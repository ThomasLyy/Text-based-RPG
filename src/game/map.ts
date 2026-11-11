// One act's map: 10 floors of rooms on 4 lanes, each room linked to rooms on the floor above. The boss sits on top.
import { randint } from "./io";

export type RoomKind = "fight" | "elite" | "event" | "merchant" | "rest";
export interface MapRoom {
  lane: number;
  kind: RoomKind;
  next: number[]; // lanes of the linked rooms on the next floor; empty on the last floor (it leads to the boss)
}
export type ActMap = MapRoom[][]; // index 0 = floor 1, rooms sorted by lane

export const ROOMS_PER_ACT = 10;
export const LANES = 4;
export const ROOM_LABEL: Record<RoomKind | "boss", string> = { fight: "Fight", elite: "Elite", event: "Event", merchant: "Shop", rest: "Rest", boss: "Boss" };
const ODDS: [RoomKind, number][] = [["fight", 45], ["elite", 15], ["event", 20], ["merchant", 10], ["rest", 10]];

function rollKind(): RoomKind {
  let r = Math.random() * 100;
  for (const [kind, pct] of ODDS) if ((r -= pct) < 0) return kind;
  return "rest";
}

// Four walks climb the floors; the rooms are the cells they visit. Walk A stays in lanes 0-1 and walk B in 2-3,
// so every floor has at least 2 rooms; two free walks add the branches. A step never crosses an earlier link.
export function generateMap(): ActMap {
  const ranges: [number, number][] = [[0, 1], [2, 3], [0, LANES - 1], [0, LANES - 1]];
  const lanes = ranges.map(([lo, hi]) => randint(lo, hi));
  const links: Map<number, Set<number>>[] = Array.from({ length: ROOMS_PER_ACT }, () => new Map());
  const visit = (f: number, lane: number) => links[f].get(lane) ?? links[f].set(lane, new Set()).get(lane)!;
  lanes.forEach((l) => visit(0, l));
  for (let f = 0; f < ROOMS_PER_ACT - 1; f++) {
    ranges.forEach(([lo, hi], w) => {
      const l = lanes[w];
      // a -> a+1 crosses a+1 -> a; straight moves never cross
      const moves = [l - 1, l, l + 1].filter((n) => n >= lo && n <= hi && !(n !== l && links[f].get(n)?.has(l)));
      const n = moves[randint(0, moves.length - 1)];
      visit(f, l).add(n);
      visit(f + 1, n);
      lanes[w] = n;
    });
  }
  const map: ActMap = links.map((floor) =>
    [...floor.entries()].sort(([a], [b]) => a - b).map(([lane, next]) => ({ lane, kind: rollKind(), next: [...next].sort((a, b) => a - b) })),
  );
  // at least one path reaches a Rest close to the boss: any room on floors 9-10 lies on some path
  const late = [...map[ROOMS_PER_ACT - 2], ...map[ROOMS_PER_ACT - 1]];
  if (!late.some((r) => r.kind === "rest")) late[randint(0, late.length - 1)].kind = "rest";
  return map;
}
