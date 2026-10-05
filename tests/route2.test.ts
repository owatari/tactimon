import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
  MAX_WILD_PACK_SIZE,
  resolveScaledWildEncounter,
  resolveWildPackSize,
} from "../apps/client/lib/wildEncounters";

describe("Route 2", () => {
  it("registers the extracted FireRed layout", () => {
    expect(WORLD_MAPS["route-2"]).toMatchObject({
      label: "Route 2",
      spawn: { x: 9, y: 79 },
      fallbackMusicId: 291,
    });
  });

  it("uses the real Viridian/Route 2 connection offset", () => {
    expect(
      resolveWorldTransition(
        "viridian-city",
        21,
        0,
        "north",
      ),
    ).toEqual({
      mapId: "route-2",
      spawn: { x: 9, y: 79 },
    });

    expect(
      resolveWorldTransition(
        "route-2",
        9,
        79,
        "south",
      ),
    ).toEqual({
      mapId: "viridian-city",
      spawn: { x: 21, y: 0 },
    });
  });

  it("matches FireRed's 21 percent land encounter rate", () => {
    expect(
      LAND_ENCOUNTERS["route-2"].encounterRate,
    ).toBe(21);
  });

  it("preserves the rare Caterpie and Weedle slots", () => {
    expect(resolveLandEncounter("route-2", 90)).toEqual({
      species: "caterpie",
      level: 4,
    });
    expect(resolveLandEncounter("route-2", 94)).toEqual({
      species: "weedle",
      level: 4,
    });
    expect(resolveLandEncounter("route-2", 98)).toEqual({
      species: "caterpie",
      level: 5,
    });
    expect(resolveLandEncounter("route-2", 99)).toEqual({
      species: "weedle",
      level: 5,
    });
  });

  it("keeps the existing Route 1 table intact", () => {
    expect(resolveLandEncounter("route-1", 0)).toEqual({
      species: "pidgey",
      level: 3,
    });
    expect(resolveLandEncounter("route-1", 99)).toEqual({
      species: "rattata",
      level: 4,
    });
  });
});


describe("scaled wild packs", () => {
  const range = { min: 3, max: 5 };
  const rolls = [0, 0.13, 0.37, 0.5, 0.71, 0.99];

  it("gives a single party member in range 1-2 wilds, never a swarm", () => {
    for (const roll of rolls) {
      const size = resolveWildPackSize(range, [5], roll);
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(2);
    }
  });

  it("gives an under-levelled member exactly 1 wild", () => {
    for (const roll of rolls) {
      expect(resolveWildPackSize(range, [2], roll)).toBe(1);
    }
  });

  it("gives an over-levelled (+10) member exactly 2 and a +20 member 2-3", () => {
    for (const roll of rolls) {
      expect(resolveWildPackSize(range, [15], roll)).toBe(2);
      const heavy = resolveWildPackSize(range, [25], roll);
      expect(heavy).toBeGreaterThanOrEqual(2);
      expect(heavy).toBeLessThanOrEqual(3);
    }
  });

  it("sums per party member and caps the pack", () => {
    for (const roll of rolls) {
      const mixed = resolveWildPackSize(range, [2, 15], roll);
      expect(mixed).toBe(3);
      expect(
        resolveWildPackSize(range, [30, 30, 30, 30, 30, 30], roll),
      ).toBe(MAX_WILD_PACK_SIZE);
    }
  });

  it("is deterministic for the same roll", () => {
    expect(resolveWildPackSize(range, [5, 7], 0.42)).toBe(
      resolveWildPackSize(range, [5, 7], 0.42),
    );
  });

  it("first Route 1 encounter with a lone starter has at most 2 wilds", () => {
    for (const roll of rolls) {
      const encounter = resolveScaledWildEncounter("route-1", roll, [5]);
      expect(encounter).not.toBeNull();
      expect(encounter!.members.length).toBeLessThanOrEqual(2);
    }
  });
});
