from player import Player
from game import gameLoop

def main():
    player = Player(name="Heracles")
    gameLoop(player)  # Démarrer la boucle de jeu directement

if __name__ == "__main__":
    main()