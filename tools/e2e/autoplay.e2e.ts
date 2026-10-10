/**
 * Auto Player e2e (needs `pnpm dev`): switch it on in a fresh game and watch how far the bot gets.
 *   AUTO_MINUTES=3 AUTO_SPEED=16 pnpm exec vitest run --config tools/e2e/vitest.config.ts autoplay
 * Progress is printed every few seconds (map, badges, party level, last log lines).
 */
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser, sleep, type Cdp } from "./cdp";
import { makeHelpers, URL_BASE } from "./helpers";
import { seedStory, type SeedSpec } from "./autoplay-seeds";
import { WORLD_MAPS } from "../../apps/client/lib/maps";

let proc: ChildProcess;
let cdp: Cdp;
const h = makeHelpers(() => cdp);
const MINUTES = Number(process.env.AUTO_MINUTES ?? 2);
const SPEED = Number(process.env.AUTO_SPEED ?? 16);
/** AUTO_SEED=<json SeedSpec> starts from a save in the middle of the game instead of a new one. */
const SEED: SeedSpec | null = process.env.AUTO_SEED ? JSON.parse(process.env.AUTO_SEED) : null;

type Progress = { x: number; y: number; map: string; steps: number; stalls: number; maps: number; goal: string; log: string[]; badges: number; level: number; trainers: number; starter: string | null };
const progress = () =>
  cdp.eval<Progress>(`(() => {
    const st = window.__tactimon_auto?.status() ?? { mapId: "", steps: 0, stalls: 0, maps: 0, goal: "", log: [] };
    const raw = JSON.parse(localStorage.getItem("tactimon.story.v1") ?? "{}");
    const s = raw.story ?? raw;
    return { x: st.x, y: st.y, map: st.mapId, steps: st.steps, stalls: st.stalls, maps: st.maps, goal: st.goal, log: st.log.slice(-4), badges: (s.badgeIds ?? []).length, level: s.playerPokemon?.level ?? 0, trainers: (s.defeatedTrainerIds ?? []).length, starter: s.starter ?? null };
  })()`);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await h.open();
}, 60_000);
afterAll(() => proc?.kill());

describe("Auto Player (browser)", () => {
  it(`plays a fresh game for ${MINUTES} min at ${SPEED}x, muted`, async () => {
    await h.load(SEED ? h.seedStory(seedStory(SEED), { mapId: SEED.map, x: SEED.x ?? WORLD_MAPS[SEED.map].spawn.x, y: SEED.y ?? WORLD_MAPS[SEED.map].spawn.y }) : {});
    expect(await h.count("[data-auto-panel]")).toBe(1);
    await h.click("[data-auto-open]");
    await h.click("[data-auto-switch]");
    await h.click(`[data-auto-speed="${SPEED}"]`);
    expect(await cdp.eval<boolean>(`[...document.querySelectorAll("audio")].every((a) => a.volume === 0 || a.paused)`)).toBe(true);
    const end = Date.now() + MINUTES * 60_000;
    let last = "";
    while (Date.now() < end) {
      await sleep(5000);
      const p = await progress();
      const line = `${p.map} (${p.x},${p.y}) | steps ${p.steps} stalls ${p.stalls} maps ${p.maps} | starter ${p.starter} badges ${p.badges} lvl ${p.level} trainers ${p.trainers} | ${p.goal}`;
      if (line !== last) console.log(line);
      last = line;
    }
    await h.shot("end");
    console.log("debug", JSON.stringify(await cdp.eval(`window.__tactimon_auto?.debug()`)));
    const p = await progress();
    const fullLog = await cdp.eval<string[]>(`window.__tactimon_auto?.status().log ?? []`);
    console.log(["log:", ...fullLog].join(" / "));
    console.log("trace:", JSON.stringify(await cdp.eval(`window.__tactimon_auto?.debug()?.trace`)));
    expect(p.starter).not.toBeNull();
    if (process.env.AUTO_EXPECT_BADGES) expect(p.badges).toBeGreaterThanOrEqual(Number(process.env.AUTO_EXPECT_BADGES));
    expect(cdp.errors).toEqual([]);
  }, (MINUTES + 2) * 60_000);
});
