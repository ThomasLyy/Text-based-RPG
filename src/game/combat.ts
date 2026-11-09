import { io, type CombatView } from "./io";
import type { Spell } from "./spell";
import type { Enemy } from "./enemy";
import { DEFEND_MANA, type Player } from "./player";

export const MANA_REGEN = 5; // per round

export async function handleTargeting(spell: Spell | null, enemies: Enemy[]): Promise<Enemy> {
  const alive = enemies.filter((e) => e.health > 0);
  if (alive.length === 1) return alive[0];

  const options = enemies.map((e, i) => ({ e, label: `${i + 1}. ${e.name} (${e.health}/${e.maxHealth})` })).filter((o) => o.e.health > 0);
  const i = await io.ask(spell ? `Cast ${spell.name} on` : "Attack", options.map((o) => o.label));
  return options[i].e;
}

// Built from live state on every render, so the screen never lags behind the game.
export function combatView(player: Player, enemies: Enemy[], title: string): CombatView {
  const t = player.stats();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return {
    title,
    enemies: enemies.map((e) => ({ name: e.name, health: e.health, maxHealth: e.maxHealth, intent: e.health > 0 ? e.intentText() : "" })),
    player: {
      health: player.health, maxHealth: player.maxHealth, mana: player.mana, maxMana: player.maxMana,
      level: player.level, xp: player.experience, xpNext: player.xpToNextLevel,
      status: [...(player.defending ? ["Defending"] : []), ...(player.poisoned.turns > 0 ? [`Poisoned: ${player.poisoned.damage} for ${player.poisoned.turns} turn${player.poisoned.turns === 1 ? "" : "s"}`] : [])],
      weapons: player.weapons().map(([w]) => `${w.name} ${w.min}–${w.max}`).join(" + "),
    },
    stats: [["STR", t.strength], ["AGI", t.agility], ["INT", t.intelligence], ["PER", t.perception], ["Crit", pct(player.critChance())], ["Dodge", pct(player.dodgeChance())]],
  };
}

interface Turn { run: () => void; first?: boolean }

// Choices (target, potion) are made now; run() happens on the hero's turn in agility order.
async function chooseAction(player: Player, enemies: Enemy[]): Promise<Turn | "fled"> {
  const spells = player.spells.filter((s) => player.spellCost(s) <= player.mana);
  const actions = ["Attack", "Defend", ...spells.map((s) => `${s.name} (${player.spellCost(s)} MP)`), ...(player.potions.length ? ["Use Potion"] : []), ...(enemies.some((e) => e.boss) ? [] : ["Flee"])];
  const action = actions[await io.ask("Your turn", actions)];

  const spell = spells.find((s) => action.startsWith(s.name));
  if (spell) {
    const targets = spell.targetType === "multiple" ? enemies.filter((e) => e.health > 0) : [await handleTargeting(spell, enemies)];
    return { run: () => player.useSpell(spell, targets) };
  }
  if (action === "Attack") {
    const target = await handleTargeting(null, enemies);
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

  while (!over()) {
    render();
    const turn = await chooseAction(player, enemies);
    if (turn === "fled") return "fled";

    // Enemies faster than the hero's agility act before him, the rest after. Quick weapons always go first.
    const agility = player.stat("agility");
    const faster = turn.first ? [] : enemies.filter((e) => e.speed > agility);
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

    if (!over()) player.tickPoison();
    player.defending = false;
    player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN);
  }

  render();
  if (player.health <= 0) {
    io.print("[bold red]You have been defeated![/]");
    return "dead";
  }
  io.print("[bold green]You defeated all enemies![/]");
  const totalXpGained = enemies.reduce((sum, e) => sum + e.xpReward, 0);
  player.experience += totalXpGained;
  io.print(`You gained ${totalXpGained} experience points.`);
  return "won";
}
