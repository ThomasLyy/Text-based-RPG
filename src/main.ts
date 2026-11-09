import { io, type CombatView } from "./game/io";
import { Player } from "./game/player";
import { gameLoop } from "./game/game";

const $ = (id: string) => document.getElementById(id)!;

// Rich-style markup ("[bold red]text[/]") -> HTML spans with those class names.
const markup = (s: string) =>
  s
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
    .replace(/\[(\/?)([\w ]*)\]/g, (_, close, cls) => (close ? "</span>" : `<span class="${cls}">`));

const bar = (value: number, max: number, color: string) =>
  `<div class="track"><div class="fill ${color}" style="width:${Math.min(100, Math.max(0, (value / max) * 100))}%"></div></div>`;

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
  const p = v.player;
  $("board").innerHTML = `
    <h1>${markup(v.title)}</h1>
    <fieldset><legend>Enemies</legend>
      ${v.enemies
        .map((e) =>
          e.health > 0
            ? `<div class="unit"><div class="line"><b>${e.name}</b><span>${e.health} / ${e.maxHealth}</span></div>${bar(e.health, e.maxHealth, "red")}${e.intent ? `<div class="intent">Next: ${markup(e.intent)}</div>` : ""}</div>`
            : `<div class="unit dim">${e.name} — defeated</div>`,
        )
        .join("")}
    </fieldset>
    <fieldset><legend>Hero · Level ${p.level}</legend>
      <div class="unit"><div class="line"><span>Health</span><span>${p.health} / ${p.maxHealth}</span></div>${bar(p.health, p.maxHealth, "green")}</div>
      <div class="unit"><div class="line"><span>Mana</span><span>${p.mana} / ${p.maxMana}</span></div>${bar(p.mana, p.maxMana, "blue")}</div>
      <div class="unit"><div class="line dim"><span>XP</span><span>${p.xp} / ${p.xpNext}</span></div>${bar(p.xp, p.xpNext, "cyan")}</div>
      <div class="line stats">${v.stats.map(([n, val]) => `<span><span class="dim">${n}</span> ${val}</span>`).join("")}</div>
      ${p.status.length ? `<div class="yellow">${p.status.map(markup).join(" · ")}</div>` : ""}
    </fieldset>`;
};

async function runForever() {
  for (;;) {
    $("log").replaceChildren();
    $("board").replaceChildren();
    await gameLoop(new Player({ name: "Hero" }));
    await io.ask("Run over", ["New run"]);
  }
}

runForever().catch((e: unknown) => {
  io.print(`[bold red]Crash: ${e instanceof Error ? e.message : String(e)}[/]`);
  console.error(e);
  io.ask("The game crashed.", ["Restart"]).then(() => location.reload());
});
