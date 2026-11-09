// Events between fights: 2 per act (after floors 2 and 3), picked from 4 kinds.
import { describe, price, upgradeQuality, QUALITIES, type Armor, type Stat, type Weapon } from "./items";
import { RANK_NAME, spellName } from "./spell";
import { chooseReward, comparison, rewardOffers, take } from "./reward";
import { io, randint } from "./io";
import type { Player } from "./player";

export type EventKind = "merchant" | "forge" | "shrine" | "trial";
export const EVENT_KINDS: EventKind[] = ["merchant", "forge", "shrine", "trial"];
export const HEAL_PRICE = 30;

// Merchant: 4 items for gold (only what you can afford is listed), or pay to heal.
async function merchant(player: Player, act: number) {
  io.print("[panel bold yellow]A wandering merchant spreads out her wares.[/]");
  const stock = rewardOffers(player, act, false, 4);
  for (;;) {
    const affordable = stock.filter((i) => price(i) <= player.gold);
    const heal = player.health < player.maxHealth && player.gold >= HEAL_PRICE;
    const options = [...affordable.map((i) => `${describe(i)} — ${comparison(player, i)} — ${price(i)} gold`), ...(heal ? [`Heal to full — ${HEAL_PRICE} gold`] : []), "Leave"];
    const i = await io.ask(`You have ${player.gold} gold`, options);
    if (i < affordable.length) {
      const item = affordable[i];
      player.gold -= price(item);
      stock.splice(stock.indexOf(item), 1);
      await take(player, item);
    } else if (heal && i === affordable.length) {
      player.gold -= HEAL_PRICE;
      player.health = player.maxHealth;
      io.print("The merchant's salve closes your wounds.");
    } else return io.print("You move on.");
  }
}

// Forge: one equipped item goes up a quality tier, free.
async function forge(player: Player) {
  io.print("[panel bold yellow]An abandoned forge, its coals still glowing.[/]");
  const items = [player.mainHand, player.offHand, ...Object.values(player.armor)].filter(
    (i, n, all): i is Weapon | Armor => !!i && i.quality !== "Epic" && all.indexOf(i) === n,
  );
  if (!items.length) return io.print("Your gear is already as fine as it gets.");
  const next = (i: Weapon | Armor) => QUALITIES[QUALITIES.indexOf(i.quality) + 1];
  const choice = await io.ask("Choose an item to upgrade", [...items.map((i) => `${i.name} (${i.quality} → ${next(i)})`), "Leave"]);
  if (choice === items.length) return io.print("You leave the forge.");
  const item = items[choice];
  upgradeQuality(item);
  io.print(`Your ${describe(item)}.`);
}

// Shrine: one blessing out of three.
async function shrine(player: Player) {
  io.print("[panel bold yellow]A quiet shrine hums with old power.[/]");
  const upgradable = player.spells.filter((k) => k.rank < RANK_NAME.length);
  const options = [
    ...(upgradable.length ? ["Pray: one of your spells gains a rank"] : []),
    "Blood offering: lose 20% of max HP, gain +3 to a random stat",
    "Meditate: restore all mana and 40% of your health",
  ];
  const choice = options[await io.ask("Choose a blessing", options)];
  if (choice.startsWith("Pray")) {
    const k = upgradable[await io.ask("Choose a spell to upgrade", upgradable.map(spellName))];
    k.rank++;
    io.print(`Your ${spellName(k)} grows stronger.`);
  } else if (choice.startsWith("Blood")) {
    const stats: Stat[] = ["strength", "agility", "intelligence", "perception"];
    const stat = stats[randint(0, 3)];
    player.health = Math.max(1, player.health - Math.round(player.maxHealth * 0.2));
    player.base[stat] += 3;
    io.print(`Your blood hisses on the stone. +3 ${stat}.`);
  } else {
    player.mana = player.maxMana;
    player.health = Math.min(player.maxHealth, player.health + Math.round(player.maxHealth * 0.4));
    io.print("You meditate. Your mind clears.");
  }
}

// Trial: an obstacle solved with Strength, Agility or Intelligence.
// Chance = 40% + 3% per point above 10 (10%-95%). Success: a cache (gold + pick 1 of 3). Failure: lose 15% max HP.
const TRIALS: { text: string; ways: [string, string, string] }[] = [
  { text: "A rockslide blocks the corridor.", ways: ["Lift the boulders", "Climb over", "Shatter them with magic"] },
  { text: "A sealed vault door, covered in runes.", ways: ["Force it open", "Pick the lock", "Unweave the ward"] },
  { text: "A chasm, with a treasure chest on the far side.", ways: ["Leap across", "Swing on the old ropes", "Levitate the chest"] },
];
const TRIAL_STATS: Stat[] = ["strength", "agility", "intelligence"];
export const trialChance = (stat: number) => Math.min(0.95, Math.max(0.1, 0.4 + 0.03 * (stat - 10)));

async function trial(player: Player, act: number) {
  const t = TRIALS[randint(0, TRIALS.length - 1)];
  io.print(`[panel bold yellow]${t.text}[/]`);
  const odds = TRIAL_STATS.map((s) => trialChance(player.stat(s)));
  const options = [...t.ways.map((w, i) => `${w} (${TRIAL_STATS[i]}, ${Math.round(odds[i] * 100)}%)`), "Walk away"];
  const i = await io.ask("How do you get through?", options);
  if (i === 3) return io.print("You walk away.");
  if (Math.random() < odds[i]) {
    const gold = 20 * (act + 1);
    player.gold += gold;
    io.print(`[green]Success![/] You find a hidden cache with ${gold} gold.`);
    await chooseReward(player, act);
  } else {
    player.health = Math.max(1, player.health - Math.round(player.maxHealth * 0.15)); // a trap hurts but never kills
    io.print(`[red]It goes wrong.[/] You get hurt. Health ${player.health}/${player.maxHealth}.`);
  }
}

export async function runEvent(kind: EventKind, player: Player, act: number) {
  if (kind === "merchant") await merchant(player, act);
  else if (kind === "forge") await forge(player);
  else if (kind === "shrine") await shrine(player);
  else await trial(player, act);
}

// Two different kinds per act.
export function actEvents(): EventKind[] {
  const pool = [...EVENT_KINDS];
  return [0, 1].map(() => pool.splice(randint(0, pool.length - 1), 1)[0]);
}
