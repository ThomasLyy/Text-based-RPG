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

## My calls (the user can change any of them)

- **Length:** 6 rooms, then the boss, per act: 21 floors in all. That's the same number of stops as today (4 fights + 2 events per act).
- **Width:** 4 lanes. Each floor has 2 to 4 rooms.
- **Links:** a room links to 1 to 3 rooms on the next floor, in its own lane or a neighbouring one. Links never cross, so the drawing stays readable. Every room can be reached and has a way out.
- **Floor 1** of every act is always normal Fights. **No Elite on floors 1 and 2.**
- **Rest near the boss:** at least one path has a Rest on floor 5 or 6.
- **Room odds** (floors 2 to 6): Fight 45%, Elite 15%, Event 20%, Merchant 10%, Rest 10%. The Rest-near-boss rule and the floor 1 and 2 rules take priority over the odds. The balance test may adjust them.
- **Elite:** 1 or 2 of the act's normal enemies, 40% tougher (health and damage), with double XP and gold. The reward rolls one quality step up (Common becomes Uncommon, and so on, capped at Epic).
- **Enemy count by floor:** floors 1-2 give 1 to 2 enemies, floors 3-4 give 2, floors 5-6 give 2 to 3. Each floor is 5% tougher, as today.
- **Rest room:** Rest restores 40% of max health and all mana. Forge is today's forge event.
- **Events:** today's shrine and trial, plus two new ones with real downside:
  - **Strange brew:** drink it for a random +3 or -2 to a stat, or walk away.
  - **Locked chest:** open it for gold and a reward, with a 30% chance it's a trap that costs 15% of max health. It never kills you.
- **Fleeing:** works on Elites as on normal fights (no reward); still impossible against bosses.
- **After a boss:** a full heal as you enter the next act. The user didn't object when I suggested it.
- **The merchant and forge leave the fixed event list.** "Two events per act after floors 2 and 3" is removed.

## Screen

- **Wide screens:** between rooms, the map is drawn in the center column. Rows go bottom to top: floor 1 at the bottom, the boss at the top. Lines show the links. Visited rooms are dim, your room is highlighted, and the rooms you can reach next are bright and clickable.
- **Phone:** the same map, scaled to the column width.
- **Buttons:** the reachable rooms are also listed as normal buttons ("Elite", "Rest", ...) under the map, so the game works through `io.ask` like everything else. The tests and balance bots use those buttons.
- **Room labels:** short words, not icons: Fight, Elite, Event, Shop, Rest, Boss.
- **Seeing the map mid-fight:** the map stays reachable during a fight. My call is a "Map" fold-out like the hero sheet on phones, and a tab next to the log on wide screens.

## Goals

- Every act asks the player to plan a route and take risks.
- A run still takes about 10 to 15 minutes (not yet timed with players).
- Balance stays in the current band: the first-button bot loses, the sensible bots win 20–50%, and builds stay within 15 points of each other.

## Non-goals (for now)

- Meta-progression, the home screen and the end-of-run screen. Those are the next designs.
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
