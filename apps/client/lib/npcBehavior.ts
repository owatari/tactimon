/**
 * NPC behaviour engine (task 036): what FireRed NPCs do beyond standing still, plus the scripted
 * walks of trainers that spot the player and of rivals that come to the player.
 *
 * Pure logic (no DOM): the overworld feeds it NPC seeds and a `isFree(x, y, key)` collision query,
 * calls `update(now)` every frame and reads `poses()` to place the sprites.
 */
import type { Direction } from "./maps";

export const DIRS: Readonly<Record<Direction, { x: number; y: number }>> = {
  south: { x: 0, y: 1 },
  north: { x: 0, y: -1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  south: "north",
  north: "south",
  west: "east",
  east: "west",
};

/** Frame cells of the 16x32 overworld sheets (east is the west frame mirrored). */
const IDLE_FRAME: Readonly<Record<Direction, number>> = { south: 0, north: 1, west: 2, east: 2 };
const WALK_FRAME: Readonly<Record<Direction, readonly [number, number]>> = {
  south: [3, 4],
  north: [5, 6],
  west: [7, 8],
  east: [7, 8],
};

export function npcFrame(facing: Direction, walking: boolean, foot: 0 | 1): number {
  return walking ? WALK_FRAME[facing][foot] : IDLE_FRAME[facing];
}

export function facingBetween(from: { x: number; y: number }, to: { x: number; y: number }): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
  return dy >= 0 ? "south" : "north";
}

export type BehaviorKind =
  | { kind: "static"; facing: Direction | null }
  | { kind: "look"; facings: readonly Direction[]; intervalMs: readonly [number, number] }
  | { kind: "rotate"; clockwise: boolean; intervalMs: readonly [number, number] }
  | { kind: "wander"; axis: "both" | "vertical" | "horizontal"; slow?: boolean }
  | { kind: "patrol"; axis: "vertical" | "horizontal"; first: Direction };

const ALL: readonly Direction[] = ["north", "south", "west", "east"];
const SLOW: readonly [number, number] = [1200, 3200];

/**
 * FireRed `MOVEMENT_TYPE_*` ids -> behaviour. Anything not listed stands still facing down
 * (`implementedMovementTypes()` documents exactly what is covered).
 */
const BEHAVIORS: Readonly<Record<number, BehaviorKind>> = {
  0: { kind: "static", facing: null },
  1: { kind: "look", facings: ALL, intervalMs: SLOW },
  2: { kind: "wander", axis: "both" },
  3: { kind: "wander", axis: "vertical" },
  4: { kind: "wander", axis: "vertical" },
  5: { kind: "wander", axis: "horizontal" },
  6: { kind: "wander", axis: "horizontal" },
  7: { kind: "static", facing: "north" },
  8: { kind: "static", facing: "south" },
  9: { kind: "static", facing: "west" },
  10: { kind: "static", facing: "east" },
  11: { kind: "static", facing: null },
  12: { kind: "static", facing: null },
  13: { kind: "look", facings: ["south", "north"], intervalMs: SLOW },
  14: { kind: "look", facings: ["west", "east"], intervalMs: SLOW },
  15: { kind: "look", facings: ["north", "west"], intervalMs: SLOW },
  16: { kind: "look", facings: ["north", "east"], intervalMs: SLOW },
  17: { kind: "look", facings: ["south", "west"], intervalMs: SLOW },
  18: { kind: "look", facings: ["south", "east"], intervalMs: SLOW },
  19: { kind: "look", facings: ["south", "north", "west"], intervalMs: SLOW },
  20: { kind: "look", facings: ["south", "north", "east"], intervalMs: SLOW },
  21: { kind: "look", facings: ["north", "west", "east"], intervalMs: SLOW },
  22: { kind: "look", facings: ["south", "west", "east"], intervalMs: SLOW },
  23: { kind: "rotate", clockwise: false, intervalMs: [1000, 1800] },
  24: { kind: "rotate", clockwise: true, intervalMs: [1000, 1800] },
  25: { kind: "patrol", axis: "vertical", first: "north" },
  26: { kind: "patrol", axis: "vertical", first: "south" },
  27: { kind: "patrol", axis: "horizontal", first: "west" },
  28: { kind: "patrol", axis: "horizontal", first: "east" },
  // FireRed's slow strollers (little girls, the Slowpoke of Fuchsia): wander with long pauses.
  52: { kind: "wander", axis: "both", slow: true },
  80: { kind: "wander", axis: "horizontal", slow: true },
};

