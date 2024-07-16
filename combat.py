from rich import print
from rich.progress import Progress, BarColumn, TextColumn
from rich.prompt import Prompt
from rich.console import Console
from rich.table import Table

import time
import random

from spell import smallSpell
from reward import chooseReward

def combat(player, enemies, floor):
    # Affichage des ennemis rencontrés au début du combat
    enemy_counts = {}
    for enemy in enemies:
        enemy_counts[enemy.name] = enemy_counts.get(enemy.name, 0) + 1
    print("\nYou encounter:")
    for enemy_name, count in enemy_counts.items():
        print(f"- {count} {enemy_name}{'s' if count > 1 else ''}")  # Affiche le pluriel si nécessaire

    # Affichage des statistiques du joueur
    player.displayStats()

    # Affichage de l'équipement du joueur
    print("\nYour equipment:")
    for slot, item in player.equipped.items():
        if item:
            print(f"- {slot}: {item}")
    print("\nYour consumables:")
    for item in player.consumables:
        print(f"- {item}")

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

    all_enemies_defeated = False  # Variable pour suivre si tous les ennemis sont vaincus
    while player.health > 0 and not all_enemies_defeated:
        # Player's turn
        console = Console()
        table = Table(title="Available Actions")
        table.add_column("Action", justify="right", style="cyan", no_wrap=True)
        table.add_column("Element", justify="center")
        table.add_column("Effect", justify="center")
        table.add_column("Cost", justify="center")

        for spell in smallSpell:
            table.add_row(spell.name, spell.element, spell.effect, str(spell.manaCost))

        table.add_row("Attack", "", "", "")
        table.add_row("Flee", "", "", "")

        console.print(table)

        validActions = [spell.name.lower() for spell in smallSpell] + ["attack", "flee", "use item"]
        actionChoice = ""
        while actionChoice not in validActions:
            actionChoice = Prompt.ask("Choose an action").lower()
            if actionChoice not in validActions:
                print("Invalid action. Please choose from the available actions.")

        if actionChoice in [spell.name.lower() for spell in smallSpell]:
            spellToCast = next(spell for spell in smallSpell if spell.name.lower() == actionChoice)

            # Ciblage automatique du dernier ennemi si cible unique et un seul ennemi restant
            if spellToCast.targetType == "single" and sum(1 for enemy in enemies if enemy.health > 0) == 1:
                target = next(enemy for enemy in enemies if enemy.health > 0)
                print(f"Automatically targeting the last enemy: {target.name}")
            else:
                # Affichage des ennemis disponibles pour le ciblage
                print("\nEnemies:")
                for i, enemy in enumerate(enemies):
                    if enemy.health > 0:
                        print(f"{i+1}. {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})")

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

        elif actionChoice == "use item":
            if not player.consumables:
                print("You have no consumables.")
            else:
                print("\nConsumables:")
                for i, item in enumerate(player.consumables):
                    print(f"{i+1}. {item}")

                # Récupération des noms des consommables du joueur
                consumableNames = [item.name for item in player.consumables]

                itemChoice = Prompt.ask("Choose a consumable (by number or name)")

                # Vérification si le choix est un nombre ou un nom
                if itemChoice.isdigit():
                    itemIndex = int(itemChoice) - 1
                    while itemIndex < 0 or itemIndex >= len(player.consumables):
                        print("Invalid choice. Please choose a valid number.")
                        itemIndex = int(Prompt.ask("Choose a consumable (by number)")) - 1
                elif itemChoice in consumableNames:
                    itemIndex = consumableNames.index(itemChoice)
                else:
                    print("Invalid choice. Please choose a valid number or consumable name.")
                    continue  # Redémarrer le tour du joueur

                player.useConsumable(player.consumables[itemIndex])

        elif actionChoice == "attack":
            # Ciblage automatique du dernier ennemi si un seul ennemi restant
            if sum(1 for enemy in enemies if enemy.health > 0) == 1:
                target = next(enemy for enemy in enemies if enemy.health > 0)
                print(f"Automatically targeting the last enemy: {target.name}")
            else:
                # Affichage des ennemis disponibles pour le ciblage
                print("\nEnemies:")
                for i, enemy in enumerate(enemies):
                    if enemy.health > 0:
                        print(f"{i+1}. {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})")

                targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                while (
                    targetIndex < 0
                    or targetIndex >= len(enemies)
                    or enemies[targetIndex].health <= 0
                ):
                    print("Invalid target. Please choose a valid number.")
                    targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
                target = enemies[targetIndex]

            totalStats = player.calculateTotalStats()
            damage = totalStats["strength"] + random.randint(1, 6)
            target.health = max(0, target.health - damage)
            print(f"You hit the {target.name} for {damage} damage!")
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
                damage = enemy.strength + random.randint(1, 4)
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
                        progress.update(task, description=f"[red]{enemy.name} Defeated[/red]")
                    print(progress)

                time.sleep(1)

        # Vérifier si tous les ennemis sont vaincus après le tour des ennemis
        all_enemies_defeated = all(enemy.health <= 0 for enemy in enemies)

    # Combat result (déplacé en dehors de la boucle)
    if player.health <= 0:
        print("[bold red]You have been defeated![/bold red]")
    elif all_enemies_defeated:  # Vérifier si tous les ennemis sont vaincus
        print("[bold green]You defeated all enemies![/bold green]")
        for enemy in enemies:
            player.experience += enemy.xpReward
        print(f"You gained {sum(enemy.xpReward for enemy in enemies)} experience points.")

        # Choix de récompense (si ce n'est pas le boss)
        if floor < 5:
            chooseReward(player, floor)
            player.displayStats()  #