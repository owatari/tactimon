import { describe, expect, it } from "vitest";
import {
  isPokemonStoragePcAt,
  resolveWarpTransitionAt,
  resolveWhiteOutRespawn,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("Cerulean services", () => {
  it("registers the Pokémon Center and Poké Mart interiors", () => {
    expect(WORLD_MAPS["cerulean-pokemon-center"]).toMatchObject({
      label: "Cerulean Pokémon Center",
      spawn: { x: 7, y: 7 },
      fallbackMusicId: 303,
    });
    expect(WORLD_MAPS["cerulean-mart"]).toMatchObject({
      label: "Cerulean Poké Mart",
      spawn: { x: 4, y: 6 },
      fallbackMusicId: 303,
    });
  });

  it("connects the canonical city doors in both directions", () => {
    expect(resolveWarpTransitionAt("cerulean-city", 22, 19)).toEqual({
      mapId: "cerulean-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
    expect(
      resolveWarpTransitionAt("cerulean-pokemon-center", 7, 8),
    ).toEqual({
      mapId: "cerulean-city",
      spawn: { x: 22, y: 20 },
    });

    expect(resolveWarpTransitionAt("cerulean-city", 29, 28)).toEqual({
      mapId: "cerulean-mart",
      spawn: { x: 4, y: 6 },
    });
    expect(resolveWarpTransitionAt("cerulean-mart", 4, 7)).toEqual({
      mapId: "cerulean-city",
      spawn: { x: 29, y: 29 },
    });
  });

  it("uses the Cerulean Center as a persistent whiteout checkpoint with PC", () => {
    expect(resolveWhiteOutRespawn("cerulean-city")).toEqual({
      mapId: "cerulean-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
    expect(
      isPokemonStoragePcAt("cerulean-pokemon-center", 11, 1),
    ).toBe(true);

    expect(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        healLocationId: "cerulean-city",
      }).healLocationId,
    ).toBe("cerulean-city");
  });
});
