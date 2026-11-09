import { randint } from "./io";

export type Stat = "strength" | "agility" | "intelligence" | "perception";
export const STATS: Stat[] = ["strength", "agility", "intelligence", "perception"];
export const STAT_LABEL: Record<Stat, string> = { strength: "STR", agility: "AGI", intelligence: "INT", perception: "PER" };

export const QUALITIES = ["Common", "Uncommon", "Rare", "Epic"] as const;
export type Quality = (typeof QUALITIES)[number];
export const QUALITY_MULT: Record<Quality, number> = { Common: 1, Uncommon: 1.15, Rare: 1.3, Epic: 1.5 };
const QUALITY_COLOR: Record<Quality, string> = { Common: "white", Uncommon: "green", Rare: "blue", Epic: "purple" };

// Item power grows with the act the item drops in.
export const ACT_MULT = [1, 1.3, 1.6];

export type Trait = "none" | "parry" | "cleave" | "crush" | "stagger" | "twin" | "quick" | "keen" | "arcane" | "channel";

export interface Family {
  name: string;
  hands: 1 | 2;
  stat: Stat;
  grade: number; // damage multiplier per stat point above 10 (S 0.10, A 0.08, B 0.06)
  min: number;
  max: number;
  trait: Trait;
  traitText: string;
  materials: string[]; // name prefix per act
}

const METAL = ["Iron", "Steel", "Mithril"];
const WOOD = ["Oak", "Yew", "Elven"];
const ARCANE = ["Ashwood", "Ebony", "Starwood"];

export const FAMILIES: Family[] = [
  { name: "Sword", hands: 1, stat: "strength", grade: 0.06, min: 9, max: 13, trait: "parry", traitText: "Parry: Defend blocks 90%", materials: METAL },
  { name: "Axe", hands: 1, stat: "strength", grade: 0.06, min: 8, max: 14, trait: "cleave", traitText: "Cleave: 30% splash to another enemy", materials: METAL },
  { name: "Mace", hands: 1, stat: "strength", grade: 0.06, min: 9, max: 12, trait: "crush", traitText: "Crush: +30% vs bosses", materials: METAL },
  { name: "Hammer", hands: 2, stat: "strength", grade: 0.1, min: 14, max: 20, trait: "stagger", traitText: "Stagger: 20% to cancel the enemy's move", materials: METAL },
  { name: "Dagger", hands: 1, stat: "agility", grade: 0.06, min: 6, max: 9, trait: "twin", traitText: "Twin strike: hits twice at 60%", materials: METAL },
  { name: "Throwing Knives", hands: 1, stat: "agility", grade: 0.06, min: 7, max: 11, trait: "quick", traitText: "Quick: attacking acts first", materials: METAL },
  { name: "Bow", hands: 2, stat: "agility", grade: 0.1, min: 11, max: 17, trait: "keen", traitText: "Keen: +10% crit chance", materials: WOOD },
  { name: "Wand", hands: 1, stat: "intelligence", grade: 0.06, min: 6, max: 9, trait: "arcane", traitText: "Arcane: spells cost 20% less", materials: ARCANE },
  { name: "Staff", hands: 2, stat: "intelligence", grade: 0.08, min: 9, max: 14, trait: "channel", traitText: "Channel: +20% spell power", materials: ARCANE },
];

export const FISTS: Family = { name: "Fists", hands: 1, stat: "strength", grade: 0.06, min: 3, max: 5, trait: "none", traitText: "", materials: [] };

export interface Weapon {
  kind: "weapon";
  name: string;
  family: Family;
  quality: Quality;
  min: number;
  max: number;
}

export type ArmorSlot = "head" | "chest" | "legs" | "feet" | "amulet" | "ring" | "shield" | "focus";
export type Bonuses = Partial<Record<Stat | "maxHealth" | "maxMana", number>>;

export interface Armor {
  kind: "armor";
  name: string;
  slot: ArmorSlot;
  quality: Quality;
  bonuses: Bonuses;
}

export interface Potion {
  kind: "potion";
  name: string;
  health: number;
  mana: number;
}

export type Item = Weapon | Armor | Potion;

