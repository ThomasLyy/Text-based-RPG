
export enum EquipmentType {
  WEAPON = "Weapon",
  ARMOR = "Armor",
  CONSUMABLE = "Consumable",
}

export enum WeaponSubType {
  SWORD = "Sword",
  AXE = "Axe",
  MACE = "Mace",
  BOW = "Bow",
}

export enum ArmorSubType {
  HEAD = "Head",
  CHEST = "Chest",
  WAIST = "Waist",
  LEGS = "Legs",
  FEET = "Feet",
  NECK = "Neck",
  RING = "Ring",
  SHIELD = "Shield",
}

type Fields<T> = { [K in keyof T as T[K] extends Function ? never : K]?: T[K] };

export class Equipment {
  name!: string;
  equipmentType!: EquipmentType;
  tier!: number; // 1 to 5
  value!: number;
  strengthBonus = 0;
  speedBonus = 0;
  intelligenceBonus = 0;
  perceptionBonus = 0;
  healthBonus = 0;
  manaBonus = 0;
  subType: WeaponSubType | ArmorSubType | null = null;
  element: string | null = null;

  constructor(f: Fields<Equipment> & Pick<Equipment, "name" | "equipmentType" | "tier" | "value">) {
    Object.assign(this, f);
  }

  toString() {
    return `Tier ${this.tier} ${this.name} (${this.equipmentType}${this.subType ? `, ${this.subType}` : ""}${this.element ? `, ${this.element}` : ""})`;
  }
}

export const rustySword = new Equipment({ name: "Rusty Sword", equipmentType: EquipmentType.WEAPON, subType: WeaponSubType.SWORD, tier: 1, value: 5, strengthBonus: 2 });
export const leatherCap = new Equipment({ name: "Leather Cap", equipmentType: EquipmentType.ARMOR, subType: ArmorSubType.HEAD, tier: 1, value: 8, healthBonus: 5 });
export const flamingSword = new Equipment({ name: "Flaming Sword", equipmentType: EquipmentType.WEAPON, subType: WeaponSubType.SWORD, tier: 5, value: 50, strengthBonus: 15, element: "Fire" });

export const weapons = [rustySword, flamingSword];
export const armors = [leatherCap];
