import { io, type CombatView } from "./io";
import { smallSpell, type Spell } from "./spell";
import type { Enemy } from "./enemy";
import type { Player } from "./player";

export async function handleTargeting(spell: Spell | null, enemies: Enemy[]): Promise<Enemy> {
  const alive = enemies.filter((e) => e.health > 0);
  if (alive.length === 1) return alive[0];

  const options = enemies.map((e, i) => ({ e, label: `${i + 1}. ${e.name} (${e.health}/${e.maxHealth})` })).filter((o) => o.e.health > 0);
  const i = await io.ask(spell ? `Cast ${spell.name} on` : "Attack", options.map((o) => o.label));
  return options[i].e;
}

export async function handleItemUse(player: Player) {
  if (player.consumables.length === 0) return io.print("[dim]You have no consumables.[/]");

  const i = await io.ask("Choose a consumable", player.consumables.map((c, n) => `${n + 1}. ${c.name} - Health: ${c.healthRecovery}, Mana: ${c.manaRecovery}`));
  const item = player.consumables.splice(i, 1)[0];
  item.use(player);
}

// Built from live state on every render, so the screen never lags behind the game.
export function combatView(player: Player, enemies: Enemy[], title: string): CombatView {
  const t = player.calculateTotalStats();
  return {
    title,
    enemies: enemies.map((e) => ({ name: e.name, health: e.health, maxHealth: e.maxHealth, intent: "" })),
    player: { health: player.health, maxHealth: player.maxHealth, mana: player.mana, maxMana: player.maxMana, level: player.level, xp: player.experience, xpNext: player.xpToNextLevel, status: [] },
    stats: [["STR", t.strength], ["INT", t.intelligence], ["SPD", t.speed], ["PER", t.perception]],
  };
}

export async function combat(player: Player, enemies: Enemy[], title = "") {
  const render = () => io.render(combatView(player, enemies, title));

  while (player.health > 0 && enemies.some((e) => e.health > 0)) {
    render();
    const actions = ["Attack", ...smallSpell.filter((s) => s.manaCost <= player.mana).map((s) => `${s.name} (${s.manaCost} MP)`), "Use Item", "Flee"];
    const action = actions[await io.ask("Your turn", actions)];

    const spellToCast = smallSpell.find((s) => action.startsWith(s.name));
    if (spellToCast) {
      const targets = spellToCast.targetType === "multiple" ? enemies.filter((e) => e.health > 0) : [await handleTargeting(spellToCast, enemies)];
      player.useSpell(spellToCast, targets);
    } else if (action === "Attack") {
      player.attack(await handleTargeting(null, enemies));
    } else if (action === "Flee") {
      if (player.flee()) {
        io.print("[bold yellow]You successfully fled the battle![/]");
        return;
      }
      io.print("[bold red]You failed to flee![/]");
    } else if (action === "Use Item") {
      await handleItemUse(player);
    }
    render();

    for (const enemy of enemies) {
      if (enemy.health > 0 && player.health > 0) {
        await io.sleep(400);
        enemy.attack(player);
        render();
      }
    }
  }

  render();
  if (player.health <= 0) {
    io.print("[bold red]You have been defeated![/]");
  } else {
    io.print("[bold green]You defeated all enemies![/]");
    const totalXpGained = enemies.reduce((sum, e) => sum + e.xpReward, 0);
    player.experience += totalXpGained;
    io.print(`You gained ${totalXpGained} experience points.`);
  }
}
