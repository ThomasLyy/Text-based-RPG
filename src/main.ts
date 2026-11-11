import { io, seedRandom, type CombatView, type Fx, type MapView } from "./game/io";
import { FAMILIES } from "./game/items";
import { SPELLS } from "./game/spell";
import { ELEMENT_ICONS, FAMILY_ICONS, ROOM_ICONS, enemySprite, svg } from "./sprites";
import { RULES, SaveMismatch, loadSave, newRun, record } from "./game/save";
import { CURRENCY, finishRun, settings } from "./game/meta";
import { home } from "./game/home";
import { ROOMS_PER_ACT, ROOM_LABEL } from "./game/map";
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
        b.innerHTML = icon(label) + markup(label);
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
      const kind = Object.keys(ROOM_LABEL).find((k) => ROOM_LABEL[k as keyof typeof ROOM_LABEL] === r.label)!;
      nodes.push(`<g class="node ${r.state}"${button}><rect x="${x(r.lane) - 44}" y="${y(f) - 15}" width="88" height="30"/>${svg(ROOM_ICONS[kind], 20, `x="${x(r.lane) - 40}" y="${y(f) - 10}"`)}<text x="${x(r.lane) + 11}" y="${y(f) + 5}">${r.label}</text></g>`);
    }),
  );
  nodes.push(`<g class="node boss"><rect x="${boss.x - 44}" y="${boss.y - 15}" width="88" height="30" rx="5"/><text x="${boss.x}" y="${boss.y + 5}">Boss</text></g>`);
  return `<svg viewBox="0 0 400 ${h}" role="img" aria-label="${m.act} map">${lines.join("")}${nodes.join("")}</svg>`;
}

// An enemy as the dungeon crawlers drew it: its sprite facing you, then name, health and what it does next.
// An enemy that just fell fades out once ("dying"); after that it stays dimmed ("dead").
const fallen = new Set<number>();
function foe(e: CombatView["enemies"][number]): string {
  const sprite = enemySprite(e.name);
  const state = e.health > 0 ? "" : fallen.has(e.id) ? " dead" : " dying";
  if (e.health <= 0) fallen.add(e.id);
  return `<div class="foe${e.boss ? " boss" : ""}${state}" data-id="${e.id}">
    ${sprite ? svg(sprite, 96) : ""}
    <div class="line"><b>${e.name}</b><span>${e.health > 0 ? `${e.health} / ${e.maxHealth}` : "defeated"}</span></div>
    ${bar(e.health, e.maxHealth, "red")}
    ${e.intent ? `<div class="intent">Next: ${markup(e.intent)}</div>` : ""}
    ${e.status.length ? `<div class="cyan">${e.status.join(" · ")}</div>` : ""}
  </div>`;
}

// Hit feedback. The game reports hits as they land; they are shown on the next draw, when the enemies' boxes exist again.
const still = () => document.body.classList.contains("still") || matchMedia("(prefers-reduced-motion: reduce)").matches;
const hits: Fx[] = [];
io.fx = (hit) => void hits.push(hit);
function playFx() {
  for (const hit of hits.splice(0)) {
    if (still()) continue;
    const box = hit.on === "hero" ? $("hero") : $("board").querySelector(`[data-id="${hit.on}"]`);
    if (!box) continue;
    if (hit.on === "hero") {
      document.body.classList.remove("hurt");
      void document.body.offsetWidth; // restart the flash if one is still running
      document.body.classList.add("hurt");
    } else box.classList.add(hit.crit ? "crit" : "shake");
    // the number floats in its own layer, so the next draw of the board does not cut it short
    const r = box.getBoundingClientRect();
    const n = document.createElement("div");
    n.className = `float${hit.crit ? " big" : ""}${hit.on === "hero" ? " red" : ""}`;
    n.textContent = `-${hit.amount}`;
    n.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 30}px`;
    n.style.top = `${r.top + (hit.on === "hero" ? 30 : 20)}px`;
    n.onanimationend = () => n.remove();
    $("fx").append(n);
  }
}

// The icon a line of text speaks of: a weapon family or a spell's element, read from its first part.
function icon(text: string): string {
  const head = text.split(/ — | · /)[0];
  const family = FAMILIES.find((f) => head.includes(f.name));
  if (family) return svg(FAMILY_ICONS[family.name], 20);
  const spell = SPELLS.find((s) => head.includes(s.name));
  return spell ? svg(ELEMENT_ICONS[spell.element], 20) : "";
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
      <div class="foes">${v.enemies.map(foe).join("")}</div>
    </fieldset>`;
  if (!v.enemies.length) fallen.clear();
  playFx();
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
      ${p.gear.map(([slot, item]) => `<div class="item"><span class="dim">${slot}</span> ${item ? icon(item) + markup(item) : '<span class="dim">—</span>'}</div>`).join("")}
    </fieldset>
    <fieldset><legend>Spells ${p.spells.length}/${SPELLBOOK_SIZE}</legend>
      ${p.spells.map((s) => `<div class="item">${icon(s)}${markup(s)}</div>`).join("") || '<div class="dim">none</div>'}
    </fieldset>
    <fieldset><legend>Potions ${p.potions.length}/${POUCH_SIZE}</legend>
      ${p.potions.map((s) => `<div class="item">${markup(s)}</div>`).join("") || '<div class="dim">none</div>'}
    </fieldset>`;
  stick();
};

// The save lives in localStorage. Where storage is refused (private windows), the game plays without saving.
const KEY = "save";
const stored = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const save = loadSave(stored());
const store = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* no storage: nothing to do */
  }
};

async function runForever() {
  let notice = "";
  for (;;) {
    for (const id of ["title", "log", "board", "hero", "gear", "map"]) $(id).replaceChildren();
    if (notice) io.print(notice);
    notice = "";
    if (save.run && save.run.rules !== RULES) {
      // the rules changed under a run in progress: it cannot be replayed, so it ends here and is paid as it stood
      const { floor, level } = save.run;
      const earned = finishRun(save.profile, { won: false, floor, bosses: Math.max(0, Math.floor((floor - 1) / (ROOMS_PER_ACT + 1))) }, level);
      save.run = null;
      store();
      notice = `[yellow]The game was updated: your run in progress could not be continued. It earned you ${earned} ${CURRENCY}.[/]`;
      continue;
    }
    if (!save.run) {
      io.snapshot = null; // no hero on the home screen
      $("title").textContent = "Home";
      const level = await home(save.profile, store);
      save.run = newRun((Math.random() * 2 ** 32) >>> 0, level);
      store();
      io.clear();
    }
    const run = save.run;
    settings.bought = save.profile.bought;
    settings.level = run.level;
    seedRandom(run.seed);
    const undo = record(run, store); // every answer is stored at once: closing the tab loses nothing
    try {
      finishRun(save.profile, await gameLoop(new Player()), run.level);
    } catch (e) {
      if (!(e instanceof SaveMismatch)) throw e;
      save.run = null;
      store();
      notice = "[yellow]Your saved run could not be read. A new run begins.[/]";
      continue;
    } finally {
      undo();
    }
    save.run = null;
    store();
    await io.ask("Run over", ["Continue"]);
  }
}

runForever().catch((e: unknown) => {
  save.run = null; // a run that crashes would crash again at the same place on every reload
  store();
  io.print(`[bold red]Crash: ${e instanceof Error ? e.message : String(e)}[/]`);
  console.error(e);
  io.ask("The game crashed.", ["Restart"]).then(() => location.reload());
});
