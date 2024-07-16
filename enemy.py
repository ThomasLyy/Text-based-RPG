from dataclasses import dataclass

@dataclass
class Enemy:
    name: str
    health: int
    maxHealth: int
    strength: int
    speed: int
    xpReward: int
    # ... (attributs et méthodes)


# Basic enemies
rat = Enemy(name="Rat", health=10, maxHealth=10, strength=2, speed=8, xpReward=5)
goblin = Enemy(name="Goblin", health=15, maxHealth=15, strength=4, speed=6, xpReward=10)  # Ajout d'un gobelin

# Liste d'ennemis
enemies = [rat, goblin]

# Boss
boss = Enemy(name="Boss", health=100, maxHealth=100, strength=15, speed=12, xpReward=100)