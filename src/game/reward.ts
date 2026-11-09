import { ARMOR_SLOTS, FAMILIES, bonusText, describe, makeArmor, makePotion, makeScroll, makeWeapon, randomSpell, rollQuality, type Item, type Scroll, type Weapon } from "./items";
import { RANK_NAME, SPELLBOOK_SIZE, spellName } from "./spell";
import { io, randint } from "./io";
import type { Player } from "./player";

const avg = (w: Weapon | null) => (w ? Math.round((w.min + w.max) / 2) : 0);

// Half the time, upgrade a spell you know (if any is below rank IV); otherwise a random spell.
function randomScroll(player: Player): Scroll {
  const upgradable = player.spells.filter((k) => k.rank < RANK_NAME.length);
  if (upgradable.length && Math.random() < 0.5) {
    const k = upgradable[randint(0, upgradable.length - 1)];
    return makeScroll(k.spell, k.rank + 1);
  }
  const sp = randomSpell();
  const known = player.knows(sp.name);
  return makeScroll(sp, known ? Math.min(RANK_NAME.length, known.rank + 1) : 1);
}

// Odds per offer: weapon 30%, armor 35%, spell 20%, potion 15%. Bosses: Rare+ gear or a spell upgrade, no potions.
function randomItem(player: Player, act: number, boss: boolean): Item {
  const r = Math.random();
  if (!boss && r >= 0.85) return makePotion(act, Math.random() < 0.35);
  if (r >= 0.65) return randomScroll(player);
  if (r < 0.3) return makeWeapon(FAMILIES[randint(0, FAMILIES.length - 1)], act, rollQuality(act, boss));
  const slots = ARMOR_SLOTS.filter((s) => (s !== "shield" || player.canHoldShield()) && (s !== "focus" || player.canHoldFocus()));
  return makeArmor(slots[randint(0, slots.length - 1)], act, rollQuality(act, boss));
}

export function rewardOffers(player: Player, act: number, boss = false, count = 3): Item[] {
  const offers: Item[] = [];
  while (offers.length < count) {
    const item = randomItem(player, act, boss);
    if (!offers.some((o) => o.name === item.name && o.kind === item.kind)) offers.push(item);
  }
  return offers;
}

// What picking this item would change, shown on its button.
export function comparison(player: Player, item: Item): string {
  if (item.kind === "potion") return player.potions.length >= 5 ? "pouch full" : `pouch ${player.potions.length}/5`;
  if (item.kind === "spell") {
    const known = player.knows(item.name);
    return known ? `you have rank ${RANK_NAME[known.rank - 1]}` : `spellbook ${player.spells.length}/${SPELLBOOK_SIZE}`;
  }
  if (item.kind === "armor") {
    const current = player.armorIn(item.slot);
    return current ? `replaces ${current.name} (${bonusText(current.bonuses)})` : "empty slot";
  }
  return `avg ${avg(item)} dmg, yours ${avg(player.mainHand)}`;
}

async function learn(player: Player, scroll: Scroll) {
  const known = player.knows(scroll.name);
  if (known) {
    known.rank = Math.max(known.rank, scroll.rank);
    return io.print(`Your ${spellName(known)} grows stronger.`);
  }
  if (player.spells.length >= SPELLBOOK_SIZE) {
    const i = await io.ask(`Your spellbook is full. Forget a spell for ${scroll.name}?`, [...player.spells.map(spellName), "Keep my spells"]);
    if (i === player.spells.length) return io.print("You keep your spells.");
    io.print(`You forget ${spellName(player.spells[i])}.`);
    player.spells.splice(i, 1);
  }
  player.spells.push({ spell: scroll.spell, rank: scroll.rank });
  io.print(`You learn ${scroll.name}.`);
}

export async function take(player: Player, item: Item) {
  if (item.kind === "potion") {
    return io.print(player.addPotion(item) ? `You pack the ${item.name}.` : "Your pouch is full. You leave the potion behind.");
  }
  if (item.kind === "spell") return learn(player, item);
  let removed: Item[];
  if (item.kind === "armor") removed = player.equipArmor(item);
  else if (item.family.hands === 1 && player.mainHand?.family.hands === 1) {
    const off = player.offHand;
    const hand = await io.ask(`Equip the ${item.name} in`, [
      `Main hand (replaces ${player.mainHand.name})`,
      `Off hand (${off ? `replaces ${off.name}` : "dual-wield"})`,
    ]);
    removed = player.equipWeapon(item, hand === 0 ? "main" : "off");
  } else removed = player.equipWeapon(item);
  io.print(`You equip the ${item.name}.${removed.length ? ` (${removed.map((r) => r.name).join(", ")} left behind)` : ""}`);
}

export async function chooseReward(player: Player, act: number, boss = false) {
  const offers = rewardOffers(player, act, boss);
  io.print(`[panel bold blue]${boss ? "The boss drops a treasure!" : "Choose your reward"}[/]`);
  const choice = await io.ask("Choose a reward", [...offers.map((o) => `${describe(o)} — ${comparison(player, o)}`), "Skip"]);
  if (choice < offers.length) await take(player, offers[choice]);
}
