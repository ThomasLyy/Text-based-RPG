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
  io.ask = async (q, options) => {
    const a = answers.shift();
    if (a === undefined) throw new Error("script ended"); // reached the end of the script without a crash
    const i = options.findIndex((o) => o.startsWith(a));
    if (i === -1) throw new Error(`no scripted answer "${a}" for "${q}" in [${options}]`);
    return i;
  };
  return { io, log };
}

const dummy = (o: Partial<EnemyTemplate> = {}): EnemyTemplate => ({
  name: "Dummy", maxHealth: 50, speed: 1, xp: 5, pattern: [{ name: "Poke", kind: "attack", value: 5 }], ...o,
});

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
  const summary = await gameLoop(new Player());
  expect(summary.floor).toBeGreaterThan(1);
  expect(log.at(-1)).toMatch(/^Level \d+ · \d+ enemies defeated\.$/);
});

test("death screen names the floor and the killer (here: poison)", async () => {
  await play(["[white]", "Defend"]); // starter weapon, then defend
  rolls(); // starter picks, then floor 1: Slime, starting on its Acid move
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  const p = new Player();
  p.health = 1;
  expect(await gameLoop(p)).toEqual({ won: false, floor: 1, level: 1, kills: 0, killedBy: "Slime's poison" });
});

test("level-up: 3 different boosts offered, XP carries over, each level needs 5 more", async () => {
  await play(["+20 Max Health"]);
  rolls();
  const { Player } = await import("./player");
  const { levelUps } = await import("./game");
  const { io } = await import("./io");
  let offered: string[] = [];
  const ask = io.ask;
  io.ask = (q, o) => ((offered = o), ask(q, o));
  const p = new Player();
  p.experience = 25;
  await levelUps(p);
  expect(offered).toEqual(["+5 Perception", "+4 Intelligence", "+20 Max Health"]);
  expect([p.level, p.experience, p.xpToNextLevel, p.maxHealth, p.health]).toEqual([2, 5, 25, 120, 120]);
});

test("encounters: bosses on floors 5, 10, 15; floor 1 is a single enemy; templates untouched", async () => {
  const { encounter } = await import("./game");
  const { ACTS } = await import("./enemy");
  const before = JSON.stringify(ACTS);
  expect([5, 10, 15].map((f) => encounter(f)[0].name)).toEqual(ACTS.map((a) => a.boss.name));
  expect(encounter(1)).toHaveLength(1);
  encounter(4).forEach((e) => (e.health = 0));
  expect(JSON.stringify(ACTS)).toBe(before);
});

// --- enemies ---

test("enemies follow their pattern and announce the next move", async () => {
  const { player, Enemy } = await setup();
  await play([]);
  rolls(0); // pattern starts at step 0
  const g = new Enemy(dummy({ pattern: [{ name: "Stab", kind: "attack", value: 6 }, { name: "Heavy swing", kind: "attack", value: 13 }] }));
  expect(g.intentText()).toBe("Stab, 6 damage");
  g.act(player, [g]);
  expect(g.intentText()).toBe("Heavy swing, 13 damage");
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
  expect(brute.intentText()).toBe("Hit, 8 damage");
  expect(log).toContain("The Priest uses Mend: the Brute heals 10.");
});

test("scaled enemies are tougher", async () => {
  const { Enemy } = await setup();
  const e = new Enemy(dummy(), 1.5);
  expect([e.maxHealth, e.pattern[0].value]).toEqual([75, 8]);
});

// --- hero ---

test("Defend blocks 75% (rounded up); dodge avoids it; poison ticks and stacks", async () => {
  const { player } = await setup();
  await play([]);
  rolls(0.5, 0); // first hit lands, second is dodged
  player.defending = true;
  player.takeDamage(9, "Goblin");
  expect(player.health).toBe(97); // ceil(9 * 0.25)
  player.takeDamage(9, "Goblin");
  expect(player.health).toBe(97);

  rolls();
  player.poison(3, 2, "Slime");
  player.poison(2, 1, "Slime");
  expect(player.poisoned).toMatchObject({ damage: 3, turns: 3 });
  player.tickPoison();
  expect([player.health, player.poisoned.turns, player.lastHitBy]).toEqual([94, 2, "Slime's poison"]);
});

