# Roadmap: brief for the agent finishing 8-bit Descent

You are continuing a game that a single developer (the user) is building with AI agents, through discussion. This file says where the project stands and how to work on it. `docs/questions.md` holds everything waiting for the user; the README's "The game" section describes what exists.

If this file and the code disagree, the code is right: tell the user and correct this file in the same commit.

## The project

**8-bit Descent**, a turn-based pixel-art roguelite for the browser: 3 acts, a branching map per act, one hero who adapts to the rewards of each run, runs of about 20 minutes, progression between runs, 10 difficulty levels.

**Web only.** On 2026-11-11 the user removed everything about Android and the Play Store to keep the project focused. Do not add it back until the user asks. When it returns, saves go through the safer storage (`@capacitor/preferences`), by the user's decision. The removed Android project is in the git history before commit `c2dc651`.

- `src/game/` holds all game logic and no UI. `io.ts` is the seam between the logic and the UI (or the tests): every screen, the home screen and store included, is asked through `io.ask`.
- A run is one long async function (`game.ts`). All randomness goes through `random()` in `io.ts`, seeded per run, so a run can be replayed from its seed and answers: that is how saving works (`save.ts`).
- `src/main.ts`, `src/style.css`, `index.html`: the web UI. `src/sprites.ts`: every picture, as text. `src/audio.ts`: every sound, made in code.
- `src/game/meta.ts`: the store, the profile, the difficulty levels (`LEVELS`).
- Tests: `game.test.ts` (rules), `balance.test.ts` (bots), `src/sprites.test.ts`.
- Specs of what was built, with the reasons: `docs/superpowers/specs/`.

## Rules from the user

- All in-game text in English. One hero, no classes.
- No emoji anywhere; icons are pixel art. The look is 8-bit, and the user wants it pushed further ("a big 8-bit vibe").
- Original names only. Common words (Rat, Skeleton, Ghoul) are fine; a name that makes a player think of one specific game is not.
- Free forever, no ads.
- Keep art small: 16×16 sprites drawn in code, no image files, no audio files.
- Never loosen a threshold in `balance.test.ts` without the user's approval.

## Git

- `main` is stable. `develop` is for logic work. `ui` is for look and screen work. `fix` is for bug fixes, one commit per fix.
- **Today `ui` holds everything** and is ahead of `develop`, which is ahead of `main`.
- **Push and merge only when the user says everything is validated** (the user, 2026-11-11). Until then, commit locally.

## How to work

1. **Baseline:** run `npm test` and `npm run build` before changing anything. A failure you did not cause is reported first.
2. **Read** what you are about to change and list what it must reach: code, tests, README, this file.
3. **Do not stop to ask.** Where a decision is the user's, make the call, build on it, and write it in `docs/questions.md`. The user goes through that file when they choose to. Never push, publish or deploy without the user.
4. **Spec** anything large in `docs/superpowers/specs/<date>-<topic>-design.md`, with "My calls" in place of an approval.
5. **Build** test first for rules.
6. **Check:** `npm test` and `npm run build` pass. For anything visible, run `npm run dev` and look at it at computer width and at 360 px. Screenshots from the agent's browser work right after a page load; if one times out, reload and take it again.
7. **Close:** update the README's "The game" section, this file and `docs/questions.md`; commit.

When a change would make a saved run play out differently (enemies, items, odds, the order of random draws), bump `RULES` in `src/game/save.ts`. When the save format changes, bump `SAVE_VERSION` and add a converter with its test.

## Balance contract (`balance.test.ts`)

Decided by the user on 2026-11-11: no build more than 10 points ahead of another at each level, or 15 where 10 cannot be reached; level 10 must be winnable (22% was too low).

| Check | Limit | Measured |
|---|---|---|
| New profile, level 1: the "first button" bot | wins under 10% | 0% |
| New profile, level 1: the sensible bot overall | 20% to 50% | 37.5% (Strength 37.7, Agility 41.5, Intelligence 33.2) |
| New profile, level 1: gap between builds | 10 points | 8.3 |
| New profile, level 1: turns per fight | 3.5 or fewer | 3.1 to 3.5 |
| Everything bought, level 10: overall | 35% to 65% | 54% (50, 50, 62) |
| Everything bought, level 10: gap between builds | 15 points | 11 to 13 |

- 600 runs per build: a win rate is known to about 4 points either way, and a gap to about 5. A change that adds or removes one random draw reorders every run and moves the numbers by a few points on its own.
- Tune with `DIFFICULTY` (`game.ts`), `LEVELS` and the boosts (`meta.ts`) and weapon numbers (`items.ts`). Show the user the table before and after.
- Difficulty levels add health and half as much damage: that is what kept the builds together at level 10.

## Done

- The game: combat with announced moves, 4 stats, 9 weapon families, armor and sets, 18 spells, rewards, events, the merchant, a branching map per act, 3 acts, 12 enemies and 9 bosses with lore.
- End-of-run screen with damage by type.
- Saving by replay; save format 3 with converters from 1 and 2.
- Home screen, Ash, the store (11 unlocks, 5 boosts), best results, reset.
- 10 difficulty levels as one table.
- 41 sprites in code, enemies facing the player, hit feedback.
- Phone HUD with tabs, settings, how-to-play, keyboard shortcuts, bundled fonts.
- Sound effects and one music track per act, in code.
- Installable web version that starts offline.
- The name, 8-bit Descent, and a first pass on the 8-bit look.

## What is left

1. **Go through `docs/questions.md` with the user**, apply each answer, delete the entry. The look and the sound have never been judged by a person.
2. **The 8-bit look, further**, once the user says what they picture (the questions file lists ideas).
3. **Redraw the sprites the user rejects.**
4. **Enemy behaviours** (the user: later): three enemies share one pattern shape.
5. **Playtests** by the user (`docs/playtest.md`), then tuning from their notes.
6. **Hosting:** the agent recommends GitHub Pages; set it up on the user's yes.
7. **Release:** push and merge `ui` into `develop` into `main` when the user validates.
