import { HEAL_LOCATIONS } from "../healLocations";
import type { StoryState } from "../story";
import type { MapGraph } from "./mapGraph";
import {
  DIRS,
  findPath,
  markExitUsed,
  forgetMap,
  markInteracted,
  nextAction,
  standingCells,
  type BotAction,
  type BotMemory,
  type Dir,
  type PlanExit,
  type PlanWorld,
} from "./planner";

/** One thing the bot does on the way through a walkthrough step. */
export type Task =
  /** Walk to a map (and to a tile of it when given), crossing every map in between. */
  | { k: "goto"; map: string; x?: number; y?: number; /** Also done when we end up here (a cutscene may carry us away). */ orMap?: string }
  /** Talk to every NPC / object of the map (it never leaves the map); done when nothing is left to talk to. */
  | { k: "explore"; map: string }
  /** Talk to the object standing on a tile. */
  | { k: "talk"; map: string; at: readonly [number, number] }
  /** Face a tile and press A on it (a sign, a poster, a PC, a tree, a trash can...). */
  | { k: "interact"; map: string; at: readonly [number, number] }
  /** Walk an exact path from a tile (puzzle solutions). */
  | { k: "walk"; map: string; from: readonly [number, number]; moves: readonly Dir[] }
  /** Walk around the grass of a map until the lead is at least this level. */
  | { k: "grind"; map: string; level: number }
  /** Go to the nearest Pokémon Center and talk to the nurse. */
  | { k: "heal" }
  /** Decides the next micro-task from the save each time (null = finished): puzzles that depend on the story. */
  | { k: "dyn"; label: string; make: (story: StoryState) => Task | null };

export type Step = {
  id: string;
  title: string;
  /** True when the step's goal is already reached in this save (the step is skipped). */
  done: (story: StoryState) => boolean;
  tasks: readonly Task[];
};

/** What the director needs to see of the world and the save. */
export type DirectorContext = {
  world: PlanWorld;
  story: StoryState;
  memory: BotMemory;
  graph: MapGraph;
};

export type DirectorDecision = BotAction & { step: string };

const THREE_TRIES = 3;

const maxLevel = (story: StoryState) =>
  Math.max(0, ...[story.playerPokemon, ...story.capturedPokemon].map((pokemon) => pokemon?.level ?? 0));

/** Party health as a 0..1 ratio of the summed HP; fainted Pokémon count as 0. */
export function partyHealth(story: StoryState, maxHpOf: (pokemon: NonNullable<StoryState["playerPokemon"]>) => number): number {
  const party = [story.playerPokemon, ...story.capturedPokemon].filter((pokemon) => pokemon !== null);
  if (party.length === 0) return 1;
  const have = party.reduce((sum, pokemon) => sum + Math.max(0, pokemon.currentHp), 0);
  const total = party.reduce((sum, pokemon) => sum + Math.max(1, maxHpOf(pokemon)), 0);
  return have / total;
}

const centerMaps: string[] = HEAL_LOCATIONS.map((entry) => entry.centerMapId);

/**
 * Walks a walkthrough: finds the first step whose goal is not reached yet and executes its tasks one
 * by one. A step that cannot make progress is retried and then skipped for a while (the generic
 * explorer takes over), so one broken step never freezes the whole run.
 */
export class Director {
  stepIndex = 0;
  taskIndex = 0;
  private attempts = new Map<string, number>();
  /** Task-local state (what was already done inside the current task). */
  private flags: Record<string, unknown> = {};
  private leaveTries = new Map<string, number>();
  private skipped = new Map<string, number>();
  private clock = 0;
  /** Health ratio under which the bot goes to a Pokémon Center instead of fighting on. */
  healBelow = 0.35;
  healthOf: (story: StoryState) => number = () => 1;
  currentStep = "";
  private lastStep = "";
  private stepChanged = false;
  currentTask = "";

  constructor(private steps: readonly Step[]) {}

