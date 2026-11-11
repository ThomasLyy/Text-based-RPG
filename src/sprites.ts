// Every picture in the game: 16×16 sprites written as text, one character per pixel, each a key into PALETTE
// ("." is transparent). Outline rule: "k" around every solid shape. No image files.
// Most sprites are symmetric, so they are written as their left half (8 columns) and mirrored.

export const PALETTE: Record<string, string> = {
  k: "#0a0812", // outline
  w: "#f2e9d8", // bone, steel shine
  g: "#a59cb8", // grey
  d: "#4a4266", // dark grey
  r: "#ff5d5d",
  R: "#9c2f3f",
  o: "#ff9d4a",
  y: "#ffd75e",
  G: "#7ee06a",
  n: "#3d8a4a",
  b: "#5fb4ff",
  B: "#2d5a9c",
  c: "#4fe3d0",
  p: "#c58bff",
  P: "#6b3fa0",
  t: "#b0764a", // wood, hide
  T: "#6e4630",
  s: "#e8b48a", // skin
};

export type Sprite = string[]; // 16 strings of 16 characters

const rows = (text: string) => text.trim().split("\n").map((r) => r.trim());
const mirror = (half: string[]): Sprite => half.map((r) => r + [...r].reverse().join(""));
const recolor = (half: string[], map: Record<string, string>) => half.map((r) => r.replace(/./g, (c) => map[c] ?? c));
// patch: row index -> 8 characters, a space keeps the pixel underneath
const over = (half: string[], patch: Record<number, string>) =>
  half.map((r, y) => (patch[y] ? [...r].map((c, x) => (patch[y][x] === " " ? c : patch[y][x])).join("") : r));

const CROWN = { 0: "    y y ", 1: "    yyyy" };
const HORNS = { 0: "  w     ", 1: "  ww    ", 2: "   ww   " };

// --- the shapes enemies are made from (left halves) ---

const RAT = rows(`
  ........
  .kk.....
  kssk....
  kssk..kk
  .kskkkgg
  ..kggggg
  ..kgrrgg
  ..kggggg
  ..kggggg
  ...kgggs
  ...kkggs
  ....kkgw
  .....kkk
  ........
  ........
  ........`);

const HOOD = rows(`
  ........
  .....kkk
  ....kPPP
  ...kPPPP
  ...kPPkk
  ..kPPkdd
  ..kPPkwd
  ..kPPkdd
  ..kPPPkk
  .kPPPPPP
  .kPpPPPP
  kPPpPPPP
  kPPpPPPP
  kPPpPPPP
  kPPPPPPP
  kkkkkkkk`);

const SKULL = rows(`
  ........
  ....kkkk
  ...kwwww
  ..kwwwww
  ..kwwkkw
  ..kwwkkw
  ..kwwwww
  ...kwwwk
  ...kwkwk
  ....kkkk
  ..kk.kww
  .kwwkkww
  ..kk.kww
  .kwwkkww
  ..kk.kww
  .....kkk`);

const BLOB = rows(`
  ........
  ........
  ........
  ........
  .....kkk
  ...kkGGG
  ..kGGGGG
  .kGGwkGG
  .kGGkkGG
  kGGGGGGG
  kGnGGGGG
  kGGGGnGG
  kGGGGGGk
  kGGnGGkk
  .kGGGGGG
  ..kkkkkk`);

const SPIDER = rows(`
  ........
  ........
  t.......
  .t..t...
  ..t..t..
  ..t..kkk
  ...t.kTT
  t...kTTT
  .tttkTrT
  ....kTTT
  .tttkTTr
  t...kTTT
  ...t.kTT
  ..t..kkk
  .t..t.kw
  t..t....`);

const BRUTE = rows(`
  ........
  .....kkk
  ....ksss
  ....kskw
  ....ksss
  ..kkkksk
  .kssssss
  kssssTss
  kssksTss
  kssksTss
  kssksTss
  .kk.ksss
  ....ksss
  ....ksks
  ...kssks
  ...kkkkk`);

const SHADE = rows(`
  ........
  .....kkk
  ....kddd
  ...kdddd
  ..kddddd
  ..kddwkd
  ..kddwkd
  ..kddddd
  .kdddddd
  .kddddkk
  .kdddddd
  kddddddd
  kddddddd
  kdkddkdd
  kk.kk.kd
  .......k`);

const IMP = rows(`
  ........
  ..y.....
  ..yy..kk
  ...kkkrr
  ....krrr
  k...krwk
  kk..krrr
  kRk.krrk
  kRRkkrrr
  kRRRkrrr
  kRRkkrrr
  kRk.krrr
  kk..krkr
  ....krkr
  ...kkrkk
  ........`);

