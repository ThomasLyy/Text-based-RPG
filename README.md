# Roguelike Textuel en Python avec Rich

Ce projet est un roguelike textuel développé en Python, utilisant la bibliothèque Rich pour créer une interface utilisateur attrayante dans le terminal.

## Fonctionnalités actuelles

* **Classe `Player` :** Représente le personnage du joueur avec ses statistiques (santé, force, mana, etc.), son équipement et son inventaire de consommables.
* **Classe `Enemy` :** Représente les ennemis du jeu avec leurs statistiques et leur récompense en expérience. Plusieurs ennemis de base ont été créés (Rat, Gobelin).
* **Classe `Spell` :** Représente les sorts du jeu, avec des attributs pour le nom, les dégâts, le coût en mana, l'élément, l'effet et le type de cible (mono-cible ou multi-cible). Une grande variété de sorts a été implémentée pour différents éléments.
* **Classe `Equipment` :** Représente les équipements (armes, armures, consommables) avec leurs statistiques et leurs effets.
* **Classe `Consumable` :** Représente les consommables (potions de vie, de mana) avec leurs effets de récupération.
* **Système de combat :**
    * Combat au tour par tour entre le joueur et un ou plusieurs ennemis.
    * Actions possibles pour le joueur : attaquer, utiliser un sort, fuir, utiliser un consommable.
    * Gestion des sorts mono-cibles et multi-cibles (sorts de zone).
    * Ciblage automatique du dernier ennemi restant lors d'une attaque mono-cible.
    * Affichage dynamique des barres de progression de santé du joueur et des ennemis, avec les valeurs réelles de santé.
    * Les barres de vie des ennemis restent affichées jusqu'à la fin du combat, même s'ils sont vaincus.
* **Interface utilisateur (Rich) :**
    * Affichage des statistiques du joueur dans un panneau avec un titre et une bordure.
    * Affichage de l'équipement du joueur dans des panneaux séparés pour chaque emplacement.
    * Menu interactif pour choisir les actions du joueur pendant le combat, avec affichage des sorts disponibles, de leur élément, de leur effet et de leur coût en mana.
    * Affichage de l'inventaire des consommables.

## Technologies utilisées

* **Python :** Langage de programmation principal.
* **Rich :** Bibliothèque pour créer des interfaces utilisateur textuelles riches en fonctionnalités dans le terminal.
* **dataclasses :** Module Python pour faciliter la création de classes avec des attributs typés.

## Améliorations futures

* **Combat :**
    * **Effets de sorts :** Implémenter les effets spécifiques de chaque sort (dégâts, soins, buffs, debuffs, effets de statut).
    * **Sorts combinés :** Permettre au joueur de combiner des sorts de différents éléments pour créer de nouveaux effets.
    * **IA ennemie :** Développer une IA plus sophistiquée, prenant en compte les faiblesses et résistances élémentaires, utilisant des sorts et des compétences de manière stratégique.
    * **Coups critiques :** Implémenter une chance de coup critique basée sur la perception du joueur.
    * **Variété d'attaques :** Permettre au joueur de choisir entre différents types d'attaques (coup puissant, coup rapide, etc.).
* **Génération de niveau :**
    * **Algorithmes avancés :** Utiliser des algorithmes plus complexes pour créer des niveaux plus intéressants et variés (salles, couloirs, obstacles, étages).
    * **Salles spéciales :** Ajouter des salles avec des événements ou récompenses uniques (trésor, pièges, rencontres, autels).
    * **Niveaux de boss :** Concevoir des niveaux spécifiques pour les combats de boss.
* **Objets et équipement :**
    * **Génération aléatoire :** Créer un système pour générer des équipements aléatoires en fonction du niveau et de la difficulté.
    * **Amélioration :** Permettre au joueur d'améliorer ses équipements.
    * **Enchantements :** Ajouter des enchantements aux armes et armures.
* **Autres fonctionnalités :**
    * **Système de quêtes :** Ajouter des quêtes secondaires.
    * **Compétences et talents :** Permettre au joueur de développer des compétences et talents.
    * **Événements aléatoires :** Intégrer des événements aléatoires (pièges, rencontres, trésors).
    * **Magasins :** Ajouter des niveaux pour acheter et vendre des équipements et consommables.
* **Interface graphique :**
    * **Explorer l'utilisation de Pygame ou Arcade** pour créer une interface graphique plus immersive et interactive.
    * **Couleurs et styles :** Utiliser davantage les fonctionnalités de Rich.
    * **Menus élaborés :** Créer des menus plus complexes et interactifs.
    * **Affichage du niveau :** Afficher une représentation visuelle du niveau (mini-carte, grille).

## Comment exécuter le jeu

1. Assurez-vous d'avoir Python installé sur votre système.
2. Installez la bibliothèque Rich : `pip install rich`
3. Exécutez le script Python : `python -m main`

## Contribution

N'hésitez pas à contribuer à ce projet en proposant des améliorations, des nouvelles fonctionnalités ou en signalant des bugs.