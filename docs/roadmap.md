# Roadmap: brief for the agent finishing the game

You are continuing a game that a single developer (the user) is building with AI agents, step by step, through discussion. Your job: take the **next unfinished step** below to done, with the user deciding every open design question. This file is the single source of truth for what is left; the README's "The game" section describes what already exists.

## The project

A turn-based roguelite: 3 acts, a branching map per act, one hero who adapts to the rewards of each run, runs of about 20 minutes. It started as a text RPG and is becoming a **pixel-art roguelite** with very little art (16×16 sprites drawn in code, see step 5). Web first (Vite + TypeScript, vanilla DOM, no framework); Android (Capacitor) comes only at step 8.

- `src/game/` holds all game logic and no UI. `io.ts` is the seam between the logic and the UI (or the tests). Keep it that way: logic that needs the UI goes through `io.ts`.
- `src/main.ts`, `src/style.css`, `index.html` are the web UI.
- Tests: `src/game/game.test.ts` (rules) and `src/game/balance.test.ts` (simulated runs with bots; its thresholds are the balance contract, read them in the file).
- Overall difficulty: `DIFFICULTY` in `src/game/game.ts`.
- Past designs, as examples of the expected format: `docs/superpowers/specs/2026-11-11-floor-map-design.md` and its plan in `docs/superpowers/plans/`.

## Rules from the user

- All in-game text in English.
- One hero, no classes.
- No emoji anywhere in the game; icons are pixel art (step 5). The look is restrained, text-first, 8-bit.
- Original names only: invent names for enemies, places and items rather than reusing ones from other games (act 3 was renamed from "The Spire" to "Hell" for this reason).
- The game is free forever. No ads at release.
- Keep art ambitions small: sprites only where this file lists them.
- When balance tuning is needed, tune with the bots in `balance.test.ts`; never loosen its thresholds without the user's approval.

## Git

- `main` is stable. `develop` is where feature work happens. `fix` is for bug fixes, branched from `develop` and merged back, **one commit per fix**.
- `ui` holds the 8-bit look and the fixed HUD; it is merged into `main`/`develop` only after the full UI review of step 6. Logic work (steps 1 to 4) goes on `develop`, then `develop` is merged into `ui`. Look and screen work (steps 5 and 6) goes on `ui`.
- Commit when a coherent piece is done, with a message that says what changed. **Push only when the user says so.**

## How to run a step

