import { io, type CombatView } from "./io";
import { smallSpell, type Spell } from "./spell";
import { chooseReward } from "./reward";
import type { Enemy } from "./enemy";
import type { Player } from "./player";

// audit #3: handleItemUse calls a function that only exists inside combat(). Declared so it compiles, missing at runtime.
declare function updateHealthBars(): void;

export async function handleTargeting(spell: Spell | null, enemies: Enemy[]): Promise<Enemy> {
  const alive = enemies.filter((e) => e.health > 0);
  if (spell && spell.targetType === "single" && alive.length === 1) return alive[0]; // auto-target last enemy

  // audit #10 is gone here: buttons only offer valid targets
  const options = enemies.map((e, i) => ({ e, label: `${i + 1}. ${e.name} (Health: ${e.health}/${e.maxHealth})` })).filter((o) => o.e.health > 0);
  const i = await io.ask("Choose a target", options.map((o) => o.label));
  return options[i].e;
}

export async function handleItemUse(player: Player) {
  if (player.consumables.length === 0) return io.print("[dim]You have no consumables.[/]");

  const i = await io.ask("Choose a consumable", player.consumables.map((c, n) => `${n + 1}. ${c.name} - Health: ${c.healthRecovery}, Mana: ${c.manaRecovery}`));
  const item = player.consumables.splice(i, 1)[0];
  item.use(player);
  updateHealthBars();
}

export async function combat(player: Player, enemies: Enemy[], floor: number) {
  // Rich Progress tasks start at completed=0, so bars show 0% until the first update (same as Python).
  const view: CombatView = {
    enemies: enemies.map((e) => ({ name: e.name, title: e.name, health: 0, maxHealth: e.maxHealth })),
    stats: ["Health", "Strength", "Speed", "Intelligence", "Perception", "Mana"].map((s) => [s, player.getStat(s)]), // snapshot, never refreshed
    actions: [...smallSpell.filter((s) => s.manaCost <= player.mana).map((s) => s.name), "Attack", "Flee", "Use Item"], // audit #4: built once
    health: 0, maxHealth: player.maxHealth,
    mana: 0, maxMana: player.maxMana,
  };

  function updateHealthBars() {
    enemies.forEach((e, i) => {
      view.enemies[i].health = e.health;
      if (e.health <= 0) view.enemies[i].title = `[red]Defeated ${e.name}[/]`;
    });
    view.health = player.health;
    view.mana = player.mana;
  }

  while (player.health > 0 && enemies.some((e) => e.health > 0)) {
    io.render(view);
    const action = view.actions[await io.ask("Choose an action", view.actions)].toLowerCase();

    const spellToCast = smallSpell.find((s) => s.name.toLowerCase() === action);
    if (spellToCast) {
      const target = await handleTargeting(spellToCast, enemies);
      player.useSpell(spellToCast, target);
      player.mana -= spellToCast.manaCost; // audit #4: mana taken twice
      updateHealthBars();
    } else if (action === "attack") {
      player.attack(await handleTargeting(null, enemies));
      updateHealthBars();
    } else if (action === "flee") {
      if (player.flee()) {
        io.print("[bold yellow]You successfully fled the battle![/]");
        return;
      }
      io.print("[bold red]You failed to flee![/]");
    } else if (action === "use item") {
      await handleItemUse(player);
    }

    // Enemy's turn
    for (const enemy of enemies) {
      if (enemy.health > 0) {
        enemy.attack(player);
        updateHealthBars();
        await io.sleep(500);
      }
    }
  }

  if (player.health <= 0) {
    io.print("[bold red]You have been defeated![/]");
  } else if (enemies.every((e) => e.health <= 0)) {
    io.print("[bold green]You defeated all enemies![/]");
    const totalXpGained = enemies.reduce((sum, e) => sum + e.xpReward, 0);
    player.experience += totalXpGained;
    io.print(`You gained ${totalXpGained} experience points.`);
  }

  if ("xpToNextLevel" in player && player.experience >= player.xpToNextLevel) {
    player.level_up(); // audit #9
    io.print(`[bold cyan]You leveled up! You are now level ${player.level}.[/]`);
  }

  // audit #9: rewards also given by gameLoop, and even after defeat
  if (floor < 5) await chooseReward(player, floor);
  else if (floor === 5) io.print("[bold yellow]Congratulations! You have completed the game![/]");
}
