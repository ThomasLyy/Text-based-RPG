import { expect, test } from "vitest";
import { ACTS } from "./game/enemy";
import { FAMILIES } from "./game/items";
import { SPELLS } from "./game/spell";
import { ROOM_LABEL } from "./game/map";
import { ELEMENT_ICONS, ENEMY_SPRITES, FAMILY_ICONS, PALETTE, ROOM_ICONS, enemySprite, svg } from "./sprites";

test("sprites: every enemy, boss, weapon family, element and room type has a 16×16 sprite made of palette characters", () => {
  const needed: [string, Record<string, string[]>, string[]][] = [
    ["enemy", ENEMY_SPRITES, ACTS.flatMap((a) => [...a.enemies, ...a.bosses].map((e) => e.name))],
    ["weapon family", FAMILY_ICONS, FAMILIES.map((f) => f.name)],
    ["element", ELEMENT_ICONS, [...new Set(SPELLS.map((s) => s.element))]],
    ["room", ROOM_ICONS, Object.keys(ROOM_LABEL).filter((k) => k !== "boss")],
  ];
  let count = 0;
  for (const [kind, sprites, names] of needed) {
    expect(Object.keys(sprites).sort(), `${kind} sprites`).toEqual([...names].sort()); // none missing, none left over
    for (const [name, sprite] of Object.entries(sprites)) {
      count++;
      expect(sprite, `${kind} ${name}`).toHaveLength(16);
      for (const row of sprite) expect(row, `${kind} ${name}`).toMatch(new RegExp(`^[.${Object.keys(PALETTE).join("")}]{16}$`));
      expect(sprite.join("").replace(/\./g, "").length, `${kind} ${name} is not empty`).toBeGreaterThan(20);
    }
  }
  expect(count).toBe(41);
  expect(new Set(Object.values(ENEMY_SPRITES).map((s) => s.join(""))).size).toBe(21); // no two enemies look the same
  expect(enemySprite("Elite Rat")).toBe(ENEMY_SPRITES.Rat);
  expect(svg(ENEMY_SPRITES.Rat, 64)).toMatch(/^<svg class="sprite" width="64" height="64" viewBox="0 0 16 16"/);
});
