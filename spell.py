from dataclasses import dataclass

@dataclass
class Spell:
    name: str
    damage: int
    mana_cost: int


# Basic spells
fireball = Spell("Fireball", 15, 10)
heal = Spell("Heal", -10, 5)
lightning_bolt = Spell("Lightning Bolt", 20, 15)  # Ajout d'un éclair

# Liste de sorts
spells = [fireball, heal, lightning_bolt]