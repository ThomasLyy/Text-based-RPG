import { io, type CombatView } from "./game/io";
import { Player } from "./game/player";
import { gameLoop } from "./game/game";

const $ = (id: string) => document.getElementById(id)!;

// Rich-style markup ("[bold red]text[/]") -> HTML spans with those class names.
const markup = (s: string) =>
  s
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
    .replace(/\[(\/?)([\w ]*)\]/g, (_, close, cls) => (close ? "</span>" : `<span class="${cls}">`));

const bar = (label: string, value: number, max: number, color: string) => {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
  return `<div class="bar"><span>${pct}%</span><div class="track"><div class="fill ${color}" style="width:${pct}%"></div></div><b>${markup(label)}</b></div>`;
};

io.print = (msg) => {
  const line = document.createElement("div");
  line.innerHTML = markup(msg);
  $("log").append(line);
  $("log").scrollTop = $("log").scrollHeight;
};

io.ask = (question, options) =>
  new Promise((resolve) => {
    $("question").textContent = question;
    $("options").replaceChildren(
      ...options.map((label, i) => {
        const b = document.createElement("button");
        b.innerHTML = markup(label);
        b.onclick = () => {
          $("question").textContent = "";
          $("options").replaceChildren();
          io.print(`[dim]> ${label}[/]`);
          resolve(i);
        };
        return b;
      }),
    );
  });

io.render = (v: CombatView) => {
  $("board").innerHTML = `
    <fieldset><legend>Enemies</legend>
      ${v.enemies.map((e) => `<fieldset><legend>${markup(e.title)}</legend>${bar(`[bold]${e.name}[/]`, e.health, e.maxHealth, "red")}</fieldset>`).join("")}
    </fieldset>
    <fieldset><legend>Player</legend>
      <fieldset><legend>Stats</legend>${v.stats.map(([n, val]) => `<div>${n}: ${val}</div>`).join("")}</fieldset>
      <fieldset><legend>Actions</legend>${v.actions.map((a) => `<div class="bold blue">${a}</div>`).join("")}</fieldset>
      <div class="row">
        <fieldset><legend>Health</legend>${bar("[bold]Health[/]", v.health, v.maxHealth, "green")}</fieldset>
        <fieldset><legend>Mana</legend>${bar("[bold]Mana[/]", v.mana, v.maxMana, "blue")}</fieldset>
      </div>
    </fieldset>`;
};

gameLoop(new Player({ name: "Heracles" })).catch((e: unknown) => {
  // Python printed a traceback and exited; show the error and offer a fresh run.
  io.print(`[bold red]Crash: ${e instanceof Error ? e.message : String(e)}[/]`);
  console.error(e);
  io.ask("The game crashed.", ["Restart"]).then(() => location.reload());
});
