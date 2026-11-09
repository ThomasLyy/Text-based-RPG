import { BODY_SLOTS, FISTS, STATS, type AffixId, type Armor, type BonusKey, type Item, type Potion, type Stat, type Weapon, type Weight } from "./items";
import { BURN_TURNS, CURSE, OVERCHARGE, RANK_MULT, spellName, type KnownSpell } from "./spell";
import type { Enemy } from "./enemy";
import { io, randint } from "./io";

export const DEFEND_TAKEN = 0.25; // Defend blocks 75% of each hit this round
export const PARRY_TAKEN = 0.1; // 90% with a sword in hand
export const DEFEND_MANA = 10; // and Defend gives this much extra mana
export const MANA_REGEN = 5; // per round
export const OFFHAND_POWER = 0.6; // dual-wielding: the off-hand weapon hits at 60%
export const POUCH_SIZE = 5;
export const MAX_REDUCTION = 50; // Armor and Ward cap, in %
export const MAX_DODGE = 0.3;

// 4 body pieces of one weight
export const SET_BONUS: Record<Weight, { name: string; text: string; bonuses: Partial<Record<BonusKey, number>> }> = {
  heavy: { name: "Bulwark", text: "+10 Armor", bonuses: { armor: 10 } },
  medium: { name: "Ambush", text: "act first on the first turn, +5% dodge", bonuses: { dodge: 5 } },
  light: { name: "Arcane flow", text: "+3 mana per turn, +10% spell power", bonuses: { spellPower: 10 } },
};

type ArmorKey = "head" | "chest" | "legs" | "feet" | "amulet" | "ring1" | "ring2";

const UNARMED: Weapon = { kind: "weapon", name: "Fists", family: FISTS, quality: "Common", min: FISTS.min, max: FISTS.max };
const isWeapon = (i: Item | null | undefined): i is Weapon => i?.kind === "weapon";

export class Player {
  name = "";
  level = 1;
  experience = 0;
  xpToNextLevel = 20; // experience counts toward the next level and resets on level-up
  base: Record<Stat, number> = { strength: 10, agility: 10, intelligence: 10, perception: 10 };
  baseMaxHealth = 100;
  baseMaxMana = 100;
  health = 100;
  mana = 100;
  defending = false; // this round only
  poisoned = { damage: 0, turns: 0, source: "" };
  lastHitBy = "";

  mainHand: Weapon | null = null;
  offHand: Weapon | Armor | null = null; // second 1H weapon, shield (with a STR 1H weapon) or focus (with a wand)
  armor: Partial<Record<ArmorKey, Armor>> = {};
  potions: Potion[] = [];
  spells: KnownSpell[] = [];

  constructor(f: Partial<Pick<Player, "name">> = {}) {
    Object.assign(this, f);
  }

  // --- derived stats ---

  private gear(): Armor[] {
    return [...Object.values(this.armor), ...(this.offHand?.kind === "armor" ? [this.offHand] : [])];
  }
  affixes(id: AffixId) {
    return this.gear().reduce((n, a) => n + a.affixes.filter((x) => x === id).length, 0);
  }
  setWeight(): Weight | null {
    const w = this.armor.head?.weight;
    return w && BODY_SLOTS.every((s) => this.armor[s]?.weight === w) ? w : null;
  }
  bonus(key: BonusKey) {
    const set = this.setWeight();
    return (
      this.gear().reduce((sum, a) => sum + (a.bonuses[key] ?? 0), 0) +
      (set ? SET_BONUS[set].bonuses[key] ?? 0 : 0) +
      (key === "armor" || key === "ward" ? 3 * this.affixes("warding") : 0) +
      (key === "dodge" ? 3 * this.affixes("evasion") : 0) +
      (key === "spellPower" ? 10 * this.affixes("sorcery") : 0)
    );
  }
  stat(s: Stat) {
    return this.base[s] + this.bonus(s);
  }
  stats(): Record<Stat, number> {
    return Object.fromEntries(STATS.map((s) => [s, this.stat(s)])) as Record<Stat, number>;
  }
  get maxHealth() {
    const raw = this.baseMaxHealth + this.bonus("maxHealth") + Math.max(0, this.stat("strength") - 10); // strength makes you sturdier
    return Math.round(raw * (1 + 0.1 * this.affixes("vitality")));
  }
  get maxMana() {
    return this.baseMaxMana + this.bonus("maxMana");
  }
  armorPct() {
    return Math.min(MAX_REDUCTION, this.bonus("armor"));
  }
  wardPct() {
    return Math.min(MAX_REDUCTION, this.bonus("ward"));
  }
  manaRegen() {
    return MANA_REGEN + 2 * this.affixes("clarity") + (this.setWeight() === "light" ? 3 : 0);
  }
  // weapons that swing on Attack, with their power
  weapons(): [Weapon, number][] {
    return [[this.mainHand ?? UNARMED, 1], ...(isWeapon(this.offHand) ? [[this.offHand, OFFHAND_POWER] as [Weapon, number]] : [])];
  }
  private hasTrait(t: string) {
    return this.weapons().some(([w]) => w.family.trait === t);
  }

