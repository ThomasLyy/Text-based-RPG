# Roadmap: brief for the agent finishing the game

You are continuing a game that a single developer (the user) is building with AI agents, step by step, through discussion. Your job: take the **next unfinished step** below to done, with the user deciding every open design question. This file is the single source of truth for what is left; the README's "The game" section describes what already exists.

If this file and the code disagree, the code is right: tell the user and correct this file in the same commit as the step.

## The project

A turn-based roguelite: 3 acts, a branching map per act, one hero who adapts to the rewards of each run, runs of about 20 minutes. It started as a text RPG and is becoming a **pixel-art roguelite** with very little art (16×16 sprites drawn in code, see step 5). Web first (Vite + TypeScript, vanilla DOM, no framework); Android (Capacitor) comes only at step 8.

- `src/game/` holds all game logic and no UI. `io.ts` is the seam between the logic and the UI (or the tests). Keep it that way: logic that needs the UI goes through `io.ts`.
- A run is one long async function (`src/game/game.ts`) that waits on `io.ask` for every choice. Randomness is `Math.random`, called directly in about 15 places. Both facts matter for saving (step 3).
- `src/main.ts`, `src/style.css`, `index.html` are the web UI.
- Tests: `src/game/game.test.ts` (rules) and `src/game/balance.test.ts` (simulated runs with bots; see **Balance** below).
- Overall difficulty: `DIFFICULTY` in `src/game/game.ts`.
- Past designs, as examples of the expected format: `docs/superpowers/specs/2026-11-11-floor-map-design.md` and its plan in `docs/superpowers/plans/`.

## Rules from the user

- All in-game text in English.
- One hero, no classes.
- No emoji anywhere in the game; icons are pixel art (step 5). The look is restrained, text-first, 8-bit.
- Original names only: invent names for enemies, places and items rather than reusing ones from other games (act 3 was renamed from "The Spire" to "Hell" for this reason). The agent's reading, to confirm with the user: common words (Rat, Skeleton, Ghoul) are fine; a name that makes a player think of one specific game is not.
- The game is free forever. No ads at release.
- Keep art ambitions small: sprites only where this file lists them.
- Never loosen the thresholds in `balance.test.ts` without the user's approval.

## Git

- `main` is stable. `develop` is where feature work happens. `fix` is for bug fixes, branched from `develop` and merged back, **one commit per fix**.
- `ui` is for look and screen work (steps 5 and 6): branched from `develop`, merged back once the user approves it. Logic work (steps 1 to 4) goes on `develop`.
- `develop` is merged into `main` only when the user has approved a finished step.
- Commit when a coherent piece is done, with a message that says what changed. **Push only when the user says so.**

## How to run a step

