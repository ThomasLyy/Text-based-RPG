# Questions and calls waiting for the user

The agent builds without stopping and keeps here everything that needs an answer or a validation. Each entry says what was done meanwhile. Kinds: **Question** (the agent could not decide), **Call** (the agent decided; say if you want it changed), **Check** (only you can verify it), **Yours** (only you can do it). An entry is deleted once answered and applied.

## Answered on 2026-11-11 (applied, kept here until you have seen the result)

- **Git:** push and merge only when everything is validated. Nothing is pushed; `main` is untouched.
- **Training boost:** now +1 point at every level-up per level (8 points per level-up at level 5 of the boost).
- **Level 10:** it was too hard at 22%. With everything bought the bots now win about 50% (Strength 50%, Agility 50%, Intelligence 62%).
- **Parity:** 10 points on a new profile at level 1 (measured 8.3). At level 10 the gap measures 11 to 13 points, so level 10 uses your fallback of 15.
- **Name:** 8-bit Descent, in the page title, the home screen, the web manifest and `package.json`.
- **Web only:** the Android project, Capacitor and the Play Store drafts are removed. They are in the git history before commit `c2dc651`.
- **Storage:** when Android comes back, use the safer option (`@capacitor/preferences`). On the web the game uses `localStorage`.

## Balance

- **Call:** to reach level-10 parity, difficulty levels now add health and only half as much damage (level 10: twice the health, 50% harder hits). Fights get longer at high levels, not deadlier.
- **Call:** armored enemies take 10% less from weapons (it was 30%). At 30% Strength and Agility could not keep up at level 10.
- **Call:** Staff gives +10% spell power (it was 20%); the Focus boost gives +6 mana per level (it was 10); Bow and Wand hit a little harder.
- **Question:** parity is checked by the tests at level 1 (new profile) and level 10 (everything bought) only. Level 5 with everything bought was measured once: 90%, 94%, 90%. Levels 2 to 9 with partly-bought profiles are not measured, because the agent does not know what a typical profile is at each level. Is checking the two ends enough?
- **Question:** with everything bought, level 1 is won 95% of the time and level 5 about 90%. Is that the reward you want for a maxed profile, or should the middle levels bite harder?
- **Yours:** playtests with real players; `docs/playtest.md` says what to time and ask.

## The look and the sound (steps 5 and 6)

In plain words: the agent drew and composed these without being able to judge them. Three things need your eyes and ears.

- **Check, sprites:** start the game (`npm run dev`). The home screen shows the 9 bosses in a row; fights show the enemies. Seven enemies share one hooded shape with different colours. Which ones do you want redrawn as their own creature? Do the weapon, element and room icons read at a glance?
- **Check, sound:** click anything once, then play a fight. Do the hit, critical, level-up and click sounds fit? Each act has its own short music loop: is any of them tiring, too loud or wrong for its act? The agent cannot hear, so this has never been listened to.
- **Check, screens not seen by the agent:** shop, rest, events, level-up, end of run, settings. Play through them once on a computer and once on a phone.
- **Question, "big 8-bit vibe":** the first pass added a big pixel title with a two-colour shadow, the row of bosses on the home screen, scanlines over the whole screen, a checkered background, thicker frames with hard shadows, and a blip on every button. What else do you picture: a full title screen with "Press Start", larger sprites, a smaller colour palette, text typed out letter by letter?
- **Question:** small things the agent noticed and left: text looks small on very wide monitors; map labels are about 8 px on a phone; each choice is echoed in the log ("> Attack"); the box title stays "8-bit Descent" inside the store and the settings.
- **Call:** music and effects are made in code, so there is no licence to find and nothing to credit.
- **Call:** scanlines are always on. Say if you want them in the settings.

## The name

- **Check:** no game called "8-bit Descent" turned up in a web search. "Descent" alone is a well-known 1995 shooter series and there are small "Descent" games on itch.io. Different genre, and the full name is not taken as far as the agent could see; your call under your "original names" rule.

## Hosting

- **Question:** the agent recommends GitHub Pages: free, HTTPS (needed for the offline install), and the code is already on GitHub. It publishes on its own each time `main` is pushed, through one workflow file. It needs the repository to be public, or a paid GitHub plan for a private one. If the repository must stay private, Cloudflare Pages is the free alternative. itch.io is worth adding later as the place players find the game. Which do you want? The agent sets it up on your yes.

## Steps 2, 3, 4: calls you have not commented on

- **Call:** damage on the end screen counts what the enemy really lost; "best weapon" is a weapon family; Thorns has its own line.
- **Call:** the currency is called Ash. Unlocks: Hammers, Bows and Staves (40 each), the six powerful spells (30 each), two events (25 each). Boosts cost 20 / 40 / 70 / 110 / 160 Ash per level.
- **Call:** no enemies are sold in the store, because each act has exactly 4.
- **Call:** at level 10 the two bosses are fought one after the other, not together.
- **Call:** with a run in progress the game opens on the run; there is no "abandon run" button.
- **Call:** an update that changes the rules ends a run in progress and pays it for the floor it reached.

## Step 1: enemies (you said: check after)

- **Call:** enemy behaviours were left as they were. Rat, Gutter Thief and Skeleton share one pattern shape (two light hits, then a heavy one).