  // Each stat scales its weapons, plus one role: Strength max HP, Agility dodge, Intelligence spells, Perception crits.
  critChance() {
    return Math.min(0.6, Math.max(0, 0.05 + 0.01 * (this.stat("perception") - 10) + (this.hasTrait("keen") ? 0.1 : 0) + 0.05 * this.affixes("precision")));
  }
  critMultiplier() {
    return 1.5 + Math.max(0, 0.02 * (this.stat("perception") - 10));
  }
  dodgeChance() {
    return Math.min(MAX_DODGE, Math.max(0, 0.05 + 0.01 * (this.stat("agility") - 10) + this.bonus("dodge") / 100));
  }
  // same shape as weapons: Intelligence is the spells' grade B stat
  spellPower() {
    return Math.max(0.5, 1 + 0.06 * (this.stat("intelligence") - 10)) * (this.hasTrait("channel") ? 1.2 : 1) * (1 + this.bonus("spellPower") / 100);
  }
  spellCost(k: KnownSpell) {
    return Math.round(k.spell.cost * (this.hasTrait("arcane") ? 0.8 : 1));
  }

  // --- equipment. Each equip returns what it took off, so callers can report it. ---

  canHoldShield() {
    return this.mainHand?.family.hands === 1 && this.mainHand.family.stat === "strength";
  }
  canHoldFocus() {
    return this.mainHand?.family.trait === "arcane";
  }

  equipWeapon(w: Weapon, hand: "main" | "off" = "main"): Item[] {
    const removed: (Item | null)[] = [];
    if (w.family.hands === 2) {
      removed.push(this.mainHand, this.offHand);
      this.mainHand = w;
      this.offHand = null;
    } else if (hand === "off" && this.mainHand?.family.hands === 1) {
      removed.push(this.offHand);
      this.offHand = w;
    } else {
      removed.push(this.mainHand);
      this.mainHand = w;
    }
    // a shield or focus may no longer fit the new main weapon
    const off = this.offHand;
    if (off?.kind === "armor" && ((off.slot === "shield" && !this.canHoldShield()) || (off.slot === "focus" && !this.canHoldFocus()))) {
      removed.push(off);
      this.offHand = null;
    }
    return this.settle(removed);
  }

  equipArmor(a: Armor): Item[] {
    const removed: (Item | null)[] = [];
    if (a.slot === "shield" || a.slot === "focus") {
      removed.push(this.offHand);
      this.offHand = a;
    } else {
      const key: ArmorKey = a.slot !== "ring" ? a.slot : !this.armor.ring1 ? "ring1" : !this.armor.ring2 ? "ring2" : "ring1";
      removed.push(this.armor[key] ?? null);
      this.armor[key] = a;
    }
    return this.settle(removed);
  }

  armorIn(slot: Armor["slot"]): Armor | undefined {
    if (slot === "shield" || slot === "focus") return this.offHand?.kind === "armor" ? this.offHand : undefined;
    return slot === "ring" ? (this.armor.ring1 && this.armor.ring2 ? this.armor.ring1 : undefined) : this.armor[slot];
  }

  private settle(removed: (Item | null)[]): Item[] {
    this.health = Math.min(this.health, this.maxHealth);
    this.mana = Math.min(this.mana, this.maxMana);
    return [...new Set(removed.filter((i): i is Item => i !== null))];
  }

  addPotion(p: Potion) {
    if (this.potions.length >= POUCH_SIZE) return false;
    this.potions.push(p);
    return true;
  }

  drink(p: Potion) {
    this.health = Math.min(this.maxHealth, this.health + p.health);
    this.mana = Math.min(this.maxMana, this.mana + p.mana);
    io.print(`You drink the ${p.name}.`);
  }

  knows(name: string) {
    return this.spells.find((k) => k.spell.name === name);
  }

  // --- combat ---

