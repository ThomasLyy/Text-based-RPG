# Floor map: choose your path through each act

Date: 2026-11-11. Status: waiting for approval.

## Why

Today every run walks the same line: fight, fight, event, fight, boss. The player never decides where to go, so there's no planning and no risk-taking. A map with branching paths turns each act into a route to plan: safe or greedy, heal now or push for an elite's better gear.

## Decided by the user

- **The whole act's map is visible from the start**, so the player can plan a route.
- **Narrow:** at most 4 to 5 lanes side by side; 3 to 4 is fine.
- **Branching:** each room links to one or a few rooms on the next floor, so a choice limits where you can go next. Paths can split and merge. You move up one floor at a time and can't go back.
- **One map per act**, ending in that act's boss, which every path leads to.
- **Room types:**
  - **Fight:** a normal fight with the usual reward.
  - **Elite:** a tougher fight with slightly better gear as the reward.
  - **Event:** random, with good or bad outcomes.
  - **Merchant:** today's merchant.
  - **Rest:** choose exactly one of rest (health and mana) or forge (upgrade one item).
- **No guaranteed rest before the boss.** At least one path has a Rest room close to the boss; riskier paths may skip it.
- **No more 20% health back after every fight.** It's removed for now.
- **Length:** 10 rooms, then the boss, per act: 30 rooms in all, with the bosses on top.
- **No fixed rules for the first floors** (no "floor 1 is always a fight", no "no elites early"): meta-progression may change those later.
- **Act 3 is renamed** from The Spire to Hell. The Sewers and The Catacombs stay.
- **Room odds:** Fight 45%, Elite 15%, Event 20%, Merchant 10%, Rest 10%, on every floor.
- **After a boss:** full heal as you enter the next act.

## My calls (the user can change any of them)

- **Width:** 4 lanes. Each floor has 2 to 4 rooms (approved).
- **Links:** a room links to 1 to 3 rooms on the next floor, in its own lane or a neighbouring one. Links never cross, so the drawing stays readable. Every room can be reached and has a way out (approved).
- **Rest near the boss:** at least one path has a Rest on floor 9 or 10. This rule takes priority over the room odds.
- **Elite:** 1 or 2 of the act's normal enemies, 40% tougher (health and damage), with double XP and gold. The reward rolls one quality step up (Common becomes Uncommon, and so on, capped at Epic).
- **Enemy count by floor:** floors 1-3 give 1 to 2 enemies, floors 4-7 give 2, floors 8-10 give 2 to 3. Each floor is 3% tougher (today it's 5% over 4 floors).
- **Rest room:** Rest restores 40% of max health and all mana. Forge is today's forge event.
- **Events:** today's shrine and trial, plus two new ones with real downside:
  - **Strange brew:** drink it for a random +3 or -2 to a stat, or walk away.
  - **Locked chest:** open it for gold and a reward, with a 30% chance it's a trap that costs 15% of max health. It never kills you.
- **Fleeing:** works on Elites as on normal fights (no reward); still impossible against bosses.
- **The merchant and forge leave the fixed event list.** "Two events per act after floors 2 and 3" is removed.

## Screen

- **Wide screens:** between rooms, the map is drawn in the center column. Rows go bottom to top: floor 1 at the bottom, the boss at the top. Lines show the links. Visited rooms are dim, your room is highlighted, and the rooms you can reach next are bright and clickable.
- **Phone:** the same map, scaled to the column width.
- **Buttons:** the reachable rooms are also listed as normal buttons ("Elite", "Rest", ...) under the map, so the game works through `io.ask` like everything else. The tests and balance bots use those buttons.
- **Room labels:** short words, not icons: Fight, Elite, Event, Shop, Rest, Boss.
- **Seeing the map mid-fight:** the map stays reachable during a fight. My call is a "Map" fold-out like the hero sheet on phones, and a tab next to the log on wide screens.

## Goals

- Every act asks the player to plan a route and take risks.
- **A run takes about 20 minutes** (the user's decision, replacing 10 to 15). With 33 stops, that's roughly 35 seconds per room, so fights must get shorter. When tuning, aim for about 3 turns per fight in the balance test's `turnsPerFight` (today it's 4 to 5), mainly by trimming enemy health, not by making the hero stronger. Not yet timed with players.
- Balance stays in the current band: the first-button bot loses, the sensible bots win 20–50%, and builds stay within 15 points of each other.

## Non-goals (for now): the next designs, in order

1. **Enemies:** each act gets at least 4 enemy types with coherent lore, plus 3 bosses, one picked at random per run. Act 3 is Hell, so its enemies change.
2. **End-of-run screen:** damage dealt by type, your best weapon and spell, what killed you, currency earned, and a Continue button back to the home screen.
3. **Home screen and meta-progression:** start a run, a store of permanent upgrades, unlocks, and resetting progress. The first win should be relatively easy.
4. **Difficulty levels 1 to 10,** unlocked through meta-progression. Higher levels add more elites, tougher enemies, and resistances (for example a Fire Rat takes 30-40% less from fire spells and 10-20% more from water). Some enemies, elites included, resist physical hits, which pushes you toward spells. Level 10 has 2 bosses per act.

This map design only has to leave room for those.
- Map secrets, keys, or rooms you can't see.
- Saving a run in progress.

## Anti-goals

- A map the player can't read at a glance on a phone.
- A "correct" route that always wins. Each room type should be the right choice in some situations.

## For the builder

- **Map generation:** a function that, given random numbers, returns floors of rooms with links. It needs a test of the rules above: width, no crossing links, everything reachable, floor 1 all Fights, no early Elites, a Rest on floor 5 or 6 on some path.
- **Game loop:** `gameLoop` walks the map. On each floor, ask which room to enter, then run it.
- **Balance bots:** the bots must choose paths. The sensible bot prefers Rest when hurt, Elites when healthy, and Fights otherwise. Once the 20% heal is gone and the map is in, re-tune `DIFFICULTY` until the balance test passes again.
- **Docs:** update the README's game description.
- **Left to the builder:** the map's look, beyond being readable, matching the current dark style, and having no icons, emoji or images.
