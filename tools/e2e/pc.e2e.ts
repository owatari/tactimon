/**
 * PC window e2e (needs `pnpm dev`): box tabs, buying a box, drag and drop between party and boxes.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts pc
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { createPokemonProgression } from "../../packages/battle-engine/src";
import { appendBoxed } from "../../apps/client/lib/pcBoxes";
import { chooseStarter, placeCapturedPokemon, type StoryState } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const POS = { mapId: "viridian-pokemon-center", x: 11, y: 2, facing: "north" };

function story(): StoryState {
  let s: StoryState = { ...chooseStarter("charmander"), firstBattleComplete: true, money: 5000 };
  for (const species of ["rattata", "pidgey"] as const) {
    s = placeCapturedPokemon(s, createPokemonProgression(species, 6) as never).story;
  }
  s = appendBoxed(s, createPokemonProgression("caterpie", 5) as never, 0)!;
  s = appendBoxed(s, createPokemonProgression("weedle", 5) as never, 0)!;
  return s;
}

const saved = () =>
  cdp.eval<{ party: string[]; boxed: string[]; slots: number[]; pcBoxes: number; money: number }>(
    `(() => { const raw = JSON.parse(localStorage.getItem("tactimon.story.v1") ?? "{}"); const s = raw.story ?? raw; return { party: (s.capturedPokemon ?? []).map((p) => p.species), boxed: (s.boxedPokemon ?? []).map((p) => p.species), slots: s.boxSlots ?? [], pcBoxes: s.pcBoxes ?? 0, money: s.money }; })()`,
);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("PC window (browser)", () => {
  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`opens from the Pokémon Center PC and moves Pokémon by drag and drop (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(story(), POS));
      await h.press("e");
      await sleep(600);
      expect(await h.count(".pc-window")).toBe(1);
      expect(await h.count(".pc-tab[data-pc-tab]")).toBe(5);
      expect(await h.count(".pc-grid .pc-slot:not(.empty)")).toBe(2);
      await h.shot(`pc-open-${w}`);

      // hover a boxed Pokémon: its Summary shows
      const c = await h.center('[data-pc="box-0"]');
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c!.x, y: c!.y, button: "none" });
      await sleep(400);
      expect(await h.text(".pc-summary h3")).toContain("Caterpie");

      // drag the party's Pidgey (party slot 2) onto box tab 3: it is deposited there
      await h.drag('[data-pc="party-1"]', '[data-pc-tab="2"]');
      let s = await saved();
      expect(s.party).toEqual(["rattata"]);
      expect(s.boxed).toEqual(["caterpie", "weedle", "pidgey"]);
      expect(s.slots).toEqual([0, 0, 2]);

      // open box 3 and drag Pidgey onto the empty party slot: withdrawn
      await h.click('[data-pc-tab="2"]');
      await h.drag('[data-pc="box-2"]', '[data-pc-party-empty="3"]');
      s = await saved();
      expect(s.party).toEqual(["rattata", "pidgey"]);

      // drag a boxed Pokémon from box 1 onto a party Pokémon: swap
      await h.click('[data-pc-tab="0"]');
      await h.drag('[data-pc="box-0"]', '[data-pc="party-0"]');
      s = await saved();
      expect(s.party[0]).toBe("caterpie");
      expect(s.boxed).toContain("rattata");

      // relocate to another box through its tab
      await h.drag('[data-pc="box-0"]', '[data-pc-tab="4"]');
      s = await saved();
      expect(s.slots).toContain(4);

      // lead stays locked: dropping a boxed Pokémon on it changes nothing
      const before = await saved();
      await h.drag('[data-pc="box-1"]', '[data-pc="lead"]');
      expect((await saved()).party).toEqual(before.party);
      await h.shot(`pc-after-${w}`);
      expect(cdp.errors).toEqual([]);
    }, 90_000);
  }

  it("buys the next box, charging the price, and select-then-place works without dragging", async () => {
    await h.open();
    await h.load(h.seedStory(story(), POS));
    await h.press("e");
    await sleep(600);
    await h.click("[data-pc-buy]");
    let s = await saved();
    expect(s.pcBoxes).toBe(6);
    expect(s.money).toBe(4000);
    expect(await h.count(".pc-tab[data-pc-tab]")).toBe(6);

    // click a party Pokémon, press MOVE, click a tab: deposited into that box
    await h.click('[data-pc="party-0"]');
    await h.click("[data-pc-move]");
    await h.click('[data-pc-tab="5"]');
    s = await saved();
    expect(s.slots.at(-1)).toBe(5);
    expect(cdp.errors).toEqual([]);
  }, 60_000);
});
