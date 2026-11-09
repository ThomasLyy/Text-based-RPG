import { Equipment, EquipmentType } from "./equipment";
import { io } from "./io";
import type { Player } from "./player";

type ConsumableFields = ConstructorParameters<typeof Equipment>[0] & { healthRecovery?: number; manaRecovery?: number };

export class Consumable extends Equipment {
  healthRecovery = 0;
  manaRecovery = 0;

  constructor(f: ConsumableFields) {
    super(f);
    Object.assign(this, f); // subclass field defaults run after super(), so assign again
  }

  use(player: Player) {
    player.health = Math.min(player.maxHealth, player.health + this.healthRecovery);
    player.mana = Math.min(player.maxMana, player.mana + this.manaRecovery);
    io.print(`You used ${this.name} and recovered ${this.healthRecovery} health and ${this.manaRecovery} mana.`);
  }
}

// audit #11: ported as-is, the Python positional args land in tier=None, value, strengthBonus
export const healthPotionMinor = new Consumable({ name: "Minor Health Potion", equipmentType: EquipmentType.CONSUMABLE, tier: null, value: 1, strengthBonus: 10, healthRecovery: 20 });
export const manaPotionMinor = new Consumable({ name: "Minor Mana Potion", equipmentType: EquipmentType.CONSUMABLE, tier: null, value: 1, strengthBonus: 12, manaRecovery: 15 });

export const consumables = [healthPotionMinor, manaPotionMinor];
