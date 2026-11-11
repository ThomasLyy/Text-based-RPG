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

## Step 1: enemies

- **Check:** the new names were not looked at in a browser when step 1 was built. They are checked with the UI review of step 6.
- **Call:** enemy behaviours were left as they were, as you asked. To revisit: Rat, Gutter Thief and Skeleton share one pattern shape (two light hits, then a heavy one).