  /** Re-reads the walkthrough position from the save (the first step that is not done). */
  sync(story: StoryState): void {
    this.clock += 1;
    let index = 0;
    while (index < this.steps.length && (this.steps[index].done(story) || this.isSkipped(this.steps[index].id))) index += 1;
    if (index !== this.stepIndex) {
      this.stepIndex = index;
      this.resetTask();
    }
    this.currentStep = this.steps[this.stepIndex]?.id ?? "finished";
    if (this.currentStep !== this.lastStep) {
      this.lastStep = this.currentStep;
      this.stepChanged = true;
    }
  }

  finished(): boolean {
    return this.stepIndex >= this.steps.length;
  }

  private isSkipped(id: string): boolean {
    const until = this.skipped.get(id);
    return until !== undefined && until > this.clock;
  }

  private resetTask() {
    this.taskIndex = 0;
    this.flags = {};
  }

  /** The step failed too many times: skip it for `rounds` syncs so later steps (or the explorer) can run. */
  private giveUp(id: string, reason: string, rounds = 600): string {
    this.skipped.set(id, this.clock + rounds);
    this.attempts.delete(id);
    this.resetTask();
    return `gave up ${id}: ${reason}`;
  }

  decide(ctx: DirectorContext): (DirectorDecision & { note?: string }) | null {
    const step = this.steps[this.stepIndex];
    if (!step) return null;
    if (this.stepChanged) {
      // A new step may open edges that were closed for the previous one (a guard moved, a key was found).
      this.stepChanged = false;
      ctx.graph.clearBlocked();
      this.leaveTries.clear();
    }

    // Hurt team: restore it before anything else (the heal task is a mini walkthrough step of its own).
    if (this.healthOf(ctx.story) < this.healBelow && !this.flags.healing) {
      this.flags = { ...this.flags, healing: true, resumeTask: this.taskIndex };
    }
    const task: Task | undefined = this.flags.healing ? { k: "heal" } : step.tasks[this.taskIndex];
    if (!task) {
      // Every task ran but the goal is still open: retry the step a few times, then give up.
      const tries = (this.attempts.get(step.id) ?? 0) + 1;
      this.attempts.set(step.id, tries);
      if (tries >= THREE_TRIES) return { kind: "idle", goal: this.giveUp(step.id, "tasks finished without reaching the goal"), step: step.id };
      this.resetTask();
      return { kind: "idle", goal: `retry ${step.id}`, step: step.id };
    }

    this.currentTask = describe(task);
    const outcome = this.run(task, ctx);
    if (outcome.finished) {
      if (this.flags.healing) this.flags = {};
      else {
        this.taskIndex += 1;
        this.flags = {};
      }
      return { kind: "idle", goal: `${step.id}: ${describe(task)} done`, step: step.id };
    }
    if (outcome.failed) {
      const tries = (this.attempts.get(step.id) ?? 0) + 1;
      this.attempts.set(step.id, tries);
      if (tries >= THREE_TRIES * 2) return { kind: "idle", goal: this.giveUp(step.id, outcome.failed), step: step.id };
      return { kind: "idle", goal: `${step.id}: ${outcome.failed}`, step: step.id, note: outcome.failed };
    }
    const action = outcome.action ?? { kind: "idle" as const, goal: "waiting" };
    return { ...action, goal: `${step.id}: ${action.goal}`, step: step.id };
  }