export function behaviorFor(movementType: number): BehaviorKind {
  return BEHAVIORS[movementType] ?? { kind: "static", facing: null };
}

/**
 * Movement types that appear on Kanto maps and deliberately stand still: the patrol / walk-sequence
 * types (37, 40, 41, 45, 47, 50, 51) are only used by trainers (bikers, swimmers, nerds), which here
 * hold their post and watch in one direction (their sight line is what matters), and 76 is the
 * link-cable attendant (not in the game). The test fails when an extraction brings a type that is
 * neither implemented nor listed here.
 */
export const STATIC_MOVEMENT_TYPES: readonly number[] = [37, 40, 41, 45, 47, 50, 51, 76];

export function implementedMovementTypes(): number[] {
  return Object.keys(BEHAVIORS).map(Number);
}

/** Facing a static or looking NPC has when the map loads. */
export function initialFacing(movementType: number): Direction {
  const behavior = behaviorFor(movementType);
  if (behavior.kind === "static") return behavior.facing ?? "south";
  if (behavior.kind === "look") return behavior.facings[0];
  if (behavior.kind === "rotate") return "south";
  if (behavior.kind === "patrol") return behavior.first;
  return "south";
}

export type NpcSeed = {
  key: string;
  x: number;
  y: number;
  movementType: number;
  rangeX?: number;
  rangeY?: number;
  /** Overrides the facing the movement type implies (trainers face where their data says). */
  facing?: Direction;
};

export type NpcPose = {
  key: string;
  /** Tile coordinates (fractional while a step is in progress). */
  x: number;
  y: number;
  facing: Direction;
  walking: boolean;
  frame: number;
  /** The tile the NPC occupies for collision (its destination while stepping). */
  tileX: number;
  tileY: number;
};

type Step = { fromX: number; fromY: number; toX: number; toY: number; startedAt: number; duration: number };

type NpcState = {
  seed: NpcSeed;
  behavior: BehaviorKind;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  facing: Direction;
  foot: 0 | 1;
  step: Step | null;
  nextAt: number;
  patrolDir: Direction;
  rotateIndex: number;
  script: {
    path: { x: number; y: number }[];
    tileMs: number;
    onDone: (() => void) | null;
  } | null;
  /** While true the NPC ignores its behaviour (cutscene in progress). */
  frozen: boolean;
  /** Cutscene actors (a rival walking in) survive `setNpcs`; map NPCs do not. */
  actor: boolean;
};

export type NpcEngineOptions = {
  /** Can `key` step onto the tile? (walkable, nobody there, not the player.) */
  isFree: (x: number, y: number, key: string) => boolean;
  random?: () => number;
};

const WANDER_STEP_MS = 280;
const WANDER_PAUSE_MS: readonly [number, number] = [900, 2600];
const SLOW_WANDER_PAUSE_MS: readonly [number, number] = [2600, 6000];
const ROTATION: readonly Direction[] = ["north", "east", "south", "west"];

export class NpcEngine {
  private npcs = new Map<string, NpcState>();
  private isFree: NpcEngineOptions["isFree"];
  private random: () => number;

  constructor(options: NpcEngineOptions) {
    this.isFree = options.isFree;
    this.random = options.random ?? Math.random;
  }

  /** Forgets every NPC (a new map was loaded). */
  reset(): void {
    this.npcs.clear();
  }

