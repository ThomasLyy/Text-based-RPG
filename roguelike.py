from rich import print
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, BarColumn, TextColumn
from rich.prompt import Prompt, Confirm
from rich.console import Console
from rich.table import Table
from dataclasses import dataclass, field
import random
import time  # Pour ajouter un délai entre les tours

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
        if spell.mana_cost > self.mana:
            print("Not enough mana!")
            return

        self.mana -= spell.mana_cost

        if spell.damage > 0:  # Offensive spell
            target.health -= spell.damage
            print(f"You cast {spell.name} on the {target.name} for {spell.damage} damage!")
        else:  # Healing spell
            healing = -spell.damage  # Convertir les dégâts négatifs en soin positif
            target.health = min(target.health + healing, target.maxHealth)  # Limiter la santé au maximum
            print(f"You cast {spell.name} on the {target.name} for {healing} health!")

    def flee(self):
        # Flee logic (to be developed)
        pass


@dataclass
class Enemy:
    name: str
    health: int
    maxHealth: int
    strength: int
    speed: int
    xpReward: int
    # ... (attributs et méthodes)


class Niveau:
    print()
    # ... (attributs et méthodes)


class Objet:
    print()
    # ... (attributs et méthodes)


@dataclass
class Spell:
    name: str
    damage: int
    mana_cost: int


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


# ... (autres classes)

# Basic Rat enemy
rat = Enemy(name="Rat", health=30, maxHealth=30, strength=2, speed=8, xpReward=5)

# Basic spells
fireball = Spell("Fireball", 15, 10)
heal = Spell("Heal", -10, 5)  # Negative damage for healing

def main():
    player = Player(name="Heracles")  # Create a player named "Heracles"

    combat(player, rat)  # Start the combat

    quitInput = input("\nPress \"Enter\" to quit.")

# Call the main function to start the game
if __name__ == "__main__":
    main()