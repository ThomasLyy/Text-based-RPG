# 8-bit Descent

A turn-based pixel-art roguelite for the browser, written in TypeScript (Vite): small sprites drawn in code, progression between runs, 10 difficulty levels. Web only for now; the Android version is set aside. Ported from the original Python/Rich version (see the git history before commit `ce641ff`, the TypeScript port).

## The game

Designed for runs of about 20 minutes (not yet timed with real players): 3 acts (The Sewers, The Catacombs, Hell), 33 floors in all.

* **A map per act:** 10 floors of rooms on up to 4 lanes, then the boss. The whole map is visible from the start; each room links to 1 to 3 rooms on the next floor, so you plan a route. Rooms: Fight, Elite (40% tougher, double XP and gold, gear one quality tier up), Event, Shop (the merchant) and Rest (rest for 40% health and all mana, or forge one item). At least one path reaches a Rest on floor 9 or 10.
* **No healing between fights:** health comes back only from Rest rooms, potions, the merchant, events, level-ups (+10), and a full heal when you enter the next act.
* **One hero who adapts:** each run starts with a choice of 3 random weapons, plus one random single-target spell. The rest of the build comes from rewards.
* **Readable combat:** every enemy announces its next move (physical or magic attack, poison, heal, buff). Actions: Attack, Defend (blocks 75% of each hit this turn, 90% with a sword, and gives +10 mana), spells, potions, Flee (not against bosses).
* **4 stats:** Strength (melee weapons, Armor), Agility (daggers, throwing knives, bows, dodge, turn order), Intelligence (wands, staves, spell power, Ward), Perception (critical hit chance and damage; from gear only). Each stat's role gives +1% per 2 points above 10.
* **Level-ups:** +10 health and 3 points to spend (more with the Training boost): +1 Strength, Agility or Intelligence, or +5 max health.
* **9 weapon families**, each with a scaling grade and a trait (Parry, Cleave, Crush, Stagger, Twin strike, Quick, Keen, Arcane, Channel). One-handed weapons can be dual-wielded.
* **Armor:** heavy (Armor against physical hits, -1 Agility per piece), medium (dodge), light (mana and Ward against magic). 4-piece set bonuses; Rare and Epic items roll affixes.
* **18 spells:** 6 elements × (single target, all enemies, powerful), each element with a signature effect (burn, chill, stun, chain, heal, curse). Ranks I to IV, and a 4-slot spellbook.
* **Rewards:** pick 1 of 3 after every fight (weapons, armor, spells, potions), from Common to Epic. Every choice shows what it changes, before and after (attack damage, max HP, stats, crit, dodge, Armor, Ward); spells show their damage for you.
* **Events:** shrine, stat trial, Strange brew (+3 or -2 to a random stat) and Locked chest (gold and a reward, or a trap). Enemies drop gold.
* **Enemies:** 4 per act, fitting the place: vermin, outlaws and a drowned cult in The Sewers; the restless dead and their keepers in The Catacombs; ash, chains and fire in Hell.
* **Bosses:** each act has 3 (for example the Gutter King, the Brood Mother and the Drowned Prophet in The Sewers) and a run meets one of them, picked at random. Bosses enrage from their 8th turn.
* **End of run:** on death or victory, a screen lists the damage you dealt by type (each weapon family, each element, burn, thorns), your best weapon and your best spell, and what killed you.
* **Saving:** the run in progress is saved after every choice; closing the tab or the app and coming back continues it where it was.
* **Between runs:** every run earns Ash. The store on the home screen sells unlocks (the two-handed weapons, the six powerful spells, two events) and five permanent boosts with 5 levels each. The home screen also shows your best results and can reset your progression.
* **10 difficulty levels,** opened one by one by winning: enemies with more health that hit harder (twice the health and 50% harder hits at the top), more Elite rooms, enemies that resist their own element and are weak to its opposite (from level 4), armored enemies that weapons hurt 10% less (from level 6), and two bosses per act at level 10.
* **Home screen:** the title, the nine bosses that wait below, your Ash and best results.
* **Look:** an old screen, with scanlines, a checkered background and hard-edged frames. Every enemy and boss has a 16×16 sprite and faces you in the fight; weapon families, elements and room types have icons. Hits show floating numbers, a shake, a pop on critical hits and a red flash when you are hurt. All sprites are text in `src/sprites.ts`; there are no image files.
* **Sound:** effects and one music track per act, made in code (`src/audio.ts`), with no audio files.
* **Phones and computers:** a fixed screen that never scrolls as a page. Phones show health and mana at all times, with tabs for the room, the map, the hero and the gear. On computers, number keys pick choices and Space continues.
* **Settings:** animations on or off, music and sound volume. A three-page how-to-play is shown before the first run.
* **Offline:** the web version can be installed and starts with no network; fonts ship with the game, which makes no request to any other site.
* **The room box:** titled with the act and the room ("The Sewers - Fight"), it shows only what happened in the current room; Continue moves on and clears it.

## Balance

`src/game/balance.test.ts` plays about 5,000 simulated runs on every `npm test` (a little over a minute). On a new profile at difficulty level 1, a "first button" bot must lose, a sensible bot must win between 20% and 50% of runs, no build (Strength, Agility, Intelligence) may be more than 10 points ahead of another, and fights must average 3.5 turns or fewer (for 20-minute runs). At level 10 with everything bought, the bots must win between 35% and 65% of runs with no build more than 15 points ahead. The test also prints, without checking them, the win rates with everything bought at levels 1 and 5. To see the numbers: `npx vitest run balance --reporter=verbose`.

Overall difficulty is set by `DIFFICULTY` in `src/game/game.ts` (enemy health and damage per act); the difficulty levels are the `LEVELS` table in `src/game/meta.ts`. All tuning so far comes from bots, not human players.

## Roadmap

Where the project stands and what is left is in [docs/roadmap.md](docs/roadmap.md). It is written as a brief for an AI agent, and stays readable for people. The decisions waiting for the developer are in [docs/questions.md](docs/questions.md).

## Code

* `src/game/`: all the game logic, with no UI (`io.ts` connects it to the UI or to the tests).
* `src/main.ts`, `src/style.css`, `index.html`: the web UI. `src/sprites.ts`: the pictures. `src/audio.ts`: the sound.
* `public/`: the fonts with their licences, the app icon, the web manifest and the service worker for offline play.
* `docs/playtest.md`: what to time and ask when people try the game. `docs/superpowers/specs/`: the designs, with their reasons.

## Running the game

Requirements: Node.js 22.12 or newer.

1. Run `npm install`.
2. Play: `npm run dev`, then open the URL it prints.
3. Build: `npm run build` (output in `dist/`, which works from any folder of any static host). `npm run preview` serves that build, with offline play.
4. Tests: `npm test`.

## Branches

`main` (stable), `develop` (logic), `ui` (look and screens), `fix` (bug fixes, branched from `develop`). Today `ui` holds the latest work.
