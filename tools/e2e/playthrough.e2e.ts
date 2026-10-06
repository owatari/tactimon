/**
 * Accelerated real playthrough: 8 gyms → Elite Four → Champion through the client's own battles.
 *
 *   pnpm dev
 *   pnpm e2e:playthrough          # E2E_URL, E2E_SCREENSHOTS=<dir>, E2E_RESUME=<stage id>
 *
 * Turbo mode (`tactimon.e2e.v1`, dev only) runs every battle in Auto at 40x speed; the driver calls
 * `window.__tactimon_e2e.fightTrainer(id)` on the trainer's map, clears the post-battle screens with
 * Enter and checks the saved story. The party is levelled to each stage (a documented shortcut: the
 * walkthrough validates the flow and the battles, not grinding) and restored before every fight.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPokemonProgression } from "../../packages/battle-engine/src";
import { WORLD_MAPS } from "../../apps/client/lib/maps";
import { E2E_STORAGE_KEY } from "../../apps/client/lib/e2eMode";
import {
  STORY_STORAGE_KEY,
  parseStorySave,
  serializeStorySave,
} from "../../apps/client/lib/storyPersistence";
import {
  chooseStarter,
  completeStoryPlayerEvent,
  grantStoryBadge,
  healStoryParty,
  markStoryTrainerDefeated,
  normalizeStoryState,
  type StoryState,
} from "../../apps/client/lib/story";
import { OVERWORLD_TRAINERS } from "../../apps/client/lib/trainers";
import { Cdp, launchBrowser, sleep } from "./cdp";

const URL_BASE = process.env.E2E_URL ?? "http://localhost:3000";
const SHOTS = process.env.E2E_SCREENSHOTS;
const RESUME = process.env.E2E_RESUME;
const FIGHT_TIMEOUT_MS = 90_000;
/** Every full-screen layer the client can show between the challenge and the overworld again. */
const BUSY_SELECTOR =
  ".battle-overlay, .battle-results-overlay, [class*=progression], [class*=evolution], [class*=registration], .blackout-overlay, .dialogue-panel";

const GYM_ORDER = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"] as const;
const ELITE_FOUR = [
  "pokemon-league-loreleis-room-lorelei",
  "pokemon-league-brunos-room-bruno",
  "pokemon-league-agathas-room-agatha",
  "pokemon-league-lances-room-lance",
];
const TEAM = ["blastoise", "alakazam", "snorlax", "dragonite", "arcanine"] as const;

type Stage = { id: string; trainerId: string; heal: boolean };

const starter = "charmander" as const;
const rivalStarter = chooseStarter(starter).rivalStarter;

const stages: Stage[] = [
  ...GYM_ORDER.map((badge) => {
    const leader = OVERWORLD_TRAINERS.find((t) => t.badgeId === badge && t.mapId.endsWith("-gym"))!;
    return { id: `gym-${badge}`, trainerId: leader.id, heal: true };
  }),
  // Between Elite Four members the party is restored as if the player used Full Restores (the game lets you).
  ...ELITE_FOUR.map((id) => ({ id: `e4-${id.split("-").pop()}`, trainerId: id, heal: true })),
  { id: "champion", trainerId: `league-champion-blue-${rivalStarter}`, heal: true },
];

let proc: ChildProcess;
let cdp: Cdp;
let shotIndex = 0;
const report: string[] = [];
const resumeIndex = () => (RESUME ? Math.max(0, stages.findIndex((s) => s.id === RESUME)) : 0);

const trainerOf = (id: string) => {
  const trainer = OVERWORLD_TRAINERS.find((t) => t.id === id);
  if (!trainer) throw new Error(`unknown trainer ${id}`);
  return trainer;
};

async function readStory(): Promise<StoryState> {
  const raw = await cdp.eval<string | null>(`localStorage.getItem(${JSON.stringify(STORY_STORAGE_KEY)})`);
  const story = parseStorySave(raw);
  if (!story) throw new Error("no saved story in the page");
  return story;
}

async function writeStory(story: StoryState, mapId: string): Promise<void> {
  const spawn = WORLD_MAPS[mapId].spawn;
  const position = JSON.stringify({ mapId, x: spawn.x, y: spawn.y, facing: "south" });
  await cdp.eval(`(() => {
    localStorage.setItem(${JSON.stringify(STORY_STORAGE_KEY)}, ${JSON.stringify(serializeStorySave(story))});
    localStorage.setItem("tactimon.position.v1", ${JSON.stringify(position)});
    localStorage.setItem("tactimon.lang.v1", "en");
    localStorage.setItem(${JSON.stringify(E2E_STORAGE_KEY)}, "1");
  })()`);
}

async function boot(): Promise<void> {
  await cdp.send("Page.navigate", { url: URL_BASE });
  for (let i = 0; i < 160; i += 1) {
    await sleep(250);
    const ready = await cdp
      .eval<boolean>(`Boolean(document.querySelector(".viewport")) && typeof window.__tactimon_e2e !== "undefined"`)
      .catch(() => false);
    if (ready) return;
  }
  throw new Error("game did not become ready (viewport / e2e hook missing: is the dev server running?)");
}

async function shot(name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const { data } = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SHOTS, `${String(++shotIndex).padStart(2, "0")}-${name}.png`), Buffer.from(data, "base64"));
}

