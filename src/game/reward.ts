import { ArmorSubType, Equipment, EquipmentType, WeaponSubType } from "./equipment";
import { Consumable } from "./consumable";
import { io } from "./io";
import type { Player } from "./player";

// audit #5: Python used ArmorSubType.OFF_HAND, which does not exist -> AttributeError on floor 2.
const missingOffHand = (): never => {
  throw new Error("AttributeError: OFF_HAND");
};

export function getRewardForFloor(floor: number): Equipment[] | undefined {
  if (floor === 1) {
    return [
      new Equipment({ name: "Sharp Dagger", equipmentType: EquipmentType.WEAPON, subType: WeaponSubType.SWORD, tier: 1, value: 15, strengthBonus: 4 }),
      // audit #11: positional args shifted, ported as-is
      new Consumable({ name: "Small Health Potion", equipmentType: EquipmentType.CONSUMABLE, tier: null, value: 1, strengthBonus: 20, healthRecovery: 30 }),
    ];
  } else if (floor === 2) {
    return [
      new Equipment({ name: "Sturdy Shield", equipmentType: EquipmentType.ARMOR, subType: missingOffHand(), tier: 1, value: 20, healthBonus: 10 }),
      new Consumable({ name: "Small Mana Potion", equipmentType: EquipmentType.CONSUMABLE, tier: null, value: 1, strengthBonus: 25, manaRecovery: 20 }),
    ];
  } else if (floor === 3) {
    return [
      new Equipment({ name: "Iron Helmet", equipmentType: EquipmentType.ARMOR, subType: ArmorSubType.HEAD, tier: 2, value: 30, healthBonus: 15 }),
      new Equipment({ name: "Enchanted Ring", equipmentType: EquipmentType.ARMOR, subType: ArmorSubType.RING, tier: 2, value: 35, manaBonus: 12 }),
    ];
  } else if (floor === 4) {
    return [
      new Equipment({ name: "Steel Breastplate", equipmentType: EquipmentType.ARMOR, subType: ArmorSubType.CHEST, tier: 2, value: 40, strengthBonus: 6, healthBonus: 20 }),
      new Consumable({ name: "Medium Health Potion", equipmentType: EquipmentType.CONSUMABLE, tier: null, value: 2, strengthBonus: 35, healthRecovery: 50 }),
    ];
  }
}

export async function chooseReward(player: Player, floor: number) {
  const availableRewards = getRewardForFloor(floor);
  if (!availableRewards) return io.print("There are no rewards available on this floor.");

  io.print("[panel bold blue]Choose your reward:[/]");
  const choice = await io.ask("Enter your choice", availableRewards.map((r, i) => `${i + 1}. ${r}`));
  const chosen = availableRewards[choice];
  if (chosen.equipmentType === EquipmentType.CONSUMABLE) player.consumables.push(chosen as Consumable); // audit #14
  else player.equip(chosen);
}