  private create(seed: NpcSeed, now: number, actor: boolean): NpcState {
    const behavior = behaviorFor(seed.movementType);
    return {
      seed,
      behavior,
      homeX: seed.x,
      homeY: seed.y,
      x: seed.x,
      y: seed.y,
      facing: seed.facing ?? initialFacing(seed.movementType),
      foot: 0,
      step: null,
      nextAt: now + this.between(...(behavior.kind === "wander" ? WANDER_PAUSE_MS : SLOW)),
      patrolDir: behavior.kind === "patrol" ? behavior.first : "south",
      rotateIndex: 0,
      script: null,
      frozen: actor,
      actor,
    };
  }

  /** Adds a cutscene actor (not part of the map's NPC list). */
  addActor(seed: NpcSeed, now: number): void {
    this.npcs.set(seed.key, this.create(seed, now, true));
  }

  removeActor(key: string): void {
    if (this.npcs.get(key)?.actor) this.npcs.delete(key);
  }

  /** Replaces the map NPC set; NPCs already known keep their runtime tile and facing. */
  setNpcs(seeds: readonly NpcSeed[], now: number): void {
    const next = new Map<string, NpcState>();
    for (const [key, state] of this.npcs) if (state.actor) next.set(key, state);
    for (const seed of seeds) {
      const known = this.npcs.get(seed.key);
      if (known) {
        const moved = known.seed.x !== seed.x || known.seed.y !== seed.y;
        known.seed = seed;
        if (moved && !known.script) {
          // The place the NPC is meant to stand changed (a story event): put it there.
          known.x = seed.x;
          known.y = seed.y;
          known.homeX = seed.x;
          known.homeY = seed.y;
          known.step = null;
        }
        next.set(seed.key, known);
        continue;
      }
      next.set(seed.key, this.create(seed, now, false));
    }
    this.npcs = next;
  }

  has(key: string): boolean {
    return this.npcs.has(key);
  }

  tile(key: string): { x: number; y: number } | null {
    const npc = this.npcs.get(key);
    return npc ? { x: npc.x, y: npc.y } : null;
  }

  facing(key: string): Direction | null {
    return this.npcs.get(key)?.facing ?? null;
  }

  isBusy(key: string): boolean {
    const npc = this.npcs.get(key);
    return Boolean(npc && (npc.step || npc.script));
  }

  /** Stops the NPC's own behaviour and turns it (used when something is about to happen to it). */
  freeze(key: string, facing?: Direction): void {
    const npc = this.npcs.get(key);
    if (!npc) return;
    npc.frozen = true;
    if (facing) npc.facing = facing;
  }

  release(key: string, now: number): void {
    const npc = this.npcs.get(key);
    if (!npc) return;
    npc.frozen = false;
    npc.nextAt = now + this.between(...SLOW);
  }

  turn(key: string, facing: Direction): void {
    const npc = this.npcs.get(key);
    if (npc) npc.facing = facing;
  }

  /** Walks the NPC along `path` (tiles in order), one tile every `tileMs`, then calls `onDone`. */
  scriptWalk(
    key: string,
    path: readonly { x: number; y: number }[],
    tileMs: number,
    now: number,
    onDone?: () => void,
  ): void {
    const npc = this.npcs.get(key);
    if (!npc) {
      onDone?.();
      return;
    }
    npc.frozen = true;
    npc.script = { path: [...path], tileMs, onDone: onDone ?? null };
    npc.nextAt = now;
  }

  update(now: number): void {
    for (const npc of this.npcs.values()) {
      this.advance(npc, now);
    }
  }

  poses(now: number): NpcPose[] {
    const out: NpcPose[] = [];
    for (const npc of this.npcs.values()) {
      let x = npc.x;
      let y = npc.y;
      let walking = false;
      if (npc.step) {
        const progress = Math.min(1, (now - npc.step.startedAt) / npc.step.duration);
        x = npc.step.fromX + (npc.step.toX - npc.step.fromX) * progress;
        y = npc.step.fromY + (npc.step.toY - npc.step.fromY) * progress;
        walking = progress < 0.72;
      }
      out.push({
        key: npc.seed.key,
        x,
        y,
        facing: npc.facing,
        walking,
        frame: npcFrame(npc.facing, walking, npc.foot),
        tileX: npc.x,
        tileY: npc.y,
      });
    }
    return out;
  }

