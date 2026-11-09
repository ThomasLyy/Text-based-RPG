import { randint } from "./io";
import { SPELLS, describeSpell, RANK_NAME, type Spell } from "./spell";

export type Stat = "strength" | "agility" | "intelligence" | "perception";
export const STATS: Stat[] = ["strength", "agility", "intelligence", "perception"];
export const STAT_LABEL: Record<Stat, string> = { strength: "STR", agility: "AGI", intelligence: "INT", perception: "PER" };

export const QUALITIES = ["Common", "Uncommon", "Rare", "Epic"] as const;
export type Quality = (typeof QUALITIES)[number];
export const QUALITY_MULT: Record<Quality, number> = { Common: 1, Uncommon: 1.15, Rare: 1.3, Epic: 1.5 };
const QUALITY_COLOR: Record<Quality, string> = { Common: "white", Uncommon: "green", Rare: "blue", Epic: "purple" };
const AFFIX_COUNT: Record<Quality, number> = { Common: 0, Uncommon: 0, Rare: 1, Epic: 2 };

// Item power grows with the act the item drops in.
export const ACT_MULT = [1, 1.3, 1.6];

const pick = <T>(list: readonly T[]) => list[randint(0, list.length - 1)];

// --- weapons ---

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
  { name: "Sword", hands: 1, stat: "strength", grade: 0.07, min: 9, max: 13, trait: "parry", traitText: "Parry: Defend blocks 90%", materials: METAL },
  { name: "Axe", hands: 1, stat: "strength", grade: 0.07, min: 8, max: 14, trait: "cleave", traitText: "Cleave: 30% splash to another enemy", materials: METAL },
  { name: "Mace", hands: 1, stat: "strength", grade: 0.07, min: 9, max: 12, trait: "crush", traitText: "Crush: +30% vs bosses", materials: METAL },
  { name: "Hammer", hands: 2, stat: "strength", grade: 0.1, min: 14, max: 20, trait: "stagger", traitText: "Stagger: 20% to cancel the enemy's move", materials: METAL },
  { name: "Dagger", hands: 1, stat: "agility", grade: 0.07, min: 7, max: 10, trait: "twin", traitText: "Twin strike: hits twice at 60%", materials: METAL },
  { name: "Throwing Knives", hands: 1, stat: "agility", grade: 0.07, min: 8, max: 12, trait: "quick", traitText: "Quick: attacking acts first", materials: METAL },
  { name: "Bow", hands: 2, stat: "agility", grade: 0.1, min: 12, max: 18, trait: "keen", traitText: "Keen: +10% crit chance", materials: WOOD },
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

export function makeWeapon(family: Family, act: number, quality: Quality): Weapon {
  const m = ACT_MULT[act] * QUALITY_MULT[quality];
  return { kind: "weapon", name: `${family.materials[act]} ${family.name}`, family, quality, min: Math.round(family.min * m), max: Math.round(family.max * m) };
}

// --- armor ---

// Heavy (STR): HP + Armor (cuts physical damage), but -2 Agility per piece.
// Medium (AGI): some HP + dodge. Light (INT): little HP + mana + Ward (cuts magic damage).
export type Weight = "heavy" | "medium" | "light";
export type ArmorSlot = "head" | "chest" | "legs" | "feet" | "amulet" | "ring" | "shield" | "focus";
export type BonusKey = Stat | "maxHealth" | "maxMana" | "armor" | "ward" | "dodge" | "spellPower";
export type Bonuses = Partial<Record<BonusKey, number>>;

export type AffixId = "vitality" | "regeneration" | "thorns" | "clarity" | "precision" | "evasion" | "fury" | "sorcery" | "warding" | "vampirism";
export const AFFIXES: Record<AffixId, string> = {
  vitality: "Vitality: +10% max HP",
  regeneration: "Regeneration: heal 2 HP per turn",
  thorns: "Thorns: attackers take 20% of their damage",
  clarity: "Clarity: +2 mana per turn",
  precision: "Precision: +5% crit chance",
  evasion: "Evasion: +3% dodge",
  fury: "Fury: +10% weapon damage",
  sorcery: "Sorcery: +10% spell damage",
  warding: "Warding: +3 Armor and Ward",
  vampirism: "Vampirism: heal 5% of damage dealt",
};

