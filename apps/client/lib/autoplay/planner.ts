/**
 * Auto Player brain for the overworld: pure functions over a snapshot of the world, so the logic can be
 * unit tested on synthetic grids and the browser only has to execute the returned action.
 *
 * Strategy ("explore and talk to everyone"): talk to every NPC / object of the map once per story
 * epoch, then leave through the exit that has been used the least, preferring maps never visited.
 * The story epoch changes whenever the save's progress signature changes (an event, a badge, a key
 * item...), which makes everything worth talking to again: that is how gates open without a script.
 */
export type Dir = "north" | "south" | "west" | "east";

export const DIRS: readonly { dir: Dir; dx: number; dy: number }[] = [
  { dir: "north", dx: 0, dy: -1 },
  { dir: "south", dx: 0, dy: 1 },
  { dir: "west", dx: -1, dy: 0 },
  { dir: "east", dx: 1, dy: 0 },
];

export type PlanObject = { id: string; kind: string; x: number; y: number };

/** Leaving the map: stand on (x, y) and walk `dir`. */
export type PlanExit = { x: number; y: number; dir: Dir; to: string };

export type PlanWorld = {
  mapId: string;
  width: number;
  height: number;
  x: number;
  y: number;
  facing: Dir;
  /** True when the player can step onto the cell right now (map collision, water, NPCs...). */
  walkable: (x: number, y: number) => boolean;
  objects: readonly PlanObject[];
  exits: readonly PlanExit[];
  /** A shop / nurse counter: the game lets you talk across one counter tile. */
  isCounter?: (x: number, y: number) => boolean;
  /** Cells where wild Pokémon can appear (tall grass, cave floor, water when surfing). */
  isEncounter?: (x: number, y: number) => boolean;
  /** The team is too weak for what comes next: walk around in the grass to level up. */
  grind?: boolean;
};

export type BotMemory = {
  /** `${epoch}:${mapId}:${objectId}` of everything already talked to. */
  interacted: Set<string>;
  /** `${mapId}:${x},${y},${dir}` -> times that exit was taken. */
  exitUses: Map<string, number>;
  visitedMaps: Set<string>;
  epoch: number;
  signature: string;
  /** The cell the grinding walk just left. */
  lastGrindCell: string;
};

export function createMemory(): BotMemory {
  return { interacted: new Set(), exitUses: new Map(), visitedMaps: new Set(), epoch: 0, signature: "", lastGrindCell: "" };
}

/** A new signature means the story moved on: everything is worth another visit. */
export function observeStory(memory: BotMemory, signature: string): void {
  if (memory.signature !== signature) {
    memory.signature = signature;
    memory.epoch += 1;
  }
}

const interactedKey = (memory: BotMemory, mapId: string, objectId: string) => `${memory.epoch}:${mapId}:${objectId}`;
const exitKey = (mapId: string, exit: PlanExit) => `${mapId}:${exit.x},${exit.y},${exit.dir}`;

export function markInteracted(memory: BotMemory, mapId: string, objectId: string): void {
  memory.interacted.add(interactedKey(memory, mapId, objectId));
}

/** Forget everything already talked to in a map (this epoch), so the planner visits it all again. */
export function forgetMap(memory: BotMemory, mapId: string): void {
  const prefix = `${memory.epoch}:${mapId}:`;
  for (const key of [...memory.interacted]) if (key.startsWith(prefix)) memory.interacted.delete(key);
}

export function markExitUsed(memory: BotMemory, mapId: string, exit: PlanExit): void {
  const key = exitKey(mapId, exit);
  memory.exitUses.set(key, (memory.exitUses.get(key) ?? 0) + 1);
}

export type Step = { x: number; y: number; dir: Dir };

/** Shortest walk (BFS) from the player to any cell accepted by `goal`; the result lists the steps to take. */
export function findPath(
  world: PlanWorld,
  goal: (x: number, y: number) => boolean,
  options: { maxNodes?: number } = {},
): Step[] | null {
  const key = (x: number, y: number) => y * world.width + x;
  const start = key(world.x, world.y);
  if (goal(world.x, world.y)) return [];
  const previous = new Map<number, { from: number; dir: Dir }>();
  const seen = new Set<number>([start]);
  const queue: number[] = [start];
  const limit = options.maxNodes ?? world.width * world.height;
  for (let head = 0; head < queue.length && head < limit; head += 1) {
    const current = queue[head];
    const cx = current % world.width;
    const cy = Math.floor(current / world.width);
    for (const { dir, dx, dy } of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const next = key(nx, ny);
      if (seen.has(next) || !world.walkable(nx, ny)) continue;
      seen.add(next);
      previous.set(next, { from: current, dir });
      if (goal(nx, ny)) {
        const steps: Step[] = [];
        let cursor = next;
        while (cursor !== start) {
          const link = previous.get(cursor)!;
          steps.unshift({ x: cursor % world.width, y: Math.floor(cursor / world.width), dir: link.dir });
          cursor = link.from;
        }
        return steps;
      }
      queue.push(next);
    }
  }
  return null;
}

export type BotAction =
  | { kind: "move"; dir: Dir; goal: string }
  | { kind: "face"; dir: Dir; goal: string }
  | { kind: "interact"; objectId: string; goal: string }
  | { kind: "leave"; exit: PlanExit; goal: string }
  | { kind: "idle"; goal: string };

