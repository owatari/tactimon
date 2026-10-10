/**
 * Overworld sharpness e2e (needs `pnpm dev`): the camera layer is always on whole device pixels,
 * otherwise the compositor resamples the map bilinearly and it looks blurry while the camera eases.
 *   pnpm exec vitest run --config tools/e2e/vitest.config.ts sharp
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { chooseStarter } from "../../apps/client/lib/story";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
}, 60_000);
afterAll(() => proc?.kill());

describe("overworld camera (browser)", () => {
  for (const [w, hgt, dpr] of [[1365, 768, 1], [1365, 768, 1.25], [1792, 851, 1.5]] as const) {
    it(`snaps the camera to whole device pixels while walking (${w}x${hgt} @${dpr}x)`, async () => {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: hgt, deviceScaleFactor: dpr, mobile: false });
      await h.load(h.seedStory({ ...chooseStarter("charmander"), firstBattleComplete: true }, { mapId: "route-1", x: 10, y: 30 }));
      await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))`);
      const samples: number[][] = [];
      for (let i = 0; i < 30; i += 1) {
        await sleep(40);
        samples.push(await cdp.eval<number[]>(`(() => { const m = new DOMMatrixReadOnly(document.querySelector(".camera-layer").style.transform); return [m.m41, m.m42]; })()`));
      }
      await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowUp", bubbles: true }))`);
      const moved = new Set(samples.map((s) => s.join(","))).size;
      expect(moved).toBeGreaterThan(3); // the camera really was easing
      for (const [x, y] of samples) {
        expect(Math.abs(x * dpr - Math.round(x * dpr))).toBeLessThan(0.02);
        expect(Math.abs(y * dpr - Math.round(y * dpr))).toBeLessThan(0.02);
      }
      expect(cdp.errors).toEqual([]);
    }, 60_000);
  }
});
