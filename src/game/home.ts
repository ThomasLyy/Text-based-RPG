// The home screen, the store, the settings and the how-to-play, asked through io like the rest of the game.
import { io } from "./io";
import { BOOSTS, BOOST_PRICES, CURRENCY, LEVELS, UNLOCKS, boostPrice, buy, newProfile, type Profile } from "./meta";
import type { Options } from "./save";

// Returns the difficulty level to play. `changed` is called after anything that must be stored or applied.
export async function home(p: Profile, o: Options, changed: () => void): Promise<number> {
  let lvl = p.level;
  for (;;) {
    io.clear();
    io.print("[panel bold]Home[/]");
    io.print(`${CURRENCY}: [yellow]${p.ash}[/]`);
    const wins = Object.entries(p.wins).map(([l, n]) => `level ${l}: ${n}`);
    io.print(p.bestFloor ? `Furthest floor: ${p.bestFloor} · Wins: ${wins.join(", ") || "none yet"}` : "No run yet.");
    io.print(`Difficulty level ${lvl} of ${LEVELS.length}${lvl > 1 ? `: ${LEVELS[lvl - 1].adds}` : ""}`);
    const options = ["Start a run", "Store", ...(p.level > 1 ? ["Change the difficulty level"] : []), "Settings", "Reset progression"];
    const choice = options[await io.ask("Home", options)];
    if (choice === "Start a run") {
      if (!o.howToSeen) {
        await howToPlay();
        o.howToSeen = true;
        changed();
      }
      return lvl;
    }
    if (choice === "Store") await store(p, changed);
    else if (choice === "Settings") await settings(o, changed);
    else if (choice === "Change the difficulty level") {
      const levels = LEVELS.slice(0, p.level);
      lvl = 1 + (await io.ask("Each level keeps what the levels before it added", levels.map((l, i) => `Level ${i + 1}: ${l.adds}`)));
    } else if ((await io.ask(`Erase your ${CURRENCY}, everything bought, your levels and your best results?`, ["Keep my progression", "Erase everything"])) === 1) {
      Object.assign(p, newProfile());
      lvl = 1;
      changed();
    }
  }
}

async function store(p: Profile, changed: () => void) {
  for (;;) {
    io.clear();
    io.print("[panel bold yellow]Store[/]");
    io.print(`${CURRENCY}: [yellow]${p.ash}[/]`);
    const boosts = BOOSTS.map((b) => {
      const n = p.bought[b.id] ?? 0;
      const price = boostPrice(p, b.id);
      return { id: b.id, price, label: `${b.name} ${n}/${BOOST_PRICES.length}: +${b.per} ${b.text} per level${price === null ? " — maximum" : ` — ${price} ${CURRENCY}`}` };
    });
    const unlocks = UNLOCKS.filter((u) => !p.bought[u.id]).map((u) => ({ id: u.id, price: u.price as number | null, label: `Unlock ${u.name}: ${u.text} — ${u.price} ${CURRENCY}` }));
    const items = [...boosts, ...unlocks];
    const i = await io.ask("Store", [...items.map((x) => x.label), "Back"], [...items.map((x) => x.price === null || x.price > p.ash), false]);
    if (i === items.length) return;
    if (buy(p, items[i].id)) changed();
  }
}

const VOLUMES = [0, 20, 40, 60, 80, 100];
const louder = (v: number) => VOLUMES[(VOLUMES.indexOf(v) + 1) % VOLUMES.length] ?? 60; // each press is one step up, then back to 0

async function settings(o: Options, changed: () => void) {
  for (;;) {
    io.clear();
    io.print("[panel bold]Settings[/]");
    io.print("Each button changes its setting when pressed.");
    const choice = await io.ask("Settings", [`Animations: ${o.animations ? "on" : "off"}`, `Music volume: ${o.music}%`, `Sound volume: ${o.sound}%`, "How to play", "Back"]);
    if (choice === 0) o.animations = !o.animations;
    else if (choice === 1) o.music = louder(o.music);
    else if (choice === 2) o.sound = louder(o.sound);
    else if (choice === 3) await howToPlay();
    else return;
    if (choice < 3) changed();
  }
}

const HOW_TO: [string, string[]][] = [
  ["Enemies announce their next move", ["Under each enemy, \"Next:\" says what it will do on its turn and for how much.", "Physical damage is reduced by your Armor, magic damage by your Ward. Poison ignores both."]],
  ["Defend the big hits", ["Defend blocks 75% of every hit this turn and gives 10 mana.", "Attack when the next hit is small. Defend when it is big."]],
  ["Plan your route on the map", ["Each act is a map of rooms, with a boss at the top. You see all of it from the start.", "Health only comes back in Rest rooms, from potions, the merchant and some events.", "Elite rooms are harder and give better gear."]],
];

export async function howToPlay() {
  for (const [n, [title, lines]] of HOW_TO.entries()) {
    io.clear();
    io.print(`[panel bold cyan]How to play (${n + 1} of ${HOW_TO.length}): ${title}[/]`);
    for (const line of lines) io.print(line);
    const last = n === HOW_TO.length - 1;
    if ((await io.ask("How to play", last ? ["Got it"] : ["Next", "Skip"])) === 1) return;
  }
}