const KNIGHT = rows(`
  ........
  ....kkkk
  ...kgggg
  ..kggggg
  ..kgkkkk
  ..kggrkg
  ..kggggg
  ...kgggg
  .kkkkggg
  kggggkgg
  kgggggkg
  kggkgggg
  kggkgggg
  .kk.kggg
  ....kgkg
  ...kkgkk`);

export const ENEMY_SPRITES: Record<string, Sprite> = {
  // The Sewers
  Rat: mirror(RAT),
  "Gutter Thief": mirror(recolor(HOOD, { P: "T", p: "t" })),
  Sludge: mirror(BLOB),
  "Drowned Cultist": mirror(recolor(HOOD, { P: "B", p: "c", w: "c" })),
  "Gutter King": mirror(over(recolor(BRUTE, { T: "y" }), CROWN)),
  "Brood Mother": mirror(over(recolor(RAT, { g: "T", s: "r" }), { 8: "  kTrTTr" })),
  "Drowned Prophet": mirror(over(recolor(HOOD, { P: "B", p: "w" }), { 0: "    c c ", 1: "    cccc" })),
  // The Catacombs
  Skeleton: mirror(SKULL),
  "Crypt Spider": mirror(SPIDER),
  Ghoul: mirror(recolor(BRUTE, { s: "g", T: "g", w: "r" })),
  Gravekeeper: mirror(recolor(HOOD, { P: "d", p: "g", w: "G" })),
  "Bone Colossus": mirror(over(recolor(SKULL, { w: "s" }), HORNS)),
  Embalmer: mirror(recolor(HOOD, { P: "g", p: "G", w: "G" })),
  "Hollow King": mirror(over(recolor(HOOD, { p: "y", w: "p", d: "k" }), CROWN)),
  // Hell
  "Ash Shade": mirror(recolor(SHADE, { w: "o" })),
  "Chained Brute": mirror(recolor(BRUTE, { T: "g" })),
  "Ember Imp": mirror(IMP),
  Oathbreaker: mirror(recolor(KNIGHT, { g: "d" })),
  "Ashen Warden": mirror(over(recolor(HOOD, { P: "R", p: "o", w: "y" }), { 0: "  o     ", 1: "  oo    ", 2: "   oo   " })),
  "Iron Judge": mirror(over(recolor(KNIGHT, { r: "b" }), HORNS)),
  "Pyre Mother": mirror(over(recolor(SHADE, { d: "o", w: "y" }), { 0: "   r   r", 1: "    r kr" })),
};

// --- icons ---

export const FAMILY_ICONS: Record<string, Sprite> = {
  Sword: mirror(rows(`
    .......w
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ...kkkkw
    ...kyyyy
    ...kkkky
    ......kT
    ......kT
    ......ky`)),
  Axe: mirror(rows(`
    ........
    ..kk....
    .kggk..T
    kgggggkT
    kwggggkT
    kwggggkT
    kgggggkT
    .kggk..T
    ..kk...T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T`)),
  Mace: mirror(rows(`
    ......kk
    ....kkgg
    ...kgggg
    ..wkgggg
    ...kgggg
    ...kgggg
    ..wkgggg
    ...kgggg
    ....kkgg
    ......kT
    .......T
    .......T
    .......T
    .......T
    .......T
    ......kT`)),
  Hammer: mirror(rows(`
    ........
    .kkkkkkk
    kggggggg
    kgwggggg
    kggggggg
    kggggggg
    .kkkkkkT
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    ......kT`)),
  Dagger: mirror(rows(`
    ........
    ........
    ........
    .......w
    ......kw
    ......kw
    ......kw
    ......kw
    ......kw
    ....kkkw
    ....kyyy
    ......kT
    ......kT
    ......ky
    ........
    ........`)),
  "Throwing Knives": mirror(rows(`
    ........
    .......w
    .w.....w
    .ww....w
    ..ww...w
    ..www..w
    ...ww..w
    ...kTk.w
    ....TTky
    ....kT.T
    .......T
    .......y
    ........
    ........
    ........
    ........`)),
  Bow: mirror(rows(`
    .......w
    ......ww
    .......T
    ...ttttT
    ..tt...T
    .tt....T
    .t.....T
    tt.....T
    t......T
    gggggggT
    .......T
    .......T
    .......T
    .......T
    ......rT
    ......r.`)),
  Wand: mirror(rows(`
    .......y
    ....y..y
    .....yyy
    ...yyyyy
    .....yyy
    ....y..y
    .......y
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......k`)),
  Staff: mirror(rows(`
    .....kkk
    ....kccc
    ...kcwcc
    ...kcccc
    ...kcccc
    ....kccc
    ....tkkk
    .....ttT
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T
    .......T`)),
};

