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


# Exemples d'équipements
rustySword = Equipment(name="Rusty Sword", equipmentType=EquipmentType.WEAPON, subType=WeaponSubType.SWORD, tier=1, value=5, strengthBonus=2)
leatherCap = Equipment(name="Leather Cap", equipmentType=EquipmentType.ARMOR, subType=ArmorSubType.HEAD, tier=1, value=8, healthBonus=5)
flamingSword = Equipment(name="Flaming Sword", equipmentType=EquipmentType.WEAPON, subType=WeaponSubType.SWORD, tier=5, value=50, strengthBonus=15, element="Fire")