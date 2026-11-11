// Game tests. Math.random is stubbed: rolls(...) feeds fixed values, then 0.5 ("no crit, no dodge, flee fails").
import { beforeEach, expect, test, vi } from "vitest";
import type { EnemyTemplate } from "./enemy";

const rolls = (...values: number[]) => vi.spyOn(Math, "random").mockImplementation(() => values.shift() ?? 0.5);

// Seeded PRNG (mulberry32) for whole-run tests: random but repeatable.
const seeded = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Script the taps: each answer is the start of the button label to press.
async function play(answers: string[]) {
  const { io } = await import("./io"); // same module instance as the game after resetModules
  const log: string[] = [];
  io.print = (m) => void log.push(m);
  io.render = () => {};
  io.sleep = async () => {};
  io.ask = async (q, options, disabled) => {
    const a = answers.shift();
    if (a === undefined) throw new Error("script ended"); // reached the end of the script without a crash
    const i = options.findIndex((o) => o.startsWith(a));
    if (i === -1) throw new Error(`no scripted answer "${a}" for "${q}" in [${options}]`);
    if (disabled?.[i]) throw new Error(`picked a disabled option: ${options[i]}`); // the UI does not allow it
    return i;
  };
  return { io, log };
}

const dummy = (o: Partial<EnemyTemplate> = {}): EnemyTemplate => ({
  name: "Dummy", maxHealth: 50, speed: 1, xp: 5, pattern: [{ name: "Poke", kind: "attack", value: 5 }], ...o,
});

const known = async (name: string, rank = 1) => ({ spell: (await import("./spell")).SPELLS.find((s) => s.name === name)!, rank });

