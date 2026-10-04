import { describe, expect, it } from "vitest";
import {
  isPokemonStoragePcAt,
  resolveWarpTransitionAt,
  resolveWhiteOutRespawn,
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("Vermilion City services", () => {
  it("registers Vermilion City with its FireRed music and layout", () => {
    expect(WORLD_MAPS["vermilion-city"]).toMatchObject({
      label: "Vermilion City",
      spawn: { x: 24, y: 0 },
      fallbackMusicId: 313,
      layoutUrl: "/game-assets/maps/vermilion-city/layout.json",
      previewUrl: "/game-assets/maps/vermilion-city/preview.png",
    });
  });

  it("connects the full Route 6 overlap to Vermilion", () => {
    for (let routeX = 0; routeX <= 23; routeX += 1) {
      expect(
        resolveWorldTransition(
          "route-6",
          routeX,
          39,
          "south",
        ),
      ).toEqual({
        mapId: "vermilion-city",
        spawn: { x: routeX + 12, y: 0 },
      });
    }

    for (let cityX = 12; cityX <= 35; cityX += 1) {
      expect(
        resolveWorldTransition(
          "vermilion-city",
          cityX,
          0,
          "north",
        ),
      ).toEqual({
        mapId: "route-6",
        spawn: { x: cityX - 12, y: 39 },
      });
    }
  });

  it("connects Center and Mart doors in both directions", () => {
    expect(
      resolveWarpTransitionAt("vermilion-city", 15, 6),
    ).toEqual({
      mapId: "vermilion-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
    expect(
      resolveWarpTransitionAt(
        "vermilion-pokemon-center",
        7,
        8,
      ),
    ).toEqual({
      mapId: "vermilion-city",
      spawn: { x: 15, y: 7 },
    });

    expect(
      resolveWarpTransitionAt("vermilion-city", 29, 17),
    ).toEqual({
      mapId: "vermilion-mart",
      spawn: { x: 4, y: 6 },
    });
    expect(
      resolveWarpTransitionAt("vermilion-mart", 4, 7),
    ).toEqual({
      mapId: "vermilion-city",
      spawn: { x: 29, y: 18 },
    });
  });

  it("uses the Vermilion Center for PC and whiteout persistence", () => {
    expect(
      isPokemonStoragePcAt(
        "vermilion-pokemon-center",
        11,
        1,
      ),
    ).toBe(true);

    expect(
      resolveWhiteOutRespawn("vermilion-city"),
    ).toEqual({
      mapId: "vermilion-pokemon-center",
      spawn: { x: 7, y: 7 },
    });

    expect(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        healLocationId: "vermilion-city",
      }).healLocationId,
    ).toBe("vermilion-city");
  });
});