test("crits deal 1.5x; intelligence scales spells", async () => {
  const { player, Enemy } = await setup();
  const { fireball } = await import("./spell");
  await play([]);
  const target = new Enemy(dummy({ maxHealth: 100 }));
  rolls(0); // crit
  player.useSpell(fireball, [target]);
  expect(target.health).toBe(100 - 30); // 20 * 1.5
  player.base.intelligence = 20; // +30%
  rolls(0.9);
  player.useSpell(fireball, [target]);
  expect(target.health).toBe(70 - 26); // 20 * 1.3 from INT
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
  rolls(0, 0);
  const a = new Enemy(dummy());
  const b = new Enemy(dummy());
  await expect(combat(player, [a, b])).rejects.toThrow("script ended");
  expect([a.health, b.health]).toEqual([41, 41]);
  expect(player.mana).toBe(93); // 100 - 12 + 5 regen
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

test("fleeing a fight gives no reward", async () => {
  const { log } = await play(["[white]", "Flee"]);
  rolls(0, 0, 0, 0, 0, 0); // 3 starter picks, floor 1 enemy, its pattern start, then the flee roll succeeds
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  await expect(gameLoop(new Player())).rejects.toThrow("script ended"); // stops on floor 2
  expect(log).toContain("[bold yellow]You successfully fled the battle![/]");
  expect(log.some((l) => l.includes("Choose your reward"))).toBe(false);
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
  // sword 9–13 rolls 11; dagger 5–8 rolls 7, ×0.6 off hand ×0.6 twin = 2.52 -> 3, twice
  expect(log.filter((l) => l.startsWith("You hit"))).toEqual(["You hit the Dummy for 11 damage!", "You hit the Dummy for 3 damage!", "You hit the Dummy for 3 damage!"]);
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

test("traits: cleave splashes, crush hits bosses harder, stagger cancels the next move", async () => {
  const { player, Enemy } = await setup();
  const { makeWeapon } = await import("./items");
  const { log } = await play([]);
  const a = new Enemy(dummy({ maxHealth: 100 }));
  const b = new Enemy(dummy({ maxHealth: 100 }));
  player.equipWeapon(makeWeapon(await family("Axe"), 0, "Common"));
  rolls();
  player.attack(a, [a, b]); // 8–14 rolls 11, splash 30% = 3
  expect([a.health, b.health]).toEqual([89, 97]);

  const boss = new Enemy(dummy({ maxHealth: 100, boss: true }));
  player.equipWeapon(makeWeapon(await family("Mace"), 0, "Common"));
  rolls();
  player.attack(boss, [boss]); // 9–12 rolls 11 ×1.3 = 14
  expect(boss.health).toBe(86);

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
  const { fireball } = await import("./spell");
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
  player.takeDamage(20, "Ogre");
  expect(player.health).toBe(98); // 90% blocked
});

// --- gear and rewards ---

test("armor: rings fill two slots, bonuses add to stats and max HP/MP", async () => {
  const { player } = await setup();
  const { makeArmor } = await import("./items");
  await play([]);
  player.equipArmor(makeArmor("ring", 0, "Common", "intelligence"));
  player.equipArmor(makeArmor("ring", 0, "Rare", "intelligence")); // 3 × 1.3 = 4
  player.equipArmor(makeArmor("amulet", 0, "Common", "agility"));
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

test("rewards: 3 different offers plus Skip; boss rewards are Rare+ gear; a full pouch leaves the potion", async () => {
  const { player } = await setup();
  const { rewardOffers, take } = await import("./reward");
  const { makePotion } = await import("./items");
  const { log } = await play([]);
  for (let i = 0; i < 20; i++) {
    const offers = rewardOffers(player, 1);
    expect(new Set(offers.map((o) => o.kind + o.name)).size).toBe(3);
    const boss = rewardOffers(player, 1, true);
    expect(boss.every((o) => o.kind !== "potion" && (o.quality === "Rare" || o.quality === "Epic"))).toBe(true);
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