async function setup() {
  const { Player } = await import("./player");
  const { Enemy } = await import("./enemy");
  const { combat } = await import("./combat");
  return { player: new Player(), Enemy, combat };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

// --- whole run ---

test("smoke: a seeded run plays to the end (win or game over) without crashing", async () => {
  vi.spyOn(Math, "random").mockImplementation(seeded(1));
  const { io, log } = await play([]);
  io.ask = async (_q, options) => Math.max(0, options.findIndex((o) => o.startsWith("Fireball")));
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  const p = new Player();
  p.equipWeapon((await import("./items")).makeWeapon(await family("Hammer"), 2, "Epic")); // strong enough to walk several rooms
  const summary = await gameLoop(p);
  expect(summary.floor).toBeGreaterThan(3);
  expect(log.some((l) => /^Level \d+ · \d+ enemies defeated\.$/.test(l))).toBe(true);
  expect(log.some((l) => l.startsWith("Best weapon: [yellow]Hammer[/]"))).toBe(true); // the end-of-run screen
  expect(summary.dealt.Hammer).toBeGreaterThan(0);
});

test("run stats: damage is counted per weapon family, element, spell and burn, never more than the enemy had", async () => {
  const { player, Enemy } = await setup();
  const { makeWeapon } = await import("./items");
  const { damageReport } = await import("./game");
  rolls(); // 0.5 everywhere: no crit, no dodge, a Common Sword (10–14) rolls 12
  player.equipWeapon(makeWeapon(await family("Sword"), 0, "Common"));
  player.spells = [await known("Fireball")];
  const foe = new Enemy(dummy({ maxHealth: 35 }));
  player.attack(foe, [foe]); // 12
  player.cast(player.spells[0], [foe], [foe]); // 13, and a burn of 4 per turn
  foe.act(player, [foe]); // its turn ends: burns for 4
  expect(player.dealt).toEqual({ Sword: 12, Fire: 13, "spell:Fireball": 13, Burn: 4 });
  player.attack(foe, [foe]); // 6 health left: only 6 counts
  expect(foe.health).toBe(0);
  expect(damageReport(player.dealt)).toEqual(["[bold]Damage dealt: 35[/]", "Sword: 18", "Fire: 13", "Burn: 4", "Best weapon: [yellow]Sword[/] (18)", "Best spell: [cyan]Fireball[/] (13)"]);
  expect(damageReport({})).toEqual(["No damage dealt."]);
});

// Plays a seeded run with a "first allowed button" bot, recording it, and stops at the 6th turn of combat.
async function runUntilSixthTurn(run: import("./save").RunSave) {
  vi.resetModules();
  const { io, seedRandom } = await import("./io");
  const { record } = await import("./save");
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  io.print = io.render = () => {};
  io.sleep = async () => {};
  let turns = 0;
  io.ask = async (q, _o, disabled) => {
    if (q === "Your turn" && ++turns === 6) throw new Error("stop");
    return disabled?.findIndex((d) => !d) ?? 0;
  };
  seedRandom(run.seed);
  let stored = 0;
  const undo = record(run, () => stored++);
  await expect(gameLoop(new Player())).rejects.toThrow("stop");
  undo();
  return { view: JSON.stringify(io.snapshot!()), stored };
}

test("save: a run continued from its seed and answers is in the same state, mid-fight", async () => {
  const { newRun } = await import("./save");
  const run = newRun(7);
  const first = await runUntilSixthTurn(run); // stops at the 6th turn, with everything before it recorded
  expect(run.answers.length).toBeGreaterThan(8);
  expect(first.stored).toBe(run.answers.length);
  expect(run.floor).toBeGreaterThan(0);
  // "reload": new modules, the same save, as text
  const saved = JSON.parse(JSON.stringify(run));
  const { io, seedRandom } = (vi.resetModules(), await import("./io"));
  const { record } = await import("./save");
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  io.print = io.render = () => {};
  let slept = 0;
  io.sleep = async () => void slept++;
  let asked = "";
  io.ask = async (q) => {
    asked = q;
    throw new Error("stop");
  };
  seedRandom(saved.seed);
  record(saved, () => {});
  await expect(gameLoop(new Player())).rejects.toThrow("stop");
  expect(asked).toBe("Your turn"); // handed over exactly where the first session stopped
  expect(JSON.stringify(io.snapshot!())).toBe(first.view); // same enemies, health, gear, map
  expect(slept).toBe(0); // the replay did not wait on any animation
});

test("save: unreadable or unknown saves give a new save; a saved answer that no longer fits is reported", async () => {
  const { loadSave, newSave, record, SaveMismatch, SAVE_VERSION } = await import("./save");
  const { io } = await import("./io");
  for (const text of [null, "", "{", "{}", JSON.stringify({ version: SAVE_VERSION + 1 })]) expect(loadSave(text)).toEqual(newSave());
  const save = { ...newSave(), run: { seed: 1, rules: 1, level: 3, answers: [3], floor: 2 } };
  expect(loadSave(JSON.stringify(save))).toEqual(save);
  // a version 1 save (before the store existed) is converted: the run is kept, a profile is added
  const v1 = { version: 1, run: { seed: 5, rules: 1, answers: [0, 2], floor: 4 } };
  expect(loadSave(JSON.stringify(v1))).toEqual({ version: SAVE_VERSION, run: { ...v1.run, level: 1 }, profile: newSave().profile, options: newSave().options });
  // a version 2 save (before the settings existed) keeps its profile and gains the default settings
  const v2 = { version: 2, run: null, profile: { ...newSave().profile, ash: 77 } };
  expect(loadSave(JSON.stringify(v2))).toEqual({ ...v2, version: SAVE_VERSION, options: newSave().options });
  expect(loadSave(JSON.stringify({ version: 1, run: null })).run).toBeNull();
  io.ask = async () => 0;
  record(save.run, () => {});
  await expect(io.ask("Pick", ["a", "b"])).rejects.toThrow(SaveMismatch);
});

// --- between runs: the store, the profile, the difficulty levels ---

test("profile: Ash by floor, bosses and win, more at higher levels; a win at the top unlocked level opens the next", async () => {
  const { ashEarned, finishRun, newProfile, buy, boostPrice, BOOST_PRICES, LEVELS } = await import("./meta");
  expect(ashEarned({ won: false, floor: 17, bosses: 1 }, 1)).toBe(27);
  expect(ashEarned({ won: true, floor: 33, bosses: 3 }, 1)).toBe(88);
  expect(ashEarned({ won: true, floor: 33, bosses: 3 }, 6)).toBe(176); // +20% per level
  const p = newProfile();
  expect(finishRun(p, { won: false, floor: 17, bosses: 1 }, 1)).toBe(27);
  expect(p).toMatchObject({ ash: 27, bestFloor: 17, level: 1, wins: {} });
  finishRun(p, { won: true, floor: 33, bosses: 3 }, 1);
  expect(p).toMatchObject({ ash: 115, bestFloor: 33, level: 2, wins: { 1: 1 } });
  finishRun(p, { won: true, floor: 33, bosses: 3 }, 1); // winning below the top level opens nothing
  expect(p.level).toBe(2);
  p.level = LEVELS.length;
  finishRun(p, { won: true, floor: 33, bosses: 6 }, LEVELS.length); // there is no level 11
  expect(p.level).toBe(LEVELS.length);

  // the store: an unlock is bought once, a boost 5 times at rising prices, never on credit
  p.ash = 60;
  expect(buy(p, "family:Bow")).toBe(true);
  expect(buy(p, "family:Bow")).toBe(false);
  expect(buy(p, "vigor")).toBe(true);
  expect([p.ash, p.bought.vigor, boostPrice(p, "vigor")]).toEqual([0, 1, BOOST_PRICES[1]]);
  expect(buy(p, "vigor")).toBe(false);
  p.ash = 1000;
  while (buy(p, "vigor"));
  expect([p.bought.vigor, boostPrice(p, "vigor")]).toEqual([5, null]);
  expect(p.ash).toBe(1000 - 40 - 70 - 110 - 160);
});

test("home: buying in the store and resetting are stored; reset asks first; Start returns the chosen level", async () => {
  const { home } = await import("./home");
  const { newProfile } = await import("./meta");
  const p = { ...newProfile(), ash: 100, level: 3, bestFloor: 12 };
  let stored = 0;
  const { newOptions } = await import("./save");
  const o = { ...newOptions(), howToSeen: true };
  const { log } = await play(["Store", "Unlock Bows", "Vigor 0/5", "Back", "Change the difficulty", "Level 2", "Reset progression", "Keep", "Start a run"]);
  expect(await home(p, o, () => stored++)).toBe(2);
  expect(p).toMatchObject({ ash: 40, bought: { "family:Bow": 1, vigor: 1 }, level: 3 });
  expect(stored).toBe(2);
  expect(log.some((l) => l.includes("Furthest floor: 12"))).toBe(true);
  await play(["Reset progression", "Erase everything", "Start a run"]);
  expect(await home(p, o, () => stored++)).toBe(1);
  expect(p).toEqual(newProfile());
  expect(stored).toBe(3);
  await play(["Store", "Unlock Hammers"]); // 0 Ash: the button is disabled
  await expect(home(p, o, () => {})).rejects.toThrow("picked a disabled option");
});

test("settings and how-to-play: each press changes one setting and is stored; the how-to is shown once and can be skipped", async () => {
  const { home } = await import("./home");
  const { newProfile } = await import("./meta");
  const { newOptions } = await import("./save");
  const o = newOptions();
  let stored = 0;
  const { log } = await play(["Settings", "Animations: on", "Music volume: 60%", "Music volume: 80%", "Music volume: 100%", "Sound volume: 60%", "Back", "Start a run", "Next", "Skip"]);
  await home(newProfile(), o, () => stored++);
  expect(o).toEqual({ animations: false, music: 0, sound: 80, howToSeen: true }); // the volume goes up a step, then back to 0
  expect(stored).toBe(6); // 5 presses and the how-to seen
  expect(log.filter((l) => l.includes("How to play (")).length).toBe(2); // skipped on the second of 3 pages
  await play(["Start a run"]); // seen: not shown again
  await home(newProfile(), o, () => stored++);
  expect(stored).toBe(6);
});

test("a new profile: 2-handed weapons, powerful spells and two events are locked; boosts change the hero at the start", async () => {
  const { settings } = await import("./meta");
  const { rewardOffers } = await import("./reward");
  const { gameLoop } = await import("./game");
  const { Player } = await import("./player");
  vi.spyOn(Math, "random").mockImplementation(seeded(3));
  settings.bought = {};
  const offers = Array.from({ length: 150 }, () => rewardOffers(new Player(), 2)).flat();
  expect(offers.filter((o) => o.kind === "weapon" && o.family.hands === 2)).toEqual([]);
  expect(offers.filter((o) => o.kind === "spell" && o.spell.shape === "power")).toEqual([]);
  expect(offers.some((o) => o.kind === "weapon") && offers.some((o) => o.kind === "spell")).toBe(true);
  settings.bought = { "family:Bow": 1, "spell:Inferno": 1 };
  const more = Array.from({ length: 150 }, () => rewardOffers(new Player(), 2)).flat();
  expect(more.some((o) => o.name.endsWith("Bow"))).toBe(true);
  expect(more.some((o) => o.name === "Inferno")).toBe(true);
  expect(more.some((o) => o.name.endsWith("Staff") || o.name === "Soul Rend")).toBe(false);

  // boosts: Vigor 2 (+16 health), Focus 1 (+10 mana), Purse 3 (+45 gold), Might 5 (+15% damage), Training 2 (2 points at the start)
  settings.bought = { vigor: 2, focus: 1, purse: 3, might: 5, training: 2 };
  const asked: string[] = [];
  const { io } = await play(["", "+1 Strength", "+5 Max Health"]);
  const script = io.ask;
  io.ask = (q, o, d) => (asked.push(q), script(q, o, d));
  const p = new Player();
  const before = p.spellPower();
  await expect(gameLoop(p)).rejects.toThrow("script ended");
  expect(asked.slice(0, 3)).toEqual(["Choose your starting weapon", "Spend a point (1 of 2)", "Spend a point (2 of 2)"]);
  expect([p.maxHealth, p.health, p.maxMana, p.gold, p.base.strength]).toEqual([121, 121, 110, 45, 11]);
  expect(before).toBeCloseTo(1.15);
});

test("difficulty levels: tougher enemies, more Elites, resistances and weaknesses, armored enemies, two bosses at level 10", async () => {
  const { settings, LEVELS } = await import("./meta");
  const { Enemy, ACTS } = await import("./enemy");
  const { Player } = await import("./player");
  const { encounter, bossesOf, DIFFICULTY } = await import("./game");
  const { generateMap } = await import("./map");
  const { makeWeapon } = await import("./items");
  expect(LEVELS).toHaveLength(10);
  const imp = ACTS[2].enemies.find((e) => e.name === "Ember Imp")!; // Fire
  const sludge = ACTS[0].enemies.find((e) => e.name === "Sludge")!; // Earth, armored
  const hit = async (lvl: number, template: typeof imp, spell: string | null, elite = false) => {
    settings.level = lvl;
    rolls();
    const p = new Player();
    p.equipWeapon(makeWeapon(await family("Sword"), 0, "Common")); // rolls 12
    const foe = new Enemy({ ...template, maxHealth: 100 }, 1, elite);
    if (spell) p.cast(await known(spell), [foe], [foe]);
    else p.attack(foe, [foe]);
    return { lost: 100 - foe.health, status: foe.statusText().filter((s) => !s.startsWith("Burning")) };
  };
  // level 1: nothing special. Fireball 13, Water Whip 14, a Sword 12
  expect((await hit(1, imp, "Fireball")).lost).toBe(13);
  expect((await hit(1, sludge, null)).lost).toBe(12);
  expect((await hit(3, imp, "Fireball")).status).toEqual([]);
  // level 4: its own element 35% less, the opposite 15% more, the rest unchanged
  expect(await hit(4, imp, "Fireball")).toEqual({ lost: 8, status: ["Resists Fire, weak to Water"] }); // 13 × 0.65
  expect((await hit(4, imp, "Water Whip")).lost).toBe(16); // 14 × 1.15
  expect((await hit(4, imp, "Rock Throw")).lost).toBe(14);
  expect((await hit(4, sludge, null)).lost).toBe(12); // not armored yet
  // level 6: armored enemies take 30% less from weapons, spells are unchanged; level 8: every elite is armored
  expect((await hit(6, sludge, null)).lost).toBe(8); // 12 × 0.7
  expect((await hit(6, sludge, "Fireball")).lost).toBe(13);
  expect((await hit(6, imp, null, true)).lost).toBe(12);
  const elite = await hit(8, imp, null, true);
  expect([elite.lost, elite.status]).toEqual([8, ["Resists Fire, weak to Water", "Armored: weapons deal 30% less"]]);

  // health and damage follow the level's scale
  settings.level = 10;
  rolls(0, 0, 0);
  expect(encounter(0, 1)[0].maxHealth).toBe(Math.round(11 * DIFFICULTY[0] * LEVELS[9].scale));
  // two different bosses at level 10, one below
  rolls(0, 0);
  expect(bossesOf(1).map((b) => b.name)).toEqual([ACTS[1].bosses[0].name, ACTS[1].bosses[1].name]);
  expect(bossesOf(1)[0].maxHealth).toBe(Math.round(128 * DIFFICULTY[1] * LEVELS[9].scale));
  settings.level = 9;
  expect(bossesOf(1)).toHaveLength(1);

  // more Elite rooms: 15% at level 1, 30% at level 9
  const share = (lvl: number) => {
    settings.level = lvl;
    vi.spyOn(Math, "random").mockImplementation(seeded(5));
    const rooms = Array.from({ length: 60 }, generateMap).flat(2);
    return (rooms.filter((r) => r.kind === "elite").length / rooms.length) * 100;
  };
  expect(share(1)).toBeGreaterThan(12);
  expect(share(1)).toBeLessThan(18);
  expect(share(9)).toBeGreaterThan(26);
  expect(share(9)).toBeLessThan(34);
});

test("death screen names the floor and the killer (here: poison)", async () => {
  await play(["[white]", "Elite", "Defend", "Defend"]); // starter weapon, a room, then defend; the poison ticks after the hero's second turn
  rolls(); // all rolls 0.5: every room is an Elite, and floor 1 holds Elite Sludges starting on their Acid move
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  const p = new Player();
  p.health = 1;
  const summary = await gameLoop(p);
  expect(summary).toMatchObject({ won: false, floor: 1, level: 1, kills: 0 });
  expect(summary.killedBy).toMatch(/Sludge's poison$/);
});

// Plays the start of a seeded run with a strong weapon, answering through `answer`; stops at the 2nd path choice.
async function walk(answer: (q: string, o: string[]) => number) {
  const { io } = await play([]);
  const { Player } = await import("./player");
  const { makeWeapon } = await import("./items");
  const { gameLoop } = await import("./game");
  const p = new Player();
  p.equipWeapon(makeWeapon(await family("Hammer"), 2, "Epic"));
  const asked: { q: string; o: string[]; health: number; map: import("./io").MapView | null }[] = [];
  io.ask = async (q, o) => {
    asked.push({ q, o, health: p.health, map: io.snapshot?.().map ?? null });
    if (asked.filter((a) => a.q === "Choose your path").length === 2) throw new Error("script ended");
    return answer(q, o);
  };
  await expect(gameLoop(p)).rejects.toThrow("script ended");
  return asked;
}

test("path: you pick among the rooms linked to your last one; fleeing an elite or fight gives no reward and the path goes on", async () => {
  const random = seeded(7);
  let fleeing = false;
  vi.spyOn(Math, "random").mockImplementation(() => (fleeing ? ((fleeing = false), 0) : random())); // the flee roll succeeds
  const asked = await walk((q, o) => {
    if (q === "Choose your path") return Math.max(0, o.findIndex((x) => /^(Fight|Elite)/.test(x)));
    if (q === "Your turn") return (fleeing = true), o.indexOf("Flee");
    return 0;
  });
  const paths = asked.filter((a) => a.q === "Choose your path");
  const [first, second] = paths.map((a) => a.map!);
  expect(first.choosing).toBe(true);
  expect(paths[0].o.map((o) => o.split(" · ")[0])).toEqual(first.floors[0].filter((r) => r.state === "reachable").map((r) => r.label));
  const current = second.floors[0].find((r) => r.state === "current")!;
  expect(second.floors[1].filter((r) => r.state === "reachable").map((r) => r.lane)).toEqual(current.next);
  expect(paths[1].o).toHaveLength(current.next.length);
  expect(asked.some((a) => a.q === "Choose a reward")).toBe(false);
});

test("room box: titled '<act> - <room>'; after a room you confirm with Continue, then the log is wiped", async () => {
  vi.spyOn(Math, "random").mockImplementation(seeded(11));
  const { io } = await import("./io");
  const events: string[] = [];
  const titles: string[] = [];
  const asked = await walk((q, o) => {
    titles.push(io.snapshot!().title);
    if (q === "Choose your path") return Math.max(0, o.findIndex((x) => x.startsWith("Fight")));
    if (q === "Room cleared") io.clear = () => void events.push("clear");
    return 0;
  });
  const qs = asked.map((a) => a.q);
  expect(titles[0]).toBe("The Sewers - Choose your path");
  expect(titles[qs.indexOf("Your turn")]).toBe("The Sewers - Fight");
  expect(asked.find((a) => a.q === "Room cleared")!.o).toEqual(["Continue"]);
  expect(qs.indexOf("Room cleared")).toBe(qs.lastIndexOf("Choose your path") - 1); // the last question of the room
  expect(events).toEqual(["clear"]);
});

test("no healing between fights: health after a won fight stays as it was", async () => {
  vi.spyOn(Math, "random").mockImplementation(seeded(11));
  const asked = await walk((q, o) => {
    if (q === "Choose your path") return Math.max(0, o.findIndex((x) => x.startsWith("Fight")));
    if (q === "Choose a reward") return o.length - 1; // skip
    return 0; // Attack, first target, first boost
  });
  const reward = asked.find((a) => a.q === "Choose a reward")!;
  const next = asked.filter((a) => a.q === "Choose your path")[1];
  expect(reward).toBeDefined();
  expect(next.health).toBe(reward.health);
});

test("level-up: 3 points for STR, AGI, INT (+1) or Max HP (+5); XP carries over, each level needs 5 more", async () => {
  await play(["+1 Strength", "+5 Max Health", "+5 Max Health"]);
  const { Player } = await import("./player");
  const { levelUps } = await import("./game");
  const { io } = await import("./io");
  const questions: string[] = [];
  let offered: string[] = [];
  const ask = io.ask;
  io.ask = (q, o) => (questions.push(q), (offered = o), ask(q, o));
  const p = new Player();
  p.health = 80;
  p.experience = 25;
  await levelUps(p);
  expect(questions).toEqual(["Spend a point (1 of 3)", "Spend a point (2 of 3)", "Spend a point (3 of 3)"]);
  expect(offered).toEqual(["+1 Strength", "+1 Agility", "+1 Intelligence", "+5 Max Health"]);
  expect([p.level, p.experience, p.xpToNextLevel, p.base.strength, p.maxHealth, p.health]).toEqual([2, 5, 25, 11, 110, 100]); // 80 + 10 + 5 + 5
});

test("stat roles: +1% per 2 points above 10 — STR Armor, AGI dodge, INT Ward, PER crit; Strength no longer adds max HP", async () => {
  const { player } = await setup();
  player.base = { strength: 20, agility: 16, intelligence: 13, perception: 30 };
  expect([player.armorPct(), Math.round(player.dodgeChance() * 100), player.wardPct(), Math.round(player.critChance() * 100)]).toEqual([5, 8, 1, 15]);
  expect(player.maxHealth).toBe(100);
  player.base.agility = 4; // heavy armor can push Agility below 10
  expect(Math.round(player.dodgeChance() * 100)).toBe(2); // 5% - 3%
});

test("encounters: counts by floor, elites are 40% tougher with double XP, bosses per act, templates untouched", async () => {
  const { encounter, bossesOf, DIFFICULTY } = await import("./game");
  const { ACTS } = await import("./enemy");
  const before = JSON.stringify(ACTS);
  rolls(0);
  expect(encounter(0, 1)).toHaveLength(1);
  rolls(0.99);
  expect(encounter(0, 9)).toHaveLength(3);
  rolls();
  expect(encounter(0, 5)).toHaveLength(2);
  rolls(0, 0, 0); // one elite, the first template (Rat)
  const [elite] = encounter(0, 1, true);
  expect([elite.name, elite.maxHealth, elite.xpReward]).toEqual(["Elite Rat", Math.round(11 * DIFFICULTY[0] * 1.4), 2 * Math.round(4 * DIFFICULTY[0] * 1.4)]);
  const names = ACTS.flatMap((a) => [...a.enemies, ...a.bosses].map((t) => t.name));
  expect(new Set(names).size).toBe(names.length);
  expect(names.filter((n) => /Wraith|Troll|Fire Imp|Dread Knight|Lich|Goblin/.test(n))).toEqual([]); // the old placeholders
  for (const [a, act] of ACTS.entries()) {
    expect(act.enemies.length).toBeGreaterThanOrEqual(4);
    expect(act.bosses).toHaveLength(3);
    for (const [i, roll] of [0, 0.5, 0.99].entries()) {
      rolls(roll); // each run meets one of the act's 3 bosses
      expect(bossesOf(a).map((b) => b.name)).toEqual([act.bosses[i].name]);
    }
  }
  expect(ACTS[2].name).toBe("Hell");
  encounter(1, 8).forEach((e) => (e.health = 0));
  expect(JSON.stringify(ACTS)).toBe(before);
});

// --- map ---

async function checkMap(map: import("./map").ActMap) {
  expect(map).toHaveLength(10);
  map.forEach((floor, f) => {
    const lanes = floor.map((r) => r.lane);
    expect(floor.length).toBeGreaterThanOrEqual(2);
    expect(floor.length).toBeLessThanOrEqual(4);
    expect(new Set(lanes).size).toBe(lanes.length);
    expect(lanes.every((l) => l >= 0 && l <= 3)).toBe(true);
    const below = map[f - 1];
    if (below) for (const r of floor) expect(below.some((b) => b.next.includes(r.lane))).toBe(true); // reachable
    for (const r of floor) {
      if (f === 9) {
        expect(r.next).toEqual([]);
        continue;
      }
      expect(r.next.length).toBeGreaterThanOrEqual(1);
      expect(r.next.length).toBeLessThanOrEqual(3);
      for (const n of r.next) {
        expect(map[f + 1].some((x) => x.lane === n)).toBe(true);
        expect(Math.abs(n - r.lane)).toBeLessThanOrEqual(1);
      }
      const right = floor.find((x) => x.lane === r.lane + 1);
      if (right) expect(r.next.includes(r.lane + 1) && right.next.includes(r.lane)).toBe(false); // links never cross
    }
  });
  expect([...map[8], ...map[9]].some((r) => r.kind === "rest")).toBe(true);
}

test("map: every rule holds over 200 seeded maps", async () => {
  const { generateMap } = await import("./map");
  const count: Record<string, number> = {};
  let rooms = 0;
  for (let seed = 1; seed <= 200; seed++) {
    vi.spyOn(Math, "random").mockImplementation(seeded(seed));
    const map = generateMap();
    await checkMap(map);
    for (const r of map.flat()) (count[r.kind] = (count[r.kind] ?? 0) + 1), rooms++;
  }
  const share = (k: string) => (100 * (count[k] ?? 0)) / rooms;
  for (const [k, pct] of [["fight", 45], ["elite", 15], ["event", 20], ["merchant", 10]] as const) {
    expect(Math.abs(share(k) - pct)).toBeLessThanOrEqual(5);
  }
  expect(share("rest")).toBeGreaterThanOrEqual(5);
  expect(share("rest")).toBeLessThanOrEqual(18); // 10%, plus the rest-near-the-boss override
});

test("map: finishes and keeps the rules when Math.random always returns 0.5", async () => {
  const { generateMap } = await import("./map");
  rolls();
  await checkMap(generateMap());
});

// --- enemies ---

test("enemies follow their pattern and announce the next move", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  rolls(0); // pattern starts at step 0
  const g = new Enemy(dummy({ pattern: [{ name: "Stab", kind: "attack", value: 6 }, { name: "Heavy swing", kind: "attack", value: 13 }] }));
  expect(g.intentText()).toBe("Stab, 6 physical damage");
  g.act(player, [g]);
  expect(g.intentText()).toBe("Heavy swing, 13 physical damage");
  g.act(player, [g]);
  expect(player.health).toBe(100 - 6 - 13);
});

test("buffs add damage; heals go to the most hurt ally", async () => {
  const { player, Enemy } = await setup();
  const { log } = await play([]);
  rolls(0, 0);
  const priest = new Enemy(dummy({ name: "Priest", pattern: [{ name: "Mend", kind: "heal", value: 10 }] }));
  const brute = new Enemy(dummy({ name: "Brute", pattern: [{ name: "Rage", kind: "buff", value: 3 }, { name: "Hit", kind: "attack", value: 5 }] }));
  brute.health = 20;
  priest.act(player, [priest, brute]);
  expect(brute.health).toBe(30);
  brute.act(player, [priest, brute]);
  expect(brute.intentText()).toBe("Hit, 8 physical damage");
  expect(log).toContain("The Priest uses Mend: the Brute heals 10.");
});

test("scaled enemies are tougher", async () => {
  const { Enemy } = await setup();
  const e = new Enemy(dummy(), 1.5);
  expect([e.maxHealth, e.pattern[0].value]).toEqual([75, 8]);
});

// --- hero ---

test("Defend blocks 75% (rounded up); dodge avoids it; poison ticks and stacks", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const goblin = new Enemy(dummy({ name: "Goblin" }));
  rolls(0.5, 0); // first hit lands, second is dodged
  player.defending = true;
  player.takeDamage(9, goblin, false);
  expect(player.health).toBe(97); // ceil(9 * 0.25)
  player.takeDamage(9, goblin, false);
  expect(player.health).toBe(97);

  rolls();
  player.poison(3, 2, "Slime");
  player.poison(2, 1, "Slime");
  expect(player.poisoned).toMatchObject({ damage: 3, turns: 3 });
  player.endOfRound(); // poison counts the hero's turns, not rounds
  expect(player.health).toBe(97);
  player.endOfTurn();
  expect([player.health, player.poisoned.turns, player.lastHitBy]).toEqual([94, 2, "Slime's poison"]);
});