1. **Baseline:** on the step's branch, run `npm test` and `npm run build` before changing anything, and note the bots' numbers (`npx vitest run balance --reporter=verbose`). A failure you did not cause is reported to the user first.
2. **Read** the step below and every file it touches. List what the step must reach: code, tests, README.
3. **Ask** the user the step's open questions (listed per step), plus any you found. Propose an answer for each so the user can just say yes. Wait for the answers. Write the proposal into the step below, marked as not yet approved, so a new session does not start it again.
4. **Spec:** write `docs/superpowers/specs/<date>-<topic>-design.md` in the format of the floor-map spec (Why, Decided by the user, the design, what's out of scope). Get the user's approval.
5. **Plan:** small tasks in order, each with the files it touches and its test. For a step that changes three files or fewer, the plan is a "Tasks" section at the end of the spec; otherwise it is `docs/superpowers/plans/<date>-<topic>.md`.
6. **Build** it, test first for rules (a failing test in `game.test.ts`, then the code).
7. **Check:** `npm test` and `npm run build` both pass, and for anything visible, run `npm run dev` and look at it in a browser at computer width and at phone width (360 px). Report the bots' numbers next to the baseline; do not re-tune before step 7 (see **Balance** below).
8. **Close:** update the README's "The game" section to describe the new behaviour, move the step's items into **Done** below (one line), commit, and tell the user what was done and what is left.

A step is done when every "Done when" line of that step is true.

**Changed by the user on 2026-11-11: do not stop between steps.** Build every step in order. Where this file says to ask, wait or get approval, make the call yourself, build on it, and write it in `docs/questions.md` (what you decided, or what only the user can check or do). The user goes through that file at the end. Specs are still written, with "My calls" in place of an approval. Things that cannot be undone or that leave the machine (pushing, publishing, the Play Store) are never done without the user: they go in `docs/questions.md` too.

## Balance

`balance.test.ts` is the balance contract. It plays 200 "first button" runs and 600 runs per build (Strength, Agility, Intelligence) with a fixed seed, on a new profile, and requires: the first-button bot wins under 10%; the sensible bot wins between 20% and 50% overall; no build is more than 15 points ahead of another; fights average 3.5 turns or fewer. It also prints the win rates with everything bought, at levels 1 and 10. It takes about a minute.

**Decided by the user on 2026-11-11: build first, balance once everything is built.** Steps 1 to 6 do not re-tune. Each step notes the bots' numbers before and after and reports them; tuning happens in step 7.

**The parity check was print-only until the bots' part of step 7, done on 2026-11-11. It is enforced again.** The contract is now checked on a new profile (nothing bought) at level 1; see the spec of steps 3 and 4 for the numbers after tuning. Whenever a change would make a saved run play out differently, bump `RULES` in `src/game/save.ts`.

Numbers at 600 runs, 2026-11-11:

| | Strength | Agility | Intelligence | Gap |
|---|---|---|---|---|
| Before step 1 | 31.8% | 40% | 24.2% | 15.8 |
| After step 1 (3 bosses per act) | 25.2% | 35.5% | 25.5% | 10.3 |

- **Noise:** with 600 runs a build's win rate is known to about ±4 points. Any change that adds or removes one random draw (a random boss, for example) reorders every run and can move the gap by a few points with no real change in balance.
- When tuning (step 7): change `DIFFICULTY` or enemy numbers, never the thresholds. Show the user the before and after table.
- Intelligence is the weakest build today. A change that makes enemies more magical, or adds physical resistance (step 4), moves the builds in different directions; say which way in the spec.

## Done

- Port from Python; combat core (intents, Defend, 4 stats with roles, level-ups with 3 points, bosses, enrage, death line naming the killer).
- Variety: 9 weapon families, armor and sets, affixes, 18 spells, potions, rewards, 4 events, gold, the merchant (with warnings before losing gear or a spell).
- A branching map per act (Fight, Elite, Event, Shop, Rest), clicked on directly; 33 floors; no healing between fights.
- Before/after comparisons on every choice; hero sheet.
- Screen: a room box titled with the act and the room ("The Sewers - Fight") that only holds the current room, with Continue between rooms. The 8-bit look and a fixed HUD on wide screens.
- Balance bots on every test run (win rate, build parity, fight length).
- Step 1, enemies: 4 enemies per act with lore, act 3's placeholders replaced, 3 bosses per act with one picked at random per run (spec: `docs/superpowers/specs/2026-11-11-enemies-design.md`, which also records each enemy's element for step 4). Enemy behaviours are to be revisited later, at the user's request.

- Step 2, end-of-run screen: the run counts damage dealt per weapon family, element, spell, burn and thorns (`Player.dealt`); the Victory or Defeat screen lists it with the best weapon and spell.

- Steps 3 and 4: saving by replay (seed and answers), the home screen, the Ash currency and the store (11 unlocks, 5 boosts), 10 difficulty levels as one table. Spec: `docs/superpowers/specs/2026-11-11-saving-store-levels-design.md`.
- Step 7, the bots' part: re-tuned for a new profile, parity check enforced again. Playtests with real players are still to do.
- Steps 5 and 6: 41 sprites in code, enemies facing the player, hit feedback, phone HUD with tabs, settings, how-to-play, keyboard shortcuts, bundled fonts, sound effects and music made in code. Spec: `docs/superpowers/specs/2026-11-11-look-screens-sound-design.md`. The user has not approved the sprites or heard the sound yet.
- Step 8, the agent's part: installable offline web version, relative paths, app icon, store text drafts. The name, the Android build and the Play Store are the user's; see `docs/questions.md`.

