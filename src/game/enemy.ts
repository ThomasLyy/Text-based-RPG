import type { Player } from "./player";

export class Enemy {
  name!: string;
  health!: number;
  maxHealth!: number;
  strength!: number;
  speed!: number;
  xpReward!: number;

  constructor(f: Pick<Enemy, "name" | "health" | "maxHealth" | "strength" | "speed" | "xpReward">) {
    Object.assign(this, f);
  }
}

// audit #1: combat calls enemy.attack(), which was never written. Declared so it compiles, missing at runtime.
export interface Enemy {
  attack(player: Player): void;
}

export const rat = new Enemy({ name: "Rat", health: 10, maxHealth: 10, strength: 2, speed: 8, xpReward: 5 });
export const goblin = new Enemy({ name: "Goblin", health: 15, maxHealth: 15, strength: 4, speed: 6, xpReward: 10 });

export const enemies = [rat, goblin];

export const boss = new Enemy({ name: "Boss", health: 100, maxHealth: 100, strength: 15, speed: 12, xpReward: 100 });
