import { io, randint, choices } from "./io";
import { Enemy, enemies } from "./enemy";
import { combat } from "./combat";
import { chooseReward } from "./reward";
import type { Player } from "./player";

export async function gameLoop(player: Player) {
  for (let floor = 1; floor <= 5; floor++) {
    io.print(`[panel bold]Floor ${floor} out of 5[/]`);

    const maxEnemies = Math.min(3, floor);
    const enemyStrengthMultiplier = 1 + (floor - 1) * 0.2;

    // copies, so the templates stay untouched and two rats have their own health
    const currentEnemies = choices(enemies, randint(1, maxEnemies)).map((e) => new Enemy({ ...e }));
    for (const enemy of currentEnemies) {
      enemy.strength = Math.trunc(enemy.strength * enemyStrengthMultiplier);
      enemy.maxHealth = Math.trunc(enemy.maxHealth * enemyStrengthMultiplier);
      enemy.health = enemy.maxHealth;
    }

    await combat(player, currentEnemies, `Floor ${floor} / 5`);

    if (player.health <= 0) {
      io.print("[panel bold red]Game Over![/]");
      break;
    }

    player.health = Math.min(player.maxHealth, player.health + 10);
    io.print(`\nYou rested and recovered 10 health. Your health is now ${player.health}/${player.maxHealth}.`);

    if (floor < 5) await chooseReward(player, floor);
  }

  if (player.health > 0) io.print("[panel bold green]Congratulations! You defeated the boss![/]");
}
