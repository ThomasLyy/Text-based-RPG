# Playtest sheet

For the user, to run with 3 to 5 people who have never seen the game. The bots say the game is balanced; only people can say whether a run takes 20 minutes and whether the first win is reachable.

## Before

1. Build and serve the game: `npm run build`, then `npm run preview`, and share the address it prints (same Wi-Fi), or host `dist/` anywhere.
2. Each tester starts from a new profile: Home, then "Reset progression", or a private window.
3. Say nothing about the rules. The how-to-play screen is part of the test.

## Time, with a stopwatch

| What | Target |
|---|---|
| A full run that reaches the last boss | about 20 minutes |
| One fight | under 1 minute |
| First run, from the first screen to death or victory | note it; no target |
| Number of runs before the first win | 3 to 6 |

## Watch, without helping

- Do they read the enemies' "Next:" line before choosing? Do they ever Defend?
- Do they plan a route on the map, or click the nearest room?
- Where do they stop to read for more than 10 seconds?
- Which button do they look for and not find?
- On a phone: do they scroll during a fight?

## Ask afterwards

1. What killed you, and could you have avoided it?
2. Which reward was the hardest to choose? Which was never worth taking?
3. Was any enemy unfair? Any boss?
4. What did you buy first in the store, and why?
5. Would you start another run now?

## Send back to the agent

The times, the floor each run ended on, the build played (weapon and main stat), and the answers. The agent then adjusts `DIFFICULTY`, the store prices or the screens, and shows the bots' table before and after.
