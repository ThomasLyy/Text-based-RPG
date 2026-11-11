import { ARMOR_SLOTS, FAMILIES, bonusText, describe, makeArmor, makePotion, makeScroll, makeWeapon, rollQuality, type Armor, type Item, type Scroll, type Weapon } from "./items";
import { RANK_NAME, SPELLBOOK_SIZE, SPELLS, spellName, type KnownSpell } from "./spell";
import { io, randint, random } from "./io";
import { POUCH_SIZE, type Player } from "./player";
import { available } from "./meta";

// Half the time, upgrade a spell you know (if any is below rank IV); otherwise a random spell.
function randomScroll(player: Player): Scroll {
  const upgradable = player.spells.filter((k) => k.rank < RANK_NAME.length);
  if (upgradable.length && random() < 0.5) {
    const k = upgradable[randint(0, upgradable.length - 1)];
    return makeScroll(k.spell, k.rank + 1);
  }
  const pool = available("spell", SPELLS, (s) => s.name).filter((s) => (player.knows(s.name)?.rank ?? 0) < RANK_NAME.length); // a rank IV spell cannot grow
  const sp = pool[randint(0, pool.length - 1)];
  const known = player.knows(sp.name);
  return makeScroll(sp, known ? Math.min(RANK_NAME.length, known.rank + 1) : 1);
}

// Odds per offer: weapon 30%, armor 35%, spell 20%, potion 15%. Bosses: Rare+ gear or a spell upgrade, no potions.
function randomItem(player: Player, act: number, boss: boolean, step: number): Item {
  const r = random();
  if (!boss && r >= 0.85) return makePotion(act, random() < 0.35);
  if (r >= 0.65) return randomScroll(player);
  const families = available("family", FAMILIES, (f) => f.name);
  if (r < 0.3) return makeWeapon(families[randint(0, families.length - 1)], act, rollQuality(act, boss, step));
  const slots = ARMOR_SLOTS.filter((s) => (s !== "shield" || player.canHoldShield()) && (s !== "focus" || player.canHoldFocus()));
  return makeArmor(slots[randint(0, slots.length - 1)], act, rollQuality(act, boss, step));
}

// Elites: gear one quality tier up.
export function rewardOffers(player: Player, act: number, { boss = false, elite = false, count = 3 }: { boss?: boolean; elite?: boolean; count?: number } = {}): Item[] {
  const offers: Item[] = [];
  while (offers.length < count) {
    const item = randomItem(player, act, boss, elite ? 1 : 0);
    if (!offers.some((o) => o.name === item.name && o.kind === item.kind)) offers.push(item);
  }
  return offers;
}

// What picking this item would change, shown on its button.
export function comparison(player: Player, item: Item): string {
  if (item.kind === "potion") return player.potions.length >= POUCH_SIZE ? "pouch full" : `pouch ${player.potions.length}/${POUCH_SIZE}`;
  if (item.kind === "spell") {
    const known = player.knows(item.name);
    const dmg = Math.round(player.spellDamage(item));
    return known
      ? `you have rank ${RANK_NAME[known.rank - 1]}, ${arrow("dmg", Math.round(player.spellDamage(known)), dmg, "")}`
      : `spellbook ${player.spells.length}/${SPELLBOOK_SIZE}, ${dmg} dmg for you`;
  }
  if (item.kind === "armor") {
    const current = player.armorIn(item.slot);
    return current ? `replaces ${current.name} (${bonusText(current.bonuses)})` : "empty slot";
  }
  return player.mainHand ? `yours: ${player.mainHand.name}` : "unarmed";
}

// The numbers gear can change, read off the hero: [label, value, unit].
export function sheet(p: Player): [string, number, string][] {
  const t = p.stats();
  return [
    ["Attack", Math.round(p.attackDamage()), " dmg"],
    ["Spell power", Math.round(p.spellPower() * 100), "%"],
    ["Max HP", p.maxHealth, ""],
    ["Max MP", p.maxMana, ""],
    ["MP per turn", p.manaRegen(), ""],
    ["STR", t.strength, ""],
    ["AGI", t.agility, ""],
    ["INT", t.intelligence, ""],
    ["PER", t.perception, ""],
    ["Crit", Math.round(p.critChance() * 100), "%"],
    ["Dodge", Math.round(p.dodgeChance() * 100), "%"],
    ["Armor", p.armorPct(), "%"],
    ["Ward", p.wardPct(), "%"],
  ];
}

