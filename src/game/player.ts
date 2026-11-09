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
  xpToNextLevel = 20; // experience counts toward the next level and resets on level-up
  defending = false; // this round only
  poisoned = { damage: 0, turns: 0, source: "" };
  lastHitBy = "";

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
      return io.print(`You put ${item.name} in your pouch.`);
    }
    this.maxHealth += item.healthBonus;
    this.health += item.healthBonus;
    this.maxMana += item.manaBonus;
    this.mana += item.manaBonus;
    io.print(`You equipped ${item.name}.`);
  }

  // Perception: crit chance. Speed: dodge chance. Intelligence: spell damage.
  critChance() {
    return Math.min(0.5, Math.max(0, 0.05 + 0.01 * (this.calculateTotalStats().perception - 10)));
  }
  dodgeChance() {
    return Math.min(0.3, Math.max(0, 0.05 + 0.01 * (this.calculateTotalStats().speed - 10)));
  }
  spellPower() {
    return Math.max(0.5, 1 + 0.05 * (this.calculateTotalStats().intelligence - 10));
  }

  private strike(target: Target, base: number, verb: string) {
    const crit = Math.random() < this.critChance();
    const damage = crit ? Math.round(base * 1.5) : base;
    target.health = Math.max(0, target.health - damage);
    io.print(`${crit ? "[bold yellow]Critical![/] " : ""}You ${verb} the ${target.name} for ${damage} damage!`);
  }

  attack(enemy: Target) {
    this.strike(enemy, this.calculateTotalStats().strength + randint(1, 6), "hit");
  }

  takeDamage(amount: number, source: string) {
    if (Math.random() < this.dodgeChance()) return io.print(`You dodge the ${source}'s attack!`);
    const damage = this.defending ? Math.ceil(amount / 2) : amount;
    this.health = Math.max(0, this.health - damage);
    this.lastHitBy = source;
    io.print(`The ${source} hits you for ${damage} damage${this.defending ? " (half blocked)" : ""}!`);
  }

  // Poison stacks its turns and keeps the stronger damage. Dodge avoids it; Defend does not.
  poison(damage: number, turns: number, source: string) {
    if (Math.random() < this.dodgeChance()) return io.print(`You dodge the ${source}'s attack!`);
    this.poisoned = { damage: Math.max(damage, this.poisoned.damage), turns: this.poisoned.turns + turns, source };
    io.print(`The ${source} poisons you: ${damage} damage per turn for ${turns} turns.`);
  }

  tickPoison() {
    if (this.poisoned.turns <= 0) return;
    this.health = Math.max(0, this.health - this.poisoned.damage);
    this.poisoned.turns--;
    this.lastHitBy = `${this.poisoned.source}'s poison`;
    io.print(`[green]Poison[/] deals ${this.poisoned.damage} damage.`);
  }

  useSpell(spell: Spell, targets: Target[]) {
    if (spell.manaCost > this.mana) return io.print("Not enough mana!");
    this.mana -= spell.manaCost; // once per cast, however many targets
    for (const target of targets) {
      if (spell.damage > 0) {
        this.strike(target, Math.round(spell.damage * this.spellPower()), `cast ${spell.name} on`);
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

  // Health and mana bonuses raise maxHealth/maxMana when equipped (see equip), so they are not here.
  calculateTotalStats() {
    const t = { strength: this.strength, speed: this.speed, intelligence: this.intelligence, perception: this.perception };
    // Set: a bow sits in both hand slots but counts once
    for (const e of new Set(Object.values(this.equipped))) {
      if (e === null) continue;
      t.strength += e.strengthBonus;
      t.speed += e.speedBonus;
      t.intelligence += e.intelligenceBonus;
      t.perception += e.perceptionBonus;
    }
    return t;
  }
}