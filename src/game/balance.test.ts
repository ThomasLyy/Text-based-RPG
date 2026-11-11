// Balance guard: plays many seeded runs with bots and checks win rates stay in their target bands,
// and that no build (STR + heavy, AGI + medium, INT + light) is more than 15 points ahead of another.
// When tuning, run `npx vitest run balance --reporter=verbose` to see the numbers.
import { expect, test, vi } from "vitest";
import type { CombatView } from "./io";
import type { Stat } from "./items";

const seeded = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Bot = (question: string, options: string[], view: CombatView | null, disabled?: boolean[]) => number;
type Build = "STR" | "AGI" | "INT";
const BUILD_STAT: Record<Build, Stat> = { STR: "strength", AGI: "agility", INT: "intelligence" };
const BUILD_WEIGHT: Record<Build, string> = { STR: "heavy", AGI: "medium", INT: "light" };
const BOOST: Record<Build, string> = { STR: "+1 Strength", AGI: "+1 Agility", INT: "+1 Intelligence" };

// Taps the first button every time: first starter, Attack, first target, first boost, first reward.
const firstButton: Bot = (_q, _o, _v, disabled) => Math.max(0, disabled?.indexOf(false) ?? 0);

// Plays one build: takes gear of its stat and weight, blocks big announced hits, drinks potions when low,
// focuses the weakest enemy; the INT build casts (area spell on 3+ enemies, big spell on tough ones).
function sensibleBot(build: Build, shapes: Record<string, string>): Bot {
  let defendedLastTurn = false;
  const score = (o: string) => {
    if (o === "Skip") return 0;
    if (/ — (yours|unarmed)/.test(o)) {
      const atk = /Attack (\d+) dmg → \[\w+\](\d+) dmg/.exec(o); // the button's before -> after
      return o.includes(` ${build} `) && atk && +atk[2] > +atk[1] ? +atk[2] - +atk[1] + 5 : -1;
    }
    if (o.startsWith("Learn") || o.startsWith("Upgrade")) {
      if (build !== "INT") return -1;
      return o.includes("you have rank") ? 5 : /spellbook [0-3]\//.test(o) ? 6 : -1;
    }
    if (o.includes("Potion")) return o.includes("pouch full") || /pouch [3-5]\//.test(o) ? -1 : 3;
    const weight = / (heavy|medium|light) /.exec(o)?.[1];
    if (weight && weight !== BUILD_WEIGHT[build]) return -1;
    if (o.includes("empty slot")) return 6 + (weight ? 4 : 0);
    return weight && /Rare|Epic/.test(o) ? 3 : -1;
  };
  return (q, options, view, disabled) => {
    const has = (label: string) => options.findIndex((o) => o.startsWith(label));
    const hp = view ? view.player.health / view.player.maxHealth : 1;
    // map: rest when hurt, elites when healthy, fights otherwise
    if (q === "Choose your path") {
      if (hp < 0.5 && has("Rest") >= 0) return has("Rest");
      if (hp > 0.7 && has("Elite") >= 0) return has("Elite");
      return Math.max(0, has("Fight"));
    }
    if (q === "Rest or forge?") return hp < 0.6 || disabled?.[1] ? 0 : 1;
    if (q.startsWith("A bubbling flask")) return 1; // walk away
    if (q === "Choose a reward") {
      const s = options.map(score);
      return s.indexOf(Math.max(...s));
    }
    if (q.startsWith("You have")) {
      // merchant: best fitting item, else heal, else leave
      const s = options.map((o) => (o.startsWith("Heal") || o === "Leave" ? 0 : score(o.replace(/ — \d+ gold$/, ""))));
      if (Math.max(...s) > 0) return s.indexOf(Math.max(...s));
      return Math.max(0, has("Heal")) || options.length - 1;
    }
    if (q === "How do you get through?") return Math.max(0, options.findIndex((o) => o.includes(`(${BUILD_STAT[build]},`)));
    if (q === "Choose a blessing") return build === "INT" && has("Pray") >= 0 ? has("Pray") : has("Meditate");
    if (q.startsWith("Your spellbook is full")) return options.length - 1; // keep
    if (q.startsWith("Equip the")) return 1; // dual-wield
    if (q.startsWith("Spend a point")) return q.includes("(3 of") ? has("+5 Max Health") : has(BOOST[build]); // 2 into the build's stat, 1 into health
    if (q === "Your turn" && view) {
      const biggest = Math.max(0, ...view.enemies.map((e) => Number(/, (\d+) \w+ damage$/.exec(e.intent)?.[1] ?? 0)));
      const defend = !defendedLastTurn && biggest >= view.player.maxHealth * 0.2;
      defendedLastTurn = defend;
      if (view.player.health < view.player.maxHealth * 0.35 && has("Use Potion") >= 0) return has("Use Potion");
      if (defend) return has("Defend");
      if (build === "INT") {
        const alive = view.enemies.filter((e) => e.health > 0);
        const spell = (shape: string) => options.findIndex((o) => shapes[o.replace(/ [IV]+ \(.*$/, "")] === shape);
        if (alive.length >= 3 && spell("all") >= 0) return spell("all");
        if (Math.max(...alive.map((e) => e.health)) >= 40 && spell("power") >= 0) return spell("power");
        if (spell("single") >= 0) return spell("single");
      }
      return has("Attack");
    }
    if (q === "Attack" || q.startsWith("Cast")) {
      const hp = options.map((o) => Number(/\((\d+)\//.exec(o)?.[1]));
      return hp.indexOf(Math.min(...hp));
    }
    return 0;
  };
}

async function simulate(runs: number, build?: Build) {
  vi.spyOn(Math, "random").mockImplementation(seeded(build ? build.charCodeAt(0) : 1));
  let wins = 0, floors = 0, turns = 0, fights = 0;
  for (let r = 0; r < runs; r++) {
    vi.resetModules();
    const { io } = await import("./io");
    const { Player } = await import("./player");
    const { gameLoop, grantStarterSpell } = await import("./game");
    const { FAMILIES, makeWeapon } = await import("./items");
    const { SPELLS } = await import("./spell");
    const player = new Player();
    let view: CombatView | null = null;
    io.print = (m) => void (fights += Number(/You defeated all enemies|You have been defeated|You successfully fled/.test(m))); // each fight ends with one of these
    io.sleep = async () => {};
    io.render = (v) => void (view = v);
    let bot = firstButton;
    if (build) {
      // start armed with a random Common weapon of the build's stat, plus the usual starter spell
      const families = FAMILIES.filter((f) => f.stat === BUILD_STAT[build]);
      player.equipWeapon(makeWeapon(families[Math.floor(Math.random() * families.length)], 0, "Common"));
      grantStarterSpell(player);
      bot = sensibleBot(build, Object.fromEntries(SPELLS.map((s) => [s.name, s.shape])));
    }
    io.ask = async (q, o, d) => ((turns += Number(q === "Your turn")), bot(q, o, view, d));
    const s = await gameLoop(player);
    wins += Number(s.won);
    floors += s.floor;
  }
  vi.restoreAllMocks();
  return { winRate: wins / runs, avgFloor: +(floors / runs).toFixed(1), turnsPerFight: +(turns / fights).toFixed(1) };
}

test("balance: lazy play loses, sensible play wins sometimes, and every build is viable", { timeout: 120000 }, async () => {
  const lazy = await simulate(200);
  const builds = { STR: await simulate(150, "STR"), AGI: await simulate(150, "AGI"), INT: await simulate(150, "INT") };
  console.log("first button:", lazy);
  console.table(builds);
  const rates = Object.values(builds).map((b) => b.winRate);
  const overall = rates.reduce((a, b) => a + b) / rates.length;
  expect(lazy.winRate).toBeLessThan(0.1);
  expect(overall).toBeGreaterThan(0.2);
  expect(overall).toBeLessThan(0.5);
  expect(Math.max(...rates) - Math.min(...rates)).toBeLessThanOrEqual(0.15); // build parity
  for (const b of Object.values(builds)) expect(b.turnsPerFight).toBeLessThanOrEqual(3.5); // ~20-minute runs
});