const arrow = (label: string, a: number, b: number, unit: string) => `${label} ${a}${unit} → [${b > a ? "green" : "red"}]${b}${unit}[/]`;

// Before -> after of wearing this, only the numbers that change: `line` on one line (for the button), `full` one per line (for the side panel).
export function gearChanges(p: Player, item: Weapon | Armor, hand: "main" | "off" = "main") {
  const before = sheet(p);
  const after = p.tryOn(item, hand, () => sheet(p));
  const rows = after.map(([label, b, unit], i) => {
    const a = before[i][1];
    return a === b ? null : arrow(label, a, b, unit);
  });
  return {
    line: rows.filter(Boolean).join(" · ") || "[dim]no stat change[/]",
    full: rows.filter(Boolean).join("\n") || "[dim]no stat change[/]",
  };
}

// A button for an item: its description and what it replaces, then (gear only) what changes on a second line.
export function offer(player: Player, item: Item, suffix = ""): { label: string; detail: string } {
  const head = `${describe(item)} — ${comparison(player, item)}${suffix}`;
  if (item.kind !== "weapon" && item.kind !== "armor") return { label: head, detail: head };
  const c = gearChanges(player, item);
  return { label: `${head}\n${c.line}`, detail: `${describe(item)}\n\n${c.full}` };
}

export const spellLine = (player: Player, k: KnownSpell) => `${spellName(k)} · ${Math.round(player.spellDamage(k))} dmg, ${player.spellCost(k)} MP`;

// Full spellbook: pick a spell to forget for the new one, or the last option to keep them all.
export const forgetQuestion = (player: Player, scroll: Scroll, keep: string) =>
  io.ask(`Your spellbook is full. Forget a spell for ${spellLine(player, scroll)}?`, [...player.spells.map((k) => spellLine(player, k)), keep]);

async function learn(player: Player, scroll: Scroll) {
  const known = player.knows(scroll.name);
  if (known) {
    known.rank = Math.max(known.rank, scroll.rank);
    return io.print(`Your ${spellName(known)} grows stronger.`);
  }
  if (player.spells.length >= SPELLBOOK_SIZE) {
    const i = await forgetQuestion(player, scroll, "Keep my spells");
    if (i === player.spells.length) return io.print("You keep your spells.");
    io.print(`You forget ${spellName(player.spells[i])}.`);
    player.spells.splice(i, 1);
  }
  player.spells.push({ spell: scroll.spell, rank: scroll.rank });
  io.print(`You learn ${scroll.name}.`);
}

// A one-hander next to a one-hander: ask which hand it goes in.
export async function askHand(player: Player, item: Weapon): Promise<"main" | "off"> {
  if (item.family.hands !== 1 || player.mainHand?.family.hands !== 1) return "main";
  const off = player.offHand;
  const [main, second] = (["main", "off"] as const).map((h) => gearChanges(player, item, h));
  const hand = await io.ask(
    `Equip the ${item.name} in`,
    [`Main hand (replaces ${player.mainHand.name})\n${main.line}`, `Off hand (${off ? `replaces ${off.name}` : "dual-wield"})\n${second.line}`],
    undefined,
    [main.full, second.full],
  );
  return hand === 0 ? "main" : "off";
}

export async function take(player: Player, item: Item, hand?: "main" | "off") {
  if (item.kind === "potion") {
    return io.print(player.addPotion(item) ? `You pack the ${item.name}.` : "Your pouch is full. You leave the potion behind.");
  }
  if (item.kind === "spell") return learn(player, item);
  const removed = item.kind === "armor" ? player.equipArmor(item) : player.equipWeapon(item, hand ?? (await askHand(player, item)));
  io.print(`You equip the ${item.name}.${removed.length ? ` (${removed.map((r) => r.name).join(", ")} left behind)` : ""}`);
}

export async function chooseReward(player: Player, act: number, { boss = false, elite = false }: { boss?: boolean; elite?: boolean } = {}) {
  const offers = rewardOffers(player, act, { boss, elite });
  io.print(`[panel bold blue]${boss ? "The boss drops a treasure!" : "Choose your reward"}[/]`);
  const buttons = offers.map((o) => offer(player, o));
  const choice = await io.ask("Choose a reward", [...buttons.map((b) => b.label), "Skip"], undefined, buttons.map((b) => b.detail));
  if (choice < offers.length) await take(player, offers[choice]);
}