test("crits deal 1.5x; intelligence scales spells (grade B)", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const fireball = await known("Fireball");
  const target = new Enemy(dummy({ maxHealth: 100 }));
  rolls(0); // crit
  player.cast(fireball, [target], [target]);
  expect(target.health).toBe(100 - 20); // 13 * 1.5
  player.base.intelligence = 20; // +60%
  rolls(0.9);
  player.cast(fireball, [target], [target]);
  expect(target.health).toBe(80 - 22); // 13 * 1.7
  expect(player.mana).toBe(80);
});

// --- combat ---

test("faster enemies act before the hero, slower ones after", async () => {
  const { player, Enemy, combat } = await setup();
  const { log } = await play(["Attack", "1."]);
  rolls(0, 0);
  const fast = new Enemy(dummy({ name: "Imp", speed: 20 }));
  const slow = new Enemy(dummy({ name: "Slug", speed: 1 }));
  await expect(combat(player, [fast, slow])).rejects.toThrow("script ended");
  const order = log.filter((l) => /Imp|Slug|You hit/.test(l));
  expect(order[0]).toMatch(/^The Imp hits you/);
  expect(order[1]).toMatch(/^You hit the Imp/);
  expect(order[2]).toMatch(/^The Slug hits you/);
});

test("area spells hit every living enemy for one mana cost; mana regenerates each round", async () => {
  const { player, Enemy, combat } = await setup();
  await play(["Flame Wall"]);
  player.spells = [await known("Flame Wall")];
  rolls(0, 0);
  const a = new Enemy(dummy());
  const b = new Enemy(dummy());
  await expect(combat(player, [a, b])).rejects.toThrow("script ended");
  expect([a.health, b.health]).toEqual([41, 41]); // 7 each, then burn 2
  expect(player.mana).toBe(89); // 100 - 16 + 5 regen
});

