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
      { name: "Rat", maxHealth: 14, speed: 13, xp: 4, pattern: [attack("Bite", 4), attack("Bite", 4), attack("Frenzy", 9)] },
      { name: "Goblin", maxHealth: 24, speed: 9, xp: 6, pattern: [attack("Stab", 6), attack("Stab", 6), attack("Heavy swing", 16)] },
      { name: "Slime", maxHealth: 30, speed: 4, xp: 6, pattern: [attack("Slam", 5), poison("Acid", 3, 3)] },
      { name: "Cultist", maxHealth: 20, speed: 8, xp: 7, pattern: [attack("Dark bolt", 5), heal("Mend", 8), attack("Dark bolt", 5)] },
    ],
    boss: { name: "Goblin Warlord", maxHealth: 110, speed: 10, xp: 30, boss: true, pattern: [attack("Cleave", 10), buff("War cry", 3), attack("Cleave", 10), attack("Crushing blow", 28)] },
  },
  {
    name: "The Catacombs",
    enemies: [
      { name: "Skeleton", maxHealth: 34, speed: 10, xp: 9, pattern: [attack("Slash", 8), attack("Slash", 8), attack("Bone crush", 20)] },
      { name: "Giant Spider", maxHealth: 30, speed: 14, xp: 9, pattern: [attack("Bite", 7), poison("Venom", 4, 3)] },
      { name: "Ghoul", maxHealth: 40, speed: 6, xp: 10, pattern: [attack("Claw", 10), attack("Claw", 10), heal("Feast", 12)] },
      { name: "Dark Acolyte", maxHealth: 30, speed: 9, xp: 10, pattern: [attack("Shadow bolt", 8), heal("Unholy mend", 14), buff("Dark rite", 3)] },
    ],
    boss: { name: "Bone Colossus", maxHealth: 170, speed: 7, xp: 60, boss: true, pattern: [attack("Stomp", 13), attack("Stomp", 13), heal("Gather bones", 20), attack("Earthshatter", 36)] },
  },
  {
    name: "The Spire",
    enemies: [
      { name: "Wraith", maxHealth: 44, speed: 15, xp: 13, pattern: [attack("Chill touch", 10), poison("Soul drain", 5, 3)] },
      { name: "Troll", maxHealth: 62, speed: 6, xp: 14, pattern: [attack("Club", 12), heal("Regenerate", 14), attack("Smash", 34)] },
      { name: "Fire Imp", maxHealth: 38, speed: 17, xp: 12, pattern: [attack("Firebolt", 9), attack("Firebolt", 9), poison("Ignite", 5, 3)] },
      { name: "Dread Knight", maxHealth: 55, speed: 9, xp: 15, pattern: [attack("Strike", 12), buff("Battle focus", 3), attack("Execute", 38)] },
    ],
    boss: { name: "Lich", maxHealth: 280, speed: 11, xp: 0, boss: true, pattern: [attack("Death bolt", 16), poison("Plague", 6, 3), heal("Raise dead", 25), attack("Doom", 58)] },
  },
];

export const FLOORS_PER_ACT = 5; // the last floor of each act is its boss
export const FLOORS = ACTS.length * FLOORS_PER_ACT;
