// Characterization tests: they pin the Python behaviour, audit bugs included.
// When a bug is fixed on the fix branch, the matching expectation flips.
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

test("Fireball run: kills floor 1-2 rats, double rewards, reaches floor 2 rewards", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0); // always 1 enemy, always the rat
  const log = await play(["Fireball", "1.", "1.", "Fireball"]);
  const { player, run } = await newGame();

  await expect(run()).rejects.toThrow("script ended");
  expect(player.mana).toBe(80); // two fireballs at 10 mana each
  expect(player.equipped.mainHand?.name).toBe("Sharp Dagger"); // audit #9: reward given twice
  expect(player.equipped.offHand?.name).toBe("Sharp Dagger");
  expect(player.calculateTotalStats().strength).toBe(18); // 10 + two daggers at +4
  expect(log.filter((l) => l.includes("You defeated all enemies!"))).toHaveLength(2);
});

test("Flee always fails, then the enemy hits back", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = await play(["Flee"]);
  const { player, run } = await newGame();

  await expect(run()).rejects.toThrow("script ended");
  expect(log).toContain("[bold red]You failed to flee![/]"); // audit #12
  expect(player.health).toBe(97); // rat: strength 2 + roll 1
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
  const log = await play(["Fireball", "2.", "2.", "Use Item", "1."]); // take the potion, drink it on floor 2
  const { player, run } = await newGame();
  await expect(run()).rejects.toThrow("script ended");
  expect(log.some((l) => l.startsWith("You used Small Health Potion"))).toBe(true);
  expect(player.consumables).toHaveLength(1);
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

test("potions keep the shifted Python fields", async () => {
  const { getRewardForFloor } = await import("./reward");
  const potion = getRewardForFloor(1)![1];
  expect(String(potion)).toBe("Tier null Small Health Potion (Consumable)"); // audit #11 (Python showed "None")
  expect(potion.strengthBonus).toBe(20);
});
