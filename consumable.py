from dataclasses import dataclass
from equipment import Equipment, EquipmentType

# ... (other imports and previous code)

@dataclass
class Consumable(Equipment):
    healthRecovery: int = 0
    manaRecovery: int = 0

    def use(self, player):
        player.health = min(player.maxHealth, player.health + self.healthRecovery)
        player.mana = min(player.maxMana, player.mana + self.manaRecovery)
        print(f"You used {self.name} and recovered {self.healthRecovery} health and {self.manaRecovery} mana.")


healthPotionMinor = Consumable("Minor Health Potion", EquipmentType.CONSUMABLE, None, 1, 10, healthRecovery=20)  # Utiliser healthRecovery
manaPotionMinor = Consumable("Minor Mana Potion", EquipmentType.CONSUMABLE, None, 1, 12, manaRecovery=15)  # Utiliser manaRecovery

# Liste de consommables
consumables = [healthPotionMinor, manaPotionMinor]