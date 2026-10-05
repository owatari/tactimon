import { describe, expect, it } from "vitest";
import {
  GENERATED_MAP_SIZES,
} from "../apps/client/lib/generated/worldMaps";
import {
  WORLD_CONNECTIONS,
  WORLD_WARPS,
} from "../apps/client/lib/generated/worldWarps";
import {
  WORLD_MAPS,
  resolveWarpTransitionAt,
  resolveWorldTransition,
} from "../apps/client/lib/maps";

describe("generated Kanto world", () => {
  it("registers the remaining mainland maps", () => {
    for (const id of [
      "lavender-town",
      "celadon-city",
      "saffron-city",
      "fuchsia-city",
      "cinnabar-island",
      "route-11",
      "pokemon-tower-7f",
      "silph-co-11f",
      "victory-road-3f",
      "pokemon-league-champions-room",
    ]) {
      expect(WORLD_MAPS[id], id).toBeDefined();
    }
    expect(Object.keys(WORLD_MAPS).length).toBeGreaterThan(200);
  });

  it("only warps and connects between registered maps", () => {
    for (const [key, [target]] of Object.entries(WORLD_WARPS)) {
      expect(WORLD_MAPS[key.split(":")[0]], key).toBeDefined();
      expect(WORLD_MAPS[target], key).toBeDefined();
    }
    for (const [mapId, list] of Object.entries(WORLD_CONNECTIONS)) {
      for (const connection of list) {
        expect(WORLD_MAPS[connection.target], mapId).toBeDefined();
        expect(GENERATED_MAP_SIZES[connection.target], mapId).toBeDefined();
      }
    }
  });

  it("walks from Vermilion east into Route 11 and back", () => {
    const [width] = GENERATED_MAP_SIZES["vermilion-city"];
    const connection = WORLD_CONNECTIONS["vermilion-city"].find(
      (entry) => entry.direction === "east",
    )!;
    expect(connection.target).toBe("route-11");
    const y = 15;
    const out = resolveWorldTransition("vermilion-city", width - 1, y, "east");
    expect(out?.mapId).toBe("route-11");
    expect(out?.spawn.x).toBe(0);

    const back = resolveWorldTransition(
      "route-11",
      0,
      out!.spawn.y,
      "west",
    );
    expect(back?.mapId).toBe("vermilion-city");
    expect(back?.spawn).toEqual({ x: width - 1, y });
  });

  it("enters buildings through generated warps", () => {
    const entry = Object.entries(WORLD_WARPS).find(
      ([key]) => key.startsWith("lavender-town:"),
    )!;
    const [x, y] = entry[0].split(":")[1].split(",").map(Number);
    expect(resolveWarpTransitionAt("lavender-town", x, y)?.mapId).toBe(entry[1][0]);
  });
});