test("fights redraw through the run's snapshot, so the map stays on screen", async () => {
  const { player, Enemy, combat } = await setup();
  const { io } = await play(["Attack"]);
  const { combatView } = await import("./combat");
  const map = { act: "Test", floors: [], choosing: false, boss: false };
  const e = new Enemy(dummy());
  io.snapshot = () => combatView(player, [e], "Test", map);
  const seen: unknown[] = [];
  io.render = (v) => void seen.push(v.map);
  rolls(0);
  await expect(combat(player, [e], "Test")).rejects.toThrow("script ended");
  expect(seen.length).toBeGreaterThan(1);
  expect(seen.every((m) => m === map)).toBe(true);
});

test("no fleeing from a boss", async () => {
  const { player, Enemy, combat } = await setup();
  const { io } = await play([]);
  let offered: string[] = [];
  io.ask = async (_q, options) => {
    offered = options;
    throw new Error("stop");
  };
  await expect(combat(player, [new Enemy(dummy({ boss: true }))])).rejects.toThrow("stop");
  expect(offered).not.toContain("Flee");
});

test("Use Potion drinks a potion and is only offered when you have one", async () => {
  const { player, Enemy, combat } = await setup();
  const { makePotion } = await import("./items");
  const { io } = await play([]);
  let offered: string[] = [];
  io.ask = async (_q, options) => {
    offered = options;
    throw new Error("stop");
  };
  await expect(combat(player, [new Enemy(dummy())])).rejects.toThrow("stop");
  expect(offered).not.toContain("Use Potion");

  await play(["Use Potion", "1."]);
  player.addPotion(makePotion(0));
  player.health = 50;
  rolls();
  await expect(combat(player, [new Enemy(dummy())])).rejects.toThrow("script ended");
  expect(player.potions).toHaveLength(0);
  expect(player.health).toBe(50 + 40 - 5); // potion, then the dummy's poke
});

