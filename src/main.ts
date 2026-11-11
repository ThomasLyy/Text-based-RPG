import { io, type CombatView, type MapView } from "./game/io";
import { ROOMS_PER_ACT } from "./game/map";
import { POUCH_SIZE, Player } from "./game/player";
import { SPELLBOOK_SIZE } from "./game/spell";
import { gameLoop } from "./game/game";

const $ = (id: string) => document.getElementById(id)!;

// Rich-style markup ("[bold red]text[/]") -> HTML spans with those class names.
const markup = (s: string) =>
  s
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
    .replace(/\[(\/?)([\w ]*)\]/g, (_, close, cls) => (close ? "</span>" : `<span class="${cls}">`));

const bar = (value: number, max: number, color: string) =>
  `<div class="track"><div class="fill ${color}" style="width:${Math.min(100, Math.max(0, (value / max) * 100))}%"></div></div>`;

// Keep the newest log line visible; board and buttons change size, so re-stick after each of them.
const stick = () => ($("log").scrollTop = $("log").scrollHeight);

io.print = (msg) => {
  const line = document.createElement("div");
  line.innerHTML = markup(msg);
  $("log").append(line);
  stick();
};

// Wide screens: the hovered or focused choice, compared in full with what you wear.
const showCompare = (detail?: string) => void ($("compare").innerHTML = detail ? markup(detail) : "");

io.ask = (question, options, disabled, details) =>
  new Promise((resolve) => {
    if (io.snapshot) io.render(io.snapshot());
    $("question").textContent = question;
    showCompare();
    $("options").replaceChildren(
      ...options.map((label, i) => {
        const b = document.createElement("button");
        b.innerHTML = markup(label);
        b.disabled = disabled?.[i] ?? false;
        if (label.includes("\n") || label.length > 40) b.classList.add("wide"); // item choices get a full row
        b.onmouseenter = b.onfocus = () => showCompare(details?.[i]);
        b.onmouseleave = b.onblur = () => showCompare();
        b.onclick = () => {
          $("question").textContent = "";
          $("options").replaceChildren();
          showCompare();
          io.print(`[dim]> ${label.split("\n")[0]}[/]`);
          resolve(i);
        };
        return b;
      }),
    );
    stick();
  });

// The act map as SVG: floor 1 at the bottom, the boss on top. The buttons below make the choice.
const STEP = 56;
function drawMap(m: MapView): string {
  const h = (ROOMS_PER_ACT + 1) * STEP;
  const x = (lane: number) => 50 + lane * 100;
  const y = (floor: number) => h - STEP / 2 - floor * STEP; // floor index 0 = floor 1
  const boss = { x: 200, y: STEP / 2 };
  const walked = (s: string) => s === "visited" || s === "current";
  const lines: string[] = [];
  const nodes: string[] = [];
  m.floors.forEach((floor, f) =>
    floor.forEach((r) => {
      const ends = f === m.floors.length - 1 ? [{ ...boss, state: "other" }] : r.next.map((n) => ({ x: x(n), y: y(f + 1), state: m.floors[f + 1].find((o) => o.lane === n)!.state }));
      for (const e of ends) lines.push(`<line class="link${walked(r.state) && walked(e.state) ? " walked" : ""}" x1="${x(r.lane)}" y1="${y(f)}" x2="${e.x}" y2="${e.y}"/>`);
      nodes.push(`<g class="node ${r.state}"><rect x="${x(r.lane) - 38}" y="${y(f) - 15}" width="76" height="30" rx="5"/><text x="${x(r.lane)}" y="${y(f) + 5}">${r.label}</text></g>`);
    }),
  );
  nodes.push(`<g class="node boss"><rect x="${boss.x - 44}" y="${boss.y - 15}" width="88" height="30" rx="5"/><text x="${boss.x}" y="${boss.y + 5}">Boss</text></g>`);
  return `<svg viewBox="0 0 400 ${h}" role="img" aria-label="${m.act} map">${lines.join("")}${nodes.join("")}</svg>`;
}