  private between(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  private tryStep(npc: NpcState, direction: Direction, now: number, duration: number, force = false): boolean {
    const delta = DIRS[direction];
    const toX = npc.x + delta.x;
    const toY = npc.y + delta.y;
    npc.facing = direction;
    if (!force && !this.isFree(toX, toY, npc.seed.key)) return false;
    npc.step = { fromX: npc.x, fromY: npc.y, toX, toY, startedAt: now, duration };
    // The destination is claimed immediately so the player cannot walk into it meanwhile.
    npc.x = toX;
    npc.y = toY;
    npc.foot = npc.foot === 0 ? 1 : 0;
    return true;
  }

  private advance(npc: NpcState, now: number): void {
    if (npc.step && now - npc.step.startedAt >= npc.step.duration) {
      npc.step = null;
    }
    if (npc.step) return;

    if (npc.script) {
      const script = npc.script;
      const next = script.path[0];
      if (!next) {
        npc.script = null;
        script.onDone?.();
        return;
      }
      script.path.shift();
      npc.facing = facingBetween({ x: npc.x, y: npc.y }, next);
      npc.step = { fromX: npc.x, fromY: npc.y, toX: next.x, toY: next.y, startedAt: now, duration: script.tileMs };
      npc.x = next.x;
      npc.y = next.y;
      npc.foot = npc.foot === 0 ? 1 : 0;
      return;
    }

    if (npc.frozen || now < npc.nextAt) return;
    const behavior = npc.behavior;
    switch (behavior.kind) {
      case "static":
        break;
      case "look": {
        const options = behavior.facings.filter((facing) => facing !== npc.facing);
        const pool = options.length > 0 ? options : behavior.facings;
        npc.facing = pool[Math.floor(this.random() * pool.length)];
        npc.nextAt = now + this.between(...behavior.intervalMs);
        break;
      }
      case "rotate": {
        npc.rotateIndex = (npc.rotateIndex + (behavior.clockwise ? 1 : ROTATION.length - 1)) % ROTATION.length;
        npc.facing = ROTATION[npc.rotateIndex];
        npc.nextAt = now + this.between(...behavior.intervalMs);
        break;
      }
      case "wander": {
        const directions = ALL.filter((direction) => {
          if (behavior.axis === "vertical") return direction === "north" || direction === "south";
          if (behavior.axis === "horizontal") return direction === "west" || direction === "east";
          return true;
        });
        const direction = directions[Math.floor(this.random() * directions.length)];
        const delta = DIRS[direction];
        const rangeX = npc.seed.rangeX ?? 1;
        const rangeY = npc.seed.rangeY ?? 1;
        const toX = npc.x + delta.x;
        const toY = npc.y + delta.y;
        const inside = Math.abs(toX - npc.homeX) <= rangeX && Math.abs(toY - npc.homeY) <= rangeY;
        if (inside) this.tryStep(npc, direction, now, WANDER_STEP_MS);
        else npc.facing = direction;
        npc.nextAt = now + this.between(...(behavior.slow ? SLOW_WANDER_PAUSE_MS : WANDER_PAUSE_MS));
        break;
      }
      case "patrol": {
        const rangeX = npc.seed.rangeX ?? 1;
        const rangeY = npc.seed.rangeY ?? 1;
        const delta = DIRS[npc.patrolDir];
        const toX = npc.x + delta.x;
        const toY = npc.y + delta.y;
        const inside = Math.abs(toX - npc.homeX) <= rangeX && Math.abs(toY - npc.homeY) <= rangeY;
        if (!inside || !this.tryStep(npc, npc.patrolDir, now, WANDER_STEP_MS)) {
          npc.patrolDir = OPPOSITE[npc.patrolDir];
          npc.facing = npc.patrolDir;
        }
        npc.nextAt = now + 120;
        break;
      }
    }
  }
}

/** True when `trainer` (facing `facing`, `range` tiles of sight) sees a player standing at `player`. */
export function spotsPlayer(args: {
  trainer: { x: number; y: number };
  facing: Direction;
  range: number;
  player: { x: number; y: number };
  /** True when the tile stops the line of sight (wall, another NPC...). */
  blocksSight: (x: number, y: number) => boolean;
}): number | null {
  const delta = DIRS[args.facing];
  for (let distance = 1; distance <= args.range; distance += 1) {
    const x = args.trainer.x + delta.x * distance;
    const y = args.trainer.y + delta.y * distance;
    if (args.player.x === x && args.player.y === y) return distance;
    if (args.blocksSight(x, y)) return null;
  }
  return null;
}

/**
 * Shortest walkable route from `from` to a tile next to `target` (4-neighbour BFS, `isFree` decides
 * which tiles may be entered; the target tile itself is never entered). Returns the tiles to walk in
 * order (excluding `from`), `[]` when already adjacent, or null when unreachable.
 */
export function pathToAdjacent(args: {
  from: { x: number; y: number };
  target: { x: number; y: number };
  isFree: (x: number, y: number) => boolean;
  limit?: number;
}): { x: number; y: number }[] | null {
  const { from, target, isFree } = args;
  const limit = args.limit ?? 40;
  const adjacent = (x: number, y: number) => Math.abs(x - target.x) + Math.abs(y - target.y) === 1;
  if (adjacent(from.x, from.y)) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const previous = new Map<string, string | null>([[key(from.x, from.y), null]]);
  const queue: { x: number; y: number; d: number }[] = [{ ...from, d: 0 }];
  // Prefer straight lines: try the direction that closes the biggest gap first.
  const order = (x: number, y: number): Direction[] => {
    const dx = target.x - x;
    const dy = target.y - y;
    const horizontal: Direction = dx >= 0 ? "east" : "west";
    const vertical: Direction = dy >= 0 ? "south" : "north";
    return Math.abs(dx) >= Math.abs(dy)
      ? [horizontal, vertical, OPPOSITE[vertical], OPPOSITE[horizontal]]
      : [vertical, horizontal, OPPOSITE[horizontal], OPPOSITE[vertical]];
  };
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.d >= limit) continue;
    for (const direction of order(current.x, current.y)) {
      const nx = current.x + DIRS[direction].x;
      const ny = current.y + DIRS[direction].y;
      const id = key(nx, ny);
      if (previous.has(id)) continue;
      if (nx === target.x && ny === target.y) continue;
      if (!isFree(nx, ny)) continue;
      previous.set(id, key(current.x, current.y));
      if (adjacent(nx, ny)) {
        const route: { x: number; y: number }[] = [];
        let cursor: string | null = id;
        while (cursor && cursor !== key(from.x, from.y)) {
          const [cx, cy] = cursor.split(",").map(Number);
          route.unshift({ x: cx, y: cy });
          cursor = previous.get(cursor) ?? null;
        }
        return route;
      }
      queue.push({ x: nx, y: ny, d: current.d + 1 });
    }
  }
  return null;
}

/**
 * Where a rival who "comes to the player" starts: a tile 4-6 steps away (by walking distance),
 * preferring the one farthest away, so the walk-in is visible on screen.
 */
export function pickApproachStart(args: {
  player: { x: number; y: number };
  isFree: (x: number, y: number) => boolean;
  distance?: number;
}): { x: number; y: number } | null {
  const want = args.distance ?? 5;
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Map<string, number>([[key(args.player.x, args.player.y), 0]]);
  const queue = [{ x: args.player.x, y: args.player.y, d: 0 }];
  let best: { x: number; y: number; d: number } | null = null;
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.d > 0 && (best === null || current.d > best.d)) best = current;
    if (current.d >= want) continue;
    for (const direction of ALL) {
      const nx = current.x + DIRS[direction].x;
      const ny = current.y + DIRS[direction].y;
      const id = key(nx, ny);
      if (seen.has(id) || !args.isFree(nx, ny)) continue;
      seen.set(id, current.d + 1);
      queue.push({ x: nx, y: ny, d: current.d + 1 });
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
