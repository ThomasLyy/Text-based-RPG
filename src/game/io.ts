// Seam between game logic and the outside world (UI in src/main.ts, or a test).
export interface CombatView {
  title: string;
  floor: number; // 1-33 over the whole run, 0 before the first room
  enemies: { id: number; name: string; boss: boolean; health: number; maxHealth: number; intent: string; status: string[] }[];
  player: {
    health: number; maxHealth: number; mana: number; maxMana: number; level: number; xp: number; xpNext: number; gold: number; status: string[];
    gear: [string, string][]; // [slot, item description or ""]
    spells: string[];
    potions: string[];
  };
  stats: [string, string | number][];
  map: MapView | null;
}

// The act's map as the UI draws it. The boss sits above the last floor and is not in `floors`.
export interface MapView {
  act: string;
  floors: { lane: number; label: string; next: number[]; state: "visited" | "current" | "reachable" | "other" }[][];
  choosing: boolean; // the path question is open: only then are the next rooms shown as reachable
  boss: boolean; // the hero is at the boss
}

// A hit that just landed, for the UI to animate: on an enemy (its id) or on the hero.
export interface Fx {
  on: number | "hero";
  amount: number;
  crit?: boolean;
}

export const io = {
  print(_msg: string): void {},
  fx(_hit: Fx): void {},
  clear(): void {}, // wipe the log: a new room starts
  // disabled[i] = shown greyed out, cannot be picked; details[i] = the full comparison for that option (side panel)
  ask(_prompt: string, _options: string[], _disabled?: boolean[], _details?: string[]): Promise<number> {
    throw new Error("io.ask not set");
  },
  render(_view: CombatView): void {},
  // the current board, so the UI can redraw it before every prompt (rewards, events, level-ups)
  snapshot: null as null | (() => CombatView),
  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  },
};

// Every random draw of the game goes through random(), so a run can be played again from its seed (see save.ts).
// Unseeded it is Math.random, which the tests stub.
let source: () => number = () => Math.random();
export const random = () => source();
// mulberry32: small, fast, and the same numbers on every device
export function seedRandom(seed: number) {
  let s = seed | 0;
  source = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// random.randint(a, b): both ends included
export const randint = (a: number, b: number) => a + Math.floor(random() * (b - a + 1));
// k picks with replacement
export const choices = <T>(list: T[], k: number) =>
  Array.from({ length: k }, () => list[Math.floor(random() * list.length)]);
