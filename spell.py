from dataclasses import dataclass

@dataclass
class Spell:
    name: str
    damage: int
    manaCost: int
    element: str = None
    effect: str = None  # "damage", "heal", "buff", "debuff"
    targetType: str = "single"

# Fire Spells
fireball = Spell("Fireball", 15, 10, "Fire", "damage")
flameWall = Spell("Flame Wall", 5, 5, "Fire", "damage", "multiple")  # Zone spell
combustion = Spell("Combustion", 5, 15, "Fire", "debuff")
fieryExplosion = Spell("Fiery Explosion", 30, 25, "Fire", "damage", "multiple")
fieryEmbrace = Spell("Fiery Embrace", 0, 20, "Fire", "buff")

# Water Spells
waterWhip = Spell("Water Whip", 12, 8, "Water", "damage")
deluge = Spell("Deluge", 4, 4, "Water", "damage", "multiple")  # Zone spell, slows enemies
frostbite = Spell("Frostbite", 0, 12, "Water", "debuff")
tidalWave = Spell("Tidal Wave", 25, 20, "Water", "damage", "multiple")
purifyingWave = Spell("Purifying Wave", -8, 15, "Water", "heal")

# Air Spells
gust = Spell("Gust", 8, 5, "Air", "damage")
gale = Spell("Gale", 10, 10, "Air", "damage")  # Pushes enemies back
lightningBolt = Spell("Lightning Bolt", 20, 15, "Air", "damage")
cyclone = Spell("Cyclone", 6, 6, "Air", "damage", "multiple")  # Zone spell, disorients enemies
windWings = Spell("Wind Wings", 0, 18, "Air", "buff")  # Increases speed and dodge

# Earth Spells
pebbleToss = Spell("Pebble Toss", 5, 3, "Earth", "damage")
rockThrow = Spell("Rock Throw", 10, 7, "Earth", "damage")
earthquake = Spell("Earthquake", 8, 8, "Earth", "damage", "multiple")  # Zone spell, stuns enemies
stoneArmor = Spell("Stone Armor", 0, 15, "Earth", "buff")
landslide = Spell("Landslide", 28, 22, "Earth", "damage", "multiple")

# Light Spells
flash = Spell("Flash", 0, 5, "Light", "debuff")  # Temporarily blinds
rayOfLight = Spell("Ray of Light", 12, 10, "Light", "damage")
blindingLight = Spell("Blinding Light", 0, 15, "Light", "debuff", "multiple")  # Zone spell, reduces accuracy
blessingOfLight = Spell("Blessing of Light", 0, 20, "Light", "buff")
purifyingLight = Spell("Purifying Light", 25, 25, "Light", "damage", "multiple")

# Shadow Spells
shadowMeld = Spell("Shadow Meld", 0, 10, "Shadow", "buff")  # Increases dodge
shadowBolt = Spell("Shadow Bolt", 14, 12, "Shadow", "damage")
shadowCloud = Spell("Shadow Cloud", 5, 5, "Shadow", "damage", "multiple")  # Zone spell, blinds and weakens
curse = Spell("Curse", 0, 18, "Shadow", "debuff")
lifeDrain = Spell("Life Drain", 20, 20, "Shadow", "damage")  # Heals caster

# Energy Spells
spark = Spell("Spark", 7, 5, "Energy", "damage")
arcLightning = Spell("Arc Lightning", 13, 10, "Energy", "damage")
electricalStorm = Spell("Electrical Storm", 7, 7, "Energy", "damage", "multiple")  # Zone spell
overload = Spell("Overload", 0, 15, "Energy", "debuff")
chainLightning = Spell("Chain Lightning", 10, 10, "Energy", "damage")  # Hits multiple enemies

# Life Spells
healingTouch = Spell("Healing Touch", -10, 8, "Life", "heal")
entanglingRoots = Spell("Entangling Roots", 0, 12, "Life", "debuff", "multiple")  # Zone spell, roots enemies
regenerate = Spell("Regenerate", -5, 20, "Life", "buff")  # Heals over time
insectSwarm = Spell("Insect Swarm", 3, 3, "Life", "damage", "multiple")  # Zone spell, poisons enemies

# Mind Spells
confuse = Spell("Confuse", 0, 10, "Mind", "debuff")
illusion = Spell("Illusion", 0, 15, "Mind", "debuff")  # Creates a distraction
fear = Spell("Fear", 0, 20, "Mind", "debuff")
mindControl = Spell("Mind Control", 0, 30, "Mind", "debuff")

# Time Spells
slow = Spell("Slow", 0, 12, "Time", "debuff")
haste = Spell("Haste", 0, 18, "Time", "buff")
timeWarp = Spell("Time Warp", 0, 25, "Time", "debuff", "multiple")  # Zone spell, slows enemies
futureSight = Spell("Future Sight", 0, 30, "Time", "buff")  # Reveals enemy's next action

# Space Spells
shortTeleport = Spell("Short Teleport", 0, 10, "Space", "none")
dimensionalRift = Spell("Dimensional Rift", 15, 20, "Space", "damage")  # Summons a creature
spatialDistortion = Spell("Spatial Distortion", 10, 10, "Space", "damage", "multiple")  # Zone spell
teleport = Spell("Teleport", 0, 35, "Space", "none")

# Liste de sorts
spells = [
    # Fire
    fireball, flameWall, combustion, fieryExplosion, fieryEmbrace,
    # Water
    waterWhip, deluge, frostbite, tidalWave, purifyingWave,
    # Air
    gust, gale, lightningBolt, cyclone, windWings,
    # Earth
    pebbleToss, rockThrow, earthquake, stoneArmor, landslide,
    # Light
    flash, rayOfLight, blindingLight, blessingOfLight, purifyingLight,
    # Shadow
    shadowMeld, shadowBolt, shadowCloud, curse, lifeDrain,
    # Energy
    spark, arcLightning, electricalStorm, overload, chainLightning,
    # Life
    healingTouch, entanglingRoots, regenerate, insectSwarm,
    # Mind
    confuse, illusion, fear, mindControl,
    # Time
    slow, haste, timeWarp, futureSight,
    # Space
    shortTeleport, dimensionalRift, spatialDistortion, teleport
]

smallSpell = [
    fireball, flameWall
]