import { io, type CombatView } from "./io";
import { spellName, type KnownSpell } from "./spell";
import type { Enemy } from "./enemy";
import { DEFEND_MANA, SET_BONUS, type Player } from "./player";

export const GOLD_PER_XP = 1.5;

export async function handleTargeting(question: string, enemies: Enemy[]): Promise<Enemy> {
  const alive = enemies.filter((e) => e.health > 0);
  if (alive.length === 1) return alive[0];
  const options = enemies.map((e, i) => ({ e, label: `${i + 1}. ${e.name} (${e.health}/${e.maxHealth})` })).filter((o) => o.e.health > 0);
  return options[await io.ask(question, options.map((o) => o.label))].e;
}

// Built from live state on every render, so the screen never lags behind the game.
export function combatView(player: Player, enemies: Enemy[], title: string): CombatView {
  const t = player.stats();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const set = player.setWeight();
  return {
    title,
    enemies: enemies.map((e) => ({ name: e.name, health: e.health, maxHealth: e.maxHealth, intent: e.health > 0 ? e.intentText() : "", status: e.health > 0 ? e.statusText() : [] })),
    player: {
      health: player.health, maxHealth: player.maxHealth, mana: player.mana, maxMana: player.maxMana,
      level: player.level, xp: player.experience, xpNext: player.xpToNextLevel, gold: player.gold,
      status: [
        ...(player.defending ? ["Defending"] : []),
        ...(player.poisoned.turns > 0 ? [`Poisoned: ${player.poisoned.damage} for ${player.poisoned.turns} turn${player.poisoned.turns === 1 ? "" : "s"}`] : []),
        ...(set ? [`${SET_BONUS[set].name}: ${SET_BONUS[set].text}`] : []),
      ],
      weapons: player.weapons().map(([w]) => `${w.name} ${w.min}–${w.max}`).join(" + "),
    },
    stats: [
      ["STR", t.strength], ["AGI", t.agility], ["INT", t.intelligence], ["PER", t.perception],
      ["Crit", pct(player.critChance())], ["Dodge", pct(player.dodgeChance())], ["Armor", `${player.armorPct()}%`], ["Ward", `${player.wardPct()}%`],
    ],
  };
}

interface Turn { run: () => void; first?: boolean }

// Choices (target, potion) are made now; run() happens on the hero's turn in agility order.
async function chooseAction(player: Player, enemies: Enemy[]): Promise<Turn | "fled"> {
  const spells = player.spells.filter((k) => player.spellCost(k) <= player.mana);
  const label = (k: KnownSpell) => `${spellName(k)} (${player.spellCost(k)} MP)`;
  const actions = ["Attack", "Defend", ...spells.map(label), ...(player.potions.length ? ["Use Potion"] : []), ...(enemies.some((e) => e.boss) ? [] : ["Flee"])];
  const action = actions[await io.ask("Your turn", actions)];

  const known = spells.find((k) => action === label(k));
  if (known) {
    const targets = known.spell.shape === "all" ? enemies.filter((e) => e.health > 0) : [await handleTargeting(`Cast ${known.spell.name} on`, enemies)];
    return { run: () => player.cast(known, targets, enemies) };
  }
  if (action === "Attack") {
    const target = await handleTargeting("Attack", enemies);
    return { run: () => player.attack(target, enemies), first: player.weapons().some(([w]) => w.family.trait === "quick") };
  }
  if (action === "Defend") {
    player.defending = true; // set now so it also covers faster enemies
    io.print("You raise your guard and focus.");
    return { run: () => void (player.mana = Math.min(player.maxMana, player.mana + DEFEND_MANA)) };
  }
  if (action === "Use Potion") {
    const i = await io.ask("Choose a potion", player.potions.map((p, n) => `${n + 1}. ${p.name}`));
    const potion = player.potions.splice(i, 1)[0];
    return { run: () => player.drink(potion) };
  }
  if (Math.random() < 0.5) {
    io.print("[bold yellow]You successfully fled the battle![/]");
    return "fled";
  }
  io.print("[bold red]You failed to flee![/]");
  return { run: () => {} };
}

export async function combat(player: Player, enemies: Enemy[], title = ""): Promise<"won" | "fled" | "dead"> {
  const render = () => io.render(combatView(player, enemies, title));
  const over = () => player.health <= 0 || enemies.every((e) => e.health <= 0);

  for (let round = 1; !over(); round++) {
    render();
    const turn = await chooseAction(player, enemies);
    if (turn === "fled") return "fled";

    // Enemies faster than the hero's agility act before him, the rest after.
    // Quick weapons, and the medium set on the first round, always go first.
    const agility = player.stat("agility");
    const first = turn.first || (round === 1 && player.setWeight() === "medium");
    const faster = first ? [] : enemies.filter((e) => e.speed > agility);
    const order = [...faster, "hero" as const, ...enemies.filter((e) => !faster.includes(e))];
    for (const who of order) {
      if (over()) break;
      if (who === "hero") turn.run();
      else if (who.health > 0) {
        await io.sleep(400);
        who.act(player, enemies);
      }
      render();
    }

    player.defending = false;
    if (over()) break;
    for (const e of enemies) e.endOfRound(round);
    player.endOfRound();
  }

  render();
  if (player.health <= 0) {
    io.print("[bold red]You have been defeated![/]");
    return "dead";
  }
  io.print("[bold green]You defeated all enemies![/]");
  const xp = enemies.reduce((sum, e) => sum + e.xpReward, 0);
  const gold = Math.round(xp * GOLD_PER_XP);
  player.experience += xp;
  player.gold += gold;
  io.print(`You gained ${xp} experience and ${gold} gold.`);
  return "won";
}
