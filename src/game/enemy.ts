import type { Player } from "./player";
import { CHILL } from "./spell";
import { io, randint } from "./io";

// What an enemy will do on its next turn. Shown to the player in advance.
export interface Intent {
  name: string;
  kind: "attack" | "poison" | "heal" | "buff";
  value: number; // damage, poison per turn, heal amount, or damage bonus
  turns?: number; // poison only
  magic?: boolean; // attack only: Ward reduces magic, Armor reduces physical
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
const bolt = (name: string, value: number): Intent => ({ name, kind: "attack", value, magic: true });
const poison = (name: string, value: number, turns: number): Intent => ({ name, kind: "poison", value, turns });
const heal = (name: string, value: number): Intent => ({ name, kind: "heal", value });
const buff = (name: string, value: number): Intent => ({ name, kind: "buff", value });

export const ENRAGE_TURN = 8; // bosses gain +10% damage per round from this round on
export const ENRAGE_STEP = 0.1;

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
  rage = 0; // boss enrage: extra damage share
  stunned = false; // loses its next move
  burn = { damage: 0, turns: 0 };
  chilled = 0; // turns left dealing reduced damage
  cursed = 0; // turns left taking extra damage

  // scale multiplies health and intent values; the template itself is never changed. An elite pays double XP.
  constructor(t: EnemyTemplate, scale = 1, elite = false) {
    this.name = elite ? `Elite ${t.name}` : t.name;
    this.maxHealth = this.health = Math.round(t.maxHealth * scale);
    this.speed = t.speed;
    this.xpReward = Math.round(t.xp * scale) * (elite ? 2 : 1);
    this.boss = t.boss ?? false;
    this.pattern = t.pattern.map((i) => ({ ...i, value: Math.round(i.value * scale) }));
    this.step = this.boss ? 0 : randint(0, this.pattern.length - 1); // so two rats don't bite in sync
  }

  get intent() {
    return this.pattern[this.step % this.pattern.length];
  }

  // damage this enemy deals with an attack or poison value, before the hero's Armor/Ward/Defend
  private power(value: number) {
    return Math.round((value + this.bonus) * (1 + this.rage) * (this.chilled > 0 ? CHILL : 1));
  }

  intentText() {
    if (this.stunned) return "Stunned, loses its move";
    const i = this.intent;
    if (i.kind === "attack") return `${i.name}, ${this.power(i.value)} ${i.magic ? "magic" : "physical"} damage`;
    if (i.kind === "poison") return `${i.name}, poison ${this.power(i.value)} per turn for ${i.turns} turns`;
    if (i.kind === "heal") return `${i.name}, heal ${i.value}`;
    return `${i.name}, +${i.value} damage from now on`;
  }

  statusText(): string[] {
    return [
      ...(this.burn.turns > 0 ? [`Burning ${this.burn.damage} (${this.burn.turns})`] : []),
      ...(this.chilled > 0 ? [`Chilled (${this.chilled})`] : []),
      ...(this.cursed > 0 ? [`Cursed (${this.cursed})`] : []),
      ...(this.rage > 0 ? [`Enraged +${Math.round(this.rage * 100)}%`] : []),
    ];
  }

  act(player: Player, allies: Enemy[]) {
    const i = this.intent;
    this.step++;
    if (this.stunned) {
      this.stunned = false;
      io.print(`The ${this.name} is stunned and loses its ${i.name}.`);
    } else if (i.kind === "attack") player.takeDamage(this.power(i.value), this, i.magic ?? false);
    else if (i.kind === "poison") player.poison(this.power(i.value), i.turns!, this.name);
    else if (i.kind === "heal") {
      const target = allies.filter((a) => a.health > 0).sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
      const healed = Math.min(i.value, target.maxHealth - target.health);
      target.health += healed;
      io.print(`The ${this.name} uses ${i.name}: ${target === this ? "itself" : `the ${target.name}`} heals ${healed}.`);
    } else {
      this.bonus += i.value;
      io.print(`The ${this.name} uses ${i.name}: its attacks now deal +${this.bonus} damage.`);
    }
    this.endOfTurn(player);
  }

  // Effects count the enemy's own turns, so one cast after it moved still lasts through its next move.
  private endOfTurn(player: Player) {
    if (this.health <= 0) return;
    if (this.burn.turns > 0) {
      player.hurt(this, this.burn.damage, "Burn");
      this.burn.turns--;
      io.print(`The ${this.name} burns for ${this.burn.damage}.`);
    }
    if (this.chilled > 0) this.chilled--;
    if (this.cursed > 0) this.cursed--;
  }

  // bosses enrage after ENRAGE_TURN rounds
  endOfRound(round: number) {
    if (this.health <= 0) return;
    if (this.boss && round >= ENRAGE_TURN) {
      this.rage += ENRAGE_STEP;
      io.print(`[red]The ${this.name} grows enraged![/]`);
    }
  }
}

