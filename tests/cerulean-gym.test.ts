import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";
import {
  OVERWORLD_TRAINERS,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";
import {
  resolveOverworldDialogues,
} from "../apps/client/lib/overworldDialogues";

describe("Cerulean Gym progression", () => {
  it("registers the extracted Gym and canonical city warp", () => {
    expect(WORLD_MAPS["cerulean-gym"]).toMatchObject({
      label: "Cerulean Gym",
      spawn: { x: 8, y: 17 },
      fallbackMusicId: 275,
      layoutUrl: "/game-assets/maps/cerulean-gym/layout.json",
      previewUrl: "/game-assets/maps/cerulean-gym/preview.png",
    });

    expect(
      resolveWarpTransitionAt("cerulean-city", 31, 21),
    ).toEqual({
      mapId: "cerulean-gym",
      spawn: { x: 8, y: 17 },
    });
    expect(
      resolveWarpTransitionAt("cerulean-gym", 8, 18),
    ).toEqual({
      mapId: "cerulean-city",
      spawn: { x: 31, y: 22 },
    });
  });

  it("defines Luis, Diana and Misty at their FireRed positions", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(byId.get("cerulean-luis")).toMatchObject({
      mapId: "cerulean-gym",
      preferredPosition: { x: 10, y: 12 },
      sightRange: 1,
      moneyMultiplier: 1,
    });
    expect(byId.get("cerulean-diana")).toMatchObject({
      mapId: "cerulean-gym",
      preferredPosition: { x: 4, y: 7 },
      sightRange: 4,
      moneyMultiplier: 5,
    });
    expect(byId.get("cerulean-misty")).toMatchObject({
      mapId: "cerulean-gym",
      preferredPosition: { x: 8, y: 6 },
      sightRange: 0,
      moneyMultiplier: 25,
      badgeId: "cascade",
    });
  });

  it("uses the canonical trainer parties and payouts", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );
    const luis = byId.get("cerulean-luis")!;
    const diana = byId.get("cerulean-diana")!;
    const misty = byId.get("cerulean-misty")!;

    expect(
      luis.party.map((pokemon) => [pokemon.species, pokemon.level]),
    ).toEqual([
      ["horsea", 16],
      ["shellder", 16],
    ]);
    expect(
      diana.party.map((pokemon) => [pokemon.species, pokemon.level]),
    ).toEqual([["goldeen", 19]]);
    expect([misty.party[0], misty.party[misty.party.length - 1]]).toEqual([
      {
        species: "staryu",
        level: 18,
        moves: ["tackle", "harden", "recover", "water-pulse"],
      },
      {
        species: "starmie",
        level: 21,
        moves: ["swift", "recover", "rapid-spin", "water-pulse"],
      },
    ]);

    expect(trainerPrizeMoney(luis.party, luis.moneyMultiplier)).toBe(64);
    expect(trainerPrizeMoney(diana.party, diana.moneyMultiplier)).toBe(380);
    expect(trainerPrizeMoney(misty.party, misty.moneyMultiplier)).toBe(2100);
  });

  it("persists Cascade Badge and exposes the Gym Guide", () => {
    expect(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        badgeIds: ["boulder", "cascade"],
      }).badgeIds,
    ).toEqual(["boulder", "cascade"]);

    expect(
      resolveOverworldDialogues("cerulean-gym"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cerulean-gym-guy",
          x: 7,
          y: 16,
        }),
      ]),
    );
  });
});
