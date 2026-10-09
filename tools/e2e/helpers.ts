import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Cdp, sleep } from "./cdp";
import { STORY_STORAGE_KEY, serializeStorySave } from "../../apps/client/lib/storyPersistence";
import type { StoryState } from "../../apps/client/lib/story";

export const URL_BASE = process.env.E2E_URL ?? "http://localhost:3000";
const SHOTS = process.env.E2E_SCREENSHOTS;

/** Shared browser helpers for the window e2e files (HUD, Pokémon, PC, Bag, Market). */
export function makeHelpers(getCdp: () => Cdp) {
  let shotIndex = 0;
  const cdp = () => getCdp();

  const open = (width = 1365, height = 768) =>
    cdp().send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  async function load(seed: Record<string, unknown>, path = "/") {
    await cdp().send("Page.navigate", { url: `${URL_BASE}/robots.txt` });
    await sleep(300);
    await cdp().eval(`(() => { localStorage.clear(); for (const [k, v] of Object.entries(${JSON.stringify({ "tactimon.lang.v1": "en", ...seed })})) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); })()`);
    await cdp().send("Page.navigate", { url: URL_BASE + path });
    await cdp().bringToFront();
    for (let i = 0; i < 80; i += 1) {
      await sleep(250);
      const ready = await cdp().eval<boolean>(`Boolean(document.querySelector(".viewport, .blackout-overlay, .story-overlay"))`).catch(() => false);
      if (ready) break;
    }
    await sleep(500);
  }

  async function press(...keys: string[]) {
    for (const key of keys) {
      await cdp().eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true }))`);
      await sleep(250);
    }
  }

  async function shot(name: string) {
    if (!SHOTS) return;
    mkdirSync(SHOTS, { recursive: true });
    const { data } = await cdp().send<{ data: string }>("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, `${String(++shotIndex).padStart(2, "0")}-${name}.png`), Buffer.from(data, "base64"));
  }

  const text = (selector: string) => cdp().eval<string>(`(document.querySelector(${JSON.stringify(selector)})?.textContent ?? "")`);
  const count = (selector: string) => cdp().eval<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`);

  /** Center of the first element matching the selector, in page coordinates. */
  const center = (selector: string) =>
    cdp().eval<{ x: number; y: number } | null>(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);

  async function mouse(type: "mouseMoved" | "mousePressed" | "mouseReleased", x: number, y: number, button: "left" | "none" = "left") {
    await cdp().send("Input.dispatchMouseEvent", { type, x, y, button, buttons: type === "mouseReleased" ? 0 : 1, clickCount: type === "mouseMoved" ? 0 : 1 });
  }

  /** A real mouse click on the element (hit-tested by the browser, so overlaps are caught). */
  async function click(selector: string) {
    const c = await center(selector);
    if (!c) throw new Error(`click: ${selector} not found`);
    await mouse("mouseMoved", c.x, c.y, "none");
    await mouse("mousePressed", c.x, c.y);
    await mouse("mouseReleased", c.x, c.y);
    await sleep(300);
  }

  /** Real drag and drop with intermediate moves: from one element to another. */
  async function drag(from: string, to: string) {
    const a = await center(from);
    const b = await center(to);
    if (!a || !b) throw new Error(`drag: ${from} -> ${to} not found`);
    await mouse("mouseMoved", a.x, a.y, "none");
    await mouse("mousePressed", a.x, a.y);
    for (let i = 1; i <= 8; i += 1) {
      await mouse("mouseMoved", a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
      await sleep(30);
    }
    await mouse("mouseReleased", b.x, b.y);
    await sleep(350);
  }

  function seedStory(story: StoryState, position?: { mapId: string; x: number; y: number }) {
    const seed: Record<string, unknown> = { [STORY_STORAGE_KEY]: serializeStorySave(story) };
    if (position) seed["tactimon.position.v1"] = { ...position, facing: "south" };
    return seed;
  }

  return { open, load, press, shot, text, count, center, click, drag, seedStory };
}
