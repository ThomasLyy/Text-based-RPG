import { Equipment, EquipmentType, WeaponSubType } from "./equipment";
import type { Consumable } from "./consumable";
import type { Spell } from "./spell";
import { io, randint } from "./io";

type Slot = "mainHand" | "offHand" | "head" | "chest" | "waist" | "legs" | "feet" | "neck" | "ringLeft" | "ringRight";
interface Target { name: string; health: number; maxHealth: number }
// armor types whose slot name differs from the type name; others use the lowercase type ("head", "chest"...)
const ARMOR_SLOTS: Record<string, string[]> = { ring: ["ringLeft", "ringRight"], shield: ["offHand"] };

export class Player {
  name = "";
  level = 1;
  experience = 0;
  health = 100;
  maxHealth = 100;
  strength = 10;
  speed = 10;
  intelligence = 10;
  perception = 10;
  mana = 100;
  maxMana = 100;
  xpToNextLevel = 100;

  // Equipment slots (audit #7: never written, equip() uses `equipped` instead)
  mainHand: Equipment | null = null;
  offHand: Equipment | null = null;
  head: Equipment | null = null;
  chest: Equipment | null = null;
  waist: Equipment | null = null;
  legs: Equipment | null = null;
  feet: Equipment | null = null;
  neck: Equipment | null = null;
  ringLeft: Equipment | null = null;
  ringRight: Equipment | null = null;

  inventory: Equipment[] = [];
  equipped: Record<string, Equipment | null> = {
    mainHand: null, offHand: null, head: null, chest: null, waist: null,
    legs: null, feet: null, neck: null, ringLeft: null, ringRight: null,
  };
  consumables: Consumable[] = [];

  constructor(f: Partial<Pick<Player, "name">> = {}) {
    Object.assign(this, f);
  }

  equip(item: Equipment) {
    if (item.equipmentType === EquipmentType.WEAPON) {
      if (item.subType === WeaponSubType.SWORD || item.subType === WeaponSubType.AXE || item.subType === WeaponSubType.MACE) {
        if (this.equipped.mainHand === null) this.equipped.mainHand = item;
        else if (this.equipped.offHand === null) this.equipped.offHand = item;
        else return io.print("Both hand slots are full. Please unequip an item first.");
      } else if (item.subType === WeaponSubType.BOW) {
        if (this.equipped.mainHand === null && this.equipped.offHand === null) {
          this.equipped.mainHand = item;
          this.equipped.offHand = item;
        } else return io.print("Both hand slots are full. Please unequip an item first.");
      }
    } else if (item.equipmentType === EquipmentType.ARMOR) {
      const type = item.subType!.toLowerCase();
      const slot = (ARMOR_SLOTS[type] ?? [type]).find((s) => this.equipped[s] === null);
      if (slot) this.equipped[slot] = item;
      else return io.print(`${item.subType} slot is full. Please unequip an item first.`);
    } else if (item.equipmentType === EquipmentType.CONSUMABLE) {
      if (this.consumables.length < 5) this.consumables.push(item as Consumable);
      else return io.print("Your consumables pouch is full. Please discard a consumable first.");
    }
    io.print(`You equipped ${item.name}.`);
  }

  attack(enemy: Target) {
    const damage = this.calculateTotalStats().strength + randint(1, 6);
    enemy.health = Math.max(0, enemy.health - damage);
    io.print(`You hit the ${enemy.name} for ${damage} damage!`);
  }

  useSpell(spell: Spell, target: Target) {
    if (spell.manaCost > this.mana) return io.print("Not enough mana!");
    this.mana -= spell.manaCost;
    if (spell.damage > 0) {
      target.health = Math.max(0, target.health - spell.damage);
      io.print(`You cast ${spell.name} on the ${target.name} for ${spell.damage} damage!`);
    } else {
      const healing = -spell.damage;
      target.health = Math.min(target.health + healing, target.maxHealth);
      io.print(`You cast ${spell.name} on the ${target.name} for ${healing} health!`);
    }
  }

  flee(): boolean | void {
    // Flee logic (to be developed) — audit #12
  }

  useConsumable(item: Consumable) {
    const i = this.consumables.indexOf(item);
    if (i === -1) return io.print("You don't have that consumable.");
    item.use(this);
    this.consumables.splice(i, 1);
  }

  calculateTotalStats() {
    const t = { strength: this.strength, speed: this.speed, intelligence: this.intelligence, perception: this.perception, health: this.health, mana: this.mana };
    const slots: Slot[] = ["mainHand", "offHand", "head", "chest", "waist", "legs", "feet", "neck", "ringLeft", "ringRight"];
    for (const s of slots) {
      const e = this[s];
      if (e !== null) {
        t.strength += e.strengthBonus;
        t.speed += e.speedBonus;
        t.intelligence += e.intelligenceBonus;
        t.perception += e.perceptionBonus;
        t.health += e.healthBonus;
        t.mana += e.manaBonus;
      }
    }
    return t;
  }

  displayStats() {
    const t = this.calculateTotalStats();
    io.print("\nPlayer Stats:");
    io.print(`  Health: ${this.health}/${this.maxHealth} (${t.health})`);
    io.print(`  Strength: ${this.strength} (${t.strength})`);
    io.print(`  Speed: ${this.speed} (${t.speed})`);
    io.print(`  Intelligence: ${this.intelligence} (${t.intelligence})`);
    io.print(`  Perception: ${this.perception} (${t.perception})`);
    io.print(`  Mana: ${this.mana}/${this.maxMana} (${t.mana})`);
  }

  getStat(statName: string): number {
    const v = (this as unknown as Record<string, unknown>)[statName.toLowerCase()];
    if (typeof v !== "number") throw new Error(`Invalid stat name: ${statName}`);
    return v;
  }
}

// audit #9: combat calls this, it was never written. Declared so it compiles, missing at runtime.
export interface Player {
  level_up(): void;
}