**What is left on 2026-11-11:** everything in `docs/questions.md`. Go through it with the user, one entry at a time, apply each answer, and delete the entry. `ui` is ahead of `develop`; merge it only when the user approves the look.

## 1. Enemies (done, kept for reference)

Today each act has 4 enemies and 1 boss in `ACTS` (`src/game/enemy.ts`); act 3's are placeholders.

- At least 4 enemy types per act, with lore that fits the act (The Sewers, The Catacombs, Hell). Review acts 1 and 2 for coherence; replace act 3's placeholders.
- 3 bosses per act; each run picks one per act at random.
- Enemies use the existing intent kinds (physical attack, magic bolt, poison, heal, buff). Each should play differently: a distinct pattern, not just different numbers.
- Step 4 will give enemies elemental resistances and weaknesses (e.g. a Fire Rat resists fire), so pick themes that suggest an element where it fits. The spell elements are Fire, Water, Earth, Lightning, Light and Shadow.
- Decided by the user on 2026-11-11: the existing regular enemies keep their health, speed, XP and pattern for now; enemy behaviours are decided later.
- Code this must reach: `boss` becomes `bosses` in the `Act` type; `bossOf` in `game.ts` picks one; the victory line in `game.ts` names `ACTS.at(-1).boss` and must name the boss that was beaten; the encounters test in `game.test.ts` compares `bossOf` with `boss.name`.

Open questions: the lore of each act; the enemy and boss names; whether to add an element field to enemies now or in step 4.

**Approved by the user on 2026-11-11 and built:**

| Act | Lore | Enemies (today → proposed) | Elements |
|---|---|---|---|
| The Sewers | The flooded drains where the city throws what it wants forgotten: vermin, outlaws, a drowned cult. | Rat (kept), Goblin → Gutter Thief, Slime → Sludge, Cultist → Drowned Cultist | Water, Earth |
| The Catacombs | Burial galleries under the sewers; the dead do not rest, and their keepers went wrong. | Skeleton (kept), Giant Spider → Crypt Spider, Ghoul (kept), Dark Acolyte → Gravekeeper | Shadow, Earth |
| Hell | Below the graves: ash, chains and fire, where the damned guard the damned. | Wraith → Ash Shade, Troll → Chained Brute, Fire Imp → Ember Imp, Dread Knight → Oathbreaker | Fire, Shadow, Lightning |

