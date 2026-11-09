export interface Spell {
  name: string;
  damage: number;
  manaCost: number;
  element: string | null;
  effect: string | null; // "damage", "heal", "buff", "debuff"
  targetType: string; // "single" | "multiple"
}

const spell = (name: string, damage: number, manaCost: number, element: string | null = null, effect: string | null = null, targetType = "single"): Spell =>
  ({ name, damage, manaCost, element, effect, targetType });

// Fire
export const fireball = spell("Fireball", 20, 10, "Fire", "damage");
export const flameWall = spell("Flame Wall", 9, 12, "Fire", "damage", "multiple");
export const combustion = spell("Combustion", 5, 15, "Fire", "debuff");
export const fieryExplosion = spell("Fiery Explosion", 30, 25, "Fire", "damage", "multiple");
export const fieryEmbrace = spell("Fiery Embrace", 0, 20, "Fire", "buff");
// Water
export const waterWhip = spell("Water Whip", 12, 8, "Water", "damage");
export const deluge = spell("Deluge", 4, 4, "Water", "damage", "multiple");
export const frostbite = spell("Frostbite", 0, 12, "Water", "debuff");
export const tidalWave = spell("Tidal Wave", 25, 20, "Water", "damage", "multiple");
export const purifyingWave = spell("Purifying Wave", -8, 15, "Water", "heal");
// Air
export const gust = spell("Gust", 8, 5, "Air", "damage");
export const gale = spell("Gale", 10, 10, "Air", "damage");
export const lightningBolt = spell("Lightning Bolt", 20, 15, "Air", "damage");
export const cyclone = spell("Cyclone", 6, 6, "Air", "damage", "multiple");
export const windWings = spell("Wind Wings", 0, 18, "Air", "buff");
// Earth
export const pebbleToss = spell("Pebble Toss", 5, 3, "Earth", "damage");
export const rockThrow = spell("Rock Throw", 10, 7, "Earth", "damage");
export const earthquake = spell("Earthquake", 8, 8, "Earth", "damage", "multiple");
export const stoneArmor = spell("Stone Armor", 0, 15, "Earth", "buff");
export const landslide = spell("Landslide", 28, 22, "Earth", "damage", "multiple");
// Light
export const flash = spell("Flash", 0, 5, "Light", "debuff");
export const rayOfLight = spell("Ray of Light", 12, 10, "Light", "damage");
export const blindingLight = spell("Blinding Light", 0, 15, "Light", "debuff", "multiple");
export const blessingOfLight = spell("Blessing of Light", 0, 20, "Light", "buff");
export const purifyingLight = spell("Purifying Light", 25, 25, "Light", "damage", "multiple");
// Shadow
export const shadowMeld = spell("Shadow Meld", 0, 10, "Shadow", "buff");
export const shadowBolt = spell("Shadow Bolt", 14, 12, "Shadow", "damage");
export const shadowCloud = spell("Shadow Cloud", 5, 5, "Shadow", "damage", "multiple");
export const curse = spell("Curse", 0, 18, "Shadow", "debuff");
export const lifeDrain = spell("Life Drain", 20, 20, "Shadow", "damage");
// Energy
export const spark = spell("Spark", 7, 5, "Energy", "damage");
export const arcLightning = spell("Arc Lightning", 13, 10, "Energy", "damage");
export const electricalStorm = spell("Electrical Storm", 7, 7, "Energy", "damage", "multiple");
export const overload = spell("Overload", 0, 15, "Energy", "debuff");
export const chainLightning = spell("Chain Lightning", 10, 10, "Energy", "damage");
// Life
export const healingTouch = spell("Healing Touch", -10, 8, "Life", "heal");
export const entanglingRoots = spell("Entangling Roots", 0, 12, "Life", "debuff", "multiple");
export const regenerate = spell("Regenerate", -5, 20, "Life", "buff");
export const insectSwarm = spell("Insect Swarm", 3, 3, "Life", "damage", "multiple");
// Mind
export const confuse = spell("Confuse", 0, 10, "Mind", "debuff");
export const illusion = spell("Illusion", 0, 15, "Mind", "debuff");
export const fear = spell("Fear", 0, 20, "Mind", "debuff");
export const mindControl = spell("Mind Control", 0, 30, "Mind", "debuff");
// Time
export const slow = spell("Slow", 0, 12, "Time", "debuff");
export const haste = spell("Haste", 0, 18, "Time", "buff");
export const timeWarp = spell("Time Warp", 0, 25, "Time", "debuff", "multiple");
export const futureSight = spell("Future Sight", 0, 30, "Time", "buff");
// Space
export const shortTeleport = spell("Short Teleport", 0, 10, "Space", "none");
export const dimensionalRift = spell("Dimensional Rift", 15, 20, "Space", "damage");
export const spatialDistortion = spell("Spatial Distortion", 10, 10, "Space", "damage", "multiple");
export const teleport = spell("Teleport", 0, 35, "Space", "none");

export const spells = [
  fireball, flameWall, combustion, fieryExplosion, fieryEmbrace,
  waterWhip, deluge, frostbite, tidalWave, purifyingWave,
  gust, gale, lightningBolt, cyclone, windWings,
  pebbleToss, rockThrow, earthquake, stoneArmor, landslide,
  flash, rayOfLight, blindingLight, blessingOfLight, purifyingLight,
  shadowMeld, shadowBolt, shadowCloud, curse, lifeDrain,
  spark, arcLightning, electricalStorm, overload, chainLightning,
  healingTouch, entanglingRoots, regenerate, insectSwarm,
  confuse, illusion, fear, mindControl,
  slow, haste, timeWarp, futureSight,
  shortTeleport, dimensionalRift, spatialDistortion, teleport,
];

export const smallSpell = [fireball, flameWall];
