import { Equipment, EquipmentType, WeaponSubType } from "./equipment";
import type { Consumable } from "./consumable";
import type { Spell } from "./spell";
import { io, randint } from "./io";

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

  useSpell(spell: Spell, targets: Target[]) {
    if (spell.manaCost > this.mana) return io.print("Not enough mana!");
    this.mana -= spell.manaCost; // once per cast, however many targets
    for (const target of targets) {
      if (spell.damage > 0) {
        target.health = Math.max(0, target.health - spell.damage);
        io.print(`You cast ${spell.name} on the ${target.name} for ${spell.damage} damage!`);
      } else {
        const healing = -spell.damage;
        target.health = Math.min(target.health + healing, target.maxHealth);
        io.print(`You cast ${spell.name} on the ${target.name} for ${healing} health!`);
      }
    }
  }

  flee() {
    return Math.random() < 0.5;
  }

  calculateTotalStats() {
    const t = { strength: this.strength, speed: this.speed, intelligence: this.intelligence, perception: this.perception, health: this.health, mana: this.mana };
    // Set: a bow sits in both hand slots but counts once
    for (const e of new Set(Object.values(this.equipped))) {
      if (e === null) continue;
      t.strength += e.strengthBonus;
      t.speed += e.speedBonus;
      t.intelligence += e.intelligenceBonus;
      t.perception += e.perceptionBonus;
      t.health += e.healthBonus;
      t.mana += e.manaBonus;
    }
    return t;
  }

  getStat(statName: string): number {
    const v = (this as unknown as Record<string, unknown>)[statName.toLowerCase()];
    if (typeof v !== "number") throw new Error(`Invalid stat name: ${statName}`);
    return v;
  }
}