export const ELEMENT_ICONS: Record<string, Sprite> = {
  Fire: mirror(rows(`
    ........
    .......r
    ......rr
    ......rr
    ....r.rr
    ....rrro
    ...rrroo
    ...rrooo
    ..rrrooy
    ..rrooyy
    ..rrooyy
    ..rrooyy
    ..rroooy
    ...rrooo
    ....rrrr
    ........`)),
  Water: mirror(rows(`
    ........
    .......b
    .......b
    ......bb
    ......bb
    .....bbb
    ....bbbb
    ...bbbbb
    ..bbbbbb
    ..bwbbbb
    ..bwbbbb
    ..bbbbbb
    ..Bbbbbb
    ...BBbbb
    ....BBBB
    ........`)),
  Earth: mirror(rows(`
    ........
    ........
    .......t
    ......tt
    .....ttt
    .....tTt
    ....tttt
    ...ttTtt
    ...ttttt
    ..tTtttt
    ..tttTtt
    .ttttttt
    .ttTtttt
    tttttttT
    TTTTTTTT
    ........`)),
  Lightning: rows(`
    ................
    .........yyyy...
    ........yyyy....
    .......yyyy.....
    ......yyyy......
    .....yyyy.......
    ....yyyyyyyy....
    ....yyyyyyy.....
    .......yyy......
    ......yyy.......
    .....yyy........
    ....yyy.........
    ...yy...........
    ..yy............
    ..y.............
    ................`),
  Light: mirror(rows(`
    .......y
    .......y
    ..y.....
    ...y....
    .....yyy
    ....yyyy
    ...yywyy
    yy.yyyyy
    yy.yyyyy
    ...yyyyy
    ....yyyy
    .....yyy
    ...y....
    ..y.....
    .......y
    .......y`)),
  Shadow: mirror(rows(`
    ........
    ........
    .....ppp
    ...ppPPP
    ..pPPPPP
    ..pPPkkk
    .pPPkkkk
    .pPPkkkk
    .pPPkkkk
    .pPPkkkk
    ..pPPkkk
    ..pPPPPP
    ...ppPPP
    .....ppp
    ........
    ........`)),
};

// keyed like RoomKind in game/map.ts
export const ROOM_ICONS: Record<string, Sprite> = {
  fight: mirror(rows(`
    w.......
    ww......
    .ww.....
    ..ww....
    ...ww...
    ....ww..
    .....ww.
    ......ww
    ......ww
    .....ww.
    ..y.ww..
    ..yyw...
    ...yy...
    ..TTyy..
    .TT.....
    .T......`)),
  elite: mirror(rows(`
    ........
    r.......
    rr......
    .rr.kkkk
    ..rkwwww
    ..kwwwww
    ..kwkkww
    ..kwkkww
    ..kwwwww
    ...kwwwk
    ...kwkwk
    ....kkkk
    ........
    ........
    ........
    ........`)),
  event: rows(`
    ................
    .....pppppp.....
    ....pppppppp....
    ...ppp....ppp...
    ...ppp....ppp...
    ..........ppp...
    .........ppp....
    ........ppp.....
    .......ppp......
    .......ppp......
    .......ppp......
    ................
    ................
    .......ppp......
    .......ppp......
    ................`),
  merchant: mirror(rows(`
    ........
    .....kkk
    ...kkyyy
    ..kyyyyy
    .kyyyyyk
    .kyyyykk
    kyyyyyky
    kyyyyyky
    kyyyyyky
    kyyyyyky
    .kyyyykk
    .kyyyyyk
    ..kyyyyy
    ...kkyyy
    .....kkk
    ........`)),
  rest: mirror(rows(`
    ........
    .......r
    ......rr
    .....rro
    ....rroo
    ....rooy
    ...rrooy
    ...rooyy
    ...rroyy
    ....rroo
    .T...rrr
    .TT....T
    ..TTT.TT
    ....TTTT
    ..TTT.TT
    .TT.....`)),
};

// An inline SVG: one rect per run of equal pixels, crisp at any size.
const cache = new Map<string, string>();
export function svg(sprite: Sprite, size: number, attrs = ""): string {
  const key = `${size}|${attrs}|${sprite.join("")}`;
  let out = cache.get(key);
  if (!out) {
    let rects = "";
    sprite.forEach((row, y) => {
      for (let x = 0, n = 1; x < row.length; x += n) {
        for (n = 1; row[x + n] === row[x]; n++);
        if (row[x] !== ".") rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PALETTE[row[x]]}"/>`;
      }
    });
    out = `<svg class="sprite" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" ${attrs}>${rects}</svg>`;
    cache.set(key, out);
  }
  return out;
}

// "Elite Rat" wears the Rat's sprite.
export const enemySprite = (name: string): Sprite | undefined => ENEMY_SPRITES[name.replace(/^Elite /, "")];
