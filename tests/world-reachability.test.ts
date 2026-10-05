import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORLD_MAPS,
  resolveWarpTransitionAt,
  isWorldOpenCell,
  resolveWorldTransition,
  type Direction,
} from "../apps/client/lib/maps";

const PUBLIC = new URL("../apps/client/public/", import.meta.url);
const hasAssets = existsSync(
  new URL("game-assets/maps/pallet-town/layout.json", PUBLIC),
);

type Layout = {
  width: number;
  height: number;
  cells: { metatile: number; collision: number }[];
};

const layoutCache = new Map<string, Layout>();
const attrCache = new Map<string, Uint8Array>();

function readPublic(url: string): Buffer {
  return readFileSync(new URL(url.replace(/^\//, ""), PUBLIC));
}

function layoutOf(mapId: string): Layout {
  let layout = layoutCache.get(mapId);
  if (!layout) {
    layout = JSON.parse(
      readPublic(WORLD_MAPS[mapId].layoutUrl).toString("utf-8"),
    ) as Layout;
    layoutCache.set(mapId, layout);
  }
  return layout;
}

function attributes(url: string): Uint8Array {
  let data = attrCache.get(url);
  if (!data) {
    data = new Uint8Array(readPublic(url));
    attrCache.set(url, data);
  }
  return data;
}

function behaviorOf(mapId: string, metatile: number): number {
  const def = WORLD_MAPS[mapId];
  const primary = metatile < 640;
  const data = attributes(
    (primary ? def.tilesets.primary : def.tilesets.secondary)
      .attributesUrl,
  );
  const index = (primary ? metatile : metatile - 640) * 4;
  if (index + 1 >= data.length) return 0;
  return (data[index] | (data[index + 1] << 8)) & 0x1ff;
}

function isWater(mapId: string, metatile: number): boolean {
  const behavior = behaviorOf(mapId, metatile);
  return behavior >= 0x10 && behavior <= 0x15;
}

const JUMP: Record<Direction, number> = {
  east: 0x38,
  west: 0x39,
  north: 0x3a,
  south: 0x3b,
};

const DIRS: [Direction, number, number][] = [
  ["north", 0, -1],
  ["south", 0, 1],
  ["west", -1, 0],
  ["east", 1, 0],
];

function reachable(surf: boolean): Set<string> {
  const seen = new Set<string>();
  const visitedMaps = new Set<string>();
  const queue: [string, number, number][] = [["pallet-town", 12, 17]];
  const key = (m: string, x: number, y: number) => `${m}:${x},${y}`;
  seen.add(key(...queue[0]));

  while (queue.length) {
    const [mapId, x, y] = queue.pop()!;
    visitedMaps.add(mapId);
    const layout = layoutOf(mapId);
    for (const [dir, dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      let next: [string, number, number] | null = null;
      if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) {
        const t = resolveWorldTransition(mapId, x, y, dir);
        if (t) next = [t.mapId, t.spawn.x, t.spawn.y];
      } else {
        const warp = resolveWarpTransitionAt(mapId, nx, ny);
        if (warp) {
          next = [warp.mapId, warp.spawn.x, warp.spawn.y];
        } else {
          const cell = layout.cells[ny * layout.width + nx];
          const lx = nx + dx;
          const ly = ny + dy;
          const landing =
            lx >= 0 && ly >= 0 && lx < layout.width && ly < layout.height
              ? layout.cells[ly * layout.width + lx]
              : null;
          if (
            behaviorOf(mapId, cell.metatile) === JUMP[dir] &&
            landing &&
            landing.collision === 0
          ) {
            next = [mapId, lx, ly];
          } else if (
            (cell.collision === 0 || isWorldOpenCell(mapId, nx, ny)) &&
            (surf || !isWater(mapId, cell.metatile))
          ) {
            next = [mapId, nx, ny];
          }
        }
      }
      if (next && WORLD_MAPS[next[0]]) {
        const k = key(...next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      }
    }
  }
  return visitedMaps;
}

describe.skipIf(!hasAssets)("world reachability", () => {
  it("reaches the whole mainland from Pallet Town (ignoring story gates)", () => {
    const withSurf = reachable(true);
    const unreachable = Object.keys(WORLD_MAPS).filter(
      (id) => !withSurf.has(id),
    );
    // The Mansion's statue-switch barriers count as open (switches can always be toggled).
    expect(unreachable).toEqual([]);
    expect(withSurf.has("indigo-plateau-exterior")).toBe(true);
    expect(withSurf.has("pokemon-league-champions-room")).toBe(true);
    expect(withSurf.has("cinnabar-island")).toBe(true);
  });

  it("keeps Cinnabar behind Surf", () => {
    const walking = reachable(false);
    expect(walking.has("cinnabar-island")).toBe(false);
    expect(walking.has("lavender-town")).toBe(true);
  });
});

describe.skipIf(!hasAssets)("pokemon mansion switch puzzle", () => {
  it("can be solved: B1F is reachable by toggling the statue switches", async () => {
    const { MANSION_BARRIERS, MANSION_SWITCHES } = await import(
      "../apps/client/lib/generated/worldObstacles"
    );
    const barrier = new Map(
      MANSION_BARRIERS.map((b) => [`${b.mapId}:${b.x},${b.y}`, b.openIn]),
    );
    const switches = new Set(
      MANSION_SWITCHES.map((s) => `${s.mapId}:${s.x},${s.y}`),
    );

    const entry = resolveWarpTransitionAt("cinnabar-island", 8, 3);
    expect(entry?.mapId).toBe("pokemon-mansion-1f");

    type Node = [string, number, number, "a" | "b"];
    const start: Node = [entry!.mapId, entry!.spawn.x, entry!.spawn.y, "a"];
    const seen = new Set([start.join("|")]);
    const queue: Node[] = [start];
    const maps = new Set<string>();

    while (queue.length) {
      const [mapId, x, y, state] = queue.pop()!;
      maps.add(mapId);
      const layout = layoutOf(mapId);
      const push = (node: Node) => {
        if (!WORLD_MAPS[node[0]] || !node[0].startsWith("pokemon-mansion")) {
          return; // stay inside the Mansion
        }
        const k = node.join("|");
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(node);
        }
      };

      for (const [, dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) {
          continue;
        }
        const id = `${mapId}:${nx},${ny}`;
        if (switches.has(id)) {
          push([mapId, x, y, state === "a" ? "b" : "a"]);
          continue;
        }
        if (barrier.has(id) && barrier.get(id) !== state) continue;

        const warp = resolveWarpTransitionAt(mapId, nx, ny);
        if (warp) {
          push([warp.mapId, warp.spawn.x, warp.spawn.y, state]);
          continue;
        }
        const cell = layout.cells[ny * layout.width + nx];
        if (cell.collision === 0 || isWorldOpenCell(mapId, nx, ny)) {
          push([mapId, nx, ny, state]);
        }
      }
    }

    expect(maps.has("pokemon-mansion-b-1f")).toBe(true);
  });
});
