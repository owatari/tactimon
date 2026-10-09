/**
 * Market window e2e (needs `pnpm dev`): full stock from the first mart, drag to buy / sell with prompts, Premier bonus.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts market
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { chooseStarter, completeStoryPlayerEvent, type StoryState } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const POS = { mapId: "viridian-mart", x: 2, y: 5, facing: "north" };

function story(money: number): StoryState {
  const s = completeStoryPlayerEvent({ ...chooseStarter("charmander"), firstBattleComplete: true }, "story", "pokedex-received");
  return { ...s, money, inventory: { ...s.inventory, potion: 4, "poke-ball": 0 } } as StoryState;
}

const saved = () =>
  cdp.eval<{ money: number; potion: number; balls: number; premier: number; counter: number }>(
    `(() => { const raw = JSON.parse(localStorage.getItem("tactimon.story.v1") ?? "{}"); const s = raw.story ?? raw; return { money: s.money, potion: s.inventory.potion, balls: s.inventory["poke-ball"], premier: (s.bagItems ?? {})["premier-ball"] ?? 0, counter: (s.ballPurchases ?? {})["poke-ball"] ?? 0 }; })()`,
  );

async function openMart() {
  for (let attempt = 0; attempt < 4 && (await h.count(".market-window")) === 0; attempt += 1) {
    await h.press("e");
    await sleep(600);
  }
  expect(await h.count(".market-window")).toBe(1);
}

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("Market window (browser)", () => {
  for (const [w, hgt] of [[1365, 768], [1792, 851]] as const) {
    it(`sells the whole stock at the first mart; buy by drag with a quantity prompt, sell with confirmation (${w}x${hgt})`, async () => {
      await h.open(w, hgt);
      await h.load(h.seedStory(story(5000), POS));
      await openMart();
      // the Viridian mart used to sell 4 things: now everything is on the shelf
      expect(await h.count('[data-market-grid="shop"] .market-slot')).toBeGreaterThan(10);
      expect(await h.count('[data-market-item="shop:ultra-ball"]')).toBe(1);
      await h.shot(`market-${w}`);

      // hover shows buy / sell prices
      const c = await h.center('[data-market-item="shop:super-potion"]');
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c!.x, y: c!.y, button: "none" });
      await sleep(300);
      expect(await h.text(".market-detail")).toContain("₽700");
      expect(await h.text(".market-detail")).toContain("₽350");

      // drag a Poké Ball from the shop to the bag: quantity prompt, +1, OK
      await h.drag('[data-market-item="shop:poke-ball"]', '[data-market-grid="bag"]');
      expect(await h.count("[data-market-prompt]")).toBe(1);
      await h.click('.market-qty button[aria-label="+"]');
      expect(await h.text("[data-market-qty]")).toBe("2");
      await h.click("[data-market-ok]");
      let s = await saved();
      expect(s.balls).toBe(2);
      expect(s.money).toBe(5000 - 400);

      // buying 20 Poké Balls in total hands out a Premier Ball (2 + 18 more)
      await h.drag('[data-market-item="shop:poke-ball"]', '[data-market-grid="bag"]');
      for (let i = 0; i < 17; i += 1) await h.click('.market-qty button[aria-label="+"]');
      await h.click("[data-market-ok]");
      s = await saved();
      expect(s.balls).toBe(20);
      expect(s.premier).toBe(1);
      expect(s.counter).toBe(0);
      expect(await h.text("[data-market-notice]")).toContain("Premier");
      expect(await h.count('[data-market-item="bag:premier-ball"]')).toBe(1);

      // sell two potions: drag to the shop, quantity, OK, then "are you sure?"
      const before = await saved();
      await h.drag('[data-market-item="bag:potion"]', '[data-market-grid="shop"]');
      await h.click('.market-qty button[aria-label="+"]');
      await h.click("[data-market-ok]");
      expect(await h.count("[data-market-yes]")).toBe(1);
      expect((await saved()).potion).toBe(before.potion); // nothing sold before confirming
      await h.click("[data-market-yes]");
      s = await saved();
      expect(s.potion).toBe(2);
      expect(s.money).toBe(before.money + 300);

      // declining the confirmation keeps everything
      await h.drag('[data-market-item="bag:potion"]', '[data-market-grid="shop"]');
      await h.click("[data-market-ok]");
      await h.click("[data-market-prompt] [data-input-back]");
      expect((await saved()).potion).toBe(2);
      expect(cdp.errors).toEqual([]);
    }, 120_000);
  }
});
