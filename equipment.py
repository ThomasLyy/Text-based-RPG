from dataclasses import dataclass
from enum import Enum


class EquipmentType(Enum):
    WEAPON = "Weapon"
    ARMOR = "Armor"
    CONSUMABLE = "Consumable"


class WeaponSubType(Enum):
    SWORD = "Sword"
    AXE = "Axe"
    MACE = "Mace"
    BOW = "Bow"


class ArmorSubType(Enum):
    HEAD = "Head"
    CHEST = "Chest"
    WAIST = "Waist"
    LEGS = "Legs"
    FEET = "Feet"
    NECK = "Neck"
    RING = "Ring"
    SHIELD = "Shield"  # Ajout de l'emplacement pour bouclier


@dataclass
class Equipment:
    name: str
    equipmentType: EquipmentType
    tier: int  # 1 to 5
    value: int
    strengthBonus: int = 0
    speedBonus: int = 0
    intelligenceBonus: int = 0
    perceptionBonus: int = 0
    healthBonus: int = 0
    manaBonus: int = 0
    subType: Enum = None  # WeaponSubType or ArmorSubType
    element: str = None  # Ajout de l'attribut element pour les armes

    def __str__(self):
        return f"Tier {self.tier} {self.name} ({self.equipmentType.value}{f', {self.subType.value}' if self.subType else ''}{f', {self.element}' if self.element else ''})"
    
    def upgrade(self):
        if self.tier < 5:
            self.tier += 1
            self.strengthBonus += 2
            self.healthBonus += 5
            # ... (autres bonus en fonction du type d'équipement)
            print(f"You upgraded {self.name} to Tier {self.tier}!")
        else:
            print(f"{self.name} is already at the maximum tier.")


# Exemples d'équipements
rustySword = Equipment(name="Rusty Sword", equipmentType=EquipmentType.WEAPON, subType=WeaponSubType.SWORD, tier=1, value=5, strengthBonus=2)
leatherCap = Equipment(name="Leather Cap", equipmentType=EquipmentType.ARMOR, subType=ArmorSubType.HEAD, tier=1, value=8, healthBonus=5)
flamingSword = Equipment(name="Flaming Sword", equipmentType=EquipmentType.WEAPON, subType=WeaponSubType.SWORD, tier=5, value=50, strengthBonus=15, element="Fire")

# Listes d'équipements
weapons = [rustySword, flamingSword]  # Ajout des armes à la liste
armors = [leatherCap]  # Ajout de l'armure à la liste