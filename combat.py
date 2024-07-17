import random
import time
from rich import print, layout
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn
from rich.text import Text
from rich.prompt import Prompt
from rich.console import Console

from spell import smallSpell
from reward import chooseReward


def handleTargeting(spell, enemies, console):
    """Handles target selection for spells or attacks."""
    if spell and spell.targetType == "single" and sum(1 for e in enemies if e.health > 0) == 1:
        return next(e for e in enemies if e.health > 0)  # Auto-target last enemy if only one left

    print("\nEnemies:")
    for i, enemy in enumerate(enemies):
        if enemy.health > 0:
            print(f"{i+1}. {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})")
    targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
    while targetIndex < 0 or targetIndex >= len(enemies) or enemies[targetIndex].health <= 0:
        print("Invalid target. Please choose a valid number.")
        targetIndex = int(Prompt.ask("Choose a target (by number)")) - 1
    return enemies[targetIndex]


def handleItemUse(player, console):
    """Allows the player to use a consumable item from their inventory."""

    if not player.consumables:
        print("[dim]You have no consumables.[/dim]")
        return

    print("\nConsumables:")
    for i, item in enumerate(player.consumables):
        print(
            f"{i+1}. {item.name} - Health: {item.healthRecovery}, Mana: {item.manaRecovery}"
        )

    choiceInput = Prompt.ask("Choose a consumable (by number or name)")

    try:
        if choiceInput.isdigit():
            index = int(choiceInput) - 1
        else:
            index = next(
                (i for i, item in enumerate(player.consumables) if item.name.lower() == choiceInput.lower()),
                None,
            )

        if index is None or not (0 <= index < len(player.consumables)):
            raise ValueError("Invalid choice.")

        item = player.consumables.pop(index)  # Remove the item from inventory
        item.use(player)  # Use the item
        updateHealthBars()  # Update health/mana bars

    except ValueError as e:
        print(f"[red]{e}[/red]")


def combat(player, enemies, floor, console=Console()):
    """Manages a combat encounter between the player and a list of enemies."""

    def updateHealthBars():
        """Updates the health bars of all enemies and the player."""
        for enemy, (panel, bar) in zip(enemies, enemyPanels):
            bar.update(completed=enemy.health)
            if enemy.health <= 0:
                panel.title = f"[red]Defeated {enemy.name}[/red]"
        playerHealthBar.update(completed=player.health)
        playerManaBar.update(completed=player.mana)

    # --- UI ELEMENTS ---
    mainLayout = layout.Layout()
    enemyLayout = layout.Layout(name="Enemies", size=7)

    # Enemy Layout (with health bars)
    enemyPanels = []  # (Panel, ProgressBar) tuples
    for enemy in enemies:
        healthBar = Progress(
            "[progress.percentage]{task.percentage:>3.0f}%",
            BarColumn(bar_width=None, style="red"),
            TextColumn("{task.description}"),
        )
        healthBar.add_task(f"[bold]{enemy.name}[/]", total=enemy.maxHealth)
        enemyPanel = Panel(healthBar, title="Enemies", style="on black")
        enemyLayout.add_split(enemyPanel)
        enemyPanels.append((enemyPanel, healthBar))

    # Player Stats Table
    statsTable = Table(show_header=False, box=None, padding=(0, 1))
    for statName in ["Health", "Strength", "Speed", "Intelligence", "Perception", "Mana"]:
        statValue = player.get_stat(statName)  # Get the stat value
        statsTable.add_row(f"[{statName.lower()}]{statName}[/]: {statValue}")

    # Player Actions (dynamically generated based on available mana)
    availableActions = [
        spell.name for spell in smallSpell if spell.manaCost <= player.mana
    ] + ["Attack", "Flee", "Use Item"]
    actionsText = Text.from_markup("\n".join(f"[bold blue]{a}[/]" for a in availableActions))

    # Player Health and Mana Bars
    playerHealthBar = Progress(
        "[progress.percentage]{task.percentage:>3.0f}%",
        BarColumn(bar_width=None, style="green"),
        TextColumn("{task.description}"),
    )
    playerHealthBar.add_task("[bold]Health[/bold]", total=player.maxHealth)

    playerManaBar = Progress(
        "[progress.percentage]{task.percentage:>3.0f}%",
        BarColumn(bar_width=None, style="blue"),
        TextColumn("{task.description}"),
    )
    playerManaBar.add_task("[bold]Mana[/bold]", total=player.maxMana)

    # Panels for Stats, Actions, Health, and Mana
    statsPanel = Panel(statsTable, title="Stats")
    actionsPanel = Panel(actionsText, title="Actions")
    healthPanel = Panel(playerHealthBar, title="Health")
    manaPanel = Panel(playerManaBar, title="Mana")

    # Main Layout
    mainLayout.split_column(  # Split the main area into rows
        enemyLayout,  # Enemies on the left
        Layout(name="Player").split_column(  # Player info on the right, split into columns
            statsPanel,
            actionsPanel,
            Layout(name="HealthMana").split_row(healthPanel, manaPanel),  # Health and mana in one row
        ),
    )

    # --- COMBAT LOOP ---
    while player.health > 0 and any(e.health > 0 for e in enemies):
        console.print(mainLayout)  # Display the UI

        # Player's Turn
        actionInput = Prompt.ask("Choose an action").lower()
        while actionInput not in [a.lower() for a in availableActions]:  # Case-insensitive check
            print("Invalid action!")
            actionInput = Prompt.ask("Choose an action").lower()

        if actionInput in [spell.name.lower() for spell in smallSpell]:  # Spellcasting
            spellToCast = next(s for s in smallSpell if s.name.lower() == actionInput)
            target = handleTargeting(spellToCast, enemies, console) 
            player.useSpell(spellToCast, target)
            player.mana -= spellToCast.manaCost
            updateHealthBars()

        elif actionInput == "attack":  # Basic Attack
            target = handleTargeting(None, enemies, console)
            totalStats = player.calculate_total_stats()
            damage = totalStats["strength"] + random.randint(1, 6)
            target.health -= damage
            print(f"You hit the {target.name} for {damage} damage!")
            updateHealthBars()

        elif actionInput == "flee":  # Flee attempt
            if player.flee():
                print("[bold yellow]You successfully fled the battle![/bold yellow]")
                return  # Exit combat
            else:
                print("[bold red]You failed to flee![/bold red]")

        elif actionInput == "use item":
            handleItemUse(player, console)  # Separate function for item use

        # Enemy's Turn (simplified)
        for enemy in enemies:
            if enemy.health > 0:
                enemy.attack(player)  # Use a method on the enemy to handle attacks
                updateHealthBars()
                time.sleep(0.5)  # Slight delay for enemy attacks

# --- END OF COMBAT ---
    if player.health <= 0:
        print("[bold red]You have been defeated![/bold red]")
    elif all(enemy.health <= 0 for enemy in enemies):
        print("[bold green]You defeated all enemies![/bold green]")
        totalXpGained = sum(enemy.xpReward for enemy in enemies)
        player.experience += totalXpGained
        print(f"You gained {totalXpGained} experience points.")

    # Level Up Check
    if player.experience >= player.xpToNextLevel:
        player.level_up()  # Call the level_up method if available in your player class
        print(f"[bold cyan]You leveled up! You are now level {player.level}.[/bold cyan]")

    # Reward Selection
    if floor < 5:  # Assuming floor 5 is the final boss
        chooseReward(player, floor)
    elif floor == 5:
        print("[bold yellow]Congratulations! You have completed the game![/bold yellow]")