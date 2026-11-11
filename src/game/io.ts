// Seam between game logic and the outside world (UI in src/main.ts, or a test).
export interface CombatView {
  title: string;
  enemies: { name: string; health: number; maxHealth: number; intent: string; status: string[] }[];
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
  choosing: boolean; // the path question is open
}

export const io = {
  print(_msg: string): void {},
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

// random.randint(a, b): both ends included
export const randint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
// k picks with replacement
export const choices = <T>(list: T[], k: number) =>
  Array.from({ length: k }, () => list[Math.floor(Math.random() * list.length)]);
