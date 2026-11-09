import { io, randint, choices } from "./io";
import { ACTS, Enemy, FLOORS, FLOORS_PER_ACT } from "./enemy";
import { combat } from "./combat";
import { chooseReward } from "./reward";
import { FAMILIES, describe, makeWeapon } from "./items";
import type { Player } from "./player";

const actOf = (floor: number) => ACTS[Math.floor((floor - 1) / FLOORS_PER_ACT)];
const floorInAct = (floor: number) => ((floor - 1) % FLOORS_PER_ACT) + 1;

// Enemy toughness (health and damage) per act, tuned with the balance test. Later acts outpace your gear less.
export const DIFFICULTY = [1.15, 1.45, 1.55];

// Floor 1 of an act: 1 enemy, floor 2: 1-2, floor 3: 2, floor 4: 2-3, each floor 5% tougher. Last floor: the boss.
export function encounter(floor: number): Enemy[] {
  const act = actOf(floor);
  const f = floorInAct(floor);
  const d = DIFFICULTY[ACTS.indexOf(act)];
  if (f === FLOORS_PER_ACT) return [new Enemy(act.boss, d)];
  const count = f === 1 ? 1 : f === 2 ? randint(1, 2) : f === 3 ? 2 : randint(2, 3);
  return choices(act.enemies, count).map((t) => new Enemy(t, d * (1 + 0.05 * (f - 1))));
}

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
  player.equipWeapon(offer[await io.ask("Choose your starting weapon", offer.map(describe))]);
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

export async function gameLoop(player: Player): Promise<RunSummary> {
  await chooseStarter(player);
  let kills = 0;
  let floor = 1;
  for (; floor <= FLOORS; floor++) {
    const act = actOf(floor);
    if (floorInAct(floor) === 1) io.print(`[panel bold]${act.name}[/]`);
    const enemies = encounter(floor);
    if (enemies[0].boss) io.print(`[bold red]${enemies[0].name} blocks the way![/]`);
    else io.print(`[bold]Floor ${floor}[/]: ${enemies.map((e) => e.name).join(", ")}`);

    const outcome = await combat(player, enemies, `${act.name} · Floor ${floor} / ${FLOORS}`);
    player.poisoned.turns = 0; // poison does not follow you to the next floor
    kills += enemies.filter((e) => e.health <= 0).length;
    if (outcome === "dead") break;

    await levelUps(player);
    const boss = enemies[0].boss;
    if (outcome === "won") await chooseReward(player, ACTS.indexOf(act), boss); // no reward for running away

    // Rest: 20% health and 30 mana after each floor; a campfire (full heal) before each boss and after it.
    const campfire = boss || floorInAct(floor + 1) === FLOORS_PER_ACT;
    player.health = campfire ? player.maxHealth : Math.min(player.maxHealth, player.health + Math.round(player.maxHealth * 0.2));
    player.mana = campfire ? player.maxMana : Math.min(player.maxMana, player.mana + 30);
    io.print(`${campfire ? "You rest at a campfire." : "You catch your breath."} Health ${player.health}/${player.maxHealth}, mana ${player.mana}/${player.maxMana}.`);
  }

  const won = player.health > 0;
  const summary = { won, floor: Math.min(floor, FLOORS), level: player.level, kills, killedBy: won ? "" : player.lastHitBy };
  if (won) io.print("[panel bold green]The Lich falls. You have conquered the Spire![/]");
  else io.print(`[panel bold red]You died on floor ${summary.floor} (${actOf(summary.floor).name}), slain by the ${summary.killedBy}.[/]`);
  io.print(`Level ${summary.level} · ${kills} enemies defeated.`);
  return summary;
}
