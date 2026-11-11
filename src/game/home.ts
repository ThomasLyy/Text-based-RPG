// The home screen and the store, asked through io like the rest of the game. Returns the difficulty level to play.
import { io } from "./io";
import { BOOSTS, BOOST_PRICES, CURRENCY, LEVELS, UNLOCKS, boostPrice, buy, newProfile, type Profile } from "./meta";

// `changed` is called after anything that must be stored. `extra` adds entries to the menu (the UI's settings).
export async function home(p: Profile, changed: () => void, extra: { label: string; run: () => Promise<void> }[] = []): Promise<number> {
  let lvl = p.level;
  for (;;) {
    io.clear();
    io.print("[panel bold]Home[/]");
    io.print(`${CURRENCY}: [yellow]${p.ash}[/]`);
    const wins = Object.entries(p.wins).map(([l, n]) => `level ${l}: ${n}`);
    io.print(p.bestFloor ? `Furthest floor: ${p.bestFloor} · Wins: ${wins.join(", ") || "none yet"}` : "No run yet.");
    io.print(`Difficulty level ${lvl} of ${LEVELS.length}${lvl > 1 ? `: ${LEVELS[lvl - 1].adds}` : ""}`);
    const options = ["Start a run", "Store", ...(p.level > 1 ? ["Change the difficulty level"] : []), ...extra.map((e) => e.label), "Reset progression"];
    const choice = options[await io.ask("Home", options)];
    if (choice === "Start a run") return lvl;
    if (choice === "Store") await store(p, changed);
    else if (choice === "Change the difficulty level") {
      const levels = LEVELS.slice(0, p.level);
      lvl = 1 + (await io.ask("Each level keeps what the levels before it added", levels.map((l, i) => `Level ${i + 1}: ${l.adds}`)));
    } else if (choice === "Reset progression") {
      if ((await io.ask(`Erase your ${CURRENCY}, everything bought, your levels and your best results?`, ["Keep my progression", "Erase everything"])) === 1) {
        Object.assign(p, newProfile());
        lvl = 1;
        changed();
      }
    } else await extra.find((e) => e.label === choice)!.run();
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
