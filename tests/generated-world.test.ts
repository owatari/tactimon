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

describe("generated Kanto content", () => {
  it("adds encounters, pickups, marts and heal points for new areas", async () => {
    const { LAND_ENCOUNTERS, resolveAreaWildLevel } = await import("../apps/client/lib/wildEncounters");
    const { OVERWORLD_PICKUPS } = await import("../apps/client/lib/overworldPickups");
    const { MART_STOCK } = await import("../apps/client/lib/mart");
    const { HEAL_LOCATIONS } = await import("../apps/client/lib/healLocations");
    const { resolveWhiteOutRespawn } = await import("../apps/client/lib/maps");

    expect(LAND_ENCOUNTERS["route-11"]?.slots.length).toBe(12);
    expect(resolveAreaWildLevel("route-12")).toBeGreaterThan(10);
    expect(OVERWORLD_PICKUPS.some((p) => p.mapId === "pokemon-tower-3f" || p.mapId === "rocket-hideout-b-1f")).toBe(true);
    expect(OVERWORLD_PICKUPS.every((p) => !/^tm\d|berry/i.test(p.itemName))).toBe(true);
    expect(MART_STOCK["celadon-city-department-store-5f@1,7"] ?? MART_STOCK["celadon-city-department-store-5f@1,6"]).toBeDefined();
    expect(MART_STOCK["fuchsia-city-mart"].length).toBeGreaterThan(3);
    for (const heal of HEAL_LOCATIONS) {
      expect(WORLD_MAPS[heal.centerMapId], heal.id).toBeDefined();
      expect(resolveWhiteOutRespawn(heal.id).mapId).toBe(heal.centerMapId);
    }
  });
});

describe("generated Kanto text", () => {
  it("serves NPC and sign text for imported maps", async () => {
    const { GENERATED_NPC_TEXT, GENERATED_SIGN_TEXT } = await import("../apps/client/lib/generated/worldTexts");
    const { resolveWorldNpcPages, resolveWorldSignPages } = await import("../apps/client/lib/worldTexts");

    expect(Object.keys(GENERATED_NPC_TEXT).length).toBeGreaterThan(150);
    expect(Object.keys(GENERATED_SIGN_TEXT).length).toBeGreaterThan(150);
    for (const key of [...Object.keys(GENERATED_NPC_TEXT), ...Object.keys(GENERATED_SIGN_TEXT)]) {
      expect(WORLD_MAPS[key.split(":")[0]], key).toBeDefined();
    }
    const [npcKey] = Object.keys(GENERATED_NPC_TEXT);
    const [map, xy] = npcKey.split(":");
    const [x, y] = xy.split(",").map(Number);
    expect(resolveWorldNpcPages(map, x, y)).toEqual(GENERATED_NPC_TEXT[npcKey]);
    const [signKey] = Object.keys(GENERATED_SIGN_TEXT);
    const [smap, sxy] = signKey.split(":");
    const [sx, sy] = sxy.split(",").map(Number);
    expect(resolveWorldSignPages(smap, sx, sy)).toEqual(GENERATED_SIGN_TEXT[signKey]);
  });
});
