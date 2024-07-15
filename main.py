import random

from player import Player
from enemy import enemies
from combat import combat

def main():
    player = Player(name="Heracles")  # Create a player named "Heracles"

    combat(player, random.choice(enemies))  # Start the combat

    quitInput = input("\nPress \"Enter\" to quit.")

# Call the main function to start the game
if __name__ == "__main__":
    main()