  private heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + Math.round(amount));
  }

  // Applies crit and curse, then Vampirism.
  private strike(target: Enemy, base: number, extraCrit = 0) {
    const crit = Math.random() < this.critChance() + extraCrit;
    const damage = Math.max(1, Math.round(base * (crit ? this.critMultiplier() : 1) * (target.cursed > 0 ? CURSE : 1)));
    target.health = Math.max(0, target.health - damage);
    if (this.affixes("vampirism")) this.heal(damage * 0.05 * this.affixes("vampirism"));
    return { damage, crit };
  }

  // damage = roll(weapon) × (1 + grade × (stat − 10)) × hand power, then traits
  private weaponHit(w: Weapon, target: Enemy, power: number, enemies: Enemy[]) {
    const scale = Math.max(0.5, 1 + w.family.grade * (this.stat(w.family.stat) - 10));
    const crush = w.family.trait === "crush" && target.boss ? 1.3 : 1;
    const fury = 1 + 0.1 * this.affixes("fury");
    const { damage, crit } = this.strike(target, randint(w.min, w.max) * scale * power * crush * fury);
    io.print(`${crit ? "[bold yellow]Critical![/] " : ""}You hit the ${target.name} for ${damage} damage!`);
    if (w.family.trait === "cleave") {
      const other = enemies.find((e) => e !== target && e.health > 0);
      if (other) {
        const splash = Math.max(1, Math.round(damage * 0.3));
        other.health = Math.max(0, other.health - splash);
        io.print(`Your cleave hits the ${other.name} for ${splash}.`);
      }
    }
    if (w.family.trait === "stagger" && target.health > 0 && Math.random() < 0.2) {
      target.stunned = true;
      io.print(`[yellow]The ${target.name} is staggered![/]`);
    }
  }

  attack(target: Enemy, enemies: Enemy[]) {
    for (const [w, power] of this.weapons()) {
      for (const hit of w.family.trait === "twin" ? [0.6, 0.6] : [1]) {
        const t = target.health > 0 ? target : enemies.find((e) => e.health > 0);
        if (!t) return;
        this.weaponHit(w, t, power * hit, enemies);
      }
    }
  }

  // Each element's signature effect, applied to every target hit.
  cast(k: KnownSpell, targets: Enemy[], enemies: Enemy[]) {
    const cost = this.spellCost(k);
    if (cost > this.mana) return io.print("Not enough mana!");
    this.mana -= cost; // once per cast, however many targets
    const sp = k.spell;
    const m = RANK_MULT[k.rank - 1];
    for (const target of targets) {
      const { damage, crit } = this.strike(target, sp.damage * m * this.spellPower(), sp.element === "Lightning" ? OVERCHARGE : 0);
      io.print(`${crit ? "[bold yellow]Critical![/] " : ""}Your ${spellName(k)} hits the ${target.name} for ${damage}!`);
      if (sp.element === "Fire" && target.health > 0) {
        target.burn = { damage: target.burn.damage + Math.round(sp.effect * m), turns: BURN_TURNS };
      } else if (sp.element === "Water") target.chilled = Math.max(target.chilled, sp.effect);
      else if (sp.element === "Earth" && target.health > 0 && Math.random() < Math.min(1, sp.effect * m)) {
        target.stunned = true;
        io.print(`[yellow]The ${target.name} is stunned![/]`);
      } else if (sp.element === "Lightning" && sp.effect) {
        for (const other of enemies.filter((e) => e !== target && e.health > 0)) {
          const chain = Math.max(1, Math.round(damage * sp.effect));
          other.health = Math.max(0, other.health - chain);
          io.print(`The lightning chains to the ${other.name} for ${chain}.`);
        }
      } else if (sp.element === "Light") this.heal(damage * sp.effect);
      else if (sp.element === "Shadow") target.cursed = Math.max(target.cursed, sp.effect);
    }
  }

  // Dodge, then Armor (physical) or Ward (magic), then Defend. Thorns reflect part of what lands.
  takeDamage(amount: number, source: Enemy, magic: boolean) {
    if (Math.random() < this.dodgeChance()) return io.print(`You dodge the ${source.name}'s attack!`);
    const reduced = amount * (1 - (magic ? this.wardPct() : this.armorPct()) / 100);
    const taken = this.hasTrait("parry") ? PARRY_TAKEN : DEFEND_TAKEN;
    const damage = Math.max(1, Math.ceil(this.defending ? reduced * taken : reduced));
    this.health = Math.max(0, this.health - damage);
    this.lastHitBy = source.name;
    io.print(`The ${source.name} hits you for ${damage} damage${this.defending ? " (blocked)" : ""}!`);
    const thorns = this.affixes("thorns");
    if (thorns && source.health > 0) {
      const back = Math.max(1, Math.round(damage * 0.2 * thorns));
      source.health = Math.max(0, source.health - back);
      io.print(`Thorns hit the ${source.name} for ${back}.`);
    }
  }

  // Poison stacks its turns and keeps the stronger damage. Dodge avoids it; Armor, Ward and Defend do not.
  poison(damage: number, turns: number, source: string) {
    if (Math.random() < this.dodgeChance()) return io.print(`You dodge the ${source}'s attack!`);
    this.poisoned = { damage: Math.max(damage, this.poisoned.damage), turns: this.poisoned.turns + turns, source };
    io.print(`The ${source} poisons you: ${damage} damage per turn for ${turns} turns.`);
  }

  // poison, Regeneration, mana regen
  endOfRound() {
    if (this.poisoned.turns > 0) {
      this.health = Math.max(0, this.health - this.poisoned.damage);
      this.poisoned.turns--;
      this.lastHitBy = `${this.poisoned.source}'s poison`;
      io.print(`[green]Poison[/] deals ${this.poisoned.damage} damage.`);
    }
    if (this.health > 0) this.heal(2 * this.affixes("regeneration"));
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen());
  }
}
