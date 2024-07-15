import random

from player import Player
from enemy import Enemy, enemies
from combat import combat

def main():
    player = Player(name="Heracles")
    rat_swarm = [Enemy(name="Rat", health=10, maxHealth=10, strength=2, speed=8, xpReward=5) for _ in range(random.randint(1, 5))]  # Génère entre 1 et 5 rats
    combat(player, rat_swarm)

    quitInput = input("\nPress \"Enter\" to quit.")

# Call the main function to start the game
if __name__ == "__main__":
    main()