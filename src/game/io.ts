// Seam between game logic and the outside world (UI in src/main.ts, or a test).
export interface CombatView {
  title: string;
  enemies: { name: string; health: number; maxHealth: number; intent: string; status: string[] }[];
  player: { health: number; maxHealth: number; mana: number; maxMana: number; level: number; xp: number; xpNext: number; status: string[]; weapons: string };
  stats: [string, string | number][];
}

export const io = {
  print(_msg: string): void {},
  ask(_prompt: string, _options: string[]): Promise<number> {
    throw new Error("io.ask not set");
  },
  render(_view: CombatView): void {},
  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  },
};

// random.randint(a, b): both ends included
export const randint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
// k picks with replacement
export const choices = <T>(list: T[], k: number) =>
  Array.from({ length: k }, () => list[Math.floor(Math.random() * list.length)]);
