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

export async function gameLoop(player: Player) {
  for (let floor = 1; floor <= FLOORS; floor++) {
    const act = actOf(floor);
    if (floorInAct(floor) === 1) io.print(`[panel bold]${act.name}[/]`);
    const enemies = encounter(floor);
    if (enemies[0].boss) io.print(`[bold red]${enemies[0].name} blocks the way![/]`);
    else io.print(`[bold]Floor ${floor}[/]: ${enemies.map((e) => e.name).join(", ")}`);

    const outcome = await combat(player, enemies, `${act.name} · Floor ${floor} / ${FLOORS}`);
    player.poisoned.turns = 0; // poison does not follow you to the next floor

    if (outcome === "dead") {
      io.print("[panel bold red]Game Over![/]");
      break;
    }

    // Rest: a little health and mana after each floor, everything back after a boss.
    const boss = enemies[0].boss;
    player.health = boss ? player.maxHealth : Math.min(player.maxHealth, player.health + 15);
    player.mana = boss ? player.maxMana : Math.min(player.maxMana, player.mana + 30);
    io.print(`You rest. Health ${player.health}/${player.maxHealth}, mana ${player.mana}/${player.maxMana}.`);

    if (outcome === "won") await chooseReward(player, floor); // no reward for running away
  }

  if (player.health > 0) io.print("[panel bold green]The Lich falls. You have conquered the Spire![/]");
}