// --- weapons ---

const family = async (name: string) => (await import("./items")).FAMILIES.find((f) => f.name === name)!;

test("weapon damage = roll × (1 + grade × (stat − 10)); quality and act scale the roll", async () => {
  const { player, Enemy } = await setup();
  const { makeWeapon } = await import("./items");
  await play([]);
  const hammer = makeWeapon(await family("Hammer"), 0, "Common");
  expect([hammer.min, hammer.max]).toEqual([14, 20]);
  expect(makeWeapon(await family("Hammer"), 2, "Epic")).toMatchObject({ name: "Mithril Hammer", min: 34, max: 48 }); // ×1.6 ×1.5
  player.equipWeapon(hammer);
  player.base.strength = 20; // grade S: ×2.0
  const target = new Enemy(dummy({ maxHealth: 100 }));
  rolls(0.5, 0.5, 0.5); // roll 17, no crit, no stagger
  player.attack(target, [target]);
  expect(target.health).toBe(100 - 34);
});

test("dual-wielding swings both weapons, the off hand at 60%; daggers strike twice", async () => {
  const { player, Enemy } = await setup();
  const { makeWeapon } = await import("./items");
  const { log } = await play([]);
  player.equipWeapon(makeWeapon(await family("Sword"), 0, "Common"));
  player.equipWeapon(makeWeapon(await family("Dagger"), 0, "Common"), "off");
  const target = new Enemy(dummy({ maxHealth: 100 }));
  rolls();
  player.attack(target, [target]);
  // sword 10–14 rolls 12; dagger 7–11 rolls 9, ×0.6 off hand ×0.6 twin = 3.24 -> 3, twice
  expect(log.filter((l) => l.startsWith("You hit"))).toEqual(["You hit the Dummy for 12 damage!", "You hit the Dummy for 3 damage!", "You hit the Dummy for 3 damage!"]);
});

test("hands: 2H clears the off hand; shields need a STR one-hander; a focus needs a wand", async () => {
  const { player } = await setup();
  const { makeWeapon, makeArmor } = await import("./items");
  await play([]);
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Common"));
  expect(player.canHoldShield()).toBe(true);
  player.equipArmor(makeArmor("shield", 0, "Common"));
  expect(player.maxHealth).toBe(120);
  const removed = player.equipWeapon(makeWeapon(await family("Dagger"), 0, "Common")); // daggers don't take shields
  expect(removed.map((r) => r.name)).toEqual(["Iron Axe", "Wooden Shield"]);
  expect([player.offHand, player.maxHealth]).toEqual([null, 100]);
  player.equipWeapon(makeWeapon(await family("Dagger"), 0, "Common"), "off");
  expect(player.equipWeapon(makeWeapon(await family("Bow"), 0, "Common")).map((r) => r.name)).toEqual(["Iron Dagger", "Iron Dagger"]);
  expect(player.offHand).toBeNull();
  expect(player.canHoldFocus()).toBe(false);
  player.equipWeapon(makeWeapon(await family("Wand"), 0, "Common"));
  expect(player.canHoldFocus()).toBe(true);
});

test("a shield or focus that does not fit pushes the weapon out; wouldRemove only previews", async () => {
  const { player } = await setup();
  const { makeWeapon, makeArmor } = await import("./items");
  await play([]);
  const hammer = makeWeapon(await family("Hammer"), 0, "Common");
  player.equipWeapon(hammer);
  const shield = makeArmor("shield", 0, "Common");
  expect(player.wouldRemove(shield).map((r) => r.name)).toEqual(["Iron Hammer"]);
  expect([player.mainHand, player.offHand]).toEqual([hammer, null]); // nothing changed
  player.equipArmor(shield);
  expect([player.mainHand, player.offHand]).toEqual([null, shield]); // fists and shield
  player.equipWeapon(makeWeapon(await family("Staff"), 0, "Common"));
  expect(player.equipArmor(makeArmor("focus", 0, "Common")).map((r) => r.name)).toEqual(["Ashwood Staff"]);
  expect(player.mainHand).toBeNull();
});

test("comparisons: gear shows what changes, before -> after; spells show their damage for you", async () => {
  const { player } = await setup();
  const { makeWeapon, makeArmor, makeScroll } = await import("./items");
  const { gearChanges, comparison } = await import("./reward");
  player.equipWeapon(makeWeapon(await family("Sword"), 0, "Common")); // 9-13: 11 per Attack
  const hammer = gearChanges(player, makeWeapon(await family("Hammer"), 0, "Common")); // 14-20
  expect(hammer.line).toBe("Attack 12 dmg → [green]17 dmg[/]");
  expect(hammer.full).toBe(hammer.line); // one change here; the side panel lists only what changes, one per line
  const chest = gearChanges(player, makeArmor("chest", 0, "Common", { weight: "heavy", affixes: [] })); // +18 HP, +4 Armor, +3 STR, -1 AGI
  expect(chest.line).toContain("Max HP 100 → [green]118[/]");
  expect(chest.line).toContain("Armor 0% → [green]5%[/]"); // 4, plus 1 for the 3 Strength
  expect(chest.line).toContain("AGI 10 → [red]9[/]");
  expect(chest.line).toContain("Attack 12 dmg → [green]15 dmg[/]"); // Strength scales the sword
  expect([player.maxHealth, player.armor.chest]).toEqual([100, undefined]); // only a preview
  player.spells = [await known("Fireball")];
  const fireball = (await import("./spell")).SPELLS[0];
  expect(comparison(player, makeScroll(fireball, 2))).toBe("you have rank I, dmg 13 → [green]15[/]");
});

test("traits: cleave splashes, crush hits bosses harder, stagger cancels the next move", async () => {
  const { player, Enemy } = await setup();
  const { makeWeapon } = await import("./items");
  const { log } = await play([]);
  const a = new Enemy(dummy({ maxHealth: 100 }));
  const b = new Enemy(dummy({ maxHealth: 100 }));
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Common"));
  rolls();
  player.attack(a, [a, b]); // 9–15 rolls 12, splash 30% = 3.6 -> 4
  expect([a.health, b.health]).toEqual([88, 96]);

  const boss = new Enemy(dummy({ maxHealth: 100, boss: true }));
  player.equipWeapon(makeWeapon(await family("Mace"), 0, "Common"));
  rolls();
  player.attack(boss, [boss]); // 10–13 rolls 12 ×1.3 = 15.6 -> 16
  expect(boss.health).toBe(84);

  player.equipWeapon(makeWeapon(await family("Hammer"), 0, "Common"));
  rolls(0.5, 0.5, 0); // roll, no crit, stagger
  player.attack(a, [a]);
  expect(a.intentText()).toBe("Stunned, loses its move");
  a.act(player, [a]);
  expect(player.health).toBe(100);
  expect(log).toContain("The Dummy is stunned and loses its Poke.");
});

