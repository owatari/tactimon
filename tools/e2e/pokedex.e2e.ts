/**
 * Pokédex window e2e (needs `pnpm dev`): list, search, locked pages, locations, moves, TMs, stats, keyboard.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts pokedex
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { createPokemonProgression } from "../../packages/battle-engine/src";
import { chooseStarter, completeStoryPlayerEvent, placeCapturedPokemon, type StoryState } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const POS = { mapId: "pallet-town", x: 12, y: 17 };

function story(): StoryState {
  let s: StoryState = completeStoryPlayerEvent({ ...chooseStarter("charmander"), firstBattleComplete: true }, "story", "pokedex-received");
  s = placeCapturedPokemon(s, createPokemonProgression("rattata", 6) as never).story;
  return { ...s, pokedex: { seen: ["pidgey", "rattata", "charmander"], caught: ["rattata", "charmander"] } } as StoryState;
}

const tab = (name: string) => h.click(`[data-dex-tab="${name}"]`);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("Pokédex window (browser)", () => {
  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`lists 151, hides what is unseen, unlocks pages when caught (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(story(), POS));
      await h.click('[data-hud="pokedex"]');
      expect(await h.count(".dex-row")).toBe(151);
      expect(await h.text('[data-dex="bulbasaur"]')).toContain("-----");
      expect(await h.text('[data-dex="charmander"]')).toContain("Charmander");
      await h.shot(`dex-list-${w}`);

      // unseen species: nothing revealed
      await h.click('[data-dex="bulbasaur"]');
      expect(await h.text("[data-dex-name]")).toContain("???");
      expect(await h.text(".dex-body")).toContain("Not registered");

      // seen only: basics and stats, but locations are locked
      await h.click('[data-dex="pidgey"]');
      expect(await h.text("[data-dex-name]")).toContain("Pidgey");
      await tab("locations");
      expect(await h.text(".dex-body")).toContain("Catch it");
      await tab("stats");
      expect(await h.count(".dex-stat-row")).toBe(6);

      // caught: locations come from the encounter tables, moves and TMs unlock, best nature shows
      await h.click('[data-dex="rattata"]');
      await tab("locations");
      expect(await h.text(".dex-table")).toContain("Route 1");
      expect(await h.text(".dex-table")).toContain("%");
      await h.shot(`dex-locations-${w}`);
      await tab("moves");
      expect(await h.count(".dex-moves tbody tr")).toBeGreaterThan(2);
      await tab("tms");
      expect(await h.text(".dex-body")).toMatch(/TM\d\d/);
      await tab("info");
      expect(await h.text(".dex-nature")).toContain("Best nature");
      await h.shot(`dex-info-${w}`);

      // Charmander: gift/starter source and an evolution link
      await h.click('[data-dex="charmander"]');
      await tab("locations");
      expect(await h.text(".dex-body")).toContain("Starter");
      await tab("info");
      expect(await h.text(".dex-evolutions")).toContain("Evolves into");

      // search and filters
      await cdp.eval(`(() => { const i = document.querySelector("[data-dex-search]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "ratt"); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await sleep(200);
      expect(await h.count(".dex-row")).toBe(1);
      await cdp.eval(`(() => { const i = document.querySelector("[data-dex-search]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await h.click('[data-dex-filter="caught"]');
      expect(await h.count(".dex-row")).toBe(2);

      // keyboard: arrows walk the list and tabs
      await h.click('[data-dex-filter="all"]');
      await h.click('[data-dex="charmander"]');
      await h.press("ArrowDown");
      expect(await h.text("[data-dex-name]")).toContain("Charmeleon".replace("Charmeleon", "???"));
      await h.press("ArrowRight");
      await h.press("Escape");
      await sleep(300);
      expect(await h.count(".pokedex-window")).toBe(0);
      expect(cdp.errors).toEqual([]);
    }, 120_000);
  }

  it("keeps the faithful FireRed Pokédex as Classic mode", async () => {
    await h.open();
    await h.load(h.seedStory(story(), POS));
    await h.click('[data-hud="pokedex"]');
    await h.click("[data-dex-classic]");
    await sleep(1200);
    expect(await h.count("canvas.gba-canvas")).toBe(1);
    expect(cdp.errors).toEqual([]);
  }, 60_000);
});
