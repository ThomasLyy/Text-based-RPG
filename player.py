from dataclasses import dataclass, field
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


    # Consumables inventory (a list to start)
    consumables: list = field(default_factory=list)

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