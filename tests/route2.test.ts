import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
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
