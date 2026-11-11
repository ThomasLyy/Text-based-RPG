import { io, randint, choices, type MapView } from "./io";
import { ACTS, Enemy } from "./enemy";
import { ROOMS_PER_ACT, ROOM_LABEL, generateMap, type ActMap, type MapRoom } from "./map";
import { combat, combatView } from "./combat";
import { chooseReward, offer as button } from "./reward";
import { FAMILIES, makeWeapon } from "./items";
import { SPELLS, describeSpell } from "./spell";
import { eventRoom, merchant, restRoom } from "./events";
import type { Player } from "./player";

// Enemy toughness (health and damage) per act, tuned with the balance test. Later acts outpace your gear less.
export const DIFFICULTY = [1.4, 1.75, 1.85];
export const ELITE_SCALE = 1.4;
export const FLOORS = ACTS.length * (ROOMS_PER_ACT + 1); // 10 rooms and a boss per act

// Floors 1-3 of an act: 1-2 enemies, 4-7: 2, 8-10: 2-3, each floor 3% tougher. Elites: 1-2 enemies, 40% tougher.
export function encounter(act: number, floor: number, elite = false): Enemy[] {
  const scale = DIFFICULTY[act] * (1 + 0.03 * (floor - 1)) * (elite ? ELITE_SCALE : 1);
  const count = elite || floor <= 3 ? randint(1, 2) : floor <= 7 ? 2 : randint(2, 3);
  return choices(ACTS[act].enemies, count).map((t) => new Enemy(t, scale, elite));
}
export const bossOf = (act: number) => new Enemy(ACTS[act].boss, DIFFICULTY[act]);

const BOOSTS: { label: string; apply: (p: Player) => void }[] = [
  { label: "+4 Strength", apply: (p) => void (p.base.strength += 4) },
  { label: "+4 Agility", apply: (p) => void (p.base.agility += 4) },
  { label: "+4 Intelligence", apply: (p) => void (p.base.intelligence += 4) },
  { label: "+5 Perception", apply: (p) => void (p.base.perception += 5) },
  { label: "+20 Max Health", apply: (p) => void ((p.baseMaxHealth += 20), (p.health += 20)) },
  { label: "+20 Max Mana", apply: (p) => void ((p.baseMaxMana += 20), (p.mana += 20)) },
];

// Start of run: pick one of 3 random Common weapons from different families, so each run starts differently.
export async function chooseStarter(player: Player) {
  const pool = [...FAMILIES];
  const offer = [0, 1, 2].map(() => makeWeapon(pool.splice(randint(0, pool.length - 1), 1)[0], 0, "Common"));
  io.print("[panel bold]Choose your weapon[/]");
  const buttons = offer.map((w) => button(player, w));
  player.equipWeapon(offer[await io.ask("Choose your starting weapon", buttons.map((b) => b.label), undefined, buttons.map((b) => b.detail))]);
  grantStarterSpell(player);
}

// Every hero also starts with one random single-target spell.
export function grantStarterSpell(player: Player) {
  const singles = SPELLS.filter((s) => s.shape === "single");
  const spell = singles[randint(0, singles.length - 1)];
  player.spells.push({ spell, rank: 1 });
  io.print(`You also know [cyan]${spell.name}[/] (${describeSpell(spell)}).`);
}

// Each level: +10 health and a choice of 3 different boosts out of 6. Each level needs 5 more XP.
export async function levelUps(player: Player) {
  while (player.experience >= player.xpToNextLevel) {
    player.experience -= player.xpToNextLevel;
    player.xpToNextLevel += 5;
    player.level++;
    player.health = Math.min(player.maxHealth, player.health + 10);
    io.print(`[panel bold cyan]Level ${player.level}![/]`);
    const pool = [...BOOSTS];
    const offer = [0, 1, 2].map(() => pool.splice(randint(0, pool.length - 1), 1)[0]);
    offer[await io.ask("Choose a boost", offer.map((b) => b.label))].apply(player);
  }
}

export interface RunSummary {
  won: boolean;
  floor: number;
  level: number;
  kills: number;
  killedBy: string;
}

const LANE_NAME = ["far left", "left", "right", "far right"];
// A path button: the room, and which lane it is in (two rooms of one kind can be side by side).
export const pathLabel = (r: MapRoom) => `${ROOM_LABEL[r.kind]} · ${LANE_NAME[r.lane]}`;

function mapView(act: string, map: ActMap, path: MapRoom[], reachable: MapRoom[], choosing: boolean): MapView {
  const state = (r: MapRoom) => (r === path.at(-1) ? "current" : path.includes(r) ? "visited" : reachable.includes(r) ? "reachable" : "other");
  return { act, choosing, floors: map.map((floor) => floor.map((r) => ({ lane: r.lane, label: ROOM_LABEL[r.kind], next: r.next, state: state(r) }))) };
}

// Each act: walk its map floor by floor, picking a room linked to the last one, then fight the boss.
// No healing between rooms; a full heal when entering the next act.
export async function gameLoop(player: Player): Promise<RunSummary> {
  let enemies: Enemy[] = [];
  let title = "A new run begins";
  let view: () => MapView | null = () => null;
  io.snapshot = () => combatView(player, enemies, title, view()); // the hero sheet from the start, no enemies left over from the last run
  if (!player.mainHand) await chooseStarter(player); // already armed: a test set the build
  let kills = 0;
  let floor = 0; // overall, 1-33
  let dead = false;

  // a fight room or the boss: fight, level up, and a reward unless you fled
  const fight = async (foes: Enemy[], act: number, reward: { boss?: boolean; elite?: boolean }) => {
    enemies = foes;
    io.print(`[bold]${foes.map((e) => e.name).join(", ")}[/]`);
    const outcome = await combat(player, foes, title);
    player.poisoned.turns = 0; // poison does not follow you to the next room
    kills += foes.filter((e) => e.health <= 0).length;
    if (outcome === "dead") return (dead = true);
    await levelUps(player);
    if (outcome === "won") await chooseReward(player, act, reward);
  };

  run: for (let a = 0; a < ACTS.length; a++) {
    const act = ACTS[a];
    if (a > 0) {
      player.health = player.maxHealth;
      player.mana = player.maxMana;
      io.print("You rest before going deeper. Health and mana restored.");
    }
    io.print(`[panel bold]${act.name}[/]`);
    const map = generateMap();
    const path: MapRoom[] = [];
    let reachable = map[0];
    let choosing = false;
    view = () => mapView(act.name, map, path, reachable, choosing);
    for (let f = 1; f <= ROOMS_PER_ACT; f++) {
      floor++;
      enemies = [];
      title = `${act.name} · Floor ${f} / ${ROOMS_PER_ACT + 1}`;
      choosing = true;
      const room = reachable[await io.ask("Choose your path", reachable.map(pathLabel))];
      choosing = false;
      path.push(room);
      reachable = f < ROOMS_PER_ACT ? map[f].filter((r) => room.next.includes(r.lane)) : [];
      if (room.kind === "fight" || room.kind === "elite") await fight(encounter(a, f, room.kind === "elite"), a, { elite: room.kind === "elite" });
      else if (room.kind === "event") await eventRoom(player, a);
      else if (room.kind === "merchant") await merchant(player, a);
      else await restRoom(player);
      if (dead) break run;
    }
    floor++;
    title = `${act.name} · Floor ${ROOMS_PER_ACT + 1} / ${ROOMS_PER_ACT + 1}`;
    const boss = bossOf(a);
    io.print(`[bold red]${boss.name} blocks the way![/]`);
    if (await fight([boss], a, { boss: true })) break;
  }

  const won = !dead;
  const summary = { won, floor, level: player.level, kills, killedBy: won ? "" : player.lastHitBy };
  const actName = ACTS[Math.floor((floor - 1) / (ROOMS_PER_ACT + 1))].name;
  if (won) io.print(`[panel bold green]The ${ACTS.at(-1)!.boss.name} falls. You have survived all three acts![/]`);
  else io.print(`[panel bold red]You died on floor ${floor} of ${FLOORS} (${actName}), slain by the ${summary.killedBy}.[/]`);
  io.print(`Level ${summary.level} · ${kills} enemies defeated.`);
  return summary;
}