export interface Armor {
  kind: "armor";
  name: string;
  slot: ArmorSlot;
  weight?: Weight; // head, chest, legs, feet only
  quality: Quality;
  bonuses: Bonuses;
  affixes: AffixId[];
}

export const BODY_SLOTS = ["head", "chest", "legs", "feet"] as const;
type BodySlot = (typeof BODY_SLOTS)[number];

// Act 1 Common values. Scaled by act and quality, except the heavy Agility penalty.
const BODY: Record<Weight, { stat: Stat; names: string[]; pieces: Record<BodySlot, [string, Bonuses]> }> = {
  heavy: {
    stat: "strength",
    names: ["Iron", "Steel", "Mithril"],
    pieces: {
      head: ["Helm", { maxHealth: 10, armor: 2, strength: 2 }],
      chest: ["Breastplate", { maxHealth: 18, armor: 4, strength: 3 }],
      legs: ["Greaves", { maxHealth: 12, armor: 3, strength: 2 }],
      feet: ["Sabatons", { maxHealth: 8, armor: 2, strength: 1 }],
    },
  },
  medium: {
    stat: "agility",
    names: ["Leather", "Studded", "Shadow"],
    pieces: {
      head: ["Hood", { maxHealth: 8, agility: 2 }],
      chest: ["Jerkin", { maxHealth: 14, agility: 3, dodge: 2 }],
      legs: ["Leggings", { maxHealth: 10, agility: 2 }],
      feet: ["Boots", { maxHealth: 7, agility: 2, dodge: 1 }],
    },
  },
  light: {
    stat: "intelligence",
    names: ["Linen", "Silk", "Starweave"],
    pieces: {
      head: ["Cowl", { maxHealth: 3, intelligence: 2, maxMana: 10, ward: 2 }],
      chest: ["Robe", { maxHealth: 6, intelligence: 3, maxMana: 15, ward: 4 }],
      legs: ["Trousers", { maxHealth: 4, intelligence: 2, maxMana: 10, ward: 3 }],
      feet: ["Slippers", { maxHealth: 3, intelligence: 1, maxMana: 5, ward: 2 }],
    },
  },
};
export const HEAVY_AGILITY = -2; // per heavy piece

const OTHER: Record<"amulet" | "ring" | "shield" | "focus", { names: string[]; bonuses: Bonuses; anyStat?: number }> = {
  amulet: { names: ["Bone Amulet", "Silver Amulet", "Star Amulet"], bonuses: { maxMana: 10 }, anyStat: 3 },
  ring: { names: ["Copper Ring", "Silver Ring", "Gold Ring"], bonuses: {}, anyStat: 3 },
  shield: { names: ["Wooden Shield", "Steel Shield", "Mithril Shield"], bonuses: { maxHealth: 20, armor: 5 } },
  focus: { names: ["Crystal Shard", "Arcane Orb", "Star Focus"], bonuses: { intelligence: 3, maxMana: 20, spellPower: 10 } },
};
export const ARMOR_SLOTS: ArmorSlot[] = ["head", "chest", "legs", "feet", "amulet", "ring", "shield", "focus"];
export const WEIGHTS: Weight[] = ["heavy", "medium", "light"];

const scale = (b: Bonuses, m: number): Bonuses => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.max(1, Math.round(v * m))]));

function rollAffixes(quality: Quality): AffixId[] {
  const pool = Object.keys(AFFIXES) as AffixId[];
  return Array.from({ length: AFFIX_COUNT[quality] }, () => pool.splice(randint(0, pool.length - 1), 1)[0]);
}