1. **Read** the step below and every file it touches. List what the step must reach: code, tests, README.
2. **Ask** the user the step's open questions (listed per step), plus any you found. Propose an answer for each so the user can just say yes. Wait for the answers.
3. **Spec:** write `docs/superpowers/specs/<date>-<topic>-design.md` in the format of the floor-map spec (Why, Decided by the user, the design, what's out of scope). Get the user's approval.
4. **Plan:** write `docs/superpowers/plans/<date>-<topic>.md`: small tasks in order, each with the files it touches and its test.
5. **Build** it, test first for rules (a failing test in `game.test.ts`, then the code).
6. **Check:** `npm test` and `npm run build` both pass, and for anything visible, run `npm run dev` and look at it in a browser at computer width and at phone width (360 px).
7. **Close:** update the README's "The game" section to describe the new behaviour, move the step's items into **Done** below (one line), commit, and tell the user what was done and what is left.

A step is done when every "Done when" line of that step is true. Stop after one step and wait for the user before starting the next.

## Done

- Port from Python; combat core (intents, Defend, 4 stats with roles, level-ups with 3 points, bosses, enrage, death line naming the killer).
- Variety: 9 weapon families, armor and sets, affixes, 18 spells, potions, rewards, 4 events, gold, the merchant (with warnings before losing gear or a spell).
- A branching map per act (Fight, Elite, Event, Shop, Rest), clicked on directly; 33 floors; no healing between fights.
- Before/after comparisons on every choice; hero sheet.
- Screen: a room box titled with the act and the room ("The Sewers - Fight") that only holds the current room, with Continue between rooms. On `ui`: the 8-bit look and a fixed HUD on wide screens.
- Balance bots on every test run (win rate, build parity, fight length).

## 1. Enemies

Today each act has 4 enemies and 1 boss in `ACTS` (`src/game/enemy.ts`); act 3's are placeholders.

- At least 4 enemy types per act, with lore that fits the act (The Sewers, The Catacombs, Hell). Review acts 1 and 2 for coherence; replace act 3's placeholders.
- 3 bosses per act; each run picks one per act at random.
- Enemies use the existing intent kinds (physical attack, magic bolt, poison, heal, buff). Each should play differently: a distinct pattern, not just different numbers.
- Step 4 will give enemies elemental resistances and weaknesses (e.g. a Fire Rat resists fire), so pick themes that suggest an element where it fits.

Open questions: the lore of each act; the enemy and boss names (propose them); whether to add an element field to enemies now or in step 4.

Done when: every act has at least 4 non-placeholder enemies and 3 bosses; a test shows the boss is picked among the act's 3; `npm test` passes (re-tune if the balance tests fail, see step 7).

## 2. End-of-run screen

Shown on death and on victory.

- Damage dealt, by type: each weapon family, each element, poison and burn.
- The weapon and the spell that dealt the most damage.
- The enemy that killed the hero, if one did.
- Meta currency earned this run (the currency itself comes in step 3; show 0 or leave the line out until then, as the user prefers).
- A Continue button back to the home screen (until step 3 exists, it starts a new run).

Done when: the run tracks damage per source in the game logic, a test checks the totals over a scripted fight, and the screen shows every line above.

## 3. Home screen, meta-progression and saving

- Home screen: start a run, the store, best results, reset progression.
- A meta currency earned each run (more for going further and for winning). The first win should be relatively easy; harder content opens up after it.
- The store sells two kinds of things:
  - **Unlocks:** new content (weapon families, spells, events, enemies) that appears in runs only once bought.
  - **Boosts:** permanent, each bought up to 5 times, each level costing more than the last (e.g. "+1 point per level-up" per level).
- Best results: for example the furthest floor reached and wins per difficulty level. No run history.
- Save progression on the device, and save the run in progress with the same storage: closing the tab or the app mid-run must not lose the run (phones close background apps).
- Saves carry a version number; when an update changes the format, old saves are converted, never lost.

Open questions: the exact list of unlocks and boosts and their prices (propose a list); the currency's name; what is locked at the start; the storage on Android (`localStorage` in the WebView can be cleared by the system; `@capacitor/preferences` is the safe option but adds a dependency).

Done when: the store works and persists across a page reload; a run in progress survives a reload at any screen (map, fight, reward, shop, event, level-up); a test loads a save of version N-1 and converts it; reset progression wipes everything after a confirmation.

## 4. Difficulty levels 1 to 10

- Unlocked one by one through meta-progression (winning at level N unlocks N+1).
- Higher levels: more elites, the same enemies with more health and damage, elemental resistances (30–40% less damage, e.g. a Fire Rat against fire) and weaknesses (10–20% more, e.g. to water).
- Some enemies resist physical attacks (elites included), so the player has to use spells.
- Level 10: 2 bosses per act.

Open questions: what each level adds exactly (propose a table, levels 1 to 10).

Done when: each level's changes are data in one table; tests cover resistances, weaknesses and the 2 bosses of level 10; the balance bots run at levels 1 and 10 and the user has seen their win rates.

## 5. Look and feel

On `ui`.

- Sprites are 16×16, drawn in code: each sprite is 16 strings of 16 characters, each character a key into a shared palette (`.` for transparent), rendered in the browser (canvas or CSS), crisp at any scale. No image files. One palette and one outline rule for everything.
- The fight screen looks like an old dungeon crawler: the enemies' sprites face the player, scaled up, side by side. The hero has no sprite (first-person view).
- A sprite for every enemy and boss; its look follows the lore from step 1.
- Pixel icons: one per weapon family (9), one per element (6), one per room type (5).
- Hit feedback: floating damage numbers, the target shakes, a pop on critical hits, enemies fade out when they die, a red flash when the hero is hit. All of it respects the "animations off" setting of step 6.

Open questions: the palette (propose one per act or a single one); show the user a few sprites before drawing all of them.

Done when: a test checks that every enemy, boss, weapon family, element and room type has a sprite of exactly 16×16 using only palette characters; the user has approved the sprites in the browser.

## 6. Screen and controls

On `ui`.

- **Full UI review (mandatory, first):** go through every screen (weapon choice, map, fight, rewards, shop, rest, events, level-up, end of run, home, store) at computer width and at phone width, with screenshots, and judge it as a game HUD: where the eye goes, what moves, what is hard to read. Check a minimum text size on phones, and that each enemy intent can be told apart without its color (a word or an icon), for colorblind players. Write the findings as a list for the user, fix the ones they approve, then merge `ui`.
- Phone layout: a fixed HUD on small screens too (for example tabs for Map, Hero and Gear, with the room, enemies and choices always visible). Today it is one scrolling column.
- The comparison box shows only the stats that change, so it fits without scrolling.
- Map: the boss tile shows as "current" when the hero is in it; the next floor's rooms show as reachable only once the current room is finished.
- A short how-to-play on the first run (intents, Defend, the map), skippable, shown once.
- Settings screen: animations on/off, reset progression, music volume, sound volume.
- Keyboard shortcuts on computers: number keys pick choices (each button shows its number), Space continues.
- Chiptune sound effects (hits, crits, level-ups, buying) and music (one track per act).

Open questions: how the music is made or licensed (only with a license that allows a free game on the Play Store, and credited in the game).

Done when: every review finding is fixed or explicitly declined by the user; every screen works at 360 px wide without horizontal scrolling; every choice can be made from the keyboard.

## 7. Balance and playtests

- Re-tune with the bots after each of steps 1, 3 and 4. Build parity is 14.7 points against a 15-point limit, so step 1 will likely break it.
- Playtests with real players: check that a run takes about 20 minutes and that the first win is reachable. You can't run these: prepare what the user needs (a build to share, the questions to ask, what to time) and adjust from their notes.

Done when: `npm test` passes at levels 1 and 10, and the user reports playtest runs of about 20 minutes.

## 8. Release

- Choose the game's name with the user ("Text-based RPG" no longer fits), then update the page title, the README, `package.json`, `capacitor.config.json` and the app name.
- Bundle the pixel fonts with the game (today `index.html` loads them from Google Fonts, so the offline Android app falls back to a plain font).
- First Android build (`npm run android`), tested by the user on a real phone (Android 7.0 and newer).
- App icon and splash screen, in the game's pixel style.
- Play Store: listing (description, screenshots), signing key, content rating, data safety form, privacy policy. The game collects no data and has no ads; say so in both forms.
- Installable web version (PWA: works offline, can be added to the home screen) and its hosting (ask the user where).
- No ads at release; ads may be reconsidered later (they would need the consent screen required in Europe).

Done when: the user has installed the Android build from a Play Store test track and the web version from its hosted URL, and both work offline.
