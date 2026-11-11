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

// 10 chunky blocks: any value above 0 lights at least one
const bar = (value: number, max: number, color: string) =>
  `<div class="track"><div class="fill ${color}" style="width:${Math.min(10, Math.ceil(Math.max(0, value / max) * 10)) * 10}%"></div></div>`;

// Keep the newest log line visible; board and buttons change size, so re-stick after each of them.
const stick = () => ($("log").scrollTop = $("log").scrollHeight);

io.print = (msg) => {
  const line = document.createElement("div");
  line.innerHTML = markup(msg);
  $("log").append(line);
  stick();
};

io.clear = () => $("log").replaceChildren();

// Wide screens: the hovered or focused choice, compared in full with what you wear.
const showCompare = (detail?: string) => void ($("compare").innerHTML = detail ? markup(detail) : "");

// While the path question is open, clicking a highlighted room answers it (rooms are numbered like the options).
let pickRoom: ((i: number) => void) | null = null;
$("map").addEventListener("click", (e) => {
  const room = (e.target as Element).closest("[data-i]");
  if (room && pickRoom) pickRoom(Number(room.getAttribute("data-i")));
});
$("map").addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && (e.target as Element).hasAttribute("data-i")) {
    e.preventDefault();
    pickRoom?.(Number((e.target as Element).getAttribute("data-i")));
  }
});

io.ask = (question, options, disabled, details) =>
  new Promise((resolve) => {
    const view = io.snapshot?.();
    if (view) io.render(view);
    showCompare();
    if (view?.map?.choosing) {
      $("question").textContent = "Click a highlighted room on the map.";
      $("options").replaceChildren();
      pickRoom = (i) => {
        pickRoom = null;
        $("question").textContent = "";
        io.print(`[dim]> ${options[i]}[/]`);
        resolve(i);
      };
      return;
    }
    $("question").textContent = question;
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

// The act map as SVG: floor 1 at the bottom, the boss on top. Reachable rooms are buttons, numbered in order.
const STEP = 56;
function drawMap(m: MapView): string {
  const h = (ROOMS_PER_ACT + 1) * STEP;
  const x = (lane: number) => 50 + lane * 100;
  const y = (floor: number) => h - STEP / 2 - floor * STEP; // floor index 0 = floor 1
  const boss = { x: 200, y: STEP / 2 };
  const walked = (s: string) => s === "visited" || s === "current";
  const lines: string[] = [];
  const nodes: string[] = [];
  let pick = 0;
  m.floors.forEach((floor, f) =>
    floor.forEach((r) => {
      const ends = f === m.floors.length - 1 ? [{ ...boss, state: "other" }] : r.next.map((n) => ({ x: x(n), y: y(f + 1), state: m.floors[f + 1].find((o) => o.lane === n)!.state }));
      for (const e of ends) lines.push(`<line class="link${walked(r.state) && walked(e.state) ? " walked" : ""}" x1="${x(r.lane)}" y1="${y(f)}" x2="${e.x}" y2="${e.y}"/>`);
      const button = m.choosing && r.state === "reachable" ? ` data-i="${pick++}" role="button" tabindex="0" aria-label="${r.label}"` : "";
      nodes.push(`<g class="node ${r.state}"${button}><rect x="${x(r.lane) - 38}" y="${y(f) - 15}" width="76" height="30" rx="5"/><text x="${x(r.lane)}" y="${y(f) + 5}">${r.label}</text></g>`);
    }),
  );
  nodes.push(`<g class="node boss"><rect x="${boss.x - 44}" y="${boss.y - 15}" width="88" height="30" rx="5"/><text x="${boss.x}" y="${boss.y + 5}">Boss</text></g>`);
  return `<svg viewBox="0 0 400 ${h}" role="img" aria-label="${m.act} map">${lines.join("")}${nodes.join("")}</svg>`;
}

const row = (name: string, value: string) => `<div class="line"><span class="dim">${name}</span><span>${value}</span></div>`;

io.render = (v: CombatView) => {
  const p = v.player;
  $("map").innerHTML = v.map ? drawMap(v.map) : ""; // the box keeps its place before the first map
  $("title").innerHTML = markup(v.title);
  // always drawn, even empty, so nothing below it moves when a fight starts or ends
  $("board").innerHTML = `
    <fieldset><legend>Enemies</legend>
      ${v.enemies.length ? "" : '<div class="dim">No enemies here.</div>'}
      ${v.enemies
        .map((e) =>
          e.health > 0
            ? `<div class="unit"><div class="line"><b>${e.name}</b><span>${e.health} / ${e.maxHealth}</span></div>${bar(e.health, e.maxHealth, "red")}${e.intent ? `<div class="intent">Next: ${markup(e.intent)}</div>` : ""}${e.status.length ? `<div class="cyan">${e.status.join(" · ")}</div>` : ""}</div>`
            : `<div class="unit dim">${e.name} — defeated</div>`,
        )
        .join("")}
    </fieldset>`;
  $("hero").innerHTML = `
    <fieldset><legend>Hero · Level ${p.level} · <span class="yellow">${p.gold} gold</span></legend>
      <div class="unit"><div class="line"><span>Health</span><span>${p.health} / ${p.maxHealth}</span></div>${bar(p.health, p.maxHealth, "green")}</div>
      <div class="unit"><div class="line"><span>Mana</span><span>${p.mana} / ${p.maxMana}</span></div>${bar(p.mana, p.maxMana, "blue")}</div>
      <div class="unit"><div class="line dim"><span>XP</span><span>${p.xp} / ${p.xpNext}</span></div>${bar(p.xp, p.xpNext, "cyan")}</div>
      ${p.status.length ? `<div class="yellow">${p.status.map(markup).join(" · ")}</div>` : ""}
      <div class="grid">${v.stats.map(([n, val]) => row(n, String(val))).join("")}</div>
    </fieldset>`;
  $("gear").innerHTML = `
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

async function runForever() {
  for (;;) {
    for (const id of ["title", "log", "board", "hero", "gear", "map"]) $(id).replaceChildren();
    await gameLoop(new Player());
    await io.ask("Run over", ["Continue"]);
  }
}

runForever().catch((e: unknown) => {
  io.print(`[bold red]Crash: ${e instanceof Error ? e.message : String(e)}[/]`);
  console.error(e);
  io.ask("The game crashed.", ["Restart"]).then(() => location.reload());
});