/** Cells to stand on to talk to the object at (ox, oy): next to it, or across one counter tile. */
export function standingCells(world: PlanWorld, ox: number, oy: number): { x: number; y: number; face: Dir }[] {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < world.width && y < world.height;
  const open = (x: number, y: number) => world.walkable(x, y) || (x === world.x && y === world.y);
  const cells: { x: number; y: number; face: Dir }[] = [];
  for (const { dir, dx, dy } of DIRS) {
    const near = { x: ox - dx, y: oy - dy };
    if (inside(near.x, near.y) && open(near.x, near.y)) cells.push({ ...near, face: dir });
    else if (inside(near.x, near.y) && world.isCounter?.(near.x, near.y)) {
      const far = { x: ox - 2 * dx, y: oy - 2 * dy };
      if (inside(far.x, far.y) && open(far.x, far.y)) cells.push({ ...far, face: dir });
    }
  }
  return cells;
}

const delta = (dir: Dir) => DIRS.find((entry) => entry.dir === dir)!;

/** The object right in front of the player, if the game would let `interact` reach it. */
function objectAhead(world: PlanWorld, objects: readonly PlanObject[]): PlanObject | null {
  const { dx, dy } = delta(world.facing);
  const ahead = { x: world.x + dx, y: world.y + dy };
  return (
    objects.find((object) => object.x === ahead.x && object.y === ahead.y) ??
    // Counters: a clerk / nurse behind one tile of counter is still reachable.
    objects.find((object) => object.x === ahead.x + dx && object.y === ahead.y + dy && !world.walkable(ahead.x, ahead.y)) ??
    null
  );
}

/**
 * Decides the next micro action. `exitsTaken` bias: exits to maps never seen win, then the least used.
 * Returns an `idle` action with a reason when nothing is reachable (the runtime logs it as a stall hint).
 */
export function nextAction(world: PlanWorld, memory: BotMemory): BotAction {
  memory.visitedMaps.add(world.mapId);

  // 0. Weak team: pace back and forth over encounter cells (every step may start a wild fight).
  if (world.grind && world.isEncounter) {
    const encounter = world.isEncounter;
    if (encounter(world.x, world.y)) {
      const neighbours = DIRS.filter(({ dx, dy }) => world.walkable(world.x + dx, world.y + dy) && encounter(world.x + dx, world.y + dy));
      if (neighbours.length > 0) {
        // Prefer the neighbour we did not just come from, so the pacing does not stall on one tile.
        const previous = memory.lastGrindCell;
        const pick = neighbours.find(({ dx, dy }) => `${world.x + dx},${world.y + dy}` !== previous) ?? neighbours[0];
        memory.lastGrindCell = `${world.x},${world.y}`;
        return { kind: "move", dir: pick.dir, goal: "grind in the grass" };
      }
    }
    const path = findPath(world, (x, y) => encounter(x, y));
    if (path && path.length > 0) return { kind: "move", dir: path[0].dir, goal: "walk to the grass to train" };
  }

  const pending = world.objects.filter((object) => !memory.interacted.has(interactedKey(memory, world.mapId, object.id)));

  // 1. Talk to what we are facing.
  const ahead = objectAhead(world, pending);
  if (ahead) return { kind: "interact", objectId: ahead.id, goal: `talk to ${ahead.kind} ${ahead.id}` };

  // 2. Walk to the nearest pending object.
  let best: { steps: Step[]; object: PlanObject; face: Dir } | null = null;
  for (const object of pending) {
    const standing = standingCells(world, object.x, object.y);
    if (standing.length === 0) continue;
    const path = findPath(world, (x, y) => standing.some((cell) => cell.x === x && cell.y === y));
    if (!path) continue;
    const arrival = path.length > 0 ? path[path.length - 1] : { x: world.x, y: world.y };
    const face = standing.find((cell) => cell.x === arrival.x && cell.y === arrival.y)!.face;
    if (!best || path.length < best.steps.length) best = { steps: path, object, face };
  }
  if (best) {
    if (best.steps.length === 0) {
      if (world.facing !== best.face) return { kind: "face", dir: best.face, goal: `face ${best.object.id}` };
      return { kind: "interact", objectId: best.object.id, goal: `talk to ${best.object.kind} ${best.object.id}` };
    }
    return { kind: "move", dir: best.steps[0].dir, goal: `go talk to ${best.object.kind} ${best.object.id}` };
  }

  // 3. Leave through the least used exit (never-visited maps first).
  const ranked = [...world.exits].sort((a, b) => {
    const unseen = (exit: PlanExit) => (memory.visitedMaps.has(exit.to) ? 1 : 0);
    return (
      unseen(a) - unseen(b) ||
      (memory.exitUses.get(exitKey(world.mapId, a)) ?? 0) - (memory.exitUses.get(exitKey(world.mapId, b)) ?? 0) ||
      a.to.localeCompare(b.to) ||
      a.x - b.x ||
      a.y - b.y
    );
  });
  for (const exit of ranked) {
    if (world.x === exit.x && world.y === exit.y) {
      return { kind: "leave", exit, goal: `leave to ${exit.to}` };
    }
    const path = findPath(world, (x, y) => x === exit.x && y === exit.y);
    if (path) return { kind: "move", dir: path[0].dir, goal: `walk to the exit for ${exit.to}` };
  }
  return { kind: "idle", goal: "nothing reachable" };
}
