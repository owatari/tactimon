/**
 * Pokémon window e2e (needs `pnpm dev`): hover / pin the Summary, drag to reorder the party and moves.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts pokemon
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

function party(): StoryState {
  let story: StoryState = { ...chooseStarter("charmander"), firstBattleComplete: true };
  for (const [species, level] of [["rattata", 6], ["pidgey", 7], ["caterpie", 5]] as const) {
    story = placeCapturedPokemon(story, createPokemonProgression(species, level) as never).story;
  }
  return story;
}

const names = () =>
  cdp.eval<string[]>(`[...document.querySelectorAll(".pokemon-window-slot:not(.empty) .start-menu-party-copy strong")].map((e) => e.textContent)`);
const savedCaptured = () =>
  cdp.eval<string[]>(`(() => { const raw = localStorage.getItem("tactimon.story.v1") ?? "{}"; const s = JSON.parse(raw); const story = s.story ?? s; return (story.capturedPokemon ?? []).map((p) => p.species); })()`);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("Pokémon window (browser)", () => {
  it("has no SUMMARY / SWITCH / CANCEL popup: Enter pins the Summary and Shift+arrows move a Pokémon", async () => {
    await h.open();
    await h.load(h.seedStory(party(), POS));
    await h.click('[data-hud="party"]');
    await h.press("ArrowDown");
    await h.press("Enter");
    expect(await h.count(".start-menu-popup")).toBe(0);
    expect(await h.count(".pokemon-window-slot.pinned")).toBe(1);
    expect(await h.text(".pokemon-window-card h3")).toContain("Rattata");
    await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }))`);
    await sleep(300);
    expect(await names()).toEqual(["Charmander", "Pidgey", "Rattata", "Caterpie"]);
    expect(await savedCaptured()).toEqual(["pidgey", "rattata", "caterpie"]);
  }, 60_000);

  const shares = () =>
    cdp.eval<number[]>(`(() => { const raw = JSON.parse(localStorage.getItem("tactimon.story.v1") ?? "{}"); return (raw.story ?? raw).expShare ?? []; })()`);

  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`EXP share sliders: min 5%, total 100%, the rest on one Pokémon, saved (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(party(), POS));
      await h.click('[data-hud="party"]');
      expect(await h.count("[data-exp-slider]")).toBe(4);
      expect((await shares()).reduce((a, b) => a + b, 0)).toBe(100);
      await h.shot(`exp-share-${w}`);

      // a real click near the end of the second slider pushes it up and takes from the others
      const c = await cdp.eval<{ x: number; y: number; w: number }>(`(() => { const r = document.querySelector('[data-exp-slider="1"]').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; })()`);
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x + c.w * 0.9, y: c.y, button: "left", buttons: 1, clickCount: 1 });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x + c.w * 0.9, y: c.y, button: "left", buttons: 0, clickCount: 1 });
      await sleep(300);
      let now = await shares();
      expect(now.reduce((a, b) => a + b, 0)).toBe(100);
      expect(now[1]).toBeGreaterThan(50);
      expect(Math.min(...now)).toBeGreaterThanOrEqual(5);

      // "ALL" on the third Pokémon: 5% for the others, 85% for it
      await h.click('[data-exp-all="2"]');
      now = await shares();
      expect(now).toEqual([5, 5, 85, 5]);
      expect(await h.text('[data-exp-value="2"]')).toBe("85%");

      // EQUAL goes back to an even split
      await h.click("[data-exp-equal]");
      now = await shares();
      expect(Math.max(...now) - Math.min(...now)).toBeLessThanOrEqual(1);
      expect(cdp.errors).toEqual([]);
    }, 60_000);

    it(`hover shows the side Summary, click pins it, drag reorders (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(party(), POS));
      await h.click('[data-hud="party"]');
      expect(await h.count(".pokemon-window-slot:not(.empty)")).toBe(4);
      expect(await names()).toEqual(["Charmander", "Rattata", "Pidgey", "Caterpie"]);

      // hover the third slot: its Summary appears at the side
      const c = await h.center('[data-party-slot="2"]');
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c!.x, y: c!.y, button: "none" });
      await sleep(500);
      expect(await h.text(".pokemon-window-card h3")).toContain("Pidgey");
      await h.shot(`pokemon-hover-${w}`);

      // click pins; the Summary stays on Pidgey when the mouse leaves
      await h.click('[data-party-slot="2"]');
      expect(await cdp.eval<boolean>(`document.querySelector('[data-party-slot="2"]').classList.contains("pinned")`)).toBe(true);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 400, button: "none" });
      await sleep(300);
      expect(await h.text(".pokemon-window-card h3")).toContain("Pidgey");

      // pin the lead (two moves) and drag its first move onto the second slot
      await h.click('[data-party-slot="0"]');
      expect(await h.text(".pokemon-window-card h3")).toContain("Charmander");
      const before = await cdp.eval<string[]>(`[...document.querySelectorAll(".move-slot strong")].map((e) => e.textContent)`);
      await h.drag(".move-slot:nth-child(1)", ".move-slot:nth-child(2)");
      const after = await cdp.eval<string[]>(`[...document.querySelectorAll(".move-slot strong")].map((e) => e.textContent)`);
      expect(after.slice(0, 2)).toEqual([before[1], before[0]]);
      expect(await cdp.eval<boolean>(`(localStorage.getItem("tactimon.story.v1") ?? "").includes("${before[1] === "Growl" ? "growl" : "scratch"}")`)).toBe(true);
      await h.shot(`pokemon-pinned-${w}`);

      // drag Caterpie (slot 3) onto Rattata (slot 1): party order persists
      await h.drag('[data-party-slot="3"]', '[data-party-slot="1"]');
      expect(await names()).toEqual(["Charmander", "Caterpie", "Pidgey", "Rattata"]);
      expect(await savedCaptured()).toEqual(["caterpie", "pidgey", "rattata"]);

      // the lead slot stays locked
      await h.drag('[data-party-slot="1"]', '[data-party-slot="0"]');
      expect((await names())[0]).toBe("Charmander");
      expect(cdp.errors).toEqual([]);
    }, 60_000);
  }
});
