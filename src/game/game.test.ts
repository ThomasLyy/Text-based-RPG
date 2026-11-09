// Game tests: scripted taps through the real gameLoop, Math.random stubbed for fixed rolls.
import { beforeEach, expect, test, vi } from "vitest";

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
    if (i === -1) throw new Error(`no scripted answer for "${q}" in [${options}]`);
    return i;
  };
  return log;
}

beforeEach(() => {
  vi.resetModules(); // fresh enemy objects per test, like a fresh Python process
  vi.restoreAllMocks();
});

async function newGame() {
  const { Player } = await import("./player");
  const { gameLoop } = await import("./game");
  const player = new Player({ name: "Heracles" });
  return { player, run: () => gameLoop(player) };
}

test("smoke: a whole 5-floor run finishes without crashing", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { io } = await import("./io");
  const log = await play([]);
  io.ask = async () => 0; // always tap the first button: Fireball, then the first reward
  const { player, run } = await newGame();
  await run();
  expect(log).toContain("[panel bold green]Congratulations! You defeated the boss![/]");
  expect(player.health).toBeGreaterThan(0);
  expect(Object.values(player.equipped).filter(Boolean)).toHaveLength(4); // dagger, shield, helmet, breastplate
});

test("Fireball run: kills floor 1-2 rats, one reward per floor, reaches floor 2 rewards", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0); // always 1 enemy, always the rat
  const log = await play(["Fireball", "1.", "Fireball"]);
  const { player, run } = await newGame();

  await expect(run()).rejects.toThrow("script ended");
  expect(player.mana).toBe(80); // two fireballs at 10 mana each
  expect(player.equipped.mainHand?.name).toBe("Sharp Dagger");
  expect(player.equipped.offHand).toBeNull();
  expect(player.calculateTotalStats().strength).toBe(14); // 10 + dagger at +4
  expect(log.filter((l) => l.includes("You defeated all enemies!"))).toHaveLength(2);
  const { rat } = await import("./enemy");
  expect([rat.health, rat.maxHealth, rat.strength]).toEqual([10, 10, 2]); // template not scaled by floors 1-2
});

test("two rats in one fight have their own health", async () => {
  // randint(1,2) -> 2 enemies on floor 2; every pick is the rat
  const rolls = [0, 0, 0.99, 0, 0];
  vi.spyOn(Math, "random").mockImplementation(() => rolls.shift() ?? 0);
  await play(["Fireball", "1.", "Fireball", "1."]);
  const { player, run } = await newGame();
  const { io } = await import("./io");
  let fight: { health: number }[] = [];
  const render = io.render;
  io.render = (v) => { fight = v.enemies; render(v); };
  await expect(run()).rejects.toThrow("script ended");
  expect(fight).toHaveLength(2);
  expect(player.health).toBeLessThan(100); // the second rat survived the fireball and hit back
});

test("area spells hit every living enemy for one mana cost", async () => {
  const rolls = [0, 0, 0.99, 0, 0]; // 2 rats on floor 2
  vi.spyOn(Math, "random").mockImplementation(() => rolls.shift() ?? 0);
  await play(["Fireball", "1.", "Flame Wall"]);
  const { player, run } = await newGame();
  const { io } = await import("./io");
  let fight: { health: number }[] = [];
  io.render = (v) => void (fight = v.enemies);
  await expect(run()).rejects.toThrow("script ended");
  expect(fight.map((e) => e.health)).toEqual([7, 7]); // 12 - 5 each
  expect(player.mana).toBe(85); // fireball 10 + flame wall 5
});

test("failed flee: the enemy hits back", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.99); // goblin, flee roll fails, max damage roll
  const log = await play(["Flee"]);
  const { player, run } = await newGame();

  await expect(run()).rejects.toThrow("script ended");
  expect(log).toContain("[bold red]You failed to flee![/]");
  expect(player.health).toBe(92); // goblin: strength 4 + roll 4
});

test("successful flee ends the fight without damage or XP", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = await play(["Flee"]);
  const { player, run } = await newGame();

  await expect(run()).rejects.toThrow("script ended");
  expect(log).toContain("[bold yellow]You successfully fled the battle![/]");
  expect([player.health, player.experience]).toEqual([100, 0]);
});

test("Attack hits for strength + roll and stops at 0 health", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = await play(["Attack", "1."]); // attack always asks for a target, even with one enemy left
  const { run } = await newGame();
  await expect(run()).rejects.toThrow("script ended");
  expect(log).toContain("You hit the Rat for 11 damage!"); // strength 10 + roll 1, rat had 10
  expect(log).toContain("[bold green]You defeated all enemies![/]");
});

test("Use Item with no potions", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = await play(["Use Item"]);
  const { run } = await newGame();
  await expect(run()).rejects.toThrow("script ended");
  expect(log).toContain("[dim]You have no consumables.[/]");
});

test("Use Item drinks a potion", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = await play(["Fireball", "2.", "Use Item", "1."]); // take the potion, drink it on floor 2
  const { player, run } = await newGame();
  await expect(run()).rejects.toThrow("script ended");
  expect(log.some((l) => l.startsWith("You used Small Health Potion"))).toBe(true);
  expect(player.consumables).toHaveLength(0);
});

test("defeat: no reward, game over", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.99); // flee fails, goblin hits
  const log = await play(["Flee"]);
  const { player, run } = await newGame();
  player.health = 1;
  await run();
  expect(log).toContain("[bold red]You have been defeated![/]");
  expect(log).toContain("[panel bold red]Game Over![/]");
  expect(log).not.toContain("[panel bold blue]Choose your reward:[/]");
});

test("reward potions respect the 5-slot pouch", async () => {
  const { Player } = await import("./player");
  const { chooseReward, getRewardForFloor } = await import("./reward");
  const log = await play(["2."]);
  const p = new Player();
  p.consumables = Array.from({ length: 5 }, () => getRewardForFloor(1)![1] as never);
  await chooseReward(p, 1);
  expect(p.consumables).toHaveLength(5);
  expect(log).toContain("Your consumables pouch is full. Please discard a consumable first.");
});

test("rings fill both ring slots, shields go in the off hand", async () => {
  const { Player } = await import("./player");
  const { getRewardForFloor } = await import("./reward");
  await play([]);
  const p = new Player();
  p.equip(getRewardForFloor(3)![1]);
  p.equip(getRewardForFloor(3)![1]);
  p.equip(getRewardForFloor(2)![0]);
  expect([p.equipped.ringLeft, p.equipped.ringRight].map((r) => r?.name)).toEqual(["Enchanted Ring", "Enchanted Ring"]);
  expect(p.equipped.offHand?.name).toBe("Sturdy Shield");
  expect(p.calculateTotalStats().mana).toBe(124); // 100 + two rings at +12
});

test("a bow fills both hands but its bonus counts once", async () => {
  const { Player } = await import("./player");
  const { Equipment, EquipmentType, WeaponSubType } = await import("./equipment");
  await play([]);
  const p = new Player();
  p.equip(new Equipment({ name: "Bow", equipmentType: EquipmentType.WEAPON, subType: WeaponSubType.BOW, tier: 1, value: 1, perceptionBonus: 5 }));
  expect(p.calculateTotalStats().perception).toBe(15);
});

test("potions have a real tier and value, and no stat bonus", async () => {
  const { getRewardForFloor } = await import("./reward");
  const potion = getRewardForFloor(1)![1];
  expect(String(potion)).toBe("Tier 1 Small Health Potion (Consumable)");
  expect([potion.value, potion.strengthBonus]).toEqual([20, 0]);
});
