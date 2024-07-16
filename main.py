import random

from rich.prompt import Prompt

from player import Player
from enemy import Enemy
from combat import combat

from equipment import rustySword, leatherCap
from consumable import healthPotionMinor, manaPotionMinor


def main():
    player = Player(name="Heracles")

    print("\nChoose your starting equipment:")
    print("1. Rusty Sword (Strength +2)")
    print("2. Leather Cap (Health +5)")
    choice = Prompt.ask("Enter your choice (1 or 2)")
    while choice not in ["1", "2"]:
        print("Invalid choice.")
        choice = Prompt.ask("Enter your choice (1 or 2)")

    if choice == "1":
        player.equip(rustySword)
    else:
        player.equip(leatherCap)

    print("\nChoose a starting potion:")
    print("1. Minor Health Potion (Health +20)")
    print("2. Minor Mana Potion (Mana +15)")
    choice = Prompt.ask("Enter your choice (1 or 2)")
    while choice not in ["1", "2"]:
        print("Invalid choice.")
        choice = Prompt.ask("Enter your choice (1 or 2)")

    if choice == "1":
        player.equip(healthPotionMinor)
    else:
        player.equip(manaPotionMinor)


    rat_swarm = [Enemy(name="Rat", health=10, maxHealth=10, strength=2, speed=8, xpReward=5) for _ in range(random.randint(1, 5))]  # Génère entre 1 et 5 rats
    combat(player, rat_swarm)

    input("\nPress \"Enter\" to quit.")

# Call the main function to start the game
if __name__ == "__main__":
    main()