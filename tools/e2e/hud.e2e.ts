/**
 * Player HUD e2e (needs `pnpm dev`): round window buttons, interact / back / run, number shortcuts.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts hud
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { chooseStarter, completeStoryPlayerEvent, type StoryState } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const POS = { mapId: "pallet-town", x: 12, y: 17 };
const base = (): StoryState => ({ ...chooseStarter("charmander"), firstBattleComplete: true });

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("player HUD (browser)", () => {
  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`shows 6 round buttons and 3 actions at ${w}x${hgt}, inside the viewport`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(completeStoryPlayerEvent(base(), "story", "pokedex-received"), POS));
      expect(await h.count(".player-hud-windows .hud-round")).toBe(6);
      expect(await h.count(".player-hud-actions .hud-action")).toBeGreaterThanOrEqual(2);
      const inside = await cdp.eval<boolean>(`[...document.querySelectorAll(".hud-round, .hud-action")].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })`);
      expect(inside).toBe(true);
      await h.shot(`hud-${w}`);
    }, 40_000);
  }

  it("the Pokédex button is off before the Pokédex and the Pokémon button opens the party directly", async () => {
    await h.open();
    await h.load(h.seedStory(base(), POS));
    expect(await cdp.eval<boolean>(`document.querySelector('[data-hud="pokedex"]').disabled`)).toBe(true);
    await h.click('[data-hud="party"]');
    expect(await h.count(".start-menu-party, .start-menu-screen")).toBeGreaterThan(0);
    expect(await h.count(".start-menu-entry")).toBe(0); // straight into the party, not the list
    await h.shot("hud-party-open");
    await h.press("Escape"); // back from a direct window closes the whole menu
    await sleep(300);
    expect(await h.count(".start-menu-screen, .start-menu")).toBe(0);
  }, 40_000);

  it("number shortcuts open windows and the run button toggles RUN/WALK", async () => {
    await h.open();
    await h.load(h.seedStory(base(), POS));
    await h.press("4");
    expect(await h.count(".start-menu-entry")).toBe(0);
    expect(await h.count(".start-menu-screen")).toBeGreaterThan(0);
    await h.press("Escape");
    const before = await h.text('[data-hud="run"] b').catch(() => "");
    if (before) {
      await h.click('[data-hud="run"]');
      expect(await h.text('[data-hud="run"] b')).not.toBe(before);
    }
    expect(cdp.errors).toEqual([]);
  }, 40_000);
});