test("traits: quick acts before faster enemies; keen adds crit; wand cuts spell cost; staff boosts spells; sword parries", async () => {
  const { player, Enemy, combat } = await setup();
  const { makeWeapon } = await import("./items");
  const fireball = await known("Fireball");
  const { log } = await play(["Attack"]);
  player.equipWeapon(makeWeapon(await family("Throwing Knives"), 0, "Common"));
  rolls(0);
  const imp = new Enemy(dummy({ name: "Imp", speed: 20 }));
  await expect(combat(player, [imp])).rejects.toThrow("script ended");
  expect(log.find((l) => /Imp|You hit/.test(l))).toMatch(/^(Critical! )?You hit/);

  player.equipWeapon(makeWeapon(await family("Bow"), 0, "Common"));
  expect(player.critChance()).toBeCloseTo(0.15);
  player.equipWeapon(makeWeapon(await family("Wand"), 0, "Common"));
  expect(player.spellCost(fireball)).toBe(8);
  player.equipWeapon(makeWeapon(await family("Staff"), 0, "Common"));
  expect(player.spellPower()).toBeCloseTo(1.2);

  player.equipWeapon(makeWeapon(await family("Sword"), 0, "Common"));
  player.defending = true;
  player.health = 100;
  rolls();
  player.takeDamage(20, new Enemy(dummy({ name: "Ogre" })), false);
  expect(player.health).toBe(98); // 90% blocked
});

// --- gear and rewards ---

test("armor: rings fill two slots, bonuses add to stats and max HP/MP", async () => {
  const { player } = await setup();
  const { makeArmor } = await import("./items");
  await play([]);
  player.equipArmor(makeArmor("ring", 0, "Common", { stat: "intelligence" }));
  player.equipArmor(makeArmor("ring", 0, "Rare", { stat: "intelligence", affixes: [] })); // 3 × 1.3 = 4
  player.equipArmor(makeArmor("amulet", 0, "Common", { stat: "agility" }));
  expect([player.stat("intelligence"), player.stat("agility"), player.maxMana]).toEqual([17, 13, 110]);
  expect(player.armorIn("ring")?.name).toBe("Copper Ring"); // the next ring would replace this one
});

test("starter: 3 Common weapons from different families", async () => {
  const { io } = await play([]);
  let offered: string[] = [];
  io.ask = async (_q, o) => ((offered = o), 0);
  const { Player } = await import("./player");
  const { chooseStarter } = await import("./game");
  const p = new Player();
  await chooseStarter(p);
  expect(offered).toHaveLength(3);
  expect(new Set(offered.map((o) => o.split(" · ")[0])).size).toBe(3);
  expect(offered.every((o) => o.includes("Common"))).toBe(true);
  expect(p.mainHand).not.toBeNull();
});

test("rewards: 3 different offers; boss rewards are Rare+ gear or spells; a full pouch leaves the potion", async () => {
  const { player } = await setup();
  const { rewardOffers, take } = await import("./reward");
  const { makePotion } = await import("./items");
  const { log } = await play([]);
  for (let i = 0; i < 20; i++) {
    const offers = rewardOffers(player, 1, {});
    expect(new Set(offers.map((o) => o.kind + o.name)).size).toBe(3);
    const boss = rewardOffers(player, 1, { boss: true });
    expect(boss.every((o) => o.kind === "spell" || (o.kind !== "potion" && (o.quality === "Rare" || o.quality === "Epic")))).toBe(true);
  }
  for (let i = 0; i < 5; i++) player.addPotion(makePotion(0));
  await take(player, makePotion(0, true));
  expect(player.potions).toHaveLength(5);
  expect(log).toContain("Your pouch is full. You leave the potion behind.");
});

test("rewards: a one-hander asks which hand when you already hold one", async () => {
  const { player } = await setup();
  const { makeWeapon } = await import("./items");
  const { take } = await import("./reward");
  await play(["Off hand"]);
  player.equipWeapon(makeWeapon(await family("Sword"), 0, "Common"));
  await take(player, makeWeapon(await family("Axe"), 0, "Common"));
  expect([player.mainHand?.name, player.offHand?.name]).toEqual(["Iron Sword", "Iron Axe"]);
});


// --- gear: weights, Armor vs Ward, sets, affixes ---

test("Armor cuts physical hits, Ward cuts magic hits, both capped at 50%; heavy pieces cost Agility", async () => {
  const { player, Enemy } = await setup();
  const { makeArmor } = await import("./items");
  await play([]);
  player.equipArmor(makeArmor("chest", 0, "Common", { weight: "heavy" })); // 4 Armor, +3 STR (+1 Armor), -1 AGI
  player.equipArmor(makeArmor("head", 0, "Common", { weight: "light" })); // 2 Ward, +2 INT (+1 Ward)
  expect([player.armorPct(), player.wardPct(), player.stat("agility")]).toEqual([5, 3, 9]);
  const ogre = new Enemy(dummy({ name: "Ogre" }));
  player.health = player.maxHealth; // gear raises max HP but does not heal
  rolls();
  player.takeDamage(50, ogre, false);
  player.takeDamage(50, ogre, true);
  expect(player.health).toBe(player.maxHealth - 48 - 49); // 50 × 0.95, 50 × 0.97, rounded up
});

test("4 pieces of one weight give the set bonus", async () => {
  const { player } = await setup();
  const { makeArmor, BODY_SLOTS } = await import("./items");
  await play([]);
  for (const s of BODY_SLOTS.slice(0, 3)) player.equipArmor(makeArmor(s, 0, "Common", { weight: "heavy" }));
  expect(player.setWeight()).toBeNull();
  player.equipArmor(makeArmor("feet", 0, "Common", { weight: "heavy" }));
  expect(player.setWeight()).toBe("heavy");
  expect(player.armorPct()).toBe(2 + 4 + 3 + 2 + 10 + 4); // pieces + Bulwark + 8 STR from the pieces; Bulwark
  expect(player.stat("agility")).toBe(6); // 10 - 4 × 1
});

test("affixes: Rare has 1, Epic 2; thorns reflect, vampirism heals, regeneration ticks", async () => {
  const { player, Enemy } = await setup();
  const { makeArmor } = await import("./items");
  await play([]);
  expect(makeArmor("ring", 0, "Rare").affixes).toHaveLength(1);
  expect(new Set(makeArmor("ring", 0, "Epic").affixes).size).toBe(2);
  // the stat is fixed: two random Strength rings would add 3% Armor and change the damage below
  player.equipArmor(makeArmor("ring", 0, "Common", { stat: "perception", affixes: ["thorns", "regeneration"] }));
  player.equipArmor(makeArmor("ring", 0, "Common", { stat: "perception", affixes: ["vampirism"] }));
  const ogre = new Enemy(dummy({ name: "Ogre", maxHealth: 100 }));
  rolls();
  player.takeDamage(50, ogre, false);
  expect(ogre.health).toBe(90); // 20% of 50 back
  player.attack(ogre, [ogre]); // fists roll 4: heal 5% of 4 -> 0
  player.endOfRound();
  expect(player.health).toBe(100 - 50 + 2);
});

// --- spells: one signature effect per element ---

test("Fire burns over 3 turns, Water chills enemy damage, Shadow curses for +25% damage taken", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const e = new Enemy(dummy({ maxHealth: 200 }));
  rolls(0.9, 0.9, 0.9);
  player.cast(await known("Fireball"), [e], [e]); // 13, burn 4
  e.endOfRound(1); // burn counts the enemy's turns, not rounds
  expect(e.health).toBe(200 - 13);
  e.act(player, [e]);
  expect(e.health).toBe(200 - 13 - 4);
  player.cast(await known("Water Whip"), [e], [e]); // 14, chill 2
  expect(e.intentText()).toBe("Poke, 4 physical damage"); // 5 × 0.7
  player.cast(await known("Shadow Bolt"), [e], [e]); // 13, curse
  rolls(0.9);
  player.attack(e, [e]); // fists roll 5 × 1.25 = 6
  expect(e.health).toBe(183 - 14 - 13 - 6);
});

