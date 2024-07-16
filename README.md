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
* **Équipement :**
    * Les équipements sont divisés en 5 tiers, de 1 (faible) à 5 (puissant).
    * Les armes peuvent avoir un élément associé (feu, eau, etc.).
    * Le joueur peut équiper des armes et des armures. Les équipements équipés sont liés au joueur jusqu'à ce qu'ils soient remplacés.
    * Les bonus de statistiques des équipements sont ajoutés aux statistiques du joueur.
* **Consommables :**
    * Les consommables sont des objets qui peuvent être utilisés pour soigner le joueur ou lui donner des bonus temporaires.
    * Le joueur a un inventaire limité de 5 emplacements pour les consommables.
    * Les consommables sont supprimés de l'inventaire après utilisation.

## Technologies utilisées

* **Python :** Langage de programmation principal.
* **Rich :** Bibliothèque pour créer des interfaces utilisateur textuelles riches en fonctionnalités dans le terminal.
* **dataclasses :** Module Python pour faciliter la création de classes avec des attributs typés.

## Améliorations futures

* **Interface graphique :**
    * **Explorer l'utilisation de Pygame ou Arcade** pour créer une interface graphique plus immersive et interactive.
* **Effets de sorts :**
    * Implémenter les effets spécifiques de chaque sort (dégâts, soins, buffs, debuffs).
    * Gérer les effets de statut qui durent plusieurs tours.
    * Permettre au joueur de combiner des sorts de différents éléments.
* **Arbre de compétences :**
    * Créer un arbre de compétences pour débloquer et améliorer les sorts.
* **Génération de niveau :**
    * Implémenter la génération aléatoire d'équipements en fonction du niveau et de la difficulté du combat.
    * Ajouter des magasins pour acheter et vendre des équipements.
* **Ennemis :**
    * Développer une IA plus élaborée pour les ennemis.
* **Autres :**
    * Ajouter des résistances et des faiblesses élémentaires aux ennemis.
    * Implémenter la possibilité de choisir un nouvel équipement après chaque combat.
    * Implémenter la génération aléatoire d'équipements en fonction du niveau et de la difficulté du combat.
    * Ajouter des magasins pour acheter et vendre des équipements.

## Comment exécuter le jeu

1. Assurez-vous d'avoir Python installé sur votre système.
2. Installez la bibliothèque Rich : `pip install rich`
3. Exécutez le script Python : `python main.py`

## Contribution

N'hésitez pas à contribuer à ce projet en proposant des améliorations, des nouvelles fonctionnalités ou en signalant des bugs.
