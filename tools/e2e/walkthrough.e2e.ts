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
import { createPokemonProgression, rollPersonality } from "../../packages/battle-engine/src";
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
  await cdp.bringToFront();
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
    await press("ArrowUp", "ArrowUp", "Enter", "Enter", "Enter", "Enter");
    expect(await count(".start-menu-summary-single")).toBe(1);
    expect(await count(".move-slot")).toBe(4);
    expect(await count(".capture-stats")).toBe(1);
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
    story = { ...story, pendingCaptures: [createPokemonProgression("pikachu", 6)] } as never;
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    expect(await count(".capture-summary")).toBe(1);
    expect(await count(".dex-registration")).toBe(0);
    expect(await text(".capture-summary h2")).toContain("Pikachu");
    expect(await count(".capture-types .type-icon")).toBeGreaterThan(0);
    expect(await count(".move-slot")).toBe(4);
    await cdp.eval(`document.querySelector(".move-slot:not(.empty)").dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); document.querySelector(".move-slot:not(.empty)").dispatchEvent(new MouseEvent("mouseenter"))`);
    await cdp.eval(`document.querySelector(".move-slot:not(.empty)").focus()`);
    await sleep(200);
    expect(await text(".move-detail")).toMatch(/AP/);
    await shot("capture-screen");
    await cdp.eval(`(() => { const i = document.querySelector(".capture-actions input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "Zap"); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await press("ArrowDown", "Enter");
    await sleep(500);
    expect(await count(".capture-summary")).toBe(0);
    const saved = JSON.parse((await cdp.eval<string>(`localStorage.getItem("tactimon.story.v1")`)) as string).story;
    expect(saved.pendingCaptures).toEqual([]);
    expect(saved.capturedPokemon.at(-1)).toMatchObject({ species: "pikachu", nickname: "Zap" });
  }, 40_000);

  it("E9. the lead Pokémon follows the player in the overworld", async () => {
    const story = withPokedex({ ...chooseStarter("charmander"), firstBattleComplete: true });
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    for (let i = 0; i < 40 && (await count(".party-follower")) === 0; i += 1) await sleep(250);
    expect(await count(".party-follower")).toBe(1);
    expect(await cdp.eval<string>(`document.querySelector(".party-follower").style.display`)).toBe("block");
    await shot("follower");
  }, 40_000);

  it("E10. a shiny catch is announced and uses the shiny sprite palette", async () => {
    let story = withPokedex({ ...chooseStarter("squirtle"), firstBattleComplete: true });
    story = { ...story, pendingCaptures: [createPokemonProgression("pikachu", 6, { ...rollPersonality(() => 0.4), shiny: true })] } as never;
    await load(seedStory(story, { mapId: "pallet-town", x: 12, y: 17 }));
    expect(await count(".capture-summary-shiny")).toBe(1);
    expect(await cdp.eval<string>(`document.querySelector(".capture-summary .start-menu-front img").getAttribute("src")`)).toContain("/front/shiny/");
  }, 40_000);

  it("E11. battle sprites sit on their own tile: the unit layer matches the grid even when the arena is taller than the view", async () => {
    const base = chooseStarter("charmander");
    const members = ["pidgey", "rattata", "mankey"].map((id) => createPokemonProgression(id as never, 7));
    const story = withPokedex({ ...base, firstBattleComplete: true, capturedPokemon: members } as never);
    await load({ ...seedStory(story, { mapId: "viridian-forest", x: 16, y: 30 }), "tactimon.e2e.v1": "1" });
    for (let i = 0; i < 40 && !(await cdp.eval<boolean>(`typeof window.__tactimon_e2e?.fightWild === "function"`)); i += 1) await sleep(250);
    expect(await cdp.eval<boolean>(`window.__tactimon_e2e.fightWild([{ species: "weedle", level: 5 }, { species: "caterpie", level: 5 }, { species: "pikachu", level: 5 }])`)).toBe(true);
    // Turbo starts in Auto at 40x: stop it and let the board settle so no unit is mid-slide.
    await cdp.eval(`[...document.querySelectorAll("button")].find((b) => /Auto ON/.test(b.textContent))?.click()`);
    await sleep(1500);
    const report = await cdp.eval<string>(`(() => {
      const cells = [...document.querySelectorAll(".duel-cell")];
      const cols = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().left))).size;
      const rows = cells.length / cols;
      const grid = document.querySelector(".duel-grid").getBoundingClientRect();
      const tile = cells[0].getBoundingClientRect().width;
      const bad = [];
      for (const u of document.querySelectorAll(".duel-unit-position")) {
        const x = Math.round((parseFloat(u.style.left) / 100) * cols);
        const y = Math.round((parseFloat(u.style.top) / 100) * rows);
        const c = cells[y * cols + x].getBoundingClientRect();
        const r = u.getBoundingClientRect();
        if (Math.abs(r.left - c.left) > 1.5 || Math.abs(r.top - c.top) > 1.5) bad.push(u.textContent.trim() + "@" + x + "," + y + " off by " + Math.round(r.left - c.left) + "," + Math.round(r.top - c.top));
      }
      return JSON.stringify({ gridHeight: Math.round(grid.height), expected: Math.round(rows * tile), units: document.querySelectorAll(".duel-unit-position").length, bad });
    })()`);
    const parsed = JSON.parse(report) as { gridHeight: number; expected: number; units: number; bad: string[] };
    expect(parsed.units).toBeGreaterThanOrEqual(6);
    expect(parsed.gridHeight, "the grid box must not be clamped shorter than its rows").toBeGreaterThanOrEqual(parsed.expected - 1);
    expect(parsed.bad).toEqual([]);
  }, 40_000);

  it("E12. several catches show one at a time and SEND ALL TO BOX stores them without nicknames", async () => {
    const story = withPokedex({ ...chooseStarter("squirtle"), firstBattleComplete: true });
    const queue = ["pikachu", "rattata", "pidgey"].map((id) => createPokemonProgression(id as never, 5));
    await load(seedStory({ ...story, pendingCaptures: queue } as never, { mapId: "pallet-town", x: 12, y: 17 }));
    expect(await count(".capture-summary")).toBe(1);
    expect((await text(".capture-summary-count")).trim()).toBe("1/3");
    expect(await count(".capture-send-all")).toBe(1);
    await shot("capture-queue");
    await cdp.eval(`document.querySelector(".capture-send-all").click()`);
    await sleep(600);
    expect(await count(".capture-summary")).toBe(0);
    const saved = JSON.parse((await cdp.eval<string>(`localStorage.getItem("tactimon.story.v1")`)) as string).story;
    expect(saved.pendingCaptures).toEqual([]);
    expect(saved.boxedPokemon.map((p: { species: string }) => p.species)).toEqual(["pikachu", "rattata", "pidgey"]);
  }, 40_000);

  it("E13. a Poké Ball shows its odds on hover and the capture animation plays out before the results", async () => {
    const base = chooseStarter("charmander");
    const story = withPokedex({ ...base, firstBattleComplete: true, inventory: { potion: 1, "poke-ball": 20 } } as never);
    await load({ ...seedStory(story, { mapId: "viridian-forest", x: 16, y: 30 }), "tactimon.e2e.v1": "1" });
    for (let i = 0; i < 40 && !(await cdp.eval<boolean>(`typeof window.__tactimon_e2e?.fightWild === "function"`)); i += 1) await sleep(250);
    await cdp.eval(`window.__tactimon_e2e.fightWild([{ species: "pidgey", level: 3 }])`);
    await sleep(500);
    const click = (sel: string, re: string) =>
      cdp.eval(`[...document.querySelectorAll(${JSON.stringify(sel)})].find((b) => new RegExp(${JSON.stringify(re)}).test(b.textContent.trim()) && !b.disabled)?.click()`);
    await click("button", "Auto ON");
    await sleep(1200);
    await click(".battle-action-list button", "^Item");
    await sleep(400);
    await click(".battle-selection-dock-grid button", "Poké Ball");
    await sleep(300);
    await cdp.eval(`(() => { const t = document.querySelector(".duel-unit-position.rival"); t?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); t?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); })()`);
    await sleep(300);
    expect(await text(".capture-chance-preview")).toMatch(/^Catch \d+%$/);
    // Real speed: the turbo 40x would hide the phases.
    await click("button", "Speed");
    await cdp.eval(`document.querySelector(".duel-unit-position.rival")?.click()`);
    const seen: string[] = [];
    let resultsAt = -1;
    for (let i = 0; i < 90 && resultsAt < 0; i += 1) {
      const state = await cdp.eval<string>(`(() => { const b = document.querySelector(".capture-throw-position"); const ph = b ? [...b.classList].find((c) => c.startsWith("phase-")) : ""; return (ph || "-") + "|" + (document.querySelector(".battle-results-overlay") ? "RESULTS" : "battle"); })()`);
      const [phase, screen] = state.split("|");
      if (phase !== "-" && seen.at(-1) !== phase) seen.push(phase);
      if (screen === "RESULTS") resultsAt = i;
      await sleep(100);
    }
    // A catch (or a failed throw, which keeps the battle going) never skips the sequence.
    expect(seen[0]).toBe("phase-throw");
    expect(seen).toContain("phase-shake");
    if (resultsAt >= 0) expect(seen.at(-1)).toBe("phase-caught");
  }, 60_000);

  it("E14. battle cards keep their whole content inside the card", async () => {
    const base = chooseStarter("charmander");
    const story = withPokedex({
      ...base,
      firstBattleComplete: true,
      playerPokemon: createPokemonProgression("charmander", 20),
      capturedPokemon: [createPokemonProgression("pidgey", 12), createPokemonProgression("rattata", 15), createPokemonProgression("mankey", 12)],
    } as never);
    await load({ ...seedStory(story, { mapId: "viridian-forest", x: 16, y: 30 }), "tactimon.e2e.v1": "1" });
    for (let i = 0; i < 40 && !(await cdp.eval<boolean>(`typeof window.__tactimon_e2e?.fightWild === "function"`)); i += 1) await sleep(250);
    await cdp.eval(`window.__tactimon_e2e.fightWild([{ species: "onix", level: 12 }, { species: "rattata", level: 4 }, { species: "pidgey", level: 5 }])`);
    await sleep(1500);
    const bad = await cdp.eval<string>(`JSON.stringify([...document.querySelectorAll(".combatant-hud")].map((card) => { const r = card.getBoundingClientRect(); return [...card.querySelectorAll(".combatant-hud-body, .battle-portrait-frame, .combatant-meta-row, .resource-chip")].filter((k) => { const b = k.getBoundingClientRect(); return b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1; }).map((k) => k.className); }).filter((list) => list.length > 0))`);
    expect(JSON.parse(bad)).toEqual([]);
  }, 40_000);

  it("E15. menus work with the mouse alone (hover selects, left click confirms, right click goes back) and battles with arrows + Enter", async () => {
    const base = chooseStarter("charmander");
    const story = withPokedex({
      ...base,
      firstBattleComplete: true,
      inventory: { potion: 2, "poke-ball": 5 },
      playerPokemon: createPokemonProgression("charmander", 20),
      capturedPokemon: [createPokemonProgression("pidgey", 12), createPokemonProgression("rattata", 15)],
    } as never);
    await load({ ...seedStory(story, { mapId: "viridian-forest", x: 16, y: 30 }), "tactimon.e2e.v1": "1" });
    const pointAt = async (selector: string, index = 0) => {
      const box = await cdp.eval<string>(`(() => { const e = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!e) return ""; const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`);
      expect(box, selector).not.toBe("");
      return JSON.parse(box) as [number, number];
    };
    const mouse = async (type: "mouseMoved" | "mousePressed" | "mouseReleased", x: number, y: number, button: "none" | "left" | "right" = "none") =>
      cdp.send("Input.dispatchMouseEvent", { type, x, y, button, buttons: button === "left" ? 1 : button === "right" ? 2 : 0, clickCount: button === "none" ? 0 : 1 });
    const click = async (x: number, y: number, button: "left" | "right") => {
      await mouse("mouseMoved", x, y);
      await mouse("mousePressed", x, y, button);
      await mouse("mouseReleased", x, y, button);
      await sleep(350);
    };

    await press("Escape");
    expect(await count(".start-menu-root")).toBe(1);
    // Hover selects the entry; the left click opens it.
    const entries = await cdp.eval<string[]>(`[...document.querySelectorAll(".start-menu-entry")].map((e) => e.textContent)`);
    const partyAt = entries.findIndex((label) => /POK[eé]MON/.test(label));
    const [px, py] = await pointAt(".start-menu-entry", partyAt);
    await mouse("mouseMoved", px, py);
    await sleep(250);
    expect(await text(".start-menu-entry.selected")).toMatch(/POK[eé]MON/);
    await click(px, py, "left");
    expect(await count(".start-menu-party")).toBe(1);
    // Hovering the third row of the party list moves the cursor there.
    const [rx, ry] = await pointAt(".start-menu-party ul li", 2);
    await mouse("mouseMoved", rx, ry);
    await sleep(500);
    expect(await cdp.eval<number>(`[...document.querySelectorAll(".start-menu-party ul li")].findIndex((e) => e.classList.contains("selected"))`)).toBe(2);
    // Right click backs out one level, then closes the menu.
    await click(rx, ry + 80, "right");
    expect(await count(".start-menu-party")).toBe(0);
    expect(await count(".start-menu-root")).toBe(1);
    await click(rx, ry + 80, "right");
    expect(await count(".start-menu-overlay")).toBe(0);
    // The browser context menu never gets a chance: the event is cancelled.
    const prevented = await cdp.eval<boolean>(`(() => { const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; })()`);
    expect(prevented).toBe(true);

    // Battle: the mouse opens a sub menu and the right click closes it; arrows + Enter do the same.
    for (let i = 0; i < 40 && !(await cdp.eval<boolean>(`typeof window.__tactimon_e2e?.fightWild === "function"`)); i += 1) await sleep(250);
    await cdp.eval(`window.__tactimon_e2e.fightWild([{ species: "rattata", level: 3 }])`);
    // Turn Auto off the moment the battle opens (at 40x speed the AI would otherwise win it first).
    for (let i = 0; i < 100; i += 1) {
      const clicked = await cdp.eval<boolean>(`(() => { const b = [...document.querySelectorAll("button")].find((x) => /Auto ON/.test(x.textContent)); if (!b) return false; b.click(); return true; })()`);
      if (clicked) break;
      await sleep(30);
    }
    await sleep(800);
    for (let i = 0; i < 20 && (await count(".battle-action-list button")) < 3; i += 1) {
      await cdp.eval(`[...document.querySelectorAll("button")].find((b) => /End turn/.test(b.textContent) && !b.disabled)?.click()`);
      await sleep(1200);
    }
    const [ix, iy] = await pointAt(".battle-action-list button", 2);
    await click(ix, iy, "left");
    expect(await count(".battle-selection-dock-back")).toBe(1);
    await click(ix, iy, "right");
    expect(await count(".battle-selection-dock-back")).toBe(0);
    // Keyboard / gamepad: arrows move the focus between the buttons, Enter presses the focused one.
    await press("ArrowDown", "ArrowDown");
    const focused = await cdp.eval<boolean>(`Boolean(document.activeElement && document.activeElement.closest(".battle-shell") && document.activeElement.tagName === "BUTTON")`);
    expect(focused).toBe(true);
    await press("Enter");
    await sleep(300);
    expect(cdp.errors).toEqual([]);
  }, 90_000);
});
