import random
from rich import print
from rich.panel import Panel

from enemy import enemies
from combat import combat

from reward import choose_reward

def gameLoop(player):
    for floor in range(1, 6):
        print(Panel(f"[bold]Floor {floor}[/bold]"))
        print(f"You are on floor {floor} of 5")

        # Difficulté croissante en fonction de l'étage
        maxEnemies = min(3, floor)
        enemyStrengthMultiplier = 1 + (floor - 1) * 0.2

        # Rencontre aléatoire d'ennemis
        currentEnemies = random.choices(enemies, k=random.randint(1, maxEnemies))
        for enemy in currentEnemies:
            enemy.strength = int(enemy.strength * enemyStrengthMultiplier)
            enemy.maxHealth = int(enemy.maxHealth * enemyStrengthMultiplier)
            enemy.health = enemy.maxHealth

        combat(player, currentEnemies, floor)

        if player.health <= 0:
            print(Panel("[bold red]Game Over![/bold red]"))
            break

        # Repos du joueur
        player.health = min(player.maxHealth, player.health + 10)
        print(f"\nYou rested and recovered 10 health. Your health is now {player.health}/{player.maxHealth}.")

        # Récompenses (étages 1 à 4) :
        if floor < 5:  # Pas de récompense après le boss (étage 5)
            choose_reward(player, floor)

        # Forge
        if floor == 3:
            print(Panel("[bold blue]Welcome to the Forge![/bold blue]"))
        # ... (à implémenter)

    if player.health > 0:
        print(Panel("[bold green]Congratulations! You defeated the boss![/bold green]"))