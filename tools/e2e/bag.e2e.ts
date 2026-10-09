/**
 * Bag window e2e (needs `pnpm dev`): pocket tabs, icon grid, hover details, drag an item onto a Pokémon.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts bag
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { createPokemonProgression } from "../../packages/battle-engine/src";
import { chooseStarter, placeCapturedPokemon, type StoryState } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const POS = { mapId: "pallet-town", x: 12, y: 17 };

function story(): StoryState {
  let s: StoryState = { ...chooseStarter("charmander"), firstBattleComplete: true };
  s = placeCapturedPokemon(s, { ...createPokemonProgression("rattata", 8), currentHp: 3 } as never).story;
  return {
    ...s,
    inventory: { ...s.inventory, potion: 3, "poke-ball": 7 },
    bagItems: { "super-potion": 2, antidote: 4, "great-ball": 5, ether: 1 },
  } as StoryState;
}

const saved = () =>
  cdp.eval<{ hp: number; potion: number; superPotion: number; ether: number; pp: Record<string, number> }>(
    `(() => { const raw = JSON.parse(localStorage.getItem("tactimon.story.v1") ?? "{}"); const s = raw.story ?? raw; const r = s.capturedPokemon[0]; return { hp: r.currentHp, potion: s.inventory.potion, superPotion: s.bagItems["super-potion"] ?? 0, ether: s.bagItems.ether ?? 0, pp: r.movePp }; })()`,
  );

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("Bag window (browser)", () => {
  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`shows tabs, an icon grid and hover details, and a dragged potion heals a Pokémon (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(story(), POS));
      await h.click('[data-hud="bag"]');
      expect(await h.count(".bag-tab[data-bag-tab]")).toBe(5);
      expect(await h.count(".bag-slot[data-bag-item]")).toBeGreaterThanOrEqual(4);
      expect(await h.count(".bag-slot img")).toBeGreaterThanOrEqual(4);

      // hover shows the details and quantity
      const c = await h.center('[data-bag-item="potion"]');
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c!.x, y: c!.y, button: "none" });
      await sleep(300);
      expect(await h.text(".bag-detail")).toContain("Potion");
      expect(await h.text(".bag-detail")).toContain("3");
      await h.shot(`bag-${w}`);

      // drag the potion onto the second Pokémon (Rattata, 3 HP): healed, one potion less
      const before = await saved();
      await h.drag('[data-bag-item="potion"]', '[data-bag-party="1"]');
      const after = await saved();
      expect(after.hp).toBeGreaterThan(before.hp);
      expect(after.potion).toBe(2);

      // dropping an item that does nothing keeps it (full HP potion is refused later); dragging out does not discard
      await h.drag('[data-bag-item="super-potion"]', ".bag-detail");
      expect((await saved()).superPotion).toBe(2);

      // an item with a move target asks which move
      await h.drag('[data-bag-item="ether"]', '[data-bag-party="1"]');
      expect(await h.count(".bag-window .start-menu-bag-target")).toBe(1);
      await h.press("Escape");

      // the sort button cycles the order without losing items
      await h.click("[data-bag-sort]");
      expect(await h.count(".bag-slot[data-bag-item]")).toBeGreaterThanOrEqual(4);

      // pocket tabs
      await h.click('[data-bag-tab="balls"]');
      expect(await h.count('[data-bag-item="great-ball"]')).toBe(1);
      expect(cdp.errors).toEqual([]);
    }, 90_000);
  }
});
