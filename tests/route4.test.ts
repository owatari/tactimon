import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";

describe("Route 4 west of Mt. Moon", () => {
  it("registers the extracted Route 4 layout with canonical music", () => {
    expect(WORLD_MAPS["route-4"]).toMatchObject({
      label: "Route 4",
      spawn: { x: 11, y: 19 },
      fallbackMusicId: 293,
      layoutUrl: "/game-assets/maps/route-4/layout.json",
      previewUrl: "/game-assets/maps/route-4/preview.png",
    });
  });

  it("uses FireRed's eight-tile Route 3/Route 4 connection", () => {
    for (let route3X = 68; route3X <= 75; route3X += 1) {
      expect(
        resolveWorldTransition(
          "route-3",
          route3X,
          0,
          "north",
        ),
      ).toEqual({
        mapId: "route-4",
        spawn: { x: route3X - 60, y: 19 },
      });
    }

    for (let route4X = 8; route4X <= 15; route4X += 1) {
      expect(
        resolveWorldTransition(
          "route-4",
          route4X,
          19,
          "south",
        ),
      ).toEqual({
        mapId: "route-3",
        spawn: { x: route4X + 60, y: 0 },
      });
    }
  });

  it("matches FireRed's 21 percent Route 4 land table", () => {
    expect(
      LAND_ENCOUNTERS["route-4"].encounterRate,
    ).toBe(21);

    expect(resolveLandEncounter("route-4", 0)).toEqual({
      species: "spearow",
      level: 10,
    });
    expect(resolveLandEncounter("route-4", 40)).toEqual({
      species: "ekans",
      level: 6,
    });
    expect(resolveLandEncounter("route-4", 90)).toEqual({
      species: "mankey",
      level: 10,
    });
    expect(resolveLandEncounter("route-4", 99)).toEqual({
      species: "ekans",
      level: 12,
    });
  });

  it("opens the canonical Mt. Moon entrance", () => {
    expect(
      resolveWarpTransitionAt("route-4", 19, 5),
    ).toEqual({
      mapId: "mt-moon-1f",
      spawn: { x: 18, y: 37 },
    });
  });
});
