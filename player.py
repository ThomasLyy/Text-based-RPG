from dataclasses import dataclass, field
from equipment import EquipmentType, WeaponSubType
import random

@dataclass
class Player:
    name: str = ""
    level: int = 1
    experience: int = 0
    health: int = 100
    maxHealth: int = 100
    strength: int = 10
    speed: int = 10
    intelligence: int = 10
    perception: int = 10
    mana: int = 100
    maxMana: int = 100  # Ajout de l'attribut max_mana

    # Equipment slots
    mainHand: str = None
    offHand: str = None
    head: str = None
    chest: str = None
    waist: str = None
    legs: str = None
    feet: str = None
    neck: str = None
    ringLeft: str = None
    ringRight: str = None

    # Equipment & Inventory
    inventory: list = field(default_factory=list)  # Inventaire
    equipped: dict = field(default_factory=lambda: {
        "mainHand": None, "offHand": None, "head": None, "chest": None, "waist": None,
        "legs": None, "feet": None, "neck": None, "ringLeft": None, "ringRight": None
    })  # Emplacements d'équipement (dictionnaire)
    consumables: list = field(default_factory=list)  # Inventaire de consommables (liste)

    def equip(self, item):
        if item.equipmentType == EquipmentType.WEAPON:
            if item.subType == WeaponSubType.SWORD or item.subType == WeaponSubType.AXE or item.subType == WeaponSubType.MACE:
                if self.equipped["mainHand"] is None:
                    self.equipped["mainHand"] = item
                elif self.equipped["offHand"] is None:
                    self.equipped["offHand"] = item
                else:
                    print("Both hand slots are full. Please unequip an item first.")
                    return
            elif item.subType == WeaponSubType.BOW:
                if self.equipped["mainHand"] is None and self.equipped["offHand"] is None:
                    self.equipped["mainHand"] = item
                    self.equipped["offHand"] = item
                else:
                    print("Both hand slots are full. Please unequip an item first.")
                    return
        elif item.equipmentType == EquipmentType.ARMOR:
            if self.equipped[item.subType.name.lower()] is None:
                self.equipped[item.subType.name.lower()] = item
            else:
                print(f"{item.subType.value} slot is full. Please unequip an item first.")
                return
        elif item.equipmentType == EquipmentType.CONSUMABLE:
            if len(self.consumables) < 5:
                self.consumables.append(item)
            else:
                print("Your consumables pouch is full. Please discard a consumable first.")
                return

        print(f"You equipped {item.name}.")


    def attack(self, enemy):
        damage = self.strength + random.randint(1, 6)  # Simulate dice roll
        enemy.health = max(0, enemy.health - damage)  # Ensure health doesn't go below 0
        print(f"You hit the {enemy.name} for {damage} damage!")


    # Method to useSpell on target
    def useSpell(self, spell, target):
        if spell.manaCost > self.mana:
            print("Not enough mana!")
            return
        self.mana -= spell.manaCost
        if spell.damage > 0:  # Offensive spell
            target.health = max(0, target.health - spell.damage)  # Limite la santé à 0
            print(f"You cast {spell.name} on the {target.name} for {spell.damage} damage!")
        else:  # Healing spell
            healing = -spell.damage  # Convertir les dégâts négatifs en soin positif
            target.health = min(target.health + healing, target.maxHealth) # Ensure health doesn't go below 0
            print(f"You cast {spell.name} on the {target.name} for {healing} health!")


    def flee(self):
        # Flee logic (to be developed)
        pass


    def useConsumable(self, item):
        if item in self.consumables:
            item.use(self)
            self.consumables.remove(item)
        else:
            print("You don't have that consumable.")


    def calculateTotalStats(self):
        totalStrength = self.strength
        totalSpeed = self.speed
        totalIntelligence = self.intelligence
        totalPerception = self.perception
        totalHealth = self.health
        totalMana = self.mana

        for equipmentSlot in [
            self.mainHand, self.offHand, self.head, self.chest, self.waist,
            self.legs, self.feet, self.neck, self.ringLeft, self.ringRight
        ]:
            if equipmentSlot is not None:
                totalStrength += equipmentSlot.strengthBonus
                totalSpeed += equipmentSlot.speedBonus
                totalIntelligence += equipmentSlot.intelligenceBonus
                totalPerception += equipmentSlot.perceptionBonus
                totalHealth += equipmentSlot.healthBonus
                totalMana += equipmentSlot.manaBonus

        return {
            "strength": totalStrength,
            "speed": totalSpeed,
            "intelligence": totalIntelligence,
            "perception": totalPerception,
            "health": totalHealth,
            "mana": totalMana
        }