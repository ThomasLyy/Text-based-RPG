# Text-based RPG

Roguelite textuel au tour par tour, en TypeScript. Le même code tourne dans le navigateur (Vite) et sur Android (Capacitor). Porté depuis la version Python/Rich (voir l'historique git avant la branche `rework`).

## Le jeu

Une partie dure 10 à 15 minutes : 15 étages en 3 actes (The Sewers, The Catacombs, The Spire), un boss aux étages 5, 10 et 15.

* **Un héros qui s'adapte :** au départ, choix d'une arme parmi 3 tirées au hasard, plus un sort mono-cible aléatoire. Le reste du build vient des récompenses.
* **Combat lisible :** chaque ennemi annonce son prochain coup (attaque physique ou magique, poison, soin, buff). Actions : Attaquer, Se défendre (bloque 75 %), sorts, potions, fuir (pas contre un boss).
* **4 statistiques :** Force (armes de mêlée, PV max), Agilité (dagues, couteaux de lancer, arcs, esquive, ordre du tour), Intelligence (baguettes, bâtons, puissance des sorts), Perception (critiques).
* **9 familles d'armes** avec un rang de scaling et un trait (Parade, Fendoir, Écrasement, Étourdissement, Double frappe, Rapide, Précis, Arcane, Canalisation). Double maniement des armes à une main.
* **Armures :** lourde (Armure contre le physique, −2 Agilité par pièce), intermédiaire (esquive), légère (mana et Protection contre la magie). Bonus de set à 4 pièces, affixes sur les objets Rares et Épiques.
* **18 sorts :** 6 éléments × (mono-cible, zone, puissant), chacun avec son effet signature (brûlure, gel, étourdissement, chaîne, soin, malédiction), rangs I à IV, grimoire de 4 sorts.
* **Récompenses :** 1 objet au choix parmi 3 après chaque combat (armes, armures, sorts, potions), qualité Commun à Épique.
* **Événements :** 2 par acte (marchand, forge, sanctuaire, épreuve de statistique), de l'or sur les ennemis.
* **Boss :** enragent à partir du 8e tour.

## Équilibrage

`src/game/balance.test.ts` joue des centaines de parties simulées à chaque `npm test` : un bot « premier bouton » doit perdre, un bot raisonnable doit gagner entre 20 et 50 % des parties, et aucun build (Force, Agilité, Intelligence) ne doit avoir plus de 15 points d'avance sur un autre. Pour voir les chiffres : `npx vitest run balance --reporter=verbose`.

## Code

* `src/game/` : toute la logique du jeu, sans interface (`io.ts` fait le lien avec l'interface ou les tests).
* `src/main.ts`, `src/style.css`, `index.html` : l'interface web.
* `android/` : le projet Android généré par Capacitor.

## Lancer le jeu

1. Installez Node.js (20+), puis `npm install`.
2. Web : `npm run dev`, puis ouvrez l'URL affichée. Build : `npm run build` (sortie dans `dist/`).
3. Tests : `npm test`.
4. Android : installez Android Studio (avec JDK 21), puis `npm run android` (build + `cap sync` + ouvre Android Studio).

## Branches

`main` (stable), `develop` (nouvelles fonctionnalités), `fix` (corrections, partant de `develop`).
