# Roguelike Textuel en Python avec Rich

Ce projet est un roguelike textuel développé en Python, utilisant la bibliothèque Rich pour créer une interface utilisateur attrayante dans le terminal.

## Fonctionnalités actuelles

* **Classe `Player` :** Représente le personnage du joueur avec ses statistiques (santé, force, etc.), son équipement et son inventaire de consommables.
* **Classe `Enemy` :** Représente les ennemis du jeu avec leurs statistiques et leur récompense en expérience. Un ennemi de base "Rat" a été créé.
* **Système de combat :**
    * Combat au tour par tour entre le joueur et un ennemi.
    * Actions possibles pour le joueur : attaquer, utiliser un sort (non implémenté pour l'instant), fuir.
    * Affichage dynamique des barres de progression de santé du joueur et de l'ennemi, avec les valeurs réelles de santé.
* **Interface utilisateur (Rich) :**
    * Affichage des statistiques du joueur dans un panneau avec un titre et une bordure.
    * Affichage de l'équipement du joueur dans des panneaux séparés pour chaque emplacement.

## Technologies utilisées

* **Python :** Langage de programmation principal.
* **Rich :** Bibliothèque pour créer des interfaces utilisateur textuelles riches en fonctionnalités dans le terminal.
* **dataclasses :** Module Python pour faciliter la création de classes avec des attributs typés.

## Comment exécuter le jeu

1. Assurez-vous d'avoir Python installé sur votre système.
2. Installez la bibliothèque Rich : `pip install rich`
3. Exécutez le script Python : `python roguelike.py`

## Prochaines étapes

* Implémenter un système de sorts pour le joueur.
* Développer une IA plus élaborée pour les ennemis.
* Ajouter des coups critiques basés sur la perception du joueur.
* Créer différents types d'attaques pour le joueur.
* Commencer à travailler sur la génération procédurale des niveaux.
* Ajouter des objets, des équipements et un système d'inventaire.

## Contribution

N'hésitez pas à contribuer à ce projet en proposant des améliorations, des nouvelles fonctionnalités ou en signalant des bugs.
