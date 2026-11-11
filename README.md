# Text-based RPG

A turn-based text roguelike written in TypeScript, on its way to becoming a roguelite (progression between runs is planned, see the roadmap). The same code runs in the browser (Vite) and on Android (Capacitor). Ported from the original Python/Rich version (see the git history before the `rework` branch).

## The game

Designed for runs of about 20 minutes (not yet timed with real players): 3 acts (The Sewers, The Catacombs, Hell), 33 floors in all.

* **A map per act:** 10 floors of rooms on up to 4 lanes, then the boss. The whole map is visible from the start; each room links to 1 to 3 rooms on the next floor, so you plan a route. Rooms: Fight, Elite (40% tougher, double XP and gold, gear one quality tier up), Event, Shop (the merchant) and Rest (rest for 40% health and all mana, or forge one item). At least one path reaches a Rest on floor 9 or 10.
* **No healing between fights:** health comes back only from Rest rooms, potions, the merchant, events, level-ups (+10), and a full heal when you enter the next act.
* **One hero who adapts:** each run starts with a choice of 3 random weapons, plus one random single-target spell. The rest of the build comes from rewards.
* **Readable combat:** every enemy announces its next move (physical or magic attack, poison, heal, buff). Actions: Attack, Defend (blocks 75% of each hit this turn, 90% with a sword, and gives +10 mana), spells, potions, Flee (not against bosses).
* **4 stats:** Strength (melee weapons, Armor), Agility (daggers, throwing knives, bows, dodge, turn order), Intelligence (wands, staves, spell power, Ward), Perception (critical hit chance and damage; from gear only). Each stat's role gives +1% per 2 points above 10.
* **Level-ups:** +10 health and 3 points to spend: +1 Strength, Agility or Intelligence, or +5 max health.
* **9 weapon families**, each with a scaling grade and a trait (Parry, Cleave, Crush, Stagger, Twin strike, Quick, Keen, Arcane, Channel). One-handed weapons can be dual-wielded.
* **Armor:** heavy (Armor against physical hits, -1 Agility per piece), medium (dodge), light (mana and Ward against magic). 4-piece set bonuses; Rare and Epic items roll affixes.
* **18 spells:** 6 elements × (single target, all enemies, powerful), each element with a signature effect (burn, chill, stun, chain, heal, curse). Ranks I to IV, and a 4-slot spellbook.
* **Rewards:** pick 1 of 3 after every fight (weapons, armor, spells, potions), from Common to Epic. Every choice shows what it changes, before and after (attack damage, max HP, stats, crit, dodge, Armor, Ward); spells show their damage for you.
* **Events:** shrine, stat trial, Strange brew (+3 or -2 to a random stat) and Locked chest (gold and a reward, or a trap). Enemies drop gold.
* **Bosses** enrage from their 8th turn.
* **The room box:** titled with the act and the room ("The Sewers - Fight"), it shows only what happened in the current room; Continue moves on and clears it.

## Balance

`src/game/balance.test.ts` plays hundreds of simulated runs on every `npm test`. A "first button" bot must lose, a sensible bot must win between 20% and 50% of runs, no build (Strength, Agility, Intelligence) may be more than 15 points ahead of another, and fights must average 3.5 turns or fewer (for 20-minute runs). To see the numbers: `npx vitest run balance --reporter=verbose`.

Overall difficulty is set by `DIFFICULTY` in `src/game/game.ts` (enemy health and damage per act). All tuning so far comes from bots, not human players.

## Roadmap

Everything left before the game is complete, in the agreed order.

### Done

* Port from Python; combat core (intents, Defend, 4 stats with roles, level-ups with 3 points, bosses, enrage, death line naming the killer).
* Variety: 9 weapon families, armor and sets, affixes, 18 spells, potions, rewards, 4 events, gold, the merchant (with warnings before losing gear or a spell).
* A branching map per act (Fight, Elite, Event, Shop, Rest), clicked on directly; 33 floors; no healing between fights.
* Before/after comparisons on every choice; hero sheet.
* Screen: a room box titled with the act and the room ("The Sewers - Fight") that only holds the current room, with Continue between rooms. On the `ui` branch: the 8-bit look and a fixed HUD on wide screens.
* Balance bots on every test run (win rate, build parity, fight length).

