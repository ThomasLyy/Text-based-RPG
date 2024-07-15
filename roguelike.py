from rich import print
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, BarColumn, TextColumn
from dataclasses import dataclass, field
import random
import time  # Pour ajouter un délai entre les tours

@dataclass
class Player:
    name: str = ""
    level: int = 1
    experience: int = 0
    health: int = 100
    strength: int = 10
    speed: int = 10
    intelligence: int = 10
    perception: int = 10

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
        # Attack logic (to be developed)
        pass

    def useSpell(self, spell, enemy):
        # Spell casting logic (to be developed)
        pass

    def flee(self):
        # Flee logic (to be developed)
        pass

@dataclass
class Enemy:
    name: str
    health: int
    strength: int
    speed: int
    xpReward: int
    # ... (attributs et méthodes)

# Basic Rat enemy
rat = Enemy(name="Rat", health=30, strength=2, speed=8, xpReward=5)

class Niveau:
    print()
    # ... (attributs et méthodes)

class Objet:
    print()
    # ... (attributs et méthodes)

# Combat function
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
        action = input("Choose an action (attack, spell, flee): ")
        if action == "attack":
            damage = player.strength + random.randint(1, 6)  # Simulate dice roll
            enemy.health -= damage
            print(f"You hit the {enemy.name} for {damage} damage!")
        elif action == "spell":
            print("No spells available yet.")  # Placeholder for spell system
        elif action == "flee":
            if random.random() < 0.5:  # 50% chance of successful flee
                print("You successfully flee!")
                return
            else:
                print("You failed to flee!")
        else:
            print("Invalid action.")

        # Update health bars
        player_progress.update(player_health_task, completed=player.health)
        enemy_progress.update(enemy_health_task, completed=enemy.health)

        # Display health bars
        print(player_progress)
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
        print(enemy_progress)

        time.sleep(1)  # Add a 1-second delay between turns

    # Combat result
    if player.health <= 0:
        print("[bold red]You have been defeated![/bold red]")
    else:
        print(f"[bold green]You defeated the {enemy.name}![/bold green]")
        player.experience += enemy.xpReward
        print(f"You gained {enemy.xpReward} experience points.")

# ... (autres classes)

def main():
    player = Player(name="Heracles")  # Create a player named "Heracles"
    # Create a Rich Text object for the player stats
    player_stats = Text()
    player_stats.append(f"Name: {player.name}\n")
    player_stats.append(f"Level: {player.level}\n")
    player_stats.append(f"Experience: {player.experience}\n")
    player_stats.append(f"Health: {player.health}\n")
    player_stats.append(f"Strength: {player.strength}\n")
    player_stats.append(f"Speed: {player.speed}\n")
    player_stats.append(f"Intelligence: {player.intelligence}\n")
    player_stats.append(f"Perception: {player.perception}")

    # Create a Panel with the player stats
    stats_panel = Panel(player_stats, title="Player Stats", border_style="green")

    # Print the panel
    print(stats_panel)

    # Create panels for equipment
    equipment_panels = {
        "Main Hand": Panel(Text(player.mainHand or "Empty"), title="Main Hand"),
        "Off Hand": Panel(Text(player.offHand or "Empty"), title="Off Hand"),
        "Head": Panel(Text(player.head or "Empty"), title="Head"),
        "Chest": Panel(Text(player.chest or "Empty"), title="Chest"),
        "Waist": Panel(Text(player.waist or "Empty"), title="Waist"),
        "Legs": Panel(Text(player.legs or "Empty"), title="Legs"),
        "Feet": Panel(Text(player.feet or "Empty"), title="Feet"),
        "Neck": Panel(Text(player.neck or "Empty"), title="Neck"),
        "Ring Left": Panel(Text(player.ringLeft or "Empty"), title="Ring Left"),
        "Ring Right": Panel(Text(player.ringRight or "Empty"), title="Ring Right"),
    }

    # Print the equipment panels
    for panel in equipment_panels.values():
        print(panel)

    combat(player, rat)  # Start the combat

    quitInput = input("\nPress \"Enter\" to quit.")

# Call the main function to start the game
if __name__ == "__main__":
    main()