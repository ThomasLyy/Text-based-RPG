import { io, randint, choices, type MapView } from "./io";
import { ACTS, Enemy } from "./enemy";
import { ROOMS_PER_ACT, ROOM_LABEL, generateMap, type ActMap, type MapRoom } from "./map";
import { combat, combatView } from "./combat";
import { chooseReward, offer as button } from "./reward";
import { FAMILIES, makeWeapon } from "./items";
import { SPELLS, describeSpell } from "./spell";
import { eventRoom, merchant, restRoom } from "./events";
import type { Player } from "./player";
import { CURRENCY, ashEarned, available, boost, level, settings } from "./meta";

// Enemy toughness (health and damage) per act, tuned with the balance test. Later acts outpace your gear less.
export const DIFFICULTY = [1.2, 1.5, 1.6];
export const ELITE_SCALE = 1.4;
export const FLOORS = ACTS.length * (ROOMS_PER_ACT + 1); // 10 rooms and a boss per act

// Floors 1-3 of an act: 1-2 enemies, 4-7: 2, 8-10: 2-3, each floor 3% tougher. Elites: 1-2 enemies, 40% tougher.
export function encounter(act: number, floor: number, elite = false): Enemy[] {
  const scale = DIFFICULTY[act] * level().scale * (1 + 0.03 * (floor - 1)) * (elite ? ELITE_SCALE : 1);
  const count = elite || floor <= 3 ? randint(1, 2) : floor <= 7 ? 2 : randint(2, 3);
  return choices(ACTS[act].enemies, count).map((t) => new Enemy(t, scale, elite));
}
// The act's boss, picked among its 3; at the last difficulty level, two different ones, fought one after the other.
export function bossesOf(act: number): Enemy[] {
  const pool = [...ACTS[act].bosses];
  return Array.from({ length: level().bosses }, () => new Enemy(pool.splice(randint(0, pool.length - 1), 1)[0], DIFFICULTY[act] * level().scale));
}

// Level-up points: each one is +1 to a stat, or +5 max health. Perception only comes from gear.
export const LEVEL_POINTS = 3;
export const HEALTH_PER_POINT = 5;
const POINTS: { label: string; apply: (p: Player) => void }[] = [
  { label: "+1 Strength", apply: (p) => void p.base.strength++ },
  { label: "+1 Agility", apply: (p) => void p.base.agility++ },
  { label: "+1 Intelligence", apply: (p) => void p.base.intelligence++ },
  { label: `+${HEALTH_PER_POINT} Max Health`, apply: (p) => void ((p.baseMaxHealth += HEALTH_PER_POINT), (p.health += HEALTH_PER_POINT)) },
];

// Start of run: pick one of 3 random Common weapons from different families, so each run starts differently.
export async function chooseStarter(player: Player) {
  const pool = available("family", FAMILIES, (f) => f.name);
  const offer = [0, 1, 2].map(() => makeWeapon(pool.splice(randint(0, pool.length - 1), 1)[0], 0, "Common"));
  io.print("[panel bold]Choose your weapon[/]");
  const buttons = offer.map((w) => button(player, w));
  player.equipWeapon(offer[await io.ask("Choose your starting weapon", buttons.map((b) => b.label), undefined, buttons.map((b) => b.detail))]);
  grantStarterSpell(player);
  await spendPoints(player, boost("training"));
}

// The store's boosts that change the hero at the start of a run. Might is read where damage is computed.
function applyBoosts(player: Player) {
  player.baseMaxHealth += boost("vigor");
  player.health += boost("vigor");
  player.baseMaxMana += boost("focus");
  player.mana += boost("focus");
  player.gold += boost("purse");
}

async function spendPoints(player: Player, count: number) {
  for (let n = 1; n <= count; n++) POINTS[await io.ask(`Spend a point (${n} of ${count})`, POINTS.map((b) => b.label))].apply(player);
}

// Every hero also starts with one random single-target spell.
export function grantStarterSpell(player: Player) {
  const singles = SPELLS.filter((s) => s.shape === "single");
  const spell = singles[randint(0, singles.length - 1)];
  player.spells.push({ spell, rank: 1 });
  io.print(`You also know [cyan]${spell.name}[/] (${describeSpell(spell)}).`);
}

// Each level: +10 health and 3 points to spend. Each level needs 5 more XP.
export async function levelUps(player: Player) {
  while (player.experience >= player.xpToNextLevel) {
    player.experience -= player.xpToNextLevel;
    player.xpToNextLevel += 5;
    player.level++;
    player.health = Math.min(player.maxHealth, player.health + 10);
    io.print(`[panel bold cyan]Level ${player.level}![/]`);
    await spendPoints(player, LEVEL_POINTS);
  }
}

export interface RunSummary {
  won: boolean;
  floor: number;
  level: number;
  kills: number;
  bosses: number; // bosses beaten
  killedBy: string;
  dealt: Record<string, number>; // see Player.dealt
}

// The end-of-run lines about damage: the total, one line per type (weapon family, element, Burn, Thorns), then the best weapon and spell.
export function damageReport(dealt: Record<string, number>): string[] {
  const sorted = Object.entries(dealt).sort((a, b) => b[1] - a[1]);
  const spells = sorted.filter(([k]) => k.startsWith("spell:"));
  const types = sorted.filter(([k]) => !k.startsWith("spell:"));
  const weapon = types.find(([k]) => k === "Fists" || FAMILIES.some((f) => f.name === k));
  if (!types.length) return ["No damage dealt."];
  return [
    `[bold]Damage dealt: ${types.reduce((sum, [, v]) => sum + v, 0)}[/]`,
    ...types.map(([k, v]) => `${k}: ${v}`),
    ...(weapon ? [`Best weapon: [yellow]${weapon[0]}[/] (${weapon[1]})`] : []),
    ...(spells.length ? [`Best spell: [cyan]${spells[0][0].slice(6)}[/] (${spells[0][1]})`] : []),
  ];
}

const LANE_NAME = ["far left", "left", "right", "far right"];
// A path button: the room, and which lane it is in (two rooms of one kind can be side by side).
const ROOM_TITLE = { ...ROOM_LABEL, elite: "Elite Fight" };
export const pathLabel =(r: MapRoom) => `${ROOM_LABEL[r.kind]} · ${LANE_NAME[r.lane]}`;

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
  let floor = 0; // overall, 1-33
  io.snapshot = () => combatView(player, enemies, title, view(), floor); // the hero sheet from the start, no enemies left over from the last run
  applyBoosts(player);
  if (!player.mainHand) await chooseStarter(player); // already armed: a test set the build
  let kills = 0;
  let bosses = 0;
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

  // the log only holds the current room: the player confirms, then it is wiped for the next one
  const leaveRoom = async () => {
    await io.ask("Room cleared", ["Continue"]);
    io.clear();
  };

  let lastBoss = "";
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
      title = `${act.name} - Choose your path`;
      choosing = true;
      const room = reachable[await io.ask("Choose your path", reachable.map(pathLabel))];
      choosing = false;
      title = `${act.name} - ${ROOM_TITLE[room.kind]}`;
      path.push(room);
      reachable = f < ROOMS_PER_ACT ? map[f].filter((r) => room.next.includes(r.lane)) : [];
      if (room.kind === "fight" || room.kind === "elite") await fight(encounter(a, f, room.kind === "elite"), a, { elite: room.kind === "elite" });
      else if (room.kind === "event") await eventRoom(player, a);
      else if (room.kind === "merchant") await merchant(player, a);
      else await restRoom(player);
      if (dead) break run;
      await leaveRoom();
    }
    floor++;
    title = `${act.name} - Boss`;
    for (const boss of bossesOf(a)) {
      lastBoss = boss.name;
      io.print(`[bold red]${boss.name} blocks the way![/]`);
      if (await fight([boss], a, { boss: true })) break run;
      bosses++;
    }
    if (a < ACTS.length - 1) await leaveRoom();
  }

  const won = !dead;
  const summary: RunSummary = { won, floor, level: player.level, kills, bosses, killedBy: won ? "" : player.lastHitBy, dealt: player.dealt };
  const actName = ACTS[Math.floor((floor - 1) / (ROOMS_PER_ACT + 1))].name;
  // the end-of-run screen: its own room box, nothing left over from the last fight
  io.clear();
  enemies = [];
  title = won ? "Victory" : "Defeat";
  if (won) io.print(`[panel bold green]The ${lastBoss} falls. You have survived all three acts![/]`);
  else io.print(`[panel bold red]You died on floor ${floor} of ${FLOORS} (${actName}), slain by the ${summary.killedBy}.[/]`);
  io.print(`Level ${summary.level} · ${kills} enemies defeated.`);
  for (const line of damageReport(player.dealt)) io.print(line);
  io.print(`${CURRENCY} earned: [yellow]${ashEarned(summary, settings.level)}[/]`);
  return summary;
}