  private run(task: Task, ctx: DirectorContext): { action?: BotAction; finished?: boolean; failed?: string } {
    const { world } = ctx;
    switch (task.k) {
      case "goto":
        if (task.orMap && world.mapId === task.orMap) return { finished: true };
        return this.goto(task.map, task.x, task.y, ctx);
      case "explore": {
        if (world.mapId !== task.map) return this.goto(task.map, undefined, undefined, ctx);
        if (!this.flags.cleared) {
          // Everyone is worth talking to again at the start of the task (a retry, a new story state).
          this.flags.cleared = true;
          forgetMap(ctx.memory, world.mapId);
        }
        const action = nextAction({ ...world, exits: [], grind: false }, ctx.memory);
        return action.kind === "idle" ? { finished: true } : { action };
      }
      case "talk":
      case "interact": {
        if (world.mapId !== task.map) return this.goto(task.map, undefined, undefined, ctx);
        if (this.flags.acted) return { finished: true };
        return this.touch(task, ctx);
      }
      case "walk":
        return this.walk(task, ctx);
      case "grind": {
        if (maxLevel(ctx.story) >= task.level) return { finished: true };
        if (world.mapId !== task.map) return this.goto(task.map, undefined, undefined, ctx);
        const action = nextAction({ ...world, exits: [], objects: [], grind: true }, ctx.memory);
        return action.kind === "idle" ? { failed: "no grass to train in here" } : { action };
      }
      case "heal":
        return this.heal(ctx);
      case "dyn": {
        const sub = task.make(ctx.story);
        if (!sub) return { finished: true };
        const key = describe(sub);
        if (this.flags.dynKey !== key) this.flags = { ...this.flags, dynKey: key, acted: false, started: false };
        const outcome = this.run(sub, ctx);
        // A finished micro-task hands over to the next one on the following tick.
        if (outcome.finished) this.flags = { ...this.flags, dynKey: "" };
        return outcome.finished ? { action: { kind: "idle", goal: `${task.label}: ${key} done` } } : outcome;
      }
    }
  }

  /** Walks toward `map` (and a tile of it): the next hop of the route, or the tile itself once there. */
  private goto(map: string, x: number | undefined, y: number | undefined, ctx: DirectorContext): { action?: BotAction; finished?: boolean; failed?: string } {
    const { world, graph, memory } = ctx;
    if (world.mapId === map) {
      if (x === undefined || y === undefined) return { finished: true };
      if (world.x === x && world.y === y) return { finished: true };
      const path = findPath(world, (cx, cy) => cx === x && cy === y);
      if (!path) return { failed: `no path to ${x},${y} in ${map}` };
      return { action: { kind: "move", dir: path[0].dir, goal: `walk to ${map} ${x},${y}` } };
    }
    const route = graph.route(world.mapId, map);
    if (!route) return { failed: `no route from ${world.mapId} to ${map}` };
    const hop = route[1];
    const exits = world.exits.filter((exit) => exit.to === hop);
    if (exits.length === 0) return { failed: `no exit to ${hop} on ${world.mapId}` };
    const here = exits.find((exit) => exit.x === world.x && exit.y === world.y);
    if (here) return this.leave(here, ctx);
    const path = findPath(world, (cx, cy) => exits.some((exit) => exit.x === cx && exit.y === cy));
    if (!path) {
      graph.block(world.mapId, hop);
      return { failed: `exits to ${hop} unreachable` };
    }
    void memory;
    return { action: { kind: "move", dir: path[0].dir, goal: `to ${hop} on the way to ${map}` } };
  }

  private leave(exit: PlanExit, ctx: DirectorContext): { action?: BotAction; failed?: string } {
    const key = `${ctx.world.mapId}>${exit.to}`;
    const tries = (this.leaveTries.get(key) ?? 0) + 1;
    this.leaveTries.set(key, tries);
    markExitUsed(ctx.memory, ctx.world.mapId, exit);
    if (tries > 6) {
      // Walking into that exit keeps failing (a guard, a locked door): treat the edge as closed.
      this.leaveTries.set(key, 0);
      ctx.graph.block(ctx.world.mapId, exit.to);
      return { failed: `exit to ${exit.to} is blocked` };
    }
    return { action: { kind: "leave", exit, goal: `leave to ${exit.to}` } };
  }

