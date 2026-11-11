// 6 elements × 3 spells. Each element has one signature effect (see `effect`).
export type Element = "Fire" | "Water" | "Earth" | "Lightning" | "Light" | "Shadow";
export const OPPOSITE: Record<Element, Element> = { Fire: "Water", Water: "Fire", Earth: "Lightning", Lightning: "Earth", Light: "Shadow", Shadow: "Light" };
export type Shape ="single" | "all" | "power";

export interface Spell {
  name: string;
  element: Element;
  shape: Shape; // single target, all enemies, or a powerful single target
  cost: number;
  damage: number;
  // Fire: burn per turn (3 turns). Water: chill turns. Earth: stun chance. Lightning: chain share (power only).
  // Light: share of damage healed. Shadow: curse turns.
  effect: number;
}

export interface KnownSpell {
  spell: Spell;
  rank: number; // 1-4
}

export const RANK_MULT = [1, 1.15, 1.3, 1.5]; // damage and effect strength, by rank I-IV
export const RANK_NAME = ["I", "II", "III", "IV"];
export const SPELLBOOK_SIZE = 4;
export const BURN_TURNS = 3;
export const CHILL = 0.7; // chilled enemies deal 70% damage
export const CURSE = 1.25; // cursed enemies take 125% damage
export const OVERCHARGE = 0.25; // lightning: extra crit chance

const s = (name: string, element: Element, shape: Shape, cost: number, damage: number, effect: number): Spell => ({ name, element, shape, cost, damage, effect });

export const SPELLS: Spell[] = [
  s("Fireball", "Fire", "single", 10, 13, 4),
  s("Flame Wall", "Fire", "all", 16, 7, 2),
  s("Inferno", "Fire", "power", 28, 31, 8),
  s("Water Whip", "Water", "single", 10, 14, 2),
  s("Tidal Wave", "Water", "all", 16, 8, 1),
  s("Glacial Spike", "Water", "power", 28, 32, 3),
  s("Rock Throw", "Earth", "single", 10, 14, 0.25),
  s("Earthquake", "Earth", "all", 16, 8, 0.15),
  s("Landslide", "Earth", "power", 28, 34, 1),
  s("Lightning Bolt", "Lightning", "single", 10, 14, 0),
  s("Thunderstorm", "Lightning", "all", 16, 9, 0),
  s("Chain Lightning", "Lightning", "power", 28, 29, 0.5),
  s("Ray of Light", "Light", "single", 10, 13, 0.3),
  s("Purifying Light", "Light", "all", 16, 7, 0.3),
  s("Judgment", "Light", "power", 28, 31, 0.3),
  s("Shadow Bolt", "Shadow", "single", 10, 13, 2),
  s("Shadow Cloud", "Shadow", "all", 16, 7, 2),
  s("Soul Rend", "Shadow", "power", 28, 31, 3),
];

export const spellName = (k: KnownSpell) => `${k.spell.name} ${RANK_NAME[k.rank - 1]}`;

export function effectText(sp: Spell, rank = 1): string {
  const m = RANK_MULT[rank - 1];
  switch (sp.element) {
    case "Fire": return `Burn ${Math.round(sp.effect * m)}/turn`;
    case "Water": return `Chill ${sp.effect} turn${sp.effect > 1 ? "s" : ""}`;
    case "Earth": return sp.effect >= 1 ? "Stuns" : `${Math.round(Math.min(1, sp.effect * m) * 100)}% stun`;
    case "Lightning": return `+${OVERCHARGE * 100}% crit${sp.effect ? `, chains ${sp.effect * 100}%` : ""}`;
    case "Light": return `heals ${sp.effect * 100}% of damage`;
    case "Shadow": return `Curse ${sp.effect} turns`;
  }
}

export function describeSpell(sp: Spell, rank = 1) {
  const target = sp.shape === "all" ? "all enemies" : sp.shape === "power" ? "powerful" : "single";
  return `${sp.element} · ${target} · ${sp.cost} MP · ${Math.round(sp.damage * RANK_MULT[rank - 1])} dmg, ${effectText(sp, rank)}`;
}