let mapChoosing: boolean | null = null; // open the map when the path question starts, fold it when it ends

const row = (name: string, value: string) => `<div class="line"><span class="dim">${name}</span><span>${value}</span></div>`;

io.render = (v: CombatView) => {
  const p = v.player;
  const box = $("mapbox") as HTMLDetailsElement;
  box.hidden = !v.map;
  if (v.map) {
    $("map").innerHTML = drawMap(v.map);
    if (v.map.choosing !== mapChoosing) box.open = v.map.choosing;
    mapChoosing = v.map.choosing;
  }
  $("board").innerHTML = `
    <h1>${markup(v.title)}</h1>
    ${v.enemies.length ? `<fieldset><legend>Enemies</legend>
      ${v.enemies
        .map((e) =>
          e.health > 0
            ? `<div class="unit"><div class="line"><b>${e.name}</b><span>${e.health} / ${e.maxHealth}</span></div>${bar(e.health, e.maxHealth, "red")}${e.intent ? `<div class="intent">Next: ${markup(e.intent)}</div>` : ""}${e.status.length ? `<div class="cyan">${e.status.join(" · ")}</div>` : ""}</div>`
            : `<div class="unit dim">${e.name} — defeated</div>`,
        )
        .join("")}
    </fieldset>` : ""}
    <fieldset><legend>Hero · Level ${p.level}</legend>
      <div class="unit"><div class="line"><span>Health</span><span>${p.health} / ${p.maxHealth}</span></div>${bar(p.health, p.maxHealth, "green")}</div>
      <div class="unit"><div class="line"><span>Mana</span><span>${p.mana} / ${p.maxMana}</span></div>${bar(p.mana, p.maxMana, "blue")}</div>
      ${p.status.length ? `<div class="yellow">${p.status.map(markup).join(" · ")}</div>` : ""}
    </fieldset>`;
  $("hero").innerHTML = `
    <fieldset><legend>Level ${p.level} · <span class="yellow">${p.gold} gold</span></legend>
      <div class="unit"><div class="line dim"><span>XP</span><span>${p.xp} / ${p.xpNext}</span></div>${bar(p.xp, p.xpNext, "cyan")}</div>
      <div class="grid">${v.stats.map(([n, val]) => row(n, String(val))).join("")}</div>
    </fieldset>
    <fieldset><legend>Gear</legend>
      ${p.gear.map(([slot, item]) => `<div class="item"><span class="dim">${slot}</span> ${item ? markup(item) : '<span class="dim">—</span>'}</div>`).join("")}
    </fieldset>
    <fieldset><legend>Spells ${p.spells.length}/${SPELLBOOK_SIZE}</legend>
      ${p.spells.map((s) => `<div class="item">${markup(s)}</div>`).join("") || '<div class="dim">none</div>'}
    </fieldset>
    <fieldset><legend>Potions ${p.potions.length}/${POUCH_SIZE}</legend>
      ${p.potions.map((s) => `<div class="item">${markup(s)}</div>`).join("") || '<div class="dim">none</div>'}
    </fieldset>`;
  stick();
};

// The sheet is a column on wide screens (always open) and a fold-out on phones.
const wide = matchMedia("(min-width: 1000px)");
const fitSheet = () => (($("sheet") as HTMLDetailsElement).open = wide.matches);
wide.addEventListener("change", fitSheet);
fitSheet();

async function runForever() {
  for (;;) {
    $("log").replaceChildren();
    $("board").replaceChildren();
    $("hero").replaceChildren();
    await gameLoop(new Player());
    await io.ask("Run over", ["New run"]);
  }
}

runForever().catch((e: unknown) => {
  io.print(`[bold red]Crash: ${e instanceof Error ? e.message : String(e)}[/]`);
  console.error(e);
  io.ask("The game crashed.", ["Restart"]).then(() => location.reload());
});
