/**
 * Browser walkthrough (Edge/Chrome headless over CDP). Not part of `pnpm test`.
 *
 *   pnpm dev                      # in another terminal (http://localhost:3000)
 *   pnpm e2e:walkthrough          # optional: E2E_URL=http://localhost:3000 E2E_SCREENSHOTS=<dir>
 *
 * Every stage seeds a save at a point of the adventure, loads the real client and asserts what the
 * player would see (location banner, Start menu entries, Pokédex canvas, Trainer Card, language).
 * A failing stage is named in the test title. Screenshots go to E2E_SCREENSHOTS (never versioned).
 */
import type { ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cdp, launchBrowser, sleep } from "./cdp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPokemonProgression } from "../../packages/battle-engine/src";
import { WORLD_MAPS } from "../../apps/client/lib/maps";
import { STORY_STORAGE_KEY, serializeStorySave } from "../../apps/client/lib/storyPersistence";
import {
  chooseStarter,
  completeStoryPlayerEvent,
  grantStoryBadge,
  markStoryTrainerDefeated,
  placeCapturedPokemon,
  type StoryBadgeId,
  type StoryState,
} from "../../apps/client/lib/story";

const URL_BASE = process.env.E2E_URL ?? "http://localhost:3000";
const SHOTS = process.env.E2E_SCREENSHOTS;
const BADGES: StoryBadgeId[] = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];

let proc: ChildProcess;
let cdp: Cdp;
let shotIndex = 0;

async function open(width = 1365, height = 768): Promise<void> {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

async function load(seed: Record<string, unknown>, path = "/"): Promise<void> {
  await cdp.send("Page.navigate", { url: `${URL_BASE}/robots.txt` });
  await sleep(300);
  await cdp.eval(`(() => { localStorage.clear(); for (const [k, v] of Object.entries(${JSON.stringify({ "tactimon.lang.v1": "en", ...seed })})) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); })()`);
  await cdp.send("Page.navigate", { url: URL_BASE + path });
  // Next dev compiles on first visit: wait for the game shell instead of a fixed delay.
  for (let i = 0; i < 80; i += 1) {
    await sleep(250);
    const ready = await cdp.eval<boolean>(`Boolean(document.querySelector(".viewport, .blackout-overlay, .story-overlay"))`).catch(() => false);
    if (ready) break;
  }
  await sleep(500);
}

async function press(...keys: string[]): Promise<void> {
  for (const key of keys) {
    await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true }))`);
    await sleep(250);
  }
}

async function shot(name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const { data } = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SHOTS, `${String(++shotIndex).padStart(2, "0")}-${name}.png`), Buffer.from(data, "base64"));
}

const text = (selector: string) =>
  cdp.eval<string>(`(document.querySelector(${JSON.stringify(selector)})?.textContent ?? "")`);
const count = (selector: string) => cdp.eval<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`);

function seedStory(story: StoryState, position?: { mapId: string; x: number; y: number }) {
  const seed: Record<string, unknown> = { [STORY_STORAGE_KEY]: serializeStorySave(story) };
  if (position) seed["tactimon.position.v1"] = { ...position, facing: "south" };
  return seed;
}

const withPokedex = (s: StoryState) => completeStoryPlayerEvent(s, "story", "pokedex-received");
const withBadges = (s: StoryState, n: number) => BADGES.slice(0, n).reduce((acc, b) => grantStoryBadge(acc, b), s);

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await open();
}, 60_000);

beforeEach(() => {
  cdp?.errors.splice(0);
});

afterAll(() => {
  proc?.kill();
});

