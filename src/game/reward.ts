import { ARMOR_SLOTS, FAMILIES, bonusText, describe, makeArmor, makePotion, makeWeapon, rollQuality, type Item, type Weapon } from "./items";
import { io, randint } from "./io";
import type { Player } from "./player";

const avg = (w: Weapon | null) => (w ? Math.round((w.min + w.max) / 2) : 0);

// Category odds for each offer: weapon 35%, armor 40%, potion 25%. Boss rewards: gear only, Rare or better.
function randomItem(player: Player, act: number, boss: boolean): Item {
  const r = Math.random();
  if (!boss && r >= 0.75) return makePotion(act, Math.random() < 0.35);
  if (r < 0.35 || (boss && r >= 0.85)) return makeWeapon(FAMILIES[randint(0, FAMILIES.length - 1)], act, rollQuality(act, boss));
  const slots = ARMOR_SLOTS.filter((s) => (s !== "shield" || player.canHoldShield()) && (s !== "focus" || player.canHoldFocus()));
  return makeArmor(slots[randint(0, slots.length - 1)], act, rollQuality(act, boss));
}

export function rewardOffers(player: Player, act: number, boss = false): Item[] {
  const offers: Item[] = [];
  while (offers.length < 3) {
    const item = randomItem(player, act, boss);
    if (!offers.some((o) => o.name === item.name && o.kind === item.kind)) offers.push(item);
  }
  return offers;
}

// What picking this item would change, shown on its button.
export function comparison(player: Player, item: Item): string {
  if (item.kind === "potion") return player.potions.length >= 5 ? "pouch full" : `pouch ${player.potions.length}/5`;
  if (item.kind === "armor") {
    const current = player.armorIn(item.slot);
    return current ? `replaces ${current.name} (${bonusText(current.bonuses)})` : "empty slot";
  }
  return `avg ${avg(item)} dmg, yours ${avg(player.mainHand)}`;
}

export async function take(player: Player, item: Item) {
  if (item.kind === "potion") {
    return io.print(player.addPotion(item) ? `You pack the ${item.name}.` : "Your pouch is full. You leave the potion behind.");
  }
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