  /** Stand next to a tile, face it and interact. */
  private touch(task: Extract<Task, { k: "talk" | "interact" }>, ctx: DirectorContext): { action?: BotAction; finished?: boolean; failed?: string } {
    const { world, memory } = ctx;
    const [tx, ty] = task.at;
    const standing = standingCells(world, tx, ty);
    if (standing.length === 0) return { failed: `nothing to stand on next to ${tx},${ty}` };
    const here = standing.find((cell) => cell.x === world.x && cell.y === world.y);
    if (here) {
      if (world.facing !== here.face) return { action: { kind: "face", dir: here.face, goal: `face ${tx},${ty}` } };
      this.flags.acted = true;
      markInteracted(memory, world.mapId, `tile:${tx},${ty}`);
      return { action: { kind: "interact", objectId: `tile:${tx},${ty}`, goal: `${task.k} ${tx},${ty}` } };
    }
    const path = findPath(world, (cx, cy) => standing.some((cell) => cell.x === cx && cell.y === cy));
    if (!path) return { failed: `cannot reach ${tx},${ty}` };
    return { action: { kind: "move", dir: path[0].dir, goal: `walk to ${tx},${ty}` } };
  }

  private walk(task: Extract<Task, { k: "walk" }>, ctx: DirectorContext): { action?: BotAction; finished?: boolean; failed?: string } {
    const { world } = ctx;
    if (world.mapId !== task.map) return this.goto(task.map, undefined, undefined, ctx);
    const positions: [number, number][] = [[task.from[0], task.from[1]]];
    for (const dir of task.moves) {
      const { dx, dy } = DIRS.find((entry) => entry.dir === dir)!;
      const last = positions[positions.length - 1];
      positions.push([last[0] + dx, last[1] + dy]);
    }
    const index = positions.findIndex(([px, py]) => px === world.x && py === world.y);
    if (index === positions.length - 1) return { finished: true };
    if (index < 0) {
      // Not on the route yet: get to its start (or fail if we wandered off it after starting).
      if (this.flags.started) return { failed: "left the scripted path" };
      return this.goto(task.map, task.from[0], task.from[1], ctx);
    }
    this.flags.started = true;
    return { action: { kind: "move", dir: task.moves[index], goal: `scripted step ${index + 1}/${task.moves.length}` } };
  }

  private heal(ctx: DirectorContext): { action?: BotAction; finished?: boolean; failed?: string } {
    const { world, story, graph } = ctx;
    if (this.healthOf(story) >= 0.95) return { finished: true };
    if (centerMaps.includes(world.mapId)) {
      const nurse = world.objects.find((object) => object.id.endsWith("nurse"));
      if (!nurse) return { failed: "no nurse in this Pokémon Center" };
      if (this.flags.acted) {
        // Talked to the nurse and the dialogue closed: healed (checked at the top), or try once more.
        this.flags.acted = false;
        this.flags.nurseTries = Number(this.flags.nurseTries ?? 0) + 1;
        if (Number(this.flags.nurseTries) >= 3) return { failed: "the nurse did not heal" };
      }
      return this.touch({ k: "talk", map: world.mapId, at: [nurse.x, nurse.y] }, ctx);
    }
    // Nearest center by route length.
    let best: { map: string; hops: number } | null = null;
    for (const map of centerMaps) {
      const route = graph.route(world.mapId, map);
      if (route && (!best || route.length < best.hops)) best = { map, hops: route.length };
    }
    if (!best) return { failed: "no Pokémon Center reachable" };
    return this.goto(best.map, undefined, undefined, ctx);
  }
}

function describe(task: Task): string {
  switch (task.k) {
    case "goto":
      return `goto ${task.map}${task.x !== undefined ? ` ${task.x},${task.y}` : ""}`;
    case "explore":
      return `explore ${task.map}`;
    case "talk":
    case "interact":
      return `${task.k} ${task.map} ${task.at[0]},${task.at[1]}`;
    case "walk":
      return `walk ${task.map} ${task.moves.length} steps`;
    case "grind":
      return `grind ${task.map} to Lv${task.level}`;
    case "heal":
      return "heal";
    case "dyn":
      return `dyn ${task.label}`;
  }
}
