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
  await gameLoop(new Player());
  expect(log.some((l) => l.includes("Game Over") || l.includes("conquered the Spire"))).toBe(true);
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

test("Defend halves damage (rounded up); dodge avoids it; poison ticks and stacks", async () => {
  const { player } = await setup();
  await play([]);
  rolls(0.5, 0); // first hit lands, second is dodged
  player.defending = true;
  player.takeDamage(9, "Goblin");
  expect(player.health).toBe(95);
  player.takeDamage(9, "Goblin");
  expect(player.health).toBe(95);

  rolls();
  player.poison(3, 2, "Slime");
  player.poison(2, 1, "Slime");
  expect(player.poisoned).toMatchObject({ damage: 3, turns: 3 });
  player.tickPoison();
  expect([player.health, player.poisoned.turns, player.lastHitBy]).toEqual([92, 2, "Slime's poison"]);
});

test("crits deal 1.5x; intelligence scales spells", async () => {
  const { player, Enemy } = await setup();
  const { fireball } = await import("./spell");
  await play([]);
  const target = new Enemy(dummy({ maxHealth: 100 }));
  rolls(0); // crit
  player.useSpell(fireball, [target]);
  expect(target.health).toBe(100 - 23); // round(15 * 1.5)
  player.intelligence = 20; // +50%
  rolls(0.9);
  player.useSpell(fireball, [target]);
  expect(target.health).toBe(77 - 23);
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
  expect([a.health, b.health]).toEqual([45, 45]);
  expect(player.mana).toBe(100); // 100 - 5 + 5 regen
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
  const { log } = await play(["Flee"]);
  rolls(0, 0, 0); // floor 1 enemy pick, its pattern start, then the flee roll succeeds
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  await expect(gameLoop(new Player())).rejects.toThrow("script ended"); // stops on floor 2
  expect(log).toContain("[bold yellow]You successfully fled the battle![/]");
  expect(log).not.toContain("[panel bold blue]Choose your reward:[/]");
});

test("Use Item drinks a potion and is only offered when you have one", async () => {
  const { player, Enemy, combat } = await setup();
  const { getRewardForFloor } = await import("./reward");
  const { io } = await play([]);
  let offered: string[] = [];
  io.ask = async (_q, options) => {
    offered = options;
    throw new Error("stop");
  };
  await expect(combat(player, [new Enemy(dummy())])).rejects.toThrow("stop");
  expect(offered).not.toContain("Use Item");

  await play(["Use Item", "1."]);
  player.equip(getRewardForFloor(1)![1]);
  player.health = 50;
  rolls();
  await expect(combat(player, [new Enemy(dummy())])).rejects.toThrow("script ended");
  expect(player.consumables).toHaveLength(0);
  expect(player.health).toBe(50 + 30 - 5); // potion, then the dummy's poke
});

// --- equipment ---

test("reward potions respect the 5-slot pouch", async () => {
  const { Player } = await import("./player");
  const { chooseReward, getRewardForFloor } = await import("./reward");
  const { log } = await play(["2."]);
  const p = new Player();
  p.consumables = Array.from({ length: 5 }, () => getRewardForFloor(1)![1] as never);
  await chooseReward(p, 1);
  expect(p.consumables).toHaveLength(5);
  expect(log).toContain("Your consumables pouch is full. Please discard a consumable first.");
});

test("rings fill both ring slots, shields go in the off hand, bonuses raise max HP/MP", async () => {
  const { Player } = await import("./player");
  const { getRewardForFloor } = await import("./reward");
  await play([]);
  const p = new Player();
  p.equip(getRewardForFloor(3)![1]);
  p.equip(getRewardForFloor(3)![1]);
  p.equip(getRewardForFloor(2)![0]);
  expect([p.equipped.ringLeft, p.equipped.ringRight].map((r) => r?.name)).toEqual(["Enchanted Ring", "Enchanted Ring"]);
  expect(p.equipped.offHand?.name).toBe("Sturdy Shield");
  expect([p.maxMana, p.maxHealth, p.health]).toEqual([124, 110, 110]);
});

test("a bow fills both hands but its bonus counts once", async () => {
  const { Player } = await import("./player");
  const { Equipment, EquipmentType, WeaponSubType } = await import("./equipment");
  await play([]);
  const p = new Player();
  p.equip(new Equipment({ name: "Bow", equipmentType: EquipmentType.WEAPON, subType: WeaponSubType.BOW, tier: 1, value: 1, perceptionBonus: 5 }));
  expect(p.calculateTotalStats().perception).toBe(15);
});
