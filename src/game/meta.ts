// What lasts between runs: the currency (Ash), what the store sold, best results, and the difficulty levels.
import type { RunSummary } from "./game";

// --- the store ---

export const CURRENCY = "Ash";

// Content that appears in runs only once bought. The id is "<kind>:<name>", as the game looks it up.
export const UNLOCKS: { id: string; name: string; text: string; price: number }[] = [
  { id: "family:Hammer", name: "Hammers", text: "two-handed Strength weapons that can stagger", price: 40 },
  { id: "family:Bow", name: "Bows", text: "two-handed Agility weapons with more critical hits", price: 40 },
  { id: "family:Staff", name: "Staves", text: "two-handed Intelligence weapons with +20% spell power", price: 40 },
  { id: "spell:Inferno", name: "Inferno", text: "the powerful Fire spell", price: 30 },
  { id: "spell:Glacial Spike", name: "Glacial Spike", text: "the powerful Water spell", price: 30 },
  { id: "spell:Landslide", name: "Landslide", text: "the powerful Earth spell", price: 30 },
  { id: "spell:Chain Lightning", name: "Chain Lightning", text: "the powerful Lightning spell", price: 30 },
  { id: "spell:Judgment", name: "Judgment", text: "the powerful Light spell", price: 30 },
  { id: "spell:Soul Rend", name: "Soul Rend", text: "the powerful Shadow spell", price: 30 },
  { id: "event:brew", name: "Strange brew", text: "an event: +3 or -2 to a random stat", price: 25 },
  { id: "event:chest", name: "Locked chest", text: "an event: gold and a reward, or a trap", price: 25 },
];

// Permanent boosts, each bought up to 5 times; level n costs BOOST_PRICES[n - 1].
export const BOOST_PRICES = [20, 40, 70, 110, 160];
export const BOOSTS: { id: string; name: string; text: string; per: number }[] = [
  { id: "vigor", name: "Vigor", text: "max health", per: 8 },
  { id: "focus", name: "Focus", text: "max mana", per: 10 },
  { id: "purse", name: "Purse", text: "gold at the start of a run", per: 15 },
  { id: "might", name: "Might", text: "% damage dealt", per: 3 },
  { id: "training", name: "Training", text: "stat point to spend at the start of a run", per: 1 },
];

// --- difficulty levels ---

export interface Level {
  scale: number; // enemy health and damage, on top of DIFFICULTY
  elites: number; // % of rooms that are Elite fights
  elements: boolean; // enemies resist their own element and are weak to its opposite
  armored: "none" | "some" | "elites"; // who takes less weapon damage: nobody, the armored enemies, or those and every elite
  bosses: 1 | 2; // boss fights at the end of each act
  adds: string; // what this level adds to the one before, for the home screen
}

export const RESIST = 0.65; // damage taken from the enemy's own element
export const WEAK = 1.15; // damage taken from the opposite element
export const ARMORED = 0.7; // weapon damage taken by an armored enemy

export const LEVELS: Level[] = [
  { scale: 1, elites: 15, elements: false, armored: "none", bosses: 1, adds: "the base game" },
  { scale: 1.06, elites: 15, elements: false, armored: "none", bosses: 1, adds: "enemies have 6% more health and damage" },
  { scale: 1.06, elites: 20, elements: false, armored: "none", bosses: 1, adds: "more Elite rooms" },
  { scale: 1.06, elites: 20, elements: true, armored: "none", bosses: 1, adds: "enemies resist their own element (35% less) and are weak to its opposite (15% more)" },
  { scale: 1.12, elites: 20, elements: true, armored: "none", bosses: 1, adds: "enemies have 12% more health and damage" },
  { scale: 1.12, elites: 20, elements: true, armored: "some", bosses: 1, adds: "some enemies are armored: weapons deal 30% less to them" },
  { scale: 1.18, elites: 25, elements: true, armored: "some", bosses: 1, adds: "18% more health and damage, and more Elite rooms" },
  { scale: 1.18, elites: 25, elements: true, armored: "elites", bosses: 1, adds: "every Elite is armored" },
  { scale: 1.24, elites: 30, elements: true, armored: "elites", bosses: 1, adds: "24% more health and damage, and more Elite rooms" },
  { scale: 1.24, elites: 30, elements: true, armored: "elites", bosses: 2, adds: "two bosses at the end of each act, one after the other" },
];

// --- the run's settings ---

// Set before a run starts. `bought: null` means everything unlocked and no boosts: the rules tests play that way.
export const settings: { bought: Record<string, number> | null; level: number } = { bought: null, level: 1 };

export const level = () => LEVELS[settings.level - 1];
export const boost = (id: string) => (settings.bought?.[id] ?? 0) * BOOSTS.find((b) => b.id === id)!.per;
const locked = new Set(UNLOCKS.map((u) => u.id));
// the things of one kind ("family", "spell", "event") the player may meet
export const available = <T>(kind: string, list: T[], name: (item: T) => string): T[] =>
  list.filter((item) => !settings.bought || !locked.has(`${kind}:${name(item)}`) || settings.bought[`${kind}:${name(item)}`] > 0);

// --- the profile ---

export interface Profile {
  ash: number;
  bought: Record<string, number>; // unlock id -> 1, boost id -> its level
  level: number; // highest difficulty level unlocked
  bestFloor: number;
  wins: Record<number, number>; // per difficulty level
}

export const newProfile = (): Profile => ({ ash: 0, bought: {}, level: 1, bestFloor: 0, wins: {} });

// 1 per floor reached, 10 per boss beaten, 25 for the win; 20% more per difficulty level above 1.
export function ashEarned(s: Pick<RunSummary, "won" | "floor" | "bosses">, lvl: number): number {
  return Math.round((s.floor + 10 * s.bosses + (s.won ? 25 : 0)) * (1 + 0.2 * (lvl - 1)));
}

// Pays the run and records it. Winning at the highest unlocked level unlocks the next one.
export function finishRun(p: Profile, s: Pick<RunSummary, "won" | "floor" | "bosses">, lvl: number): number {
  const earned = ashEarned(s, lvl);
  p.ash += earned;
  p.bestFloor = Math.max(p.bestFloor, s.floor);
  if (s.won) {
    p.wins[lvl] = (p.wins[lvl] ?? 0) + 1;
    p.level = Math.max(p.level, Math.min(LEVELS.length, lvl + 1));
  }
  return earned;
}

export const boostPrice = (p: Profile, id: string): number | null => BOOST_PRICES[p.bought[id] ?? 0] ?? null; // null: at the maximum

export function buy(p: Profile, id: string): boolean {
  const unlock = UNLOCKS.find((u) => u.id === id);
  const price = unlock ? (p.bought[id] ? null : unlock.price) : boostPrice(p, id);
  if (price === null || price > p.ash) return false;
  p.ash -= price;
  p.bought[id] = (p.bought[id] ?? 0) + 1;
  return true;
}
