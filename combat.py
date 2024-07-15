from rich import print
from rich.progress import Progress, BarColumn, TextColumn
from rich.prompt import Prompt
from rich.console import Console
from rich.table import Table
import random
import time  # Pour ajouter un délai entre les tours

from spell import fireball, heal

def combat(player, enemy):
    print(f"\n[bold red]{enemy.name} attacks![/bold red]")

    # Create progress bars for health
    player_progress = Progress(
        "[progress.description]{task.description}",
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),  # Afficher la valeur réelle
    )
    player_health_task = player_progress.add_task(
        "[green]Player Health[/green]", total=player.health, completed=player.health
    )

    enemy_progress = Progress(
        "[progress.description]{task.description}",
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),  # Afficher la valeur réelle
    )
    enemy_health_task = enemy_progress.add_task(
        f"[red]{enemy.name} Health[/red]", total=enemy.health, completed=enemy.health
    )

    while player.health > 0 and enemy.health > 0:
        # Player's turn
        console = Console()
        table = Table(title="Available Spells")
        table.add_column("Name", justify="right", style="cyan", no_wrap=True)
        table.add_column("Damage/Heal", style="magenta")
        table.add_column("Mana Cost", style="green")

        for spell in [fireball, heal]:
            table.add_row(spell.name, str(spell.damage), str(spell.mana_cost))

        console.print(table)

        spell_choice = Prompt.ask("Choose a spell (or type 'attack' or 'flee')", choices=[spell.name for spell in [fireball, heal]] + ["attack", "flee"])

        if spell_choice in [spell.name for spell in [fireball, heal]]:
            spell_to_cast = next(spell for spell in [fireball, heal] if spell.name == spell_choice)
            if spell_to_cast.damage > 0:  # Offensive spell
                target_choice = Prompt.ask("Choose a target", choices=[enemy.name])
                if target_choice == enemy.name:
                    player.useSpell(spell_to_cast, enemy)
            else:  # Healing spell
                player.useSpell(spell_to_cast, player)
        elif spell_choice == "attack":
            player.attack(enemy)
        elif spell_choice == "flee":
            player.flee()

        # Update health bars
        player_progress.update(player_health_task, completed=player.health)
        enemy_progress.update(enemy_health_task, completed=enemy.health)

        # Display health bars
        print(player_progress)
        if enemy.health > 0:  # Afficher la barre de vie de l'ennemi seulement s'il est en vie
            print(enemy_progress)

        time.sleep(1)  # Add a 1-second delay between turns

        # Enemy's turn
        if enemy.health > 0:
            damage = enemy.strength + random.randint(1, 4)  # Simulate dice roll
            player.health -= damage
            print(f"The {enemy.name} hits you for {damage} damage!")

        # Update health bars
        player_progress.update(player_health_task, completed=player.health)
        enemy_progress.update(enemy_health_task, completed=enemy.health)

        # Display health bars
        print(player_progress)
        if enemy.health > 0:  # Afficher la barre de vie de l'ennemi seulement s'il est en vie
            print(enemy_progress)

        time.sleep(1)  # Add a 1-second delay between turns

    # Combat result
    if player.health <= 0:
        print("[bold red]You have been defeated![/bold red]")
    else:
        print(f"[bold green]You defeated the {enemy.name}![/bold green]")
        player.experience += enemy.xpReward
        print(f"You gained {enemy.xpReward} experience points.")
