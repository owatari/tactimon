import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";

describe("Viridian Forest route", () => {
  it("registers both gates and the extracted forest layout", () => {
    expect(
      WORLD_MAPS["route-2-forest-south-entrance"],
    ).toMatchObject({
      spawn: { x: 7, y: 9 },
      fallbackMusicId: 314,
    });
    expect(WORLD_MAPS["viridian-forest"]).toMatchObject({
      label: "Viridian Forest",
      spawn: { x: 29, y: 61 },
      fallbackMusicId: 287,
    });
    expect(
      WORLD_MAPS["route-2-forest-north-entrance"],
    ).toMatchObject({
      spawn: { x: 7, y: 9 },
      fallbackMusicId: 314,
    });
  });

  it("connects lower Route 2 through the south gate", () => {
    expect(
      resolveWarpTransitionAt("route-2", 5, 51),
    ).toEqual({
      mapId: "route-2-forest-south-entrance",
      spawn: { x: 7, y: 9 },
    });
    expect(
      resolveWarpTransitionAt(
        "route-2-forest-south-entrance",
        7,
        1,
      ),
    ).toEqual({
      mapId: "viridian-forest",
      spawn: { x: 29, y: 61 },
    });
  });

  it("connects the north forest exit back to upper Route 2", () => {
    expect(
      resolveWarpTransitionAt(
        "viridian-forest",
        5,
        9,
      ),
    ).toEqual({
      mapId: "route-2-forest-north-entrance",
      spawn: { x: 7, y: 9 },
    });
    expect(
      resolveWarpTransitionAt(
        "route-2-forest-north-entrance",
        7,
        1,
      ),
    ).toEqual({
      mapId: "route-2",
      spawn: { x: 6, y: 12 },
    });
  });

  it("uses FireRed's 14 percent forest encounter rate", () => {
    expect(
      LAND_ENCOUNTERS["viridian-forest"].encounterRate,
    ).toBe(14);
  });

  it("preserves cocoon and Pikachu encounter slots", () => {
    expect(
      resolveLandEncounter("viridian-forest", 80),
    ).toEqual({
      species: "metapod",
      level: 5,
    });
    expect(
      resolveLandEncounter("viridian-forest", 85),
    ).toEqual({
      species: "kakuna",
      level: 5,
    });
    expect(
      resolveLandEncounter("viridian-forest", 94),
    ).toEqual({
      species: "pikachu",
      level: 3,
    });
    expect(
      resolveLandEncounter("viridian-forest", 99),
    ).toEqual({
      species: "pikachu",
      level: 5,
    });
  });
});
