# Questions and calls waiting for the user

On 2026-11-11 the user asked the agent to build every remaining step without stopping, and to keep here everything that needs an answer or a validation. Each entry says what was done meanwhile, so the game is never blocked. Answer them in order at the end; the agent then applies the answers and deletes the entry.

Kinds: **Question** (the agent could not decide), **Call** (the agent decided; say if you want it changed), **Check** (only you can verify it), **Yours** (only you can do it).

## Git

- **Yours:** nothing is pushed. `develop` holds steps 1 to 4 and 7; `ui` holds steps 5, 6 and 8 on top of them. Say when to push, when to merge `ui` into `develop`, and when to merge `develop` into `main`.

## Process

- **Call:** small steps (2, 7) have no spec file; their decisions are listed here. Steps 3 to 6 each have a spec in `docs/superpowers/specs/`.

## Step 2: end-of-run screen

- **Call:** damage counts what the enemy really lost: a 30-damage hit on an enemy with 7 health counts 7.
- **Call:** "best weapon" is a weapon family (Sword), not one item, because items are replaced during a run. "Best spell" is a spell by name.
- **Call:** Thorns has its own line next to Burn. A fist fight counts as "Fists".
- **Call:** the screen is the room box, titled "Victory" or "Defeat", with a Continue button.

## Steps 3 and 4: saving, store, difficulty levels

The spec is `docs/superpowers/specs/2026-11-11-saving-store-levels-design.md`; it has the full lists and tables.

- **Call:** saving works by replay (seed and answers), as recommended. An update that changes the rules ends a run in progress and pays it for the floor it reached.
- **Call:** the currency is called Ash.
- **Call:** the 11 unlocks and their prices: Hammers, Bows and Staves (40 each), the six powerful spells (30 each), the Strange brew and Locked chest events (25 each).
- **Call:** the 5 boosts: Vigor, Focus, Purse, Might, Training, at 20 / 40 / 70 / 110 / 160 Ash per level.
- **Question:** your example boost was "+1 point per level-up" per level. With 5 levels that is 8 points per level-up in place of 3, which I judged too strong, so Training gives +1 point at the start of a run per level. Do you want the per-level-up version, perhaps with fewer levels?
- **Call:** no enemies are sold in the store, because each act has exactly 4. Selling enemies needs a 5th and 6th enemy per act.
- **Call:** the table of what each difficulty level adds (see the spec).
- **Call:** at level 10 the two bosses are fought one after the other, not together.
- **Call:** with a run in progress the game opens on the run. There is no "abandon run" button.
- **Question:** storage on Android. The game uses `localStorage`; Android can clear it when the phone is short of space. `@capacitor/preferences` is safer and adds one dependency. Which do you want?
- **Check:** play a run, close the tab mid-fight, reopen: the fight must be where you left it.

## Step 7: balance

- **Call:** re-tuned after the store locked content: enemies are about 14% weaker (`DIFFICULTY` 1.2 / 1.5 / 1.6), Sword, Axe and Mace hit for 1 more, Dagger and Throwing Knives scale slightly less. Six rule tests had their expected numbers updated to match.
- **Call:** the balance contract is now measured on a new profile at level 1: Strength 37.7%, Agility 41.5%, Intelligence 30.5% wins for the sensible bot.
- **Question:** with everything bought the bots win 71 to 92% at level 1 and 22 to 38% at level 10. What win rates do you want there? Level 10 also favours Intelligence (38% against 22%) because of armored enemies: is that the intent of "the player has to use spells", or should the 15-point parity hold at level 10 too?
- **Yours:** playtests with real players (a run of about 20 minutes, the first win reachable). `docs/playtest.md` says what to time and ask.

## Step 5: look and feel (built on `ui`, not finished)

- **Check:** the 41 sprites are a first pass and nobody has looked at them. The 21 enemies are built from 9 base shapes, recoloured, with crowns or horns added; 7 of them share the hooded shape. Look at them in the browser and say which to redraw.
- **Check:** the fight screen, the icons on the map and on choices, and the hit feedback (floating numbers, shake, critical pop, fade on death, red flash) compile and build, but were never seen in a browser: screenshots failed in the agent's session. Only the home screen was seen once.
- **Call:** one palette of 18 colours for everything, in `src/sprites.ts`.
- **Call:** until the settings screen exists, hit feedback follows the system's "reduce motion" setting.
- **Not done:** step 5's spec, the README lines, and moving step 5 to Done in the roadmap.

## Not started

- Step 6a (UI review, phone layout, how-to-play, settings, keyboard shortcuts, bundled fonts), step 6b (sound and music), step 8 (name, Android build, icon, PWA, Play Store).

## Step 1: enemies

- **Check:** the new names were not looked at in a browser when step 1 was built. They are checked with the UI review of step 6.
- **Call:** enemy behaviours were left as they were, as you asked. To revisit: Rat, Gutter Thief and Skeleton share one pattern shape (two light hits, then a heavy one).
