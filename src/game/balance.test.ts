// Balance guard: plays many seeded runs with two bots and checks win rates stay in a target band.
// When tuning, run `npx vitest run balance --reporter=verbose` to see the numbers.
import { expect, test, vi } from "vitest";
import type { CombatView } from "./io";

const seeded = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Bot = (question: string, options: string[], view: CombatView | null) => number;

// Taps the first button every time: Attack, first target, first boost, first reward.
const firstButton: Bot = () => 0;

// Builds around its starter weapon's stat, takes matching upgrades, blocks big announced hits,
// drinks potions when low, focuses the weakest enemy.
const STAT_NAME: Record<string, string> = { STR: "Strength", AGI: "Agility", INT: "Intelligence", PER: "Perception" };
function sensibleBot(): Bot {
  let defendedLastTurn = false;
  let build = "STR";
  const statOf = (label: string) => / · (STR|AGI|INT|PER) [SAB] · /.exec(label)?.[1];
  const score = (o: string) => {
    if (o === "Skip") return 0;
    const avg = /avg (\d+) dmg, yours (\d+)/.exec(o);
    if (avg) return statOf(o) === build && +avg[1] > +avg[2] ? +avg[1] - +avg[2] + 5 : -1;
    if (o.includes("empty slot")) return 5 + (o.includes(`+`) && o.includes(build) ? 5 : 0);
    if (o.includes("Potion")) return o.includes("pouch full") || /pouch [3-5]\//.test(o) ? -1 : 3;
    return -1; // don't bother swapping armor
  };
  return (q, options, view) => {
    const has = (label: string) => options.findIndex((o) => o.startsWith(label));
    if (q === "Choose your starting weapon") return (build = statOf(options[0]) ?? "STR"), ((globalThis as { build?: string }).build = build), 0;
    if (q === "Choose a reward") {
      const s = options.map(score);
      return s.indexOf(Math.max(...s));
    }
    if (q.startsWith("Equip the")) return 1; // dual-wield
    if (q === "Your turn" && view) {
      const biggest = Math.max(0, ...view.enemies.map((e) => Number(/, (\d+) damage$/.exec(e.intent)?.[1] ?? 0)));
      const defend = !defendedLastTurn && biggest >= view.player.maxHealth * 0.2;
      defendedLastTurn = defend;
      if (view.player.health < view.player.maxHealth * 0.35 && has("Use Potion") >= 0) return has("Use Potion");
      if (defend) return has("Defend");
      if (build !== "INT") return has("Attack"); // weapon builds hit harder than these early spells
      if (view.enemies.filter((e) => e.health > 0).length >= 3 && has("Flame Wall") >= 0) return has("Flame Wall");
      if (has("Fireball") >= 0) return has("Fireball");
      return has("Attack");
    }
    if (q === "Choose a boost") {
      const priority = [`+4 ${STAT_NAME[build]}`, "+20 Max Health", "+5 Perception", "+4 Agility"];
      const i = options.findIndex((o) => o === priority.find((p) => options.includes(p)));
      return Math.max(0, i);
    }
    if (q === "Attack" || q.startsWith("Cast")) {
      const hp = options.map((o) => Number(/\((\d+)\//.exec(o)?.[1]));
      return hp.indexOf(Math.min(...hp));
    }
    return 0;
  };
}

async function simulate(makeBot: () => Bot, runs: number) {
  vi.spyOn(Math, "random").mockImplementation(seeded(1));
  let wins = 0;
  let floors = 0;
  const perBuild: Record<string, number[]> = {};
  for (let r = 0; r < runs; r++) {
    vi.resetModules();
    const { io } = await import("./io");
    const bot = makeBot();
    let view: CombatView | null = null;
    io.print = () => {};
    io.sleep = async () => {};
    io.render = (v) => void (view = v);
    io.ask = async (q, o) => bot(q, o, view);
    const { Player } = await import("./player");
    const { gameLoop } = await import("./game");
    const s = await gameLoop(new Player());
    wins += Number(s.won);
    const b = (globalThis as { build?: string }).build ?? "?";
    perBuild[b] = perBuild[b] ?? [0, 0];
    perBuild[b][0] += Number(s.won);
    perBuild[b][1]++;
    floors += s.floor;
  }
  vi.restoreAllMocks();
  return { winRate: wins / runs, avgFloor: floors / runs, perBuild: Object.fromEntries(Object.entries(perBuild).map(([k, [w, n]]) => [k, `${Math.round((100 * w) / n)}% of ${n}`])) };
}

test("balance: first-button play mostly loses, sensible play wins sometimes", { timeout: 60000 }, async () => {
  const lazy = await simulate(() => firstButton, 200);
  const smart = await simulate(sensibleBot, 200);
  console.log("first button:", lazy, "| sensible:", smart);
  expect(lazy.winRate).toBeLessThan(0.1);
  expect(smart.winRate).toBeGreaterThan(0.15);
  expect(smart.winRate).toBeLessThan(0.5);
});
