// The non-fight rooms of the map: merchant (Shop), rest (Rest or Forge), and the random events (Event).
import { describe, price, upgradeQuality, QUALITIES, STATS, type Armor, type Stat, type Weapon } from "./items";
import { RANK_NAME, SPELLBOOK_SIZE, spellName } from "./spell";
import { askHand, chooseReward, offer, rewardOffers, spellLine, take } from "./reward";
import { io, randint, random } from "./io";
import { POUCH_SIZE, type Player } from "./player";
import { available } from "./meta";

export const HEAL_PRICE = 30;
export const REST_HEAL = 0.4; // Rest room: share of max health

// Merchant: 4 items for gold (only what you can afford is listed), or pay to heal.
export async function merchant(player: Player, act: number) {
  io.print("[panel bold yellow]A wandering merchant spreads out her wares.[/]");
  const stock = rewardOffers(player, act, { count: 4 });
  for (;;) {
    const affordable = stock.filter((i) => price(i) <= player.gold);
    const heal = player.health < player.maxHealth && player.gold >= HEAL_PRICE;
    const buttons = affordable.map((i) => offer(player, i, ` — ${price(i)} gold`));
    const options = [...buttons.map((b) => b.label), ...(heal ? [`Heal to full — ${HEAL_PRICE} gold`] : []), "Leave"];
    const i = await io.ask(`You have ${player.gold} gold`, options, undefined, buttons.map((b) => b.detail));
    if (i < affordable.length) {
      const item = affordable[i];
      if (item.kind === "potion" && player.potions.length >= POUCH_SIZE) {
        io.print(`"Sorry, I can't sell you that. You cannot hold more than ${POUCH_SIZE} potions."`);
        continue;
      }
      const hand = item.kind === "weapon" ? await askHand(player, item) : "main";
      const lost = item.kind === "weapon" || item.kind === "armor" ? player.wouldRemove(item, hand) : [];
      const sure = async (q: string) => (await io.ask(`"${q}"`, ["Buy it", "Never mind"])) === 0;
      const names = new Intl.ListFormat("en").format(lost.map((l) => `your ${l.name}`));
      if (lost.length && !(await sure(`Oh, if you buy this, you'll lose ${names}. Are you sure?`))) continue;
      if (item.kind === "spell" && !player.knows(item.name) && player.spells.length >= SPELLBOOK_SIZE) {
        if (!(await sure(`Your spellbook is full. To learn ${item.name}, you'll have to forget a spell. Are you sure?`))) continue;
        const f = await io.ask(`Choose a spell to forget for ${spellLine(player, item)}`, [...player.spells.map((k) => spellLine(player, k)), "Never mind"]);
        if (f === player.spells.length || !(await sure(`You'll forget ${spellLine(player, player.spells[f])} for ${spellLine(player, item)}. Are you sure?`))) continue;
        io.print(`You forget ${spellName(player.spells[f])}.`);
        player.spells.splice(f, 1); // room made now, so learning below asks nothing more
      }
      player.gold -= price(item);
      stock.splice(stock.indexOf(item), 1);
      await take(player, item, hand);
    } else if (heal && i === affordable.length) {
      player.gold -= HEAL_PRICE;
      player.health = player.maxHealth;
      io.print("The merchant's salve closes your wounds.");
    } else return io.print("You move on.");
  }
}

const upgradable = (player: Player) =>
  [player.mainHand, player.offHand, ...Object.values(player.armor)].filter((i, n, all): i is Weapon | Armor => !!i && i.quality !== "Epic" && all.indexOf(i) === n);

// Rest room: one of rest (health and all mana) or forge. Forge is greyed out when nothing can be upgraded.
export async function restRoom(player: Player) {
  io.print("[panel bold yellow]A quiet campfire, and an old forge beside it.[/]");
  const canForge = upgradable(player).length > 0;
  const options = [`Rest: recover ${REST_HEAL * 100}% health and all mana`, `Forge: upgrade one item${canForge ? "" : " — nothing to upgrade"}`];
  if ((await io.ask("Rest or forge?", options, [false, !canForge])) === 1 && canForge) return forge(player);
  player.health = Math.min(player.maxHealth, player.health + Math.round(player.maxHealth * REST_HEAL));
  player.mana = player.maxMana;
  io.print(`You rest by the fire. Health ${player.health}/${player.maxHealth}, mana ${player.mana}/${player.maxMana}.`);
}

