import { resolveWarpTransitionAt, resolveWorldTransition } from "../maps";
import { DIRS, type PlanExit } from "./planner";

const cache = new Map<string, PlanExit[]>();

/**
 * Every way out of a map: border cells that continue into a neighbour map, and the neighbours of
 * every warp tile (door, stairs, cave mouth) — stand there and walk toward the warp.
 */
export function mapExits(mapId: string, width: number, height: number): PlanExit[] {
  const key = `${mapId}:${width}x${height}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const exits: PlanExit[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const warp = resolveWarpTransitionAt(mapId, x, y);
      if (warp) {
        for (const { dir, dx, dy } of DIRS) {
          const ax = x - dx;
          const ay = y - dy;
          if (ax >= 0 && ay >= 0 && ax < width && ay < height) exits.push({ x: ax, y: ay, dir, to: warp.mapId });
        }
      }
      for (const { dir, dx, dy } of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) continue;
        const edge = resolveWorldTransition(mapId, x, y, dir);
        if (edge) exits.push({ x, y, dir, to: edge.mapId });
      }
    }
  }
  cache.set(key, exits);
  return exits;
}
