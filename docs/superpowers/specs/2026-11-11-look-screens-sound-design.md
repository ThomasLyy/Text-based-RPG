# Look, screens and sound

Date: 2026-11-11. Status: built without approval, at the user's request; every "My call" below is also listed in `docs/questions.md`. Covers roadmap steps 5, 6a and 6b.

## Why

The game was a column of text boxes: no picture of what you fight, a phone layout that scrolled as one long page, no sound, and fonts fetched from Google on every visit.

## Decided by the user

- Sprites are 16×16, drawn in code from one palette, with no image files. The hero has no sprite; enemies face the player, side by side.
- A sprite for every enemy and boss; an icon per weapon family, element and room type.
- Hit feedback: floating numbers, a shake, a pop on critical hits, a fade on death, a red flash when the hero is hit; all of it can be turned off.
- A fixed HUD on phones too, with tabs; the room, the enemies and the choices always visible.
- The comparison box shows only what changes. The boss tile shows as current; the next rooms light up only once the room is finished.
- A short how-to-play, shown once, skippable. A settings screen. Number keys and Space on computers.
- Chiptune sound effects and one music track per act.

## My calls

### Sprites (`src/sprites.ts`)

- One palette of 18 colours for everything; `k` is the outline.
- Symmetric sprites are written as their left half and mirrored. Lightning and the Event icon are written in full.
- **The 21 enemies are built from 9 shapes** (rat, hooded figure, skull, blob, spider, brute, shade, imp, knight), recoloured, with a crown, horns or extra eyes added. Seven enemies share the hooded figure. This is a first pass: say which ones deserve their own drawing.
- Sprites are drawn as SVG rectangles, so they are sharp at any size and need no canvas.
- The icon of a choice is found from its text: a weapon family's name or a spell's name.
- The app icon is the Skeleton's sprite on the game's background (`public/icon.svg`).

### Screens

- **Phones (under 1000 px wide):** the page never scrolls. From the top: health, mana, gold and floor; four tabs (Room, Map, Hero, Gear); the chosen panel; the enemies; the choices. The Map tab opens by itself when a path must be chosen. When no enemy is left standing, the enemies' box gives its place to the choices.
- **Computers:** as before, three columns. Screens less than 900 px tall get smaller slots for the enemies and choices.
- **Keyboard:** 1 to 9 pick a choice or a highlighted room, and each button shows its number; Space or Enter continues when there is one choice.
- **Settings** (from the home screen): animations on or off, music volume, sound volume (each press goes up 20%, then back to 0), and the how-to-play again. Reset progression stays on the home screen.
- **How-to-play:** three short pages (enemies announce their move; Defend the big hits; plan your route), before the first run, with Skip.
- The settings are stored in the save (format 3) and survive "Reset progression".
- Fonts ship with the game in `public/fonts`, with their licence files (SIL Open Font License).

### Sound (`src/audio.ts`)

- **Everything is made in code** with Web Audio: square and triangle waves and noise. No audio files, nothing to license or credit.
- Effects: hit, critical hit, hero hurt, level-up, taking or buying an item, victory, defeat.
- Music: one loop of 4 bars per act (The Sewers in A minor at 100 bpm, The Catacombs in D minor at 84, Hell in E phrygian at 132). No music on the home screen.
- Sound starts at the first click or key, as browsers require.

## UI review

Seen in a browser at 2550, 1366 and 360 px wide: home, store, how-to-play, map choice, fight, reward. **Not seen:** shop, rest, events, level-up, end of run, settings.

Fixed during the review:

1. Phones scrolled as one long page: now a fixed HUD.
2. On phones, defeated enemies kept their box and pushed the rewards out of sight.
3. The map did not fit its box on phones.
4. The next floor's rooms lit up while the current room was still being played.
5. The boss tile never showed as the current room.
6. The comparison box listed 13 numbers when one changed.
7. On laptops (under 900 px tall) the room's log was squeezed to two lines.
8. Fonts came from Google on every visit.

Left for the user to judge:

1. The home screen leaves the map, hero and gear boxes empty on computers.
2. On very wide monitors the text stays at 20 px and looks small.
3. Map labels are small: about 8 px on a phone, and smaller on a laptop's narrow left column. The icons help; larger tiles would need a narrower map.
4. Each choice is echoed in the log ("> Attack"), which adds lines without adding information.
5. The room box keeps the title "Home" inside the store and the settings.

## Out of scope

- Animated sprites, backgrounds per act, a sprite for the hero.
- PNG icons and a splash screen for Android (step 8, made in Android Studio from `public/icon.svg`).