test("a 1-turn chill cast on a faster enemy still weakens its next move", async () => {
  const { player, Enemy, combat } = await setup();
  await play(["Tidal Wave"]);
  player.spells = [await known("Tidal Wave")]; // chill 1
  rolls(0, 0.9); // enemy pattern starts at step 0; no crit
  const imp = new Enemy(dummy({ name: "Imp", speed: 20, maxHealth: 100 }));
  await expect(combat(player, [imp])).rejects.toThrow("script ended");
  expect(imp.intentText()).toBe("Poke, 4 physical damage"); // 5 × 0.7, the round is over and the chill is still there
  imp.act(player, [imp]);
  expect(player.health).toBe(100 - 5 - 4);
  expect(imp.intentText()).toBe("Poke, 5 physical damage");
});

test("Earth stuns, Lightning chains, Light heals you", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const a = new Enemy(dummy({ maxHealth: 200 }));
  const b = new Enemy(dummy({ maxHealth: 200 }));
  rolls(0.9);
  player.cast(await known("Landslide"), [a], [a, b]); // always stuns
  expect(a.stunned).toBe(true);
  rolls(0.9);
  player.cast(await known("Chain Lightning"), [a], [a, b]); // 29, 50% chains
  expect(b.health).toBe(200 - 15);
  player.health = 50;
  rolls(0.9);
  player.cast(await known("Ray of Light"), [b], [a, b]); // 13, heals 30% -> 4
  expect(player.health).toBe(54);
});

test("spells skip targets that died before they went off; a single-target spell moves on", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const dead = new Enemy(dummy());
  const alive = new Enemy(dummy());
  dead.health = 0;
  player.health = 50;
  rolls(0.9);
  player.cast(await known("Ray of Light"), [dead], [dead, alive]); // 13, heals 30% -> 4
  expect([dead.health, alive.health, player.health]).toEqual([0, 50 - 13, 54]);
  rolls(0.9, 0.9);
  player.cast(await known("Purifying Light"), [dead, alive], [dead, alive]); // 7 to the living one only, heals 2
  expect([dead.health, alive.health, player.health]).toEqual([0, 37 - 7, 56]);
});

test("spell ranks scale damage; the wand cuts cost", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  const e = new Enemy(dummy({ maxHealth: 200 }));
  rolls(0.9);
  player.cast(await known("Rock Throw", 4), [e], [e]); // 14 × 1.5
  expect(e.health).toBe(200 - 21);
});

test("bosses enrage from round 8: +10% damage per round", async () => {
  const { Enemy } = await setup();
  await play([]);
  const boss = new Enemy(dummy({ boss: true, pattern: [{ name: "Slam", kind: "attack", value: 20 }] }));
  for (let round = 1; round <= 9; round++) boss.endOfRound(round);
  expect(boss.intentText()).toBe("Slam, 24 physical damage");
});

test("spellbook: 4 slots, a 5th spell asks what to forget; known spells rank up", async () => {
  const { player } = await setup();
  const { take } = await import("./reward");
  const { makeScroll } = await import("./items");
  const { SPELLS } = await import("./spell");
  await play(["Fireball I"]);
  player.spells = await Promise.all(["Fireball", "Water Whip", "Rock Throw", "Lightning Bolt"].map((n) => known(n)));
  await take(player, makeScroll(SPELLS.find((s) => s.name === "Judgment")!));
  expect(player.spells.map((k) => k.spell.name)).toEqual(["Water Whip", "Rock Throw", "Lightning Bolt", "Judgment"]);
  await take(player, makeScroll(SPELLS.find((s) => s.name === "Judgment")!, 2));
  expect(player.knows("Judgment")?.rank).toBe(2);
});

test("scrolls never offer a spell you already have at rank IV", async () => {
  const { player } = await setup();
  const { rewardOffers } = await import("./reward");
  player.spells = [await known("Fireball", 4)]; // Fireball is the first spell in the list
  rolls(0.7, 0); // a scroll, then the first spell of the pool
  expect(rewardOffers(player, 0, { count: 1 })[0].name).toBe("Flame Wall");
});

// --- events and gold ---

test("fights pay gold (1.5 per XP)", async () => {
  const { player, Enemy, combat } = await setup();
  await play(["Attack", "Attack", "Attack", "Attack", "Attack"]);
  player.equipWeapon((await import("./items")).makeWeapon(await family("Hammer"), 2, "Epic"));
  rolls();
  await combat(player, [new Enemy(dummy({ xp: 5 }))]);
  expect(player.gold).toBe(8);
});

test("forge quality: values grow, Rare and Epic gain affixes", async () => {
  const { makeWeapon, makeArmor, upgradeQuality } = await import("./items");
  const w = makeWeapon(await family("Sword"), 0, "Common");
  upgradeQuality(w);
  expect([w.quality, w.min, w.max]).toEqual(["Uncommon", 12, 16]); // ×1.15
  const a = makeArmor("chest", 0, "Uncommon", { weight: "heavy" });
  upgradeQuality(a);
  expect([a.quality, a.affixes.length, a.bonuses.agility]).toEqual(["Rare", 1, -1]); // the heavy penalty does not grow
  upgradeQuality(a);
  expect([a.quality, new Set(a.affixes).size]).toEqual(["Epic", 2]);
  expect(upgradeQuality(a)).toBe(false);
});

test("merchant: only affordable items are listed; buying costs gold and equips", async () => {
  const { player } = await setup();
  const { merchant, restRoom, EVENTS } = await import("./events");
  const { io, log } = await play([]);
  player.gold = 25;
  let first: string[] = [];
  let n = 0;
  io.ask = async (_q, o) => {
    if (n++ === 0) first = o;
    return o.length - 1; // leave
  };
  await merchant(player, 0);
  expect(first.every((o) => o === "Leave" || /— (\d+) gold$/.test(o) && +/— (\d+) gold$/.exec(o)![1] <= 25)).toBe(true);
  expect(log).toContain("You move on.");

  player.gold = 500;
  player.health = 50;
  await play(["Heal", "Leave"]);
  await merchant(player, 0);
  expect([player.health, player.gold]).toEqual([player.maxHealth, 470]);
});