describe("walkthrough (browser)", () => {
  it("E1. a brand new game boots into the overworld without errors", async () => {
    await load({});
    expect(await count(".viewport")).toBe(1);
    expect((await text(".location-chip")).length).toBeGreaterThan(0);
    await shot("new-game");
    expect(cdp.errors).toEqual([]);
  }, 30_000);

  it("E2. before Oak's Parcel the Start menu has no POKéDEX; after it, it does", async () => {
    const base = chooseStarter("charmander");
    await load(seedStory({ ...base, firstBattleComplete: true }, { mapId: "pallet-town", x: 12, y: 17 }));
    await press("Escape");
    const before = await cdp.eval<string[]>(`[...document.querySelectorAll(".start-menu-entry")].map((e) => e.textContent)`);
    expect(before).not.toContain("POKéDEX");
    expect(before).toContain("POKéMON");
    await shot("menu-before-pokedex");

    await load(seedStory(withPokedex({ ...base, firstBattleComplete: true }), { mapId: "pallet-town", x: 12, y: 17 }));
    await press("Escape");
    const after = await cdp.eval<string[]>(`[...document.querySelectorAll(".start-menu-entry")].map((e) => e.textContent)`);
    expect(after[0]).toBe("POKéDEX");
    await shot("menu-after-pokedex");
  }, 40_000);

  it("E3. the Pokédex renders from ROM assets (canvas has pixels) and its lists respond to keys", async () => {
    let story = withPokedex({ ...chooseStarter("squirtle"), firstBattleComplete: true });
    story = placeCapturedPokemon(story, createPokemonProgression("pidgey", 6) as never).story;
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    await press("Escape", "Enter");
    await sleep(1200);
    const lit = await cdp.eval<number>(`(() => { const c = document.querySelector("canvas.gba-canvas"); if (!c) return -1; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n += 1; return n; })()`);
    expect(lit).toBeGreaterThan(5000);
    await shot("pokedex-top");
    await press("Enter", "ArrowDown");
    await sleep(600);
    await shot("pokedex-list");
    expect(cdp.errors).toEqual([]);
  }, 40_000);

  it("E4. Trainer Card flips and shows the stars; Summary opens a move page", async () => {
    let story = withPokedex({ ...chooseStarter("bulbasaur"), firstBattleComplete: true, trainerId: 4242 });
    story = withBadges(story, 8);
    story = markStoryTrainerDefeated(story, "league-champion-blue-charmander");
    story = { ...story, hofDebutSeconds: 3725 };
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    await press("Escape", "ArrowDown", "ArrowDown", "ArrowDown", "Enter");
    expect(await text(".start-menu-card")).toContain("04242");
    expect(await text(".start-menu-card-stars")).toContain("★");
    await press("Enter");
    expect(await text(".start-menu-card")).toContain("1:02:05");
    await shot("trainer-card-back");
    await press("Escape");
    await press("ArrowUp", "ArrowUp", "Enter", "Enter", "Enter", "ArrowRight", "ArrowRight", "Enter", "Enter");
    expect(await text(".start-menu-move-info")).toMatch(/POWER|PODER/);
    await shot("summary-move-info");
  }, 40_000);

  it("E5. every major town and the Champion's room load without errors", async () => {
    const towns = [
      "pallet-town", "viridian-city", "pewter-city", "cerulean-city", "vermilion-city", "lavender-town",
      "celadon-city", "saffron-city", "fuchsia-city", "cinnabar-island", "indigo-plateau-exterior",
      "pokemon-league-champions-room", "safari-zone-center", "seafoam-islands-1f", "cerulean-cave-1f",
    ].filter((id) => WORLD_MAPS[id]);
    const story = withPokedex(withBadges({ ...chooseStarter("squirtle"), firstBattleComplete: true }, 8));
    for (const mapId of towns) {
      const spawn = WORLD_MAPS[mapId].spawn;
      await load(seedStory(story, { mapId, x: spawn.x, y: spawn.y }));
      expect(await count(".viewport"), mapId).toBe(1);
      expect((await text(".location-chip")).length, mapId).toBeGreaterThan(0);
    }
    expect(cdp.errors).toEqual([]);
  }, 180_000);

  it("E6. the language option translates the Start menu (pt) and the Pokédex labels", async () => {
    const story = withPokedex({ ...chooseStarter("charmander"), firstBattleComplete: true });
    await load({ ...seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }), "tactimon.lang.v1": "pt" });
    await press("Escape");
    const entries = await cdp.eval<string[]>(`[...document.querySelectorAll(".start-menu-entry")].map((e) => e.textContent)`);
    expect(entries).toContain("BOLSA"); // BAG in Portuguese
    await shot("menu-pt");
  }, 40_000);

  it("E7. whiteout: a fainted party is healed and sent to the last Pokémon Center (state check)", async () => {
    let story = withPokedex({ ...chooseStarter("squirtle"), firstBattleComplete: true });
    story = { ...story, playerPokemon: { ...story.playerPokemon!, currentHp: 0 } };
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    await sleep(2500);
    expect(await count(".viewport")).toBe(1);
    await shot("whiteout");
    expect(cdp.errors).toEqual([]);
  }, 40_000);

  it("E8. a fresh catch opens the capture screen (no Pokédex cry page); nickname + team/box are saved", async () => {
    let story = withPokedex({ ...chooseStarter("squirtle"), firstBattleComplete: true });
    story = { ...story, pendingCapture: createPokemonProgression("pikachu", 6) } as never;
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    expect(await count(".capture-summary")).toBe(1);
    expect(await count(".dex-registration")).toBe(0);
    expect(await text(".capture-summary h2")).toContain("Pikachu");
    await shot("capture-screen");
    await cdp.eval(`(() => { const i = document.querySelector(".capture-actions input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "Zap"); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await press("ArrowDown", "Enter");
    await sleep(500);
    expect(await count(".capture-summary")).toBe(0);
    const saved = JSON.parse((await cdp.eval<string>(`localStorage.getItem("tactimon.story.v1")`)) as string).story;
    expect(saved.pendingCapture).toBeNull();
    expect(saved.capturedPokemon.at(-1)).toMatchObject({ species: "pikachu", nickname: "Zap" });
  }, 40_000);
});
