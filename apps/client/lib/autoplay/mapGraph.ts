import { mapExits } from "./exits";
import type { PlanExit } from "./planner";

export type MapSize = { width: number; height: number };
export type MapSizeLoader = (mapId: string) => Promise<MapSize | null>;

/**
 * The world as a graph of maps: nodes are maps, edges are the exits found by `mapExits` (borders and
 * warps). The bot routes between far away maps with a breadth-first search over this graph and walks
 * each hop with the local planner. Layout sizes load lazily (one small fetch per map, cached).
 */
export class MapGraph {
  private sizes = new Map<string, MapSize | null>();
  private exitCache = new Map<string, PlanExit[]>();
  /** Edges that did not work (a guard, a tree, a locked door): `${from}>${to}`. Cleared when the story moves on. */
  private blocked = new Set<string>();

  constructor(
    private load: MapSizeLoader,
    private knownMaps: () => readonly string[],
  ) {}

  /** Loads every map's size (done once, in parallel) so routing is synchronous afterwards. */
  async preload(): Promise<void> {
    await Promise.all(
      this.knownMaps().map(async (mapId) => {
        if (!this.sizes.has(mapId)) this.sizes.set(mapId, await this.load(mapId).catch(() => null));
      }),
    );
  }

  ready(): boolean {
    return this.knownMaps().every((mapId) => this.sizes.has(mapId));
  }

  /** Test helper: registers a size without loading. */
  setSize(mapId: string, size: MapSize): void {
    this.sizes.set(mapId, size);
    this.exitCache.delete(mapId);
  }

  exitsOf(mapId: string): PlanExit[] {
    const cached = this.exitCache.get(mapId);
    if (cached) return cached;
    const size = this.sizes.get(mapId);
    const exits = size ? mapExits(mapId, size.width, size.height) : [];
    this.exitCache.set(mapId, exits);
    return exits;
  }

  block(from: string, to: string): void {
    this.blocked.add(`${from}>${to}`);
  }

  clearBlocked(): void {
    this.blocked.clear();
  }

  isBlocked(from: string, to: string): boolean {
    return this.blocked.has(`${from}>${to}`);
  }

  /** The maps to cross, from `from` to `to` (inclusive), fewest hops first; null when no route exists. */
  route(from: string, to: string): string[] | null {
    if (from === to) return [from];
    const previous = new Map<string, string>();
    const queue = [from];
    const seen = new Set([from]);
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      const targets = [...new Set(this.exitsOf(current).map((exit) => exit.to))].sort();
      for (const next of targets) {
        if (seen.has(next) || this.isBlocked(current, next)) continue;
        seen.add(next);
        previous.set(next, current);
        if (next === to) {
          const path = [to];
          let cursor = to;
          while (cursor !== from) {
            cursor = previous.get(cursor)!;
            path.unshift(cursor);
          }
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  }

  /** The exits of `from` that lead straight to `to`. */
  exitsTo(from: string, to: string): PlanExit[] {
    return this.exitsOf(from).filter((exit) => exit.to === to);
  }
}