test("merchant: warns before a purchase that makes you drop gear; Never mind keeps your gold", async () => {
  const { Player } = await import("./player");
  const { ARMOR_SLOTS, makeArmor, makeWeapon } = await import("./items");
  const { merchant, restRoom, EVENTS } = await import("./events");
  const { io } = await play([]);
  const sword = await family("Sword");
  vi.spyOn(Math, "random").mockImplementation(seeded(1));
  const p = new Player();
  p.equipWeapon(makeWeapon(sword, 0, "Common"));
  for (const slot of [...ARMOR_SLOTS, "ring" as const]) if (slot !== "focus") p.equipArmor(makeArmor(slot, 0, "Common")); // every slot full
  p.gold = 1000;
  const questions: string[] = [];
  let pick = -1;
  io.ask = async (q, o) => {
    questions.push(q);
    if (q.startsWith("Equip the")) return 0;
    if (q.startsWith('"Oh, if you buy this')) return questions.filter((x) => x === q).length === 1 ? 1 : 0; // Never mind, then Buy it
    if (pick === -1) pick = o.findIndex((x) => / — (yours|unarmed|replaces)/.test(x)); // first piece of gear
    expect(pick).toBeGreaterThanOrEqual(0);
    const visits = questions.filter((x) => x.startsWith("You have")).length;
    return visits <= 2 ? pick : o.length - 1; // try it twice, then leave
  };
  await merchant(p, 0);
  const warnings = questions.filter((q) => q.startsWith('"Oh, if you buy this'));
  expect(warnings).toHaveLength(2);
  expect(warnings[0]).toMatch(/you'll lose your .+\. Are you sure\?"$/);
  expect(questions.filter((q) => q.startsWith("You have"))[1]).toBe("You have 1000 gold"); // Never mind cost nothing
  expect(p.gold).toBeLessThan(1000);
});

test("merchant: a new spell with a full spellbook asks to confirm, which spell to forget, then confirms again", async () => {
  const { Player } = await import("./player");
  const { merchant, restRoom, EVENTS } = await import("./events");
  const { io, log } = await play([]);
  const book = ["Fireball", "Water Whip", "Rock Throw", "Lightning Bolt"];
  let found = false;
  for (let seed = 1; seed <= 50 && !found; seed++) {
    vi.spyOn(Math, "random").mockImplementation(seeded(seed));
    const p = new Player();
    p.gold = 1000;
    p.spells = await Promise.all(book.map((n) => known(n)));
    const visits: string[] = [];
    let learned = "";
    io.ask = async (q, o) => {
      const n = visits.length; // which visit we are on
      if (q.startsWith('"Your spellbook is full')) return n === 1 ? 1 : 0; // 1st try: Never mind
      if (q.startsWith("Choose a spell to forget")) return n === 2 ? o.length - 1 : 0; // 2nd try: Never mind, then Fireball I
      if (q.startsWith('"You\'ll forget')) return n === 3 ? 1 : 0; // 3rd try: Never mind; 4th: Buy it
      visits.push(q);
      const learn = o.findIndex((x) => x.startsWith("Learn"));
      if (learn < 0 || visits.length > 4) return o.length - 1; // leave
      learned = /\[cyan\](.+) I\[/.exec(o[learn])![1];
      return learn;
    };
    await merchant(p, 0);
    if (visits.length < 5) continue; // this stock had no new spell
    found = true;
    expect(visits.slice(0, 4)).toEqual(Array(4).fill("You have 1000 gold")); // backing out costs nothing
    expect(p.gold).toBe(960);
    expect(p.spells.map((k) => k.spell.name)).toEqual([...book.slice(1), learned]);
    expect(log).toContain("You forget Fireball I.");
  }
  expect(found).toBe(true);
});

test("merchant: with a full pouch, potions stay listed but she refuses to sell one", async () => {
  const { Player } = await import("./player");
  const { makePotion } = await import("./items");
  const { merchant, restRoom, EVENTS } = await import("./events");
  const { io, log } = await play([]);
  let tried = 0;
  for (let seed = 1; seed <= 30 && !tried; seed++) {
    vi.spyOn(Math, "random").mockImplementation(seeded(seed));
    const p = new Player();
    p.gold = 1000;
    p.potions = [0, 1, 2, 3, 4].map(() => makePotion(0));
    io.ask = async (_q, o) => {
      const potion = o.findIndex((x) => x.includes("Potion"));
      if (potion < 0 || tried++) return o.length - 1; // no potion in stock, or already tried: leave
      return potion;
    };
    await merchant(p, 0);
    if (tried) expect([p.gold, p.potions.length]).toEqual([1000, 5]);
  }
  expect(tried).toBe(2); // tried to buy, then saw the potion still listed and left
  expect(log).toContain(`"Sorry, I can't sell you that. You cannot hold more than 5 potions."`);
});

test("forge event upgrades the chosen item; shrine prays a spell up a rank", async () => {
  const { player } = await setup();
  const { merchant, restRoom, EVENTS } = await import("./events");
  const { makeWeapon } = await import("./items");
  await play(["Forge", "Iron Axe", "Pray", "Fireball"]);
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Common"));
  player.spells = [await known("Fireball")];
  await restRoom(player);
  expect(player.mainHand?.quality).toBe("Uncommon");
  await EVENTS.shrine(player, 0);
  expect(player.spells[0].rank).toBe(2);
});

test("trial: chance from the stat; success pays and offers a reward, failure hurts but never kills", async () => {
  const { player } = await setup();
  const { EVENTS, trialChance } = await import("./events");
  expect([trialChance(10), trialChance(20), trialChance(40)]).toEqual([0.4, 0.7, 0.95]);
  const { log } = await play(["Lift", "Skip"]);
  const after = seeded(3);
  const seq = [0, 0.1]; // first trial text, then success (0.1 < 0.4); then varied rolls so the reward has 3 different items
  vi.spyOn(Math, "random").mockImplementation(() => seq.shift() ?? after());
  await EVENTS.trial(player, 1);
  expect(player.gold).toBe(40);
  expect(log.some((l) => l.includes("Choose your reward"))).toBe(true);

  await play(["Lift"]);
  rolls(0, 0.9); // failure
  player.health = 5;
  await EVENTS.trial(player, 0);
  expect(player.health).toBe(1);
});

test("rest room: Rest heals 40% and all mana; Forge upgrades; Forge is greyed out when nothing can be upgraded", async () => {
  const { player } = await setup();
  const { restRoom } = await import("./events");
  const { makeWeapon } = await import("./items");
  await play(["Rest"]);
  player.health = 30;
  player.mana = 10;
  await restRoom(player);
  expect([player.health, player.mana]).toEqual([70, 100]);
  await play(["Forge", "Iron Axe"]);
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Common"));
  await restRoom(player);
  expect(player.mainHand?.quality).toBe("Uncommon");
  const { io } = await play([]);
  let disabled: boolean[] | undefined;
  io.ask = async (_q, _o, d) => ((disabled = d), 0);
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Epic"));
  await restRoom(player);
  expect(disabled?.[1]).toBe(true);
});

test("brew: drinking gives +3 or -2 to a random stat; -2 Strength at full health keeps health within max HP", async () => {
  const { player } = await setup();
  const { EVENTS } = await import("./events");
  await play(["Drink", "Drink"]);
  rolls(0, 0); // good brew, first stat
  await EVENTS.brew(player, 0);
  expect(player.base.strength).toBe(13);
  player.health = player.maxHealth;
  rolls(0.9, 0); // bad brew, Strength
  await EVENTS.brew(player, 0);
  expect([player.base.strength, player.health]).toEqual([11, player.maxHealth]);
  expect(player.maxHealth).toBe(100); // Strength no longer changes max HP
});

test("chest: 30% trap costs 15% max HP and never kills; otherwise gold 20 × (act + 1) and a reward", async () => {
  const { player } = await setup();
  const { EVENTS } = await import("./events");
  await play(["Open"]);
  rolls(0.1); // trap
  player.health = 5;
  await EVENTS.chest(player, 0);
  expect(player.health).toBe(1);
  const { log } = await play(["Open", "Skip"]);
  const after = seeded(3);
  const seq = [0.5]; // no trap, then varied rolls so the reward has 3 different items
  vi.spyOn(Math, "random").mockImplementation(() => seq.shift() ?? after());
  await EVENTS.chest(player, 1);
  expect(player.gold).toBe(40);
  expect(log.some((l) => l.includes("Choose your reward"))).toBe(true);
});

test("elite rewards: quality one step up, capped at Epic", async () => {
  const { rollQuality } = await import("./items");
  rolls(0, 0);
  expect(rollQuality(0, false, 1)).toBe("Uncommon");
  expect(rollQuality(2, true, 1)).toBe("Epic");
});

test("shrine blood offering: costs 20% of max HP from current health, greyed out if it would leave less than 1 HP", async () => {
  const { player } = await setup();
  const { merchant, restRoom, EVENTS } = await import("./events");
  await play(["Blood offering"]);
  rolls(0); // the stat roll picks strength
  player.health = 80;
  await EVENTS.shrine(player, 0);
  expect([player.health, player.base.strength, player.baseMaxHealth]).toEqual([60, 13, 100]); // -20 (20% of 100), max HP unchanged

  const { io } = await play([]);
  let disabled: boolean[] | undefined;
  let labels: string[] = [];
  io.ask = async (_q, o, d) => ((labels = o), (disabled = d), o.length - 1); // look, then meditate
  player.health = 20; // 20 - 20 (20% of 100 max HP) = 0: not allowed
  await EVENTS.shrine(player, 0);
  const blood = labels.findIndex((l) => l.startsWith("Blood"));
  expect(disabled?.[blood]).toBe(true);
  expect(labels[blood]).toContain("not enough health");
});