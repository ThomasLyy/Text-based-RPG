# Roguelike Textuel en Python avec Rich

Ce projet est un roguelike textuel développé en Python, utilisant la bibliothèque Rich pour créer une interface utilisateur attrayante dans le terminal.

## Fonctionnalités actuelles

* **Classe `Player` :** Représente le personnage du joueur avec ses statistiques (santé, force, mana, etc.), son équipement et son inventaire de consommables.
* **Classe `Enemy` :** Représente les ennemis du jeu avec leurs statistiques et leur récompense en expérience. Plusieurs ennemis de base ont été créés (Rat, Gobelin).
* **Classe `Spell` :** Représente les sorts du jeu, avec des attributs pour le nom, les dégâts, le coût en mana, l'élément, l'effet et le type de cible (mono-cible ou multi-cible). Une grande variété de sorts a été implémentée pour différents éléments.
* **Système de combat :**
    * Combat au tour par tour entre le joueur et un ou plusieurs ennemis.
    * Actions possibles pour le joueur : attaquer, utiliser un sort, fuir.
    * Gestion des sorts mono-cibles et multi-cibles (sorts de zone).
    * Ciblage automatique du dernier ennemi restant lors d'une attaque mono-cible.
    * Affichage dynamique des barres de progression de santé du joueur et des ennemis, avec les valeurs réelles de santé.
    * Les barres de vie des ennemis restent affichées jusqu'à la fin du combat, même s'ils sont vaincus.
* **Interface utilisateur (Rich) :**
    * Affichage des statistiques du joueur dans un panneau avec un titre et une bordure.
    * Affichage de l'équipement du joueur dans des panneaux séparés pour chaque emplacement.
    * Menu interactif pour choisir les actions du joueur pendant le combat, avec affichage des sorts disponibles, de leur élément, de leur effet et de leur coût en mana.

## Technologies utilisées

* **Python :** Langage de programmation principal.
* **Rich :** Bibliothèque pour créer des interfaces utilisateur textuelles riches en fonctionnalités dans le terminal.
* **dataclasses :** Module Python pour faciliter la création de classes avec des attributs typés.

## Comment exécuter le jeu

1. Assurez-vous d'avoir Python installé sur votre système.
2. Installez la bibliothèque Rich : `pip install rich`
3. Exécutez le script Python : `python main.py`

## Prochaines étapes

* Implémenter les effets spécifiques de chaque sort (dégâts, soins, buffs, debuffs).
* Gérer les effets de statut qui durent plusieurs tours.
* Permettre au joueur de combiner des sorts de différents éléments.
* Créer un arbre de compétences pour débloquer et améliorer les sorts.
* Commencer à travailler sur la génération procédurale des niveaux.
* Ajouter des objets, des équipements et un système d'inventaire.
* Développer une IA plus élaborée pour les ennemis.

## Contribution

N'hésitez pas à contribuer à ce projet en proposant des améliorations, des nouvelles fonctionnalités ou en signalant des bugs.