### 1. Enemies

* At least 4 enemy types per act with coherent lore; act 3 (Hell) still uses placeholder enemies.
* 3 bosses per act, one picked at random each run.
* Re-tune balance afterwards (build parity is currently 14.7 points against a 15-point limit).

### 2. End-of-run screen

* Damage dealt, by type (each weapon family, each element, poison and burn).
* The weapon and the spell that dealt the most.
* The enemy that killed you, if one did.
* Meta currency earned this run.
* A Continue button back to the home screen.

### 3. Home screen and meta-progression

* Home screen: start a run, meta-progression store, unlocks, reset progression.
* A currency earned per run; permanent upgrades and unlocks bought with it.
* The first win should be relatively easy; harder content opens up after it.
* Save progression on the device (web: browser storage; Android: app storage).
* The store sells two things:
  * **Unlocks:** new content (weapon families, spells, events, enemies) that only appears in runs once bought.
  * **Permanent boosts with levels:** each can be bought up to 5 times, each level costing more than the last (e.g. "+1 point per level-up" per level).
* Still open: the exact list of unlocks and boosts, and their prices.

### 4. Difficulty levels 1 to 10

* Unlocked one by one through meta-progression.
* Higher levels: more elites, the same enemies pumped up, elemental resistances (30–40% less damage, e.g. a Fire Rat against fire) and weaknesses (10–20% more, e.g. to water).
* Enemies that resist physical attacks, elites included, to force the use of spells.
* Level 10: 2 bosses per act.

### 5. Saving a run in progress

* Closing the app or the tab mid-run must not lose the run (essential on phones, where the system closes apps in the background).

### 6. Screen and controls

* **Full UI review (mandatory):** go through every screen (weapon choice, map, fight, rewards, shop, rest, events, level-up, death and victory) on a computer and on a phone, with screenshots, and judge it as a game HUD: where the eye goes, what moves, what is hard to read. Fix what it finds before merging the `ui` branch (8-bit look, fixed HUD).
* Phone layout: a fixed HUD for small screens too (for example tabs for Map, Hero and Gear, with the room, enemies and choices always visible). Today it is one scrolling column.
* Bundle the pixel fonts with the game (today they load from Google Fonts, so the Android app without internet falls back to a plain font).
* A red flash when the hero is hit.
* The comparison box: show only the stats that change, so it fits without scrolling.
* Map: the boss tile never shows as "current"; the next floor's rooms already show as reachable during a room.
* Pixel icons for the 5 room types (no emoji).
* A short how-to-play for the first run (intents, Defend, the map).
* Settings screen: animations on/off, reset progression, and sound volume if sound is added.
* Keyboard shortcuts on computers: number keys pick choices (the number shown on each button), Space continues.
* Sound effects (hits, crits, level-ups, buying) and music (a track per act), chiptune to match the 8-bit look. Still open: making or licensing the tracks.

### 7. Balance and playtests

* Re-tune with the bots after each of steps 1, 3 and 4.
* Playtests with real players: check that a run takes about 20 minutes and that the first win is reachable.

### 8. Release

* First Android build, tested on a real phone (Android 7.0 and newer).
* App icon and splash screen.
* Play Store: listing (description, screenshots), signing key, content rating, data safety form, privacy policy.
* Installable web version (PWA: works offline, can be added to the home screen) and hosting.
* High scores / run history.
* No ads at release; reconsider afterwards (ads would also need the consent screen required in Europe). The game stays free.

## Code

* `src/game/`: all the game logic, with no UI (`io.ts` connects it to the UI or to the tests).
* `src/main.ts`, `src/style.css`, `index.html`: the web UI.
* `android/`: the Android project generated by Capacitor.

## Running the game

Requirements: Node.js 22.12 or newer. For Android: Android Studio with JDK 21; the app targets Android 7.0 and newer.

1. Run `npm install`.
2. Web: `npm run dev`, then open the URL it prints. Build: `npm run build` (output in `dist/`).
3. Tests: `npm test`.
4. Android (not yet tested): `npm run android` builds the web app, runs `cap sync` and opens Android Studio.

## Branches

`main` (stable), `develop` (new features), `fix` (bug fixes, branched from `develop`).
