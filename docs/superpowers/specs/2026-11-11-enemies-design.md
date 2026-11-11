# Enemies: lore per act and three bosses per act

Date: 2026-11-11. Status: approved by the user and built on 2026-11-11.

## Why

Act 3 is called Hell but is guarded by a Troll, a Wraith and a Lich: placeholders from before the rename. Every run also ends each act on the same boss, so the third run of an act holds no surprise. This design gives each act enemies that belong there, and three bosses of which a run meets one.

## Decided by the user

- At least 4 enemy types per act, with lore that fits the act. 3 bosses per act; each run picks one per act at random.
- Original names: common words (Rat, Skeleton, Ghoul) are fine; a name that recalls one specific game is not.
- The existing regular enemies keep their health, speed, XP and pattern for now. Enemy behaviours are decided later.
- Build first, balance once everything is built: this step reports the bots' numbers and does not re-tune.

## My calls (the user can change any of them)

### Lore

- **The Sewers:** the flooded drains where the city throws what it wants forgotten: vermin, outlaws, a drowned cult.
- **The Catacombs:** burial galleries under the sewers; the dead do not rest, and their keepers went wrong.
- **Hell:** below the graves: ash, chains and fire, where the damned guard the damned.

### Regular enemies

Numbers and patterns are today's. Only the names in bold change. The element is recorded for step 4 and is not in the code yet.

| Act | Today | Becomes | Moves (renamed in bold) | Element |
|---|---|---|---|---|
| Sewers | Rat | Rat | Bite, Bite, Frenzy | none |
| Sewers | Goblin | **Gutter Thief** | Stab, Stab, Heavy swing | none |
| Sewers | Slime | **Sludge** | Slam, Acid (poison) | Earth |
| Sewers | Cultist | **Drowned Cultist** | **Brine bolt**, Mend, **Brine bolt** | Water |
| Catacombs | Skeleton | Skeleton | Slash, Slash, Bone crush | none |
| Catacombs | Giant Spider | **Crypt Spider** | Bite, Venom (poison) | Earth |
| Catacombs | Ghoul | Ghoul | Claw, Claw, Feast (heal) | Shadow |
| Catacombs | Dark Acolyte | **Gravekeeper** | Shadow bolt, Unholy mend, Dark rite | Shadow |
| Hell | Wraith | **Ash Shade** | **Cinder touch**, **Smother** (poison) | Shadow |
| Hell | Troll | **Chained Brute** | **Chain swing**, **Knit flesh** (heal), Smash | none |
| Hell | Fire Imp | **Ember Imp** | Firebolt, Firebolt, Ignite (poison) | Fire |
| Hell | Dread Knight | **Oathbreaker** | Strike, **Dark vow** (buff), Execute | Lightning |

### Bosses

The first boss of each act is today's boss with a new name where the old one no longer fits; its numbers do not change. The two new ones have the same health and XP, and deal about the same total over one loop of their pattern. "Magic" marks a bolt (reduced by Ward); the rest is physical (reduced by Armor).

| Act | Boss | Health | Speed | Pattern, in order | Damage per loop | Element |
|---|---|---|---|---|---|---|
| Sewers | **Gutter King** (was Goblin Warlord) | 83 | 10 | Cleave 10, War cry (buff +3), Cleave 10, Crushing blow 28 | 54, +9 each loop | none |
| Sewers | **Brood Mother** | 83 | 14 | Bite 9, Filth (poison 4 for 3 turns), Bite 9, Frenzy 24 | 54 | Earth |
| Sewers | **Drowned Prophet** | 83 | 8 | Brine bolt 11 (magic), Tide's mercy (heal 12), Brine bolt 11 (magic), Drowning wave 30 (magic) | 52, heals 12 | Water |
| Catacombs | Bone Colossus (kept) | 128 | 7 | Stomp 13, Grave curse 13 (magic), Gather bones (heal 20), Earthshatter 36 | 62, heals 20 | Earth |
| Catacombs | **Embalmer** | 128 | 9 | Embalming fluid (poison 7 for 3 turns), Hook 14, Embalming fluid (poison 7 for 3 turns), Stitch (heal 20) | 56, heals 20 | Earth |
| Catacombs | **Hollow King** | 128 | 8 | Hollow crown (buff +3), Hollow crown (buff +3), Void lance 38 (magic), Sceptre 12 | 62, +12 each loop | Shadow |
| Hell | **Ashen Warden** (was Lich) | 210 | 11 | Ash bolt 16 (magic), Searing ash (poison 6 for 3 turns), Rekindle (heal 25), Doom 58 (magic) | 92, heals 25 | Fire |
| Hell | **Iron Judge** | 210 | 9 | Chain lash 18, Chain lash 18, Sentence (buff +4), Execution 52 | 92, +12 each loop | Lightning |
| Hell | **Pyre Mother** | 210 | 16 | Flame lash 20 (magic), Flame lash 20 (magic), Flame lash 20 (magic), Pyre 38 (magic) | 98 | Fire |

XP stays 30, 60 and 0 (nothing to level for after the last boss). Bosses still enrage from their 8th turn.

What each boss asks of the player:

- **Gutter King, Iron Judge:** Defend on the big hit; it grows every loop, so kill fast.
- **Brood Mother:** she moves first; the poison ticks through Defend.
- **Drowned Prophet:** the first magic boss, in an act where Ward is rare; Defend the wave.
- **Embalmer:** weak hits, but the poison never stops and he heals; a race against the poison.
- **Hollow King:** two free turns to hit him, then a bolt that must be Defended.
- **Pyre Mother:** no big hit to Defend and no pause; Ward or a fast kill.

### Element field

Not added now: nothing reads it before step 4. The tables above are the record.

## Out of scope

- New intent kinds or new behaviours for regular enemies (the user: later).
- More than 4 regular enemies per act.
- Resistances and weaknesses (step 4), sprites (step 5).
- Re-tuning (step 7). A random boss adds one random draw per act, so the bots' numbers will move a little whatever the bosses are; this step reports the numbers before and after.
- Showing the boss's name on the map before the fight. Today the tile says "Boss"; it stays so.

## Tasks

1. **Test first** (`src/game/game.test.ts`): in the encounters test, replace the `bossOf` line with: every act has 3 bosses and at least 4 enemies, all names unique; with the random roll forced to 0, 0.5 and 0.99, `bossOf(act)` returns the act's first, second and third boss. Add: no name from the old placeholder list (Wraith, Troll, Fire Imp, Dread Knight, Lich, Goblin, Goblin Warlord) is left in `ACTS`. Run it: it fails.
2. **Data** (`src/game/enemy.ts`): `Act.boss` becomes `bosses: EnemyTemplate[]`; apply the two tables; remove the "placeholder enemies" comment.
3. **Pick** (`src/game/game.ts`): `bossOf(act)` picks one of the act's bosses at random; the victory line uses the name of the boss that was just beaten instead of `ACTS.at(-1).boss`.
4. **Check:** `npm test`, `npm run build`; the bots' table before and after, reported to the user. Play one run in the browser to the first boss and read the names on screen at computer and phone width.
5. **Close:** README "The game" (enemies and the 3 bosses per act); roadmap step 1 moved to Done; one commit on `develop`.