export interface Act {
  name: string;
  enemies: EnemyTemplate[];
  bosses: EnemyTemplate[]; // each run meets one of them
}

const boss = (name: string, maxHealth: number, speed: number, xp: number, pattern: Intent[]): EnemyTemplate => ({ name, maxHealth, speed, xp, pattern, boss: true });

// Act 1 is mostly physical, act 3 mostly magic: Armor shines early, Ward late.
export const ACTS: Act[] = [
  {
    name: "The Sewers",
    enemies: [
      { name: "Rat", maxHealth: 11, speed: 13, xp: 4, pattern: [attack("Bite", 4), attack("Bite", 4), attack("Frenzy", 9)] },
      { name: "Gutter Thief", maxHealth: 18, speed: 9, xp: 6, pattern: [attack("Stab", 6), attack("Stab", 6), attack("Heavy swing", 16)] },
      { name: "Sludge", maxHealth: 23, speed: 4, xp: 6, pattern: [attack("Slam", 5), poison("Acid", 3, 3)] },
      { name: "Drowned Cultist", maxHealth: 15, speed: 8, xp: 7, pattern: [bolt("Brine bolt", 5), heal("Mend", 8), bolt("Brine bolt", 5)] },
    ],
    bosses: [
      boss("Gutter King", 83, 10, 30, [attack("Cleave", 10), buff("War cry", 3), attack("Cleave", 10), attack("Crushing blow", 28)]),
      boss("Brood Mother", 83, 14, 30, [attack("Bite", 9), poison("Filth", 4, 3), attack("Bite", 9), attack("Frenzy", 24)]),
      boss("Drowned Prophet", 83, 8, 30, [bolt("Brine bolt", 11), heal("Tide's mercy", 12), bolt("Brine bolt", 11), bolt("Drowning wave", 30)]),
    ],
  },
  {
    name: "The Catacombs",
    enemies: [
      { name: "Skeleton", maxHealth: 26, speed: 10, xp: 9, pattern: [attack("Slash", 8), attack("Slash", 8), attack("Bone crush", 20)] },
      { name: "Crypt Spider", maxHealth: 23, speed: 14, xp: 9, pattern: [attack("Bite", 7), poison("Venom", 4, 3)] },
      { name: "Ghoul", maxHealth: 30, speed: 6, xp: 10, pattern: [attack("Claw", 10), attack("Claw", 10), heal("Feast", 12)] },
      { name: "Gravekeeper", maxHealth: 23, speed: 9, xp: 10, pattern: [bolt("Shadow bolt", 8), heal("Unholy mend", 14), buff("Dark rite", 3)] },
    ],
    bosses: [
      boss("Bone Colossus", 128, 7, 60, [attack("Stomp", 13), bolt("Grave curse", 13), heal("Gather bones", 20), attack("Earthshatter", 36)]),
      boss("Embalmer", 128, 9, 60, [poison("Embalming fluid", 7, 3), attack("Hook", 14), poison("Embalming fluid", 7, 3), heal("Stitch", 20)]),
      boss("Hollow King", 128, 8, 60, [buff("Hollow crown", 3), buff("Hollow crown", 3), bolt("Void lance", 38), attack("Sceptre", 12)]),
    ],
  },
  {
    name: "Hell",
    enemies: [
      { name: "Ash Shade", maxHealth: 33, speed: 15, xp: 13, pattern: [bolt("Cinder touch", 10), poison("Smother", 5, 3)] },
      { name: "Chained Brute", maxHealth: 47, speed: 6, xp: 14, pattern: [attack("Chain swing", 12), heal("Knit flesh", 14), attack("Smash", 34)] },
      { name: "Ember Imp", maxHealth: 29, speed: 17, xp: 12, pattern: [bolt("Firebolt", 9), bolt("Firebolt", 9), poison("Ignite", 5, 3)] },
      { name: "Oathbreaker", maxHealth: 41, speed: 9, xp: 15, pattern: [attack("Strike", 12), buff("Dark vow", 3), attack("Execute", 38)] },
    ],
    bosses: [
      boss("Ashen Warden", 210, 11, 0, [bolt("Ash bolt", 16), poison("Searing ash", 6, 3), heal("Rekindle", 25), bolt("Doom", 58)]),
      boss("Iron Judge", 210, 9, 0, [attack("Chain lash", 18), attack("Chain lash", 18), buff("Sentence", 4), attack("Execution", 52)]),
      boss("Pyre Mother", 210, 16, 0, [bolt("Flame lash", 20), bolt("Flame lash", 20), bolt("Flame lash", 20), bolt("Pyre", 38)]),
    ],
  },
];
