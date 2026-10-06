import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORLD_MAPS,
  isWorldOpenCell,
  resolveWarpTransitionAt,
} from "../apps/client/lib/maps";

const PUBLIC = new URL("../apps/client/public/", import.meta.url);
const hasAssets = existsSync(
  new URL("game-assets/maps/pallet-town/layout.json", PUBLIC),
);

const SEAFOAM = [
  "seafoam-islands-1f",
  "seafoam-islands-b-1f",
  "seafoam-islands-b-2f",
  "seafoam-islands-b-3f",
  "seafoam-islands-b-4f",
];

type Layout = { width: number; height: number; cells: { collision: number }[] };
const layouts = new Map<string, Layout>();
function layoutOf(mapId: string): Layout {
  let l = layouts.get(mapId);
  if (!l) {
    l = JSON.parse(
      readFileSync(
        new URL(WORLD_MAPS[mapId].layoutUrl.replace(/^\//, ""), PUBLIC),
        "utf-8",
      ),
    ) as Layout;
    layouts.set(mapId, l);
  }
  return l;
}

const NEIGHBOURS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/** Walks (with Surf; currents/boulders ignored) and follows warps; true if it can reach Route 20. */
function canLeaveToRoute20(start: [string, number, number]): boolean {
  const seen = new Set([start.join(",")]);
  const queue = [start];
  while (queue.length) {
    const [mapId, x, y] = queue.pop()!;
    const layout = layoutOf(mapId);
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) continue;
      let next: [string, number, number] | null = null;
      const warp = resolveWarpTransitionAt(mapId, nx, ny);
      if (warp) {
        if (warp.mapId === "route-20") return true;
        if (SEAFOAM.includes(warp.mapId)) next = [warp.mapId, warp.spawn.x, warp.spawn.y];
      } else if (
        layout.cells[ny * layout.width + nx].collision === 0 ||
        isWorldOpenCell(mapId, nx, ny)
      ) {
        next = [mapId, nx, ny];
      }
      if (next && !seen.has(next.join(","))) {
        seen.add(next.join(","));
        queue.push(next);
      }
    }
  }
  return false;
}

describe.skipIf(!hasAssets)("Seafoam Islands soft-lock check", () => {
  it("every warp arrival in Seafoam (incl. B3F 23,9 / 24,9 currents) can still reach Route 20", () => {
    const arrivals = new Map<string, [string, number, number]>();
    for (const mapId of SEAFOAM) {
      const layout = layoutOf(mapId);
      for (let y = 0; y < layout.height; y += 1)
        for (let x = 0; x < layout.width; x += 1) {
          const warp = resolveWarpTransitionAt(mapId, x, y);
          if (warp && SEAFOAM.includes(warp.mapId))
            arrivals.set(`${warp.mapId},${warp.spawn.x},${warp.spawn.y}`, [
              warp.mapId,
              warp.spawn.x,
              warp.spawn.y,
            ]);
        }
    }
    expect(arrivals.size).toBeGreaterThan(20);
    const stuck = [...arrivals.entries()]
      .filter(([, start]) => !canLeaveToRoute20(start))
      .map(([k]) => k);
    expect(stuck).toEqual([]);
  });

  it("B3F current tiles (23,9)/(24,9) lead to B2F, and B2F leads back down to B3F", () => {
    expect(resolveWarpTransitionAt("seafoam-islands-b-3f", 23, 9)?.mapId).toBe("seafoam-islands-b-2f");
    expect(resolveWarpTransitionAt("seafoam-islands-b-3f", 24, 9)?.mapId).toBe("seafoam-islands-b-2f");
    expect(resolveWarpTransitionAt("seafoam-islands-b-2f", 24, 8)?.mapId).toBe("seafoam-islands-b-3f");
    expect(resolveWarpTransitionAt("seafoam-islands-b-2f", 27, 8)?.mapId).toBe("seafoam-islands-b-3f");
  });
});
