import { io, randint, choices } from "./io";
import { ACTS, Enemy, FLOORS, FLOORS_PER_ACT } from "./enemy";
import { combat } from "./combat";
import { chooseReward } from "./reward";
import type { Player } from "./player";

const actOf = (floor: number) => ACTS[Math.floor((floor - 1) / FLOORS_PER_ACT)];
const floorInAct = (floor: number) => ((floor - 1) % FLOORS_PER_ACT) + 1;

// Floor 1 of an act: 1 enemy, floor 2: 1-2, floors 3-4: 2-3, each floor 10% tougher. Last floor: the boss.
export function encounter(floor: number): Enemy[] {
  const act = actOf(floor);
  const f = floorInAct(floor);
  if (f === FLOORS_PER_ACT) return [new Enemy(act.boss)];
  const count = f === 1 ? 1 : f === 2 ? randint(1, 2) : randint(2, 3);
  return choices(act.enemies, count).map((t) => new Enemy(t, 1 + 0.1 * (f - 1)));
}

const BOOSTS: { label: string; apply: (p: Player) => void }[] = [
  { label: "+3 Strength", apply: (p) => void (p.strength += 3) },
  { label: "+3 Intelligence", apply: (p) => void (p.intelligence += 3) },
  { label: "+3 Speed", apply: (p) => void (p.speed += 3) },
  { label: "+4 Perception", apply: (p) => void (p.perception += 4) },
  { label: "+15 Max Health", apply: (p) => void ((p.maxHealth += 15), (p.health += 15)) },
  { label: "+20 Max Mana", apply: (p) => void ((p.maxMana += 20), (p.mana += 20)) },
];

// Each level: +10 health and a choice of 3 different boosts out of 6. Each level needs 10 more XP.
export async function levelUps(player: Player) {
  while (player.experience >= player.xpToNextLevel) {
    player.experience -= player.xpToNextLevel;
    player.xpToNextLevel += 10;
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

    // Rest: a little health and mana after each floor, everything back after a boss.
    const boss = enemies[0].boss;
    player.health = boss ? player.maxHealth : Math.min(player.maxHealth, player.health + 15);
    player.mana = boss ? player.maxMana : Math.min(player.maxMana, player.mana + 30);
    io.print(`You rest. Health ${player.health}/${player.maxHealth}, mana ${player.mana}/${player.maxMana}.`);

    if (outcome === "won") await chooseReward(player, floor); // no reward for running away
  }

  const won = player.health > 0;
  const summary = { won, floor: Math.min(floor, FLOORS), level: player.level, kills, killedBy: won ? "" : player.lastHitBy };
  if (won) io.print("[panel bold green]The Lich falls. You have conquered the Spire![/]");
  else io.print(`[panel bold red]You died on floor ${summary.floor} (${actOf(summary.floor).name}), slain by the ${summary.killedBy}.[/]`);
  io.print(`Level ${summary.level} · ${kills} enemies defeated.`);
  return summary;
}