export function makeArmor(slot: ArmorSlot, act: number, quality: Quality, opts: { weight?: Weight; stat?: Stat; affixes?: AffixId[] } = {}): Armor {
  const m = ACT_MULT[act] * QUALITY_MULT[quality];
  const affixes = opts.affixes ?? rollAffixes(quality);
  if (slot === "head" || slot === "chest" || slot === "legs" || slot === "feet") {
    const weight = opts.weight ?? pick(WEIGHTS);
    const w = BODY[weight];
    const [piece, base] = w.pieces[slot];
    const bonuses = scale(base, m);
    if (weight === "heavy") bonuses.agility = HEAVY_AGILITY;
    return { kind: "armor", name: `${w.names[act]} ${piece}`, slot, weight, quality, bonuses, affixes };
  }
  const t = OTHER[slot];
  const bonuses = scale(t.bonuses, m);
  if (t.anyStat) bonuses[opts.stat ?? pick(STATS)] = Math.round(t.anyStat * m);
  return { kind: "armor", name: t.names[act], slot, quality, bonuses, affixes };
}

// --- potions and spell scrolls ---

export interface Potion {
  kind: "potion";
  name: string;
  health: number;
  mana: number;
}

export function makePotion(act: number, mana = false): Potion {
  return mana ? { kind: "potion", name: "Mana Potion", health: 0, mana: 40 } : { kind: "potion", name: ["Small", "Medium", "Large"][act] + " Health Potion", health: [40, 60, 80][act], mana: 0 };
}

// A reward that teaches a spell, or raises a known one by a rank.
export interface Scroll {
  kind: "spell";
  name: string;
  spell: Spell;
  rank: number; // the rank you get
}

export const makeScroll = (spell: Spell, rank = 1): Scroll => ({ kind: "spell", name: spell.name, spell, rank });
export const randomSpell = () => pick(SPELLS);

export type Item = Weapon | Armor | Potion | Scroll;

// Chance (%) of Common / Uncommon / Rare / Epic per act; boss rewards are Rare or better.
const QUALITY_ODDS = [[60, 30, 9, 1], [40, 35, 20, 5], [25, 35, 28, 12]];
export function rollQuality(act: number, boss = false): Quality {
  const odds = boss ? [0, 0, 70, 30] : QUALITY_ODDS[act];
  let r = Math.random() * 100;
  for (let i = 0; i < QUALITIES.length; i++) if ((r -= odds[i]) < 0) return QUALITIES[i];
  return "Common";
}

// --- text ---

export const grade = (g: number) => (g >= 0.1 ? "S" : g >= 0.08 ? "A" : "B");

const BONUS_LABEL: Record<BonusKey, string> = { ...STAT_LABEL, maxHealth: "HP", maxMana: "MP", armor: "Armor", ward: "Ward", dodge: "% dodge", spellPower: "% spell power" };
export function bonusText(b: Bonuses) {
  return Object.entries(b)
    .map(([k, v]) => `${v > 0 ? "+" : ""}${v}${k === "dodge" || k === "spellPower" ? "" : " "}${BONUS_LABEL[k as BonusKey]}`)
    .join(", ");
}

// One-line description with Rich-style color markup for quality.
export function describe(item: Item): string {
  if (item.kind === "potion") return `${item.name} (${[item.health && `+${item.health} HP`, item.mana && `+${item.mana} MP`].filter(Boolean).join(", ")})`;
  if (item.kind === "spell") return `${item.rank > 1 ? "Upgrade" : "Learn"} [cyan]${item.spell.name} ${RANK_NAME[item.rank - 1]}[/] · ${describeSpell(item.spell, item.rank)}`;
  const name = `[${QUALITY_COLOR[item.quality]}]${item.name}[/]`;
  if (item.kind === "armor") {
    const affixes = item.affixes.map((a) => AFFIXES[a].split(":")[0]).join(", ");
    return `${name} · ${item.quality} ${item.weight ? item.weight + " " : ""}${item.slot} · ${bonusText(item.bonuses)}${affixes ? ` · ${affixes}` : ""}`;
  }
  const f = item.family;
  return `${name} · ${item.quality} ${f.hands}H · ${STAT_LABEL[f.stat]} ${grade(f.grade)} · ${item.min}–${item.max} dmg · ${f.traitText}`;
}
