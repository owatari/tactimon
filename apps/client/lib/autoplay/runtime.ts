import { DUEL_MOVES, calculateDuelPokemonMaxHp } from "@tactimon/battle-engine";
import { useBagItem } from "../itemUse";
import { autoShop } from "./shop";
import { Director } from "./director";
import { MapGraph } from "./mapGraph";
import { WALKTHROUGH, maxHp } from "./walkthrough";
import { WORLD_MAPS } from "../maps";
import type { StoryState } from "../story";
import { getOverworldControl, onOverworldStep, type OverworldSnapshot } from "./bridge";
import {
  type BotAction,
  createMemory,
  markExitUsed,
  markInteracted,
  nextAction,
  observeStory,
  type BotMemory,
  type Dir,
  type PlanWorld,
} from "./planner";

export type AutoStatus = {
  running: boolean;
  goal: string;
  mapId: string;
  x: number;
  y: number;
  steps: number;
  stalls: number;
  maps: number;
  log: string[];
};

export type AutoPlayHost = {
  getStory(): StoryState;
  /** Applies a story change (heals with items...). */
  updateStory(update: (story: StoryState) => StoryState): void;
};

const LOG_LIMIT = 80;
/** Real time without any visible change before the watchdog tries something else. */
const STALL_MS = 12_000;
const OVERLAY_TICK_MS = 150;
const STARTER_WISH = "squirtle";
/** Lead level the team should have before the next badge (0 badges -> Brock, ... 8 badges -> the League). */
const LEVEL_TARGETS = [13, 19, 23, 27, 34, 38, 42, 46, 52] as const;
const GRIND_STEP_LIMIT = 4000;

/**
 * A progress signature: when it changes the story moved on (an event, a badge, a key item, a new Pokémon
 * level...) and the planner starts talking to everybody again.
 */
export function storySignature(story: StoryState): string {
  const events = story.playerWorld?.completedEventIds?.length ?? 0;
  const levels = [story.playerPokemon, ...story.capturedPokemon].reduce((sum, p) => sum + (p?.level ?? 0), 0);
  return [
    story.starter ?? "-",
    events,
    story.badgeIds.length,
    story.keyItemIds?.length ?? 0,
    story.defeatedTrainerIds.length,
    story.fieldTechniqueIds?.length ?? 0,
    story.capturedPokemon.length,
    levels >= 0 ? Math.floor(levels / 10) : 0,
  ].join("|");
}

const click = (selector: string): boolean => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return false;
  element.click();
  return true;
};

const press = (key: string) => {
  for (const type of ["keydown", "keyup"] as const) {
    window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  }
};

/**
 * Plays the game: one hook per overworld physics step walks / talks, a 150 ms timer clicks through the
 * overlays (battle results, evolutions, captures, shops), and a watchdog logs and breaks stalls.
 */
export class AutoPlayer {
  private memory: BotMemory = createMemory();
  private stopHook: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private idleHooks = 0;
  private held: Dir | null = null;
  private lastChange = Date.now();
  private lastSignature = "";
  private lastMap = "";
  private stallLevel = 0;
  private lastExitKey = "";
  private grindSteps = 0;
  private director = new Director(WALKTHROUGH);
  private graph = new MapGraph(
    async (mapId) => {
      const definition = WORLD_MAPS[mapId];
      if (!definition) return null;
      const response = await fetch(definition.layoutUrl);
      const layout = (await response.json()) as { width: number; height: number };
      return { width: layout.width, height: layout.height };
    },
    () => Object.keys(WORLD_MAPS),
  );
  /** After a step gives up, the generic explorer drives for a while (hooks left). */
  private explorerHooks = 0;
  private grindBudgetEpoch = -1;
  trace: string[] = [];
  status: AutoStatus = { running: false, goal: "off", mapId: "", x: 0, y: 0, steps: 0, stalls: 0, maps: 0, log: [] };

