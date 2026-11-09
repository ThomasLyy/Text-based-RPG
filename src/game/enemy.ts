import type { Player } from "./player";
import { io, randint } from "./io";

// What an enemy will do on its next turn. Shown to the player in advance.
export interface Intent {
  name: string;
  kind: "attack" | "poison" | "heal" | "buff";
  value: number; // damage, poison per turn, heal amount, or damage bonus
  turns?: number; // poison only
}

export interface EnemyTemplate {
  name: string;
  maxHealth: number;
  speed: number;
  xp: number;
  pattern: Intent[]; // played in order, looping
  boss?: boolean;
}

const attack = (name: string, value: number): Intent => ({ name, kind: "attack", value });
const poison = (name: string, value: number, turns: number): Intent => ({ name, kind: "poison", value, turns });
const heal = (name: string, value: number): Intent => ({ name, kind: "heal", value });
const buff = (name: string, value: number): Intent => ({ name, kind: "buff", value });

export class Enemy {
  name: string;
  health: number;
  maxHealth: number;
  speed: number;
  xpReward: number;
  boss: boolean;
  pattern: Intent[];
  step: number;
  bonus = 0; // extra damage from buffs

  // scale multiplies health and intent values; the template itself is never changed
  constructor(t: EnemyTemplate, scale = 1) {
    this.name = t.name;
    this.maxHealth = this.health = Math.round(t.maxHealth * scale);
    this.speed = t.speed;
    this.xpReward = Math.round(t.xp * scale);
    this.boss = t.boss ?? false;
    this.pattern = t.pattern.map((i) => ({ ...i, value: Math.round(i.value * scale) }));
    this.step = this.boss ? 0 : randint(0, this.pattern.length - 1); // so two goblins don't swing in sync
  }

  get intent() {
    return this.pattern[this.step % this.pattern.length];
  }

  intentText() {
    const i = this.intent;
    if (i.kind === "attack") return `${i.name}, ${i.value + this.bonus} damage`;
    if (i.kind === "poison") return `${i.name}, poison ${i.value + this.bonus} per turn for ${i.turns} turns`;
    if (i.kind === "heal") return `${i.name}, heal ${i.value}`;
    return `${i.name}, +${i.value} damage from now on`;
  }

  act(player: Player, allies: Enemy[]) {
    const i = this.intent;
    this.step++;
    if (i.kind === "attack") player.takeDamage(i.value + this.bonus, this.name);
    else if (i.kind === "poison") player.poison(i.value + this.bonus, i.turns!, this.name);
    else if (i.kind === "heal") {
      const target = allies.filter((a) => a.health > 0).sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
      const healed = Math.min(i.value, target.maxHealth - target.health);
      target.health += healed;
      io.print(`The ${this.name} uses ${i.name}: ${target === this ? "itself" : `the ${target.name}`} heals ${healed}.`);
    } else {
      this.bonus += i.value;
      io.print(`The ${this.name} uses ${i.name}: its attacks now deal +${this.bonus} damage.`);
    }
  }
}

export interface Act {
  name: string;
  enemies: EnemyTemplate[];
  boss: EnemyTemplate;
}

export const ACTS: Act[] = [
  {
    name: "The Sewers",
    enemies: [
      { name: "Rat", maxHealth: 14, speed: 13, xp: 4, pattern: [attack("Bite", 4), attack("Bite", 4), attack("Frenzy", 7)] },
      { name: "Goblin", maxHealth: 24, speed: 9, xp: 6, pattern: [attack("Stab", 6), attack("Stab", 6), attack("Heavy swing", 13)] },
      { name: "Slime", maxHealth: 30, speed: 4, xp: 6, pattern: [attack("Slam", 5), poison("Acid", 3, 3)] },
      { name: "Cultist", maxHealth: 20, speed: 8, xp: 7, pattern: [attack("Dark bolt", 5), heal("Mend", 8), attack("Dark bolt", 5)] },
    ],
    boss: { name: "Goblin Warlord", maxHealth: 110, speed: 10, xp: 30, boss: true, pattern: [attack("Cleave", 10), buff("War cry", 3), attack("Cleave", 10), attack("Crushing blow", 22)] },
  },
  {
    name: "The Catacombs",
    enemies: [
      { name: "Skeleton", maxHealth: 34, speed: 10, xp: 9, pattern: [attack("Slash", 9), attack("Slash", 9), attack("Bone crush", 18)] },
      { name: "Giant Spider", maxHealth: 30, speed: 14, xp: 9, pattern: [attack("Bite", 7), poison("Venom", 5, 3)] },
      { name: "Ghoul", maxHealth: 46, speed: 6, xp: 10, pattern: [attack("Claw", 10), attack("Claw", 10), heal("Feast", 12)] },
      { name: "Dark Acolyte", maxHealth: 30, speed: 9, xp: 10, pattern: [attack("Shadow bolt", 8), heal("Unholy mend", 14), buff("Dark rite", 3)] },
    ],
    boss: { name: "Bone Colossus", maxHealth: 220, speed: 7, xp: 60, boss: true, pattern: [attack("Stomp", 16), attack("Stomp", 16), heal("Gather bones", 25), attack("Earthshatter", 34)] },
  },
  {
    name: "The Spire",
    enemies: [
      { name: "Wraith", maxHealth: 44, speed: 15, xp: 13, pattern: [attack("Chill touch", 12), poison("Soul drain", 6, 3)] },
      { name: "Troll", maxHealth: 75, speed: 6, xp: 14, pattern: [attack("Club", 15), heal("Regenerate", 18), attack("Smash", 28)] },
      { name: "Fire Imp", maxHealth: 38, speed: 17, xp: 12, pattern: [attack("Firebolt", 11), attack("Firebolt", 11), poison("Ignite", 6, 3)] },
      { name: "Dread Knight", maxHealth: 65, speed: 9, xp: 15, pattern: [attack("Strike", 14), buff("Battle focus", 4), attack("Execute", 30)] },
    ],
    boss: { name: "The Lich", maxHealth: 360, speed: 11, xp: 0, boss: true, pattern: [attack("Death bolt", 20), poison("Plague", 8, 4), heal("Raise dead", 35), attack("Doom", 45)] },
  },
];

export const FLOORS_PER_ACT = 5; // the last floor of each act is its boss
export const FLOORS = ACTS.length * FLOORS_PER_ACT;
