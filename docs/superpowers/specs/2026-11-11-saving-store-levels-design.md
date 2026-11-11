# Saving, the home screen and store, and difficulty levels

Date: 2026-11-11. Status: built without approval, at the user's request; every "My call" below is also listed in `docs/questions.md`.

## Why

A run was lost when the tab closed, nothing carried over from one run to the next, and there was one difficulty. This design covers roadmap steps 3a, 3b and 4, which share one piece of data: the player's profile.

## Decided by the user

- Closing the tab or the app mid-run must not lose the run. Saves carry a version and old saves are converted.
- A home screen: start a run, the store, best results, reset progression.
- A currency earned each run; the store sells unlocks (new content) and boosts (5 levels each, rising prices).
- Difficulty levels 1 to 10, unlocked one by one by winning: more Elites, tougher enemies, elemental resistances (30–40% less) and weaknesses (10–20% more), enemies that resist physical attacks, 2 bosses per act at level 10.
- The first win should be relatively easy.

## My calls

### Saving (`src/game/save.ts`)

- **Replay, not a state machine.** A run in progress is saved as its random seed, its difficulty level and the list of answers given. On reload the game plays the run again with those answers, silently, and hands over at the first unanswered question. Every answer is stored the moment it is given.
- All game randomness goes through `random()` in `io.ts`, seeded per run.
- **Limit:** a run cannot be replayed once the rules have changed. `RULES` in `save.ts` is bumped by hand with any such change; a run saved under older rules is ended and paid Ash for the floor it had reached.
- A run that crashes is dropped, otherwise it would crash again on every reload.
- Storage is `localStorage`. Where it is refused, the game plays without saving.
- Save format version 2. Version 1 (a run, no profile) is converted.

### Currency and store (`src/game/meta.ts`, `src/game/home.ts`)

- The currency is called **Ash**. A run pays 1 per floor reached, 10 per boss beaten and 25 for a win, 20% more per difficulty level above 1. A win at level 1 pays 88; a death on floor 17 pays 27.
- **Unlocks (11, 350 Ash in all):** the three two-handed weapon families (Hammers, Bows, Staves, 40 each), the six powerful spells (30 each), and two events (Strange brew and Locked chest, 25 each). Everything else is available from the first run.
- **Boosts (5 levels each, 20 / 40 / 70 / 110 / 160 Ash, 400 per boost):** Vigor +8 max health, Focus +10 max mana, Purse +15 starting gold, Might +3% damage dealt, Training +1 stat point to spend at the start of a run.
- No enemies are sold: each act has exactly 4.
- The home screen and the store are asked through `io.ask`, like every other screen. With a run in progress, the game opens on the run, not on the home screen.
- Best results: furthest floor, and wins per difficulty level.

### Difficulty levels (`LEVELS` in `src/game/meta.ts`)

Each level keeps everything the levels before it added.

| Level | Adds |
|---|---|
| 1 | The base game |
| 2 | Enemies have 10% more health and damage |
| 3 | More Elite rooms (20% of rooms, from 15%) |
| 4 | Enemies resist their own element (35% less) and are weak to its opposite (15% more) |
| 5 | 20% more health and damage |
| 6 | Some enemies are armored: weapons deal 30% less to them |
| 7 | 30% more health and damage, 25% Elite rooms |
| 8 | Every Elite is armored |
| 9 | 40% more health and damage, 30% Elite rooms |
| 10 | Two bosses at the end of each act, one after the other |

- Opposites: Fire and Water, Earth and Lightning, Light and Shadow.
- Armored enemies: Sludge, Skeleton, Chained Brute (one per act).
- Burn and Thorns ignore resistances and armor.
- At level 10 the two bosses are different, fought in two fights in a row with no healing between, each with its own reward.
- An enemy shows "Resists Fire, weak to Water" or "Armored" next to its other statuses.

## Balance (roadmap step 7, the bots' part)

Locking content made a new profile much weaker (12% wins, from 29%), so the game was re-tuned. The contract in `balance.test.ts` is now checked on a **new profile** at level 1, and the parity check is enforced again.

- `DIFFICULTY` went from 1.4 / 1.75 / 1.85 to 1.2 / 1.5 / 1.6.
- Sword, Axe and Mace gained 1 damage (minimum and maximum). Dagger and Throwing Knives scale a little less with Agility (grade 0.07 to 0.06); the Dagger's maximum went from 10 to 11.

| Bots, wins | Strength | Agility | Intelligence |
|---|---|---|---|
| New profile, level 1 (the contract) | 37.7% | 41.5% | 30.5% |
| Everything bought, level 1 | 85% | 91.5% | 71% |
| Everything bought, level 10 | 22% | 24.5% | 38% |

## Out of scope

- Run history; an "abandon run" button; cloud saves.
- Saving through `@capacitor/preferences` on Android (question for the user, step 8).
- A balance contract for bought profiles and for level 10: the numbers are printed on every test run and wait for the user's targets.