| Act | Boss | How it plays |
|---|---|---|
| Sewers | Gutter King (today's Goblin Warlord, same pattern) | Physical; buffs itself, then a crushing blow every 4th turn |
| Sewers | Brood Mother | A giant rat; fast, poison between bites, a frenzy |
| Sewers | Drowned Prophet | Magic; bolts, heals itself, then one big bolt |
| Catacombs | Bone Colossus (kept) | Mixed physical and magic, heals, Earthshatter |
| Catacombs | Embalmer | Stacks poison, heals itself, hits weakly |
| Catacombs | Hollow King | Magic; buffs twice, then a huge shadow bolt to Defend |
| Hell | Ashen Warden (today's Lich, same pattern) | Magic; bolt, burning poison, heal, Doom |
| Hell | Iron Judge | Physical; chain lashes, a buff, then an execute |
| Hell | Pyre Mother | Fast fire bolts, no heal, no pause |

- The two new bosses of each act get the health of the act's current boss and a similar damage total over one loop of the pattern. Exact numbers go in the spec.
- Element field: add it in step 4, when something reads it; the spec records each enemy's intended element.

Done when: every act has at least 4 non-placeholder enemies and 3 bosses; a test shows the boss is picked among the act's 3; the victory line names the boss that was beaten; `npm test` passes apart from the parity check (see **Balance**).

## 2. End-of-run screen (done, kept for reference)

Shown on death and on victory.

- Damage dealt by the hero, by type: each weapon family, each element, and burn. (The hero has no poison; only enemies poison.)
- Decided by the user on 2026-11-11: only the damage the hero dealt; no list of damage received.
- The weapon and the spell that dealt the most damage.
- The enemy that killed the hero, if one did.
- Meta currency earned this run (the currency itself comes in step 3; show 0 or leave the line out until then, as the user prefers).
- A Continue button back to the home screen (until step 3 exists, it starts a new run).

Done when: the run tracks damage per source in the game logic, a test checks the totals over a scripted fight, and the screen shows every line above.

## 3. Home screen, meta-progression and saving (done, kept for reference)

Two parts, in this order, each with its own spec and its own stop for the user.

### 3a. Saving

- Save progression on the device, and save the run in progress with the same storage: closing the tab or the app mid-run must not lose the run (phones close background apps).
- Saves carry a version number; when an update changes the format, old saves are converted, never lost.
- **This is the riskiest item of the roadmap.** A run is one async function waiting on `io.ask`, so its position cannot be written to storage as it is. Two ways:
  - **Replay (the agent's recommendation, the user asked which is better on 2026-11-11; confirm in the 3a spec):** give the run one seeded random generator in place of `Math.random`, save the seed and the list of answers given to `io.ask`, and on reload play the run again silently up to the last answer. Small change to the logic; the limit is that an update which changes the rules makes an in-progress run impossible to replay, so such a run is ended and paid out as it stood.
  - **State machine:** rewrite the run so every screen is a state that can be saved. Survives rule changes, but rewrites `game.ts`, `combat.ts`, `reward.ts` and `events.ts`.
- A seeded generator also makes any bug report reproducible from its seed.

Open questions: replay or state machine; the storage on Android (`localStorage` in the WebView can be cleared by the system; `@capacitor/preferences` is the safe option but adds a dependency); what happens to a run in progress when an update changes the rules.

Done when: a run in progress survives a reload at any screen (map, fight, reward, shop, event, level-up) and continues with the same enemies, health and offers; a test saves mid-fight, reloads and compares the state; a test loads a save of version N-1 and converts it.

### 3b. Home screen and store

- Home screen: start a run, the store, best results, reset progression.
- A meta currency earned each run (more for going further and for winning). The first win should be relatively easy; harder content opens up after it.
- The store sells two kinds of things:
  - **Unlocks:** new content (weapon families, spells, events, enemies) that appears in runs only once bought.
  - **Boosts:** permanent, each bought up to 5 times, each level costing more than the last (e.g. "+1 point per level-up" per level).
- Best results: for example the furthest floor reached and wins per difficulty level. No run history.
- The balance bots must run both with nothing bought and with everything bought: boosts change the win rate, and the thresholds were set for a hero with none.

Open questions: the exact list of unlocks and boosts and their prices (propose a list); the currency's name; what is locked at the start; which win rate is the target with everything bought.

Done when: the store works and persists across a page reload; reset progression wipes everything after a confirmation; the user has seen the bots' win rates with nothing bought and with everything bought.

## 4. Difficulty levels 1 to 10 (done, kept for reference)

- Unlocked one by one through meta-progression (winning at level N unlocks N+1).
- Higher levels: more elites, the same enemies with more health and damage, elemental resistances (30–40% less damage, e.g. a Fire Rat against fire) and weaknesses (10–20% more, e.g. to water).
- Some enemies resist physical attacks (elites included), so the player has to use spells.
- Level 10: 2 bosses per act.

Open questions: what each level adds exactly (propose a table, levels 1 to 10). For step 7, not now (the user: build first): whether the 15-point build parity still applies at high levels (physical resistance is meant to hurt Strength and Agility builds), and the target win rate at level 10.

Done when: each level's changes are data in one table; tests cover resistances, weaknesses and the 2 bosses of level 10; the balance bots run at levels 1 and 10 and the user has seen their win rates.

## 5. Look and feel (built, waiting for the user's eye)

On `ui`.

- Sprites are 16×16, drawn in code: each sprite is 16 strings of 16 characters, each character a key into a shared palette (`.` for transparent), rendered in the browser (canvas or CSS), crisp at any scale. No image files. One palette and one outline rule for everything.
- The fight screen looks like an old dungeon crawler: the enemies' sprites face the player, scaled up, side by side. The hero has no sprite (first-person view).
- A sprite for every enemy and boss; its look follows the lore from step 1.
- Pixel icons: one per weapon family (9), one per element (6), one per room type (5). With 12 enemies and 9 bosses that is 41 sprites.
- Hit feedback: floating damage numbers, the target shakes, a pop on critical hits, enemies fade out when they die, a red flash when the hero is hit. Until step 6 adds the "animations off" setting, all of it follows the system's "reduce motion" setting (`style.css` already has a `prefers-reduced-motion` rule).

Open questions: the palette (propose one per act or a single one); show the user 3 sprites (one enemy, one boss, one icon) in the browser and get a yes before drawing the other 38.

Done when: a test checks that every enemy, boss, weapon family, element and room type has a sprite of exactly 16×16 using only palette characters; the user has approved the sprites in the browser.

## 6. Screen and controls (built, waiting for the user's eye and ear)

On `ui`. Two parts, each with its own stop for the user.

### 6a. Screens

- **Full UI review (mandatory, first):** go through every screen (weapon choice, map, fight, rewards, shop, rest, events, level-up, end of run, home, store) at computer width and at phone width, with screenshots, and judge it as a game HUD: where the eye goes, what moves, what is hard to read. Check a minimum text size on phones, and that each enemy intent can be told apart without its color (a word or an icon), for colorblind players. Write the findings as a list for the user and fix the ones they approve. (The 8-bit look and the fixed HUD were merged before this review, at the user's request.)
- Phone layout: a fixed HUD on small screens too (for example tabs for Map, Hero and Gear, with the room, enemies and choices always visible). Today it is one scrolling column.
- The comparison box shows only the stats that change, so it fits without scrolling.
- Map: the boss tile shows as "current" when the hero is in it; the next floor's rooms show as reachable only once the current room is finished.
- A short how-to-play on the first run (intents, Defend, the map), skippable, shown once.
- Settings screen: animations on/off, reset progression, music volume, sound volume.
- Keyboard shortcuts on computers: number keys pick choices (each button shows its number), Space continues.
- Bundle the pixel fonts with the game. Today `index.html` loads them from Google Fonts: every player's browser calls Google, which does not fit "the game collects no data", and the offline Android app falls back to a plain font. Both fonts (Press Start 2P, VT323) are under the Open Font License; ship the license file with them.

Done when: every review finding is fixed or explicitly declined by the user; every screen works at 360 px wide without horizontal scrolling; every choice can be made from the keyboard; the game makes no network request to another site.

### 6b. Sound

- Chiptune sound effects (hits, crits, level-ups, buying) and music (one track per act).
- Proposed: sound effects are made in code with the browser's Web Audio (square and noise waves), like the sprites: no files, no license. Browsers only allow sound after the first click, so start the audio on the first button press.

Open questions: how the music is made or licensed (made in code like the effects, or tracks with a license that allows a free game on the Play Store, credited in the game).

Done when: every listed effect plays; each act has its track; both volumes in the settings work and are saved.

## 7. Balance and playtests

- Check that a run takes about 20 minutes and that the first win is reachable. You can't run these: prepare what the user needs (a build to share, the questions to ask, what to time) and adjust from their notes.

- Tune with the bots here, once everything is built (the user's decision): turn the parity check back on, and settle the questions left in **Balance** and in step 4.

Done when: `npm test` passes at levels 1 and 10 with every check on, and the user reports playtest runs of about 20 minutes.

## 8. Release (the agent's part is done; the rest is the user's)

- Testing before release is done by the user, with an `.apk` or through Android Studio, whichever is simpler then. The user wants no public test phase.
- The user's Play account was created before November 2023, so Google's closed test for new personal accounts (12 testers for 14 days) does not apply.
- Choose the game's name with the user ("Text-based RPG" no longer fits), then update the page title, the README, `package.json`, `capacitor.config.json` and the app name.
- First Android build (`npm run android`), tested by the user on a real phone (Android 7.0 and newer).
- App icon and splash screen, in the game's pixel style.
- Play Store: listing (description, screenshots), signing key, content rating, data safety form, privacy policy. The game collects no data and has no ads; say so in both forms.
- Installable web version (PWA: works offline, can be added to the home screen) and its hosting (ask the user where).
- No ads at release; ads may be reconsidered later (they would need the consent screen required in Europe).

Done when: the user has installed the Android build from a Play Store test track and the web version from its hosted URL, and both work offline.