/** Levels the whole party to `level`; keeps the starter as lead and fills the rest with a strong team. */
function levelParty(story: StoryState, level: number, heal: boolean): StoryState {
  const lead = createPokemonProgression(starter, level);
  const members = TEAM.map((species) => createPokemonProgression(species, level));
  const next = normalizeStoryState({
    ...story,
    playerPokemon: heal ? lead : { ...lead, currentHp: story.playerPokemon?.currentHp ?? lead.currentHp },
    capturedPokemon: heal
      ? members
      : members.map((m, i) => ({ ...m, currentHp: story.capturedPokemon[i]?.currentHp ?? m.currentHp })),
  } as never);
  return heal ? healStoryParty(next) : next;
}

async function fight(stage: Stage): Promise<void> {
  const trainer = trainerOf(stage.trainerId);
  const maxLevel = Math.max(...trainer.party.map((p) => p.level));
  let story = await readStory();
  story = levelParty(story, Math.min(100, maxLevel + 8), stage.heal);
  // Leave the game page first: it saves its own state when unloading and would overwrite the seed.
  await cdp.send("Page.navigate", { url: `${URL_BASE}/robots.txt` });
  await sleep(300);
  await writeStory(story, trainer.mapId);
  await boot();
  // The map layout loads asynchronously: retry until the hook can build the battle context.
  let started = false;
  for (let i = 0; i < 40 && !started; i += 1) {
    started = await cdp.eval<boolean>(`window.__tactimon_e2e.fightTrainer(${JSON.stringify(trainer.id)})`);
    if (!started) await sleep(500);
  }
  expect(started, `${stage.id}: fightTrainer(${trainer.id}) did not start a battle on ${trainer.mapId}`).toBe(true);
  // No screenshots while the fast battle runs: capturing a frame stalls the 40x timers.

  const deadline = Date.now() + FIGHT_TIMEOUT_MS;
  let quiet = 0;
  while (Date.now() < deadline) {
    await sleep(500);
    // While the battle runs on Auto we must not touch the keyboard (Enter would confirm commands and
    // race the AI); only the screens after it are cleared.
    const state = await cdp.eval<"battle" | "after" | "idle">(
      `document.querySelector(".battle-overlay") ? "battle" : document.querySelector(${JSON.stringify(BUSY_SELECTOR)}) ? "after" : "idle"`,
    );
    if (state === "battle") {
      quiet = 0;
    } else if (state === "after") {
      quiet = 0;
      // Result/progression/evolution screens close with their button; registration and dialogues with Enter.
      await cdp.eval(`(() => {
        const button = document.querySelector(".battle-results-overlay button, [class*=progression] button, [class*=evolution] button");
        if (button) button.click();
        else window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      })()`);
    } else {
      quiet += 1;
      if (quiet >= 3) break;
    }
  }
  const after = await readStory();
  const layers = await cdp.eval<string>(
    `[...document.querySelectorAll(${JSON.stringify(BUSY_SELECTOR)})].map((e) => e.className.toString().split(" ")[0]).join(",")`,
  );
  const diag = await cdp.eval<string>(
    `JSON.stringify({ vfx: Boolean(document.querySelector(".battle-vfx-position")), busy: Boolean(document.querySelector(".battle-busy-indicator")), vfxHtml: (document.querySelector(".battle-vfx-position")?.innerHTML ?? "").slice(0, 300) })`,
  );
  await shot(`${stage.id}-end`);
  expect(after.defeatedTrainerIds, `${stage.id}: ${trainer.name} was not defeated (battle lost or timed out; layers left: ${layers || "none"}; ${diag}; js errors: ${JSON.stringify(cdp.errors.slice(-2)).slice(0, 700)})`).toContain(trainer.id);
  if (trainer.badgeId) expect(after.badgeIds, `${stage.id}: badge not granted`).toContain(trainer.badgeId);
  await shot(`${stage.id}-done`);
}

beforeAll(async () => {
  const res = await fetch(URL_BASE).catch(() => null);
  if (!res?.ok) throw new Error(`dev server not reachable at ${URL_BASE}: run \`pnpm dev\` first`);
  ({ cdp, proc } = await launchBrowser());
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
  // Fresh adventure after the Pokédex quest (starter fight done, Pokédex owned). With E2E_RESUME the
  // stages before it are marked as already won so the run can continue from a checkpoint.
  await cdp.send("Page.navigate", { url: `${URL_BASE}/robots.txt` });
  await sleep(300);
  await cdp.eval("localStorage.clear()");
  let story = completeStoryPlayerEvent({ ...chooseStarter(starter), firstBattleComplete: true }, "story", "pokedex-received");
  for (const stage of stages.slice(0, resumeIndex())) {
    const trainer = trainerOf(stage.trainerId);
    story = markStoryTrainerDefeated(story, trainer.id);
    if (trainer.badgeId) story = grantStoryBadge(story, trainer.badgeId);
  }
  story = levelParty(story, 14, true);
  await writeStory(story, "pallet-town");
}, 60_000);

afterAll(() => {
  proc?.kill();
  console.log(`\nplaythrough report:\n${report.join("\n")}`);
});

describe("playthrough (real battles, turbo)", () => {
  const start = resumeIndex();
  for (const [index, stage] of stages.entries()) {
    it.skipIf(index < start)(`${String(index + 1).padStart(2, "0")}. ${stage.id}`, async () => {
      const t0 = Date.now();
      await fight(stage);
      report.push(`${stage.id}: OK ${Math.round((Date.now() - t0) / 1000)}s`);
    }, FIGHT_TIMEOUT_MS + 60_000);
  }

  it("Hall of Fame: Champion defeated is recorded on the Trainer Card", async () => {
    const story = await readStory();
    expect(story.defeatedTrainerIds).toContain(`league-champion-blue-${rivalStarter}`);
    expect(story.hofDebutSeconds).toBeDefined();
    expect(story.badgeIds).toHaveLength(8);
    report.push("hall-of-fame: OK");
  });
});
