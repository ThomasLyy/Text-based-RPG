import { io, type CombatView } from "./io";
import { smallSpell, type Spell } from "./spell";
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
  const t = player.calculateTotalStats();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return {
    title,
    enemies: enemies.map((e) => ({ name: e.name, health: e.health, maxHealth: e.maxHealth, intent: e.health > 0 ? e.intentText() : "" })),
    player: {
      health: player.health, maxHealth: player.maxHealth, mana: player.mana, maxMana: player.maxMana,
      level: player.level, xp: player.experience, xpNext: player.xpToNextLevel,
      status: [...(player.defending ? ["Defending"] : []), ...(player.poisoned.turns > 0 ? [`Poisoned: ${player.poisoned.damage} for ${player.poisoned.turns} turn${player.poisoned.turns === 1 ? "" : "s"}`] : [])],
    },
    stats: [["STR", t.strength], ["INT", t.intelligence], ["SPD", t.speed], ["PER", t.perception], ["Crit", pct(player.critChance())], ["Dodge", pct(player.dodgeChance())]],
  };
}

// Choices (target, item) are made now; the returned function runs on the player's turn in speed order.
async function chooseAction(player: Player, enemies: Enemy[]): Promise<(() => void) | "fled"> {
  const spells = smallSpell.filter((s) => s.manaCost <= player.mana);
  const actions = ["Attack", "Defend", ...spells.map((s) => `${s.name} (${s.manaCost} MP)`), ...(player.consumables.length ? ["Use Item"] : []), ...(enemies.some((e) => e.boss) ? [] : ["Flee"])];
  const action = actions[await io.ask("Your turn", actions)];

  const spell = spells.find((s) => action.startsWith(s.name));
  if (spell) {
    const targets = spell.targetType === "multiple" ? enemies.filter((e) => e.health > 0) : [await handleTargeting(spell, enemies)];
    return () => player.useSpell(spell, targets);
  }
  if (action === "Attack") {
    const target = await handleTargeting(null, enemies);
    return () => player.attack(target);
  }
  if (action === "Defend") {
    player.defending = true; // set now so it also covers faster enemies
    io.print("You raise your guard and focus.");
    return () => void (player.mana = Math.min(player.maxMana, player.mana + DEFEND_MANA));
  }
  if (action === "Use Item") {
    const i = await io.ask("Choose a consumable", player.consumables.map((c, n) => `${n + 1}. ${c.name} - Health: ${c.healthRecovery}, Mana: ${c.manaRecovery}`));
    const item = player.consumables.splice(i, 1)[0];
    return () => item.use(player);
  }
  if (player.flee()) {
    io.print("[bold yellow]You successfully fled the battle![/]");
    return "fled";
  }
  io.print("[bold red]You failed to flee![/]");
  return () => {};
}

export async function combat(player: Player, enemies: Enemy[], title = ""): Promise<"won" | "fled" | "dead"> {
  const render = () => io.render(combatView(player, enemies, title));
  const over = () => player.health <= 0 || enemies.every((e) => e.health <= 0);

  while (!over()) {
    render();
    const playerTurn = await chooseAction(player, enemies);
    if (playerTurn === "fled") return "fled";

    // Enemies faster than the hero act before him, the rest after.
    const speed = player.calculateTotalStats().speed;
    const order = [...enemies.filter((e) => e.speed > speed), "hero" as const, ...enemies.filter((e) => e.speed <= speed)];
    for (const who of order) {
      if (over()) break;
      if (who === "hero") playerTurn();
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