// Base values per slot at act 1, Common. hp/mana/stat are scaled by act and quality.
const ARMOR: Record<ArmorSlot, { names: string[]; hp?: number; mana?: number; stat?: number; fixedStat?: Stat }> = {
  head: { names: ["Leather Cap", "Iron Helm", "Mithril Helm"], hp: 8, stat: 2 },
  chest: { names: ["Padded Vest", "Steel Breastplate", "Mithril Mail"], hp: 15, stat: 2 },
  legs: { names: ["Leather Pants", "Steel Greaves", "Mithril Greaves"], hp: 10, stat: 2 },
  feet: { names: ["Worn Boots", "Steel Boots", "Mithril Boots"], hp: 6, stat: 2 },
  amulet: { names: ["Bone Amulet", "Silver Amulet", "Star Amulet"], mana: 10, stat: 3 },
  ring: { names: ["Copper Ring", "Silver Ring", "Gold Ring"], stat: 3 },
  shield: { names: ["Wooden Shield", "Steel Shield", "Mithril Shield"], hp: 20 },
  focus: { names: ["Crystal Shard", "Arcane Orb", "Star Focus"], mana: 20, stat: 3, fixedStat: "intelligence" },
};
export const ARMOR_SLOTS = Object.keys(ARMOR) as ArmorSlot[];

const pick = <T>(list: readonly T[]) => list[randint(0, list.length - 1)];

// Chance (%) of Common / Uncommon / Rare / Epic per act; boss rewards are Rare or better.
const QUALITY_ODDS = [[60, 30, 9, 1], [40, 35, 20, 5], [25, 35, 28, 12]];
export function rollQuality(act: number, boss = false): Quality {
  const odds = boss ? [0, 0, 70, 30] : QUALITY_ODDS[act];
  let r = Math.random() * 100;
  for (let i = 0; i < QUALITIES.length; i++) if ((r -= odds[i]) < 0) return QUALITIES[i];
  return "Common";
}

export function makeWeapon(family: Family, act: number, quality: Quality): Weapon {
  const m = ACT_MULT[act] * QUALITY_MULT[quality];
  return { kind: "weapon", name: `${family.materials[act]} ${family.name}`, family, quality, min: Math.round(family.min * m), max: Math.round(family.max * m) };
}

export function makeArmor(slot: ArmorSlot, act: number, quality: Quality, stat: Stat = pick(STATS)): Armor {
  const t = ARMOR[slot];
  const m = ACT_MULT[act] * QUALITY_MULT[quality];
  const bonuses: Bonuses = {};
  if (t.hp) bonuses.maxHealth = Math.round(t.hp * m);
  if (t.mana) bonuses.maxMana = Math.round(t.mana * m);
  if (t.stat) bonuses[t.fixedStat ?? stat] = Math.round(t.stat * m);
  return { kind: "armor", name: t.names[act], slot, quality, bonuses };
}

export function makePotion(act: number, mana = false): Potion {
  return mana ? { kind: "potion", name: "Mana Potion", health: 0, mana: 40 } : { kind: "potion", name: ["Small", "Medium", "Large"][act] + " Health Potion", health: [40, 60, 80][act], mana: 0 };
}

export const grade = (g: number) => (g >= 0.1 ? "S" : g >= 0.08 ? "A" : "B");

export function bonusText(b: Bonuses) {
  return Object.entries(b)
    .map(([k, v]) => `+${v} ${k === "maxHealth" ? "HP" : k === "maxMana" ? "MP" : STAT_LABEL[k as Stat]}`)
    .join(", ");
}

// One-line description with Rich-style color markup for quality.
export function describe(item: Item): string {
  if (item.kind === "potion") return `${item.name} (${[item.health && `+${item.health} HP`, item.mana && `+${item.mana} MP`].filter(Boolean).join(", ")})`;
  const name = `[${QUALITY_COLOR[item.quality]}]${item.name}[/]`;
  if (item.kind === "armor") return `${name} · ${item.quality} ${item.slot} · ${bonusText(item.bonuses)}`;
  const f = item.family;
  return `${name} · ${item.quality} ${f.hands}H · ${STAT_LABEL[f.stat]} ${grade(f.grade)} · ${item.min}–${item.max} dmg · ${f.traitText}`;
}