  constructor(private host: AutoPlayHost) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.status = { ...this.status, maps: this.memory.visitedMaps.size };
    this.listeners.forEach((listener) => listener());
  }

  private log(message: string) {
    this.status = { ...this.status, log: [...this.status.log, message].slice(-LOG_LIMIT) };
  }

  start() {
    if (this.status.running) return;
    this.status = { ...this.status, running: true, goal: "starting" };
    this.lastChange = Date.now();
    this.stopHook = onOverworldStep(() => this.step());
    this.timer = setInterval(() => this.overlays(), OVERLAY_TICK_MS);
    void this.graph.preload().then(() => this.log(`map graph ready (${this.graph.exitsOf("pallet-town").length} exits in Pallet)`));
    this.director.healthOf = (story) => partyHealthOf(story);
    this.log("Auto Player on");
    this.emit();
  }

  stop() {
    if (!this.status.running) return;
    this.stopHook?.();
    if (this.timer) clearInterval(this.timer);
    this.stopHook = null;
    this.timer = null;
    getOverworldControl()?.hold(null);
    this.held = null;
    this.status = { ...this.status, running: false, goal: "off" };
    this.log("Auto Player off");
    this.emit();
  }

  private touch(signature: string) {
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      this.lastChange = Date.now();
      this.stallLevel = 0;
    }
  }

  /** One overworld physics step. */
  private step() {
    const control = getOverworldControl();
    const snap = control?.snapshot();
    if (!control || !snap) return;
    const story = this.host.getStory();
    observeStory(this.memory, storySignature(story));

    if (snap.mapId !== this.lastMap) {
      this.lastMap = snap.mapId;
      this.log(`map ${snap.mapId}`);
    }
    this.touch(`${snap.mapId}:${snap.x},${snap.y}:${snap.dialogue ? 1 : 0}:${this.memory.signature}:${snap.transitioning}`);
    this.status = { ...this.status, mapId: snap.mapId, x: snap.x, y: snap.y };

    if (snap.paused || snap.transitioning || snap.cutscene) {
      this.release(control);
      return;
    }
    if (snap.dialogue) {
      this.release(control);
      if (snap.dialogue.choices.length > 0) control.chooseDialogue(this.pickChoice(snap.dialogue.choices));
      else control.advanceDialogue();
      return;
    }
    if (snap.moving) {
      // One key press = one tile: let go as soon as the step started so the player stops on the tile
      // boundary, where the planner decides again (a held key would chain steps past a turn).
      this.release(control);
      return;
    }

    this.healWithItems(story);
    const action = this.choose(snap, story);
    this.status = { ...this.status, goal: action.goal, steps: this.status.steps + 1 };
    this.trace = [...this.trace, `${snap.x},${snap.y} ${snap.facing} -> ${action.kind}${"dir" in action ? ":" + action.dir : ""}`].slice(-30);
    switch (action.kind) {
      case "move":
        this.hold(control, action.dir);
        break;
      case "face":
        this.release(control);
        control.face(action.dir);
        break;
      case "interact":
        this.release(control);
        markInteracted(this.memory, snap.mapId, action.objectId);
        control.interact();
        this.log(`talk ${action.objectId}`);
        break;
      case "leave":
        markExitUsed(this.memory, snap.mapId, action.exit);
        this.lastExitKey = `${snap.mapId}:${action.exit.to}`;
        this.hold(control, action.exit.dir);
        break;
      case "idle":
        this.release(control);
        this.idleHooks += 1;
        if (this.idleHooks % 120 === 1) this.log(`idle: ${action.goal} on ${snap.mapId}`);
        break;
    }
    if (action.kind !== "idle") this.idleHooks = 0;
    this.emit();
  }

  /** The walkthrough decides; when it has nothing (finished / a step gave up) the generic explorer plays. */
  private choose(snap: OverworldSnapshot, story: StoryState): BotAction {
    const world = this.world(snap);
    if (this.graph.ready() && this.explorerHooks <= 0) {
      this.director.sync(story);
      const decision = this.director.decide({ world, story, memory: this.memory, graph: this.graph });
      if (decision) {
        this.status = { ...this.status, goal: `${decision.step} › ${this.director.currentTask}` };
        if (decision.goal.startsWith("gave up")) {
          this.log(decision.goal);
          this.explorerHooks = 150;
        }
        if (decision.kind !== "idle") return decision;
        if (decision.goal.includes(" done")) this.log(decision.goal);
        return { kind: "idle", goal: decision.goal };
      }
    }
    if (this.explorerHooks > 0) this.explorerHooks -= 1;
    // Fallback: talk to everyone in this map, but never wander into the next one (dead ends, water).
    return nextAction({ ...world, exits: this.director.finished() ? world.exits : [] }, this.memory);
  }

  private hold(control: NonNullable<ReturnType<typeof getOverworldControl>>, dir: Dir) {
    if (this.held !== dir) {
      this.held = dir;
      control.hold(dir);
    }
  }

  private release(control: NonNullable<ReturnType<typeof getOverworldControl>>) {
    if (this.held !== null) {
      this.held = null;
      control.hold(null);
    }
  }

  private world(snap: OverworldSnapshot): PlanWorld {
    return {
      mapId: snap.mapId,
      width: snap.width,
      height: snap.height,
      x: snap.x,
      y: snap.y,
      facing: snap.facing,
      walkable: snap.walkable,
      objects: snap.objects,
      exits: snap.exits,
      isEncounter: snap.isEncounter,
      isCounter: snap.isCounter,
      grind: this.wantsToGrind(),
    };
  }

  /**
   * Train when the team is clearly weaker than the next badge asks for. Gives up on an epoch after
   * a long time without a new level (so a capped or out-of-grass team still moves on).
   */
  private wantsToGrind(): boolean {
    const story = this.host.getStory();
    const party = [story.playerPokemon, ...story.capturedPokemon].filter((pokemon) => pokemon !== null);
    if (party.length === 0 || !story.firstBattleComplete) return false;
    const strongest = Math.max(...party.map((pokemon) => pokemon.level));
    const target = LEVEL_TARGETS[Math.min(story.badgeIds.length, LEVEL_TARGETS.length - 1)];
    if (strongest >= target) return false;
    if (this.grindBudgetEpoch !== this.memory.epoch) {
      this.grindBudgetEpoch = this.memory.epoch;
      this.grindSteps = 0;
    }
    this.grindSteps += 1;
    return this.grindSteps < GRIND_STEP_LIMIT;
  }

  /** Dialogue choices: say yes / the first option, except obvious "no" answers. */
  private pickChoice(choices: string[]): number {
    const index = choices.findIndex((label) => !/^(no|não|nao|cancel|leave|exit)/i.test(label.trim()));
    return index >= 0 ? index : 0;
  }

  /** Between fights: drink healing items on a hurt Pokémon instead of walking around at 5 HP. */
  private healWithItems(story: StoryState) {
    const party = [story.playerPokemon, ...story.capturedPokemon];
    const hurt = party.findIndex(
      (pokemon) => pokemon && pokemon.currentHp > 0 && pokemon.currentHp / Math.max(1, calculateDuelPokemonMaxHp(pokemon)) < 0.5,
    );
    if (hurt < 0) return;
    this.host.updateStory((current) => healOnce(current, hurt));
  }

  /** The overlay clicker + stall watchdog (real time, independent of the game speed). */
  private overlays() {
    const handled = this.clickThroughOverlays();
    if (!handled && Date.now() - this.lastChange > STALL_MS) this.breakStall();
    this.emit();
  }

  private clickThroughOverlays(): boolean {
    // Battle results, evolutions, level-ups, captures, shops, PC, menus...
    if (click(".battle-results-continue")) return true;
    if (document.querySelector(".pokemon-evolution-overlay")) {
      click(".pokemon-evolution-overlay button");
      return true;
    }
    if (document.querySelector(".progression-overlay")) {
      this.progressionOverlay();
      return true;
    }
    if (document.querySelector(".starter-scene")) {
      // Squirtle: it can Surf (and Strength / Rock Smash), so the rest of the game stays open to us.
      const shown = document.querySelector(".starter-info-copy")?.textContent?.toLowerCase() ?? "";
      const asking = Boolean(document.querySelector(".starter-yesno"));
      press(asking || shown.includes(STARTER_WISH) ? "Enter" : "ArrowRight");
      return true;
    }
    if (document.querySelector(".capture-summary-overlay")) {
      // Keep the catch on the team while there is room, otherwise send it to the box.
      if (document.querySelector(".capture-swap")) press("Escape");
      else if (!click(".capture-actions button:not(.capture-send-all)")) press("Enter");
      return true;
    }
    if (document.querySelector(".market-overlay")) {
      // Stock up once, then leave.
      this.host.updateStory(autoShop);
      press("Escape");
      return true;
    }
    if (document.querySelector(".pc-overlay")) {
      press("Escape");
      return true;
    }
    if (document.querySelector(".mart-overlay")) {
      if (!click(".mart-overlay button")) press("Enter");
      return true;
    }
    if (document.querySelector(".start-menu-overlay")) {
      press("Escape");
      return true;
    }
    return Boolean(document.querySelector(".battle-overlay"));
  }

  /** A new move to learn: replace the weakest known move if the new one hits harder, else skip. */
  private progressionOverlay() {
    const skip = document.querySelector<HTMLElement>(".progression-overlay .skip-move-button");
    if (!skip) {
      click(".progression-continue");
      return;
    }
    const wanted = (skip.textContent ?? "").replace(/^Do not learn\s*/i, "").trim().toLowerCase();
    const power = (name: string) =>
      Object.values(DUEL_MOVES).find((move) => move.name.toLowerCase() === name.toLowerCase())?.power ?? 0;
    const known = [...document.querySelectorAll<HTMLElement>(".progression-overlay button:not(.skip-move-button)")].map((button) => ({
      button,
      power: power(button.querySelector("strong")?.textContent ?? ""),
    }));
    const weakest = known.sort((a, b) => a.power - b.power)[0];
    if (weakest && power(wanted) > weakest.power) weakest.button.click();
    else skip.click();
  }

  private breakStall() {
    this.stallLevel += 1;
    this.lastChange = Date.now();
    this.status = { ...this.status, stalls: this.status.stalls + 1 };
    const overlays = [".battle-overlay", ".battle-results-overlay", ".pokemon-evolution-overlay", ".starter-scene", ".capture-summary-overlay", ".progression-overlay", ".market-overlay", ".mart-overlay", ".pc-overlay", ".start-menu-overlay", ".dialogue-panel", ".story-overlay"]
      .filter((selector) => document.querySelector(selector))
      .join(" ");
    this.log(`stall #${this.status.stalls} on ${this.status.mapId} (${this.status.x},${this.status.y}): ${this.status.goal} [${overlays || "no overlay"}]`);
    const control = getOverworldControl();
    // Shake things loose: confirm / cancel keys, then a random walk, and forget the exit that led nowhere.
    press("Enter");
    press("Escape");
    if (control) {
      const dirs: Dir[] = ["north", "south", "west", "east"];
      this.held = null;
      control.hold(dirs[Math.floor(Math.random() * 4)]);
    }
    if (this.stallLevel >= 2 && this.lastExitKey) this.memory.visitedMaps.add(this.lastExitKey.split(":")[1]);
  }
}

const HEALING_ITEMS = ["potion", "super-potion", "hyper-potion"] as const;

/** Uses the weakest healing item the bag has on party member `index` (a no-op when none works). */
export function healOnce(story: StoryState, index: number): StoryState {
  for (const id of HEALING_ITEMS) {
    const have = id === "potion" ? story.inventory.potion : (story.bagItems?.[id] ?? 0);
    if (!have) continue;
    const result = useBagItem(story, id, index);
    if (result.accepted) return result.story;
  }
  return story;
}

function partyHealthOf(story: StoryState): number {
  const party = [story.playerPokemon, ...story.capturedPokemon].filter((pokemon) => pokemon !== null);
  if (party.length === 0) return 1;
  const have = party.reduce((sum, pokemon) => sum + Math.max(0, pokemon.currentHp), 0);
  const total = party.reduce((sum, pokemon) => sum + Math.max(1, maxHp(pokemon)), 0);
  return have / total;
}