// Forge: one equipped item goes up a quality tier, free.
async function forge(player: Player) {
  io.print("The coals of the forge still glow.");
  const items = upgradable(player);
  const next = (i: Weapon | Armor) => QUALITIES[QUALITIES.indexOf(i.quality) + 1];
  const choice = await io.ask("Choose an item to upgrade", [...items.map((i) => `${i.name} (${i.quality} → ${next(i)})`), "Leave"]);
  if (choice === items.length) return io.print("You leave the forge.");
  const item = items[choice];
  upgradeQuality(item);
  io.print(`Your ${describe(item)}.`);
}

// Blood offering: 20% of max HP, taken from current health. Only allowed if at least 1 HP would remain.
export const bloodCost = (player: Player) => Math.round(player.maxHealth * 0.2);

// Shrine: one blessing out of three.
async function shrine(player: Player) {
  io.print("[panel bold yellow]A quiet shrine hums with old power.[/]");
  const upgradable = player.spells.filter((k) => k.rank < RANK_NAME.length);
  const cost = bloodCost(player);
  const canBleed = player.health - cost >= 1;
  const options = [
    ...(upgradable.length ? ["Pray: one of your spells gains a rank"] : []),
    `Blood offering: lose ${cost} health (20% of max HP), gain +3 to a random stat${canBleed ? "" : " — not enough health"}`,
    "Meditate: restore all mana and 40% of your health",
  ];
  const choice = options[await io.ask("Choose a blessing", options, options.map((o) => o.startsWith("Blood") && !canBleed))];
  if (choice.startsWith("Blood") && !canBleed) return io.print("You are too weak to make an offering."); // the UI never allows this
  if (choice.startsWith("Pray")) {
    const k = upgradable[await io.ask("Choose a spell to upgrade", upgradable.map(spellName))];
    k.rank++;
    io.print(`Your ${spellName(k)} grows stronger.`);
  } else if (choice.startsWith("Blood")) {
    const stats: Stat[] = ["strength", "agility", "intelligence", "perception"];
    const stat = stats[randint(0, 3)];
    player.health -= cost; // current health only: max HP never changes
    player.base[stat] += 3;
    io.print(`Your blood hisses on the stone. +3 ${stat}. Health ${player.health}/${player.maxHealth}.`);
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
  if (random() < odds[i]) {
    const gold = 20 * (act + 1);
    player.gold += gold;
    io.print(`[green]Success![/] You find a hidden cache with ${gold} gold.`);
    await chooseReward(player, act);
  } else {
    player.health = Math.max(1, player.health - Math.round(player.maxHealth * 0.15)); // a trap hurts but never kills
    io.print(`[red]It goes wrong.[/] You get hurt. Health ${player.health}/${player.maxHealth}.`);
  }
}

// Strange brew: a random stat, +3 or -2.
async function brew(player: Player) {
  if ((await io.ask("A bubbling flask sits on a stone. Drink it?", ["Drink it", "Walk away"])) === 1) return io.print("You leave the flask alone.");
  const good = random() < 0.5;
  const stat = STATS[randint(0, STATS.length - 1)];
  player.base[stat] += good ? 3 : -2;
  player.health = Math.min(player.health, player.maxHealth); // less Strength, less max HP
  io.print(good ? `[green]Warmth spreads through you.[/] +3 ${stat}.` : `[red]It burns going down.[/] -2 ${stat}.`);
}

// Locked chest: 30% a trap (15% of max HP, never kills), otherwise gold and a reward.
async function chest(player: Player, act: number) {
  if ((await io.ask("A locked chest. Open it?", ["Open it", "Leave it"])) === 1) return io.print("You leave the chest.");
  if (random() < 0.3) {
    player.health = Math.max(1, player.health - Math.round(player.maxHealth * 0.15));
    return io.print(`[red]A needle trap![/] Health ${player.health}/${player.maxHealth}.`);
  }
  const gold = 20 * (act + 1);
  player.gold += gold;
  io.print(`[green]The lock gives.[/] ${gold} gold inside.`);
  await chooseReward(player, act);
}

export const EVENTS: Record<string, (player: Player, act: number) => Promise<void>> = { shrine, trial, brew, chest };

// Event room: one random event.
export async function eventRoom(player: Player, act: number) {
  const all = available("event", Object.entries(EVENTS), ([name]) => name);
  await all[randint(0, all.length - 1)][1](player, act);
}
