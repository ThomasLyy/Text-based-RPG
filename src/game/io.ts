// Stand-in for Python's print / Prompt.ask / time.sleep / console.print(layout).
// The UI (src/main.ts) or a test replaces these functions.
export interface CombatView {
  enemies: { name: string; title: string; health: number; maxHealth: number }[];
  stats: [string, number][];
  actions: string[];
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
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
// random.choices(list, k): k picks with replacement, same objects (not copies)
export const choices = <T>(list: T[], k: number) =>
  Array.from({ length: k }, () => list[Math.floor(Math.random() * list.length)]);
