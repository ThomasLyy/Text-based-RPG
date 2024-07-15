from rich import print
from rich.progress import Progress, BarColumn, TextColumn
from rich.prompt import Prompt
from rich.console import Console
from rich.table import Table

import time
import random

from spell import smallSpell


def combat(player, enemies):
    # Affichage des ennemis rencontrés au début du combat
    enemy_counts = {}
    for enemy in enemies:
        enemy_counts[enemy.name] = enemy_counts.get(enemy.name, 0) + 1
    print("\nYou encounter:")
    for enemy_name, count in enemy_counts.items():
        print(
            f"- {count} {enemy_name}{'s' if count > 1 else ''}"
        )  # Affiche le pluriel si nécessaire

    # Create progress bars for health
    playerProgress = Progress(
        "[progress.description]{task.description}",
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),
    )
    playerHealthTask = playerProgress.add_task(
        "[green]Player Health[/green]", total=player.maxHealth, completed=player.health
    )

    enemyProgressBars = {}
    for i, enemy in enumerate(enemies):  # Enumerate to get unique indices
        enemyProgress = Progress(
            "[progress.description]{task.description}",
            BarColumn(),
            TextColumn("{task.completed}/{task.total}"),
        )
        enemyHealthTask = enemyProgress.add_task(
            f"[red]{enemy.name} Health[/red]",
            total=enemy.maxHealth,
            completed=enemy.health,
        )
        enemyProgressBars[i] = (enemyProgress, enemyHealthTask)  # Use index as key

    while player.health > 0 and any(enemy.health > 0 for enemy in enemies):
        # Player's turn
        console = Console()
        table = Table(title="Available Actions")
        table.add_column("Action", justify="right", style="cyan", no_wrap=True)
        table.add_column("Element", justify="center")
        table.add_column("Effect", justify="center")
        table.add_column("Cost", justify="center")

        for spell in smallSpell:  # Utiliser smallSpells au lieu de spells
            table.add_row(spell.name, spell.element, spell.effect, str(spell.manaCost))

        table.add_row("Attack", "", "", "")
        table.add_row("Flee", "", "", "")

        console.print(table)

        valid_actions = [spell.name.lower() for spell in smallSpell] + [
            "attack",
            "flee",
        ]
        actionChoice = ""
        while actionChoice not in valid_actions:
            actionChoice = Prompt.ask("Choose an action").lower()
            if actionChoice not in valid_actions:
                print("Invalid action. Please choose from the available actions.")

        if actionChoice in [spell.name.lower() for spell in smallSpell]:
            spellToCast = next(
                spell for spell in smallSpell if spell.name.lower() == actionChoice
            )

            # Affichage des ennemis disponibles pour le ciblage
            print("\nEnemies:")
            for i, enemy in enumerate(enemies):
                if enemy.health > 0:
                    print(
                        f"{i+1}. {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})"
                    )

            if spellToCast.targetType == "single":  # Utilisation de targetType
                targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                while (
                    targetIndex < 0
                    or targetIndex >= len(enemies)
                    or enemies[targetIndex].health <= 0
                ):
                    print("Invalid target. Please choose a valid number.")
                    targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                target = enemies[targetIndex]
                player.useSpell(spellToCast, target)
            else:  # Zone spell
                for enemy in enemies:
                    if enemy.health > 0:
                        player.useSpell(spellToCast, enemy)
        elif actionChoice == "attack":
            living_enemies = [enemy for enemy in enemies if enemy.health > 0]
            if len(living_enemies) == 1:  # S'il ne reste qu'un ennemi vivant
                target = living_enemies[0]  # Cibler automatiquement cet ennemi
                print(f"You automatically attack the last remaining enemy: {target.name}")
            else:
                # Affichage des ennemis disponibles pour le ciblage
                print("\nEnemies:")
                for i, enemy in enumerate(enemies):
                    if enemy.health > 0:
                        print(f"{i+1}. {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})")

                targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                while targetIndex < 0 or targetIndex >= len(enemies) or enemies[targetIndex].health <= 0:
                    print("Invalid target. Please choose a valid number.")
                    targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                target = enemies[targetIndex]
            player.attack(target)
        elif actionChoice == "flee":
            player.flee()
        else:
            print("Invalid action.")

        # Update health bars
        playerProgress.update(playerHealthTask, completed=player.health)
        for i, enemy in enumerate(enemies):
            progress, task = enemyProgressBars[i]
            progress.update(task, completed=enemy.health)

        # Display health bars
        print(playerProgress)
        for i, enemy in enumerate(enemies):
            progress, task = enemyProgressBars[i]
            if enemy.health <= 0:
                progress.update(task, description=f"[red]{enemy.name} Defeated[/red]")
            print(progress)

        time.sleep(1)

        # Enemy's turn
        for i, enemy in enumerate(enemies):
            if enemy.health > 0:
                damage = enemy.strength + random.randint(1, 4)  # Simulate dice roll
                player.health -= damage
                print(f"The {enemy.name} hits you for {damage} damage!")

                # Update health bars
                playerProgress.update(playerHealthTask, completed=player.health)
                progress, task = enemyProgressBars[i]
                progress.update(task, completed=enemy.health)

                # Display health bars
                print(playerProgress)
                for j, (progress, _) in enemyProgressBars.items():
                    if enemies[j].health <= 0:
                        progress.update(
                            task, description=f"[red]{enemy.name} Defeated[/red]"
                        )
                    print(progress)

                time.sleep(1)

    # Combat result
    if player.health <= 0:
        print("[bold red]You have been defeated![/bold red]")
    else:
        print("[bold green]You defeated all enemies![/bold green]")
        for enemy in enemies:
            player.experience += enemy.xpReward
        print(
            f"You gained {sum(enemy.xpReward for enemy in enemies)} experience points."
        )
