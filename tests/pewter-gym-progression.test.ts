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
  registerStoryHealLocation,
} from "../apps/client/lib/story";
import {
  OVERWORLD_TRAINERS,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";

describe("Pewter Gym progression", () => {
  it("registers Pewter facilities and the extracted Gym", () => {
    expect(WORLD_MAPS["pewter-pokemon-center"]).toMatchObject({
      spawn: { x: 7, y: 7 },
      fallbackMusicId: 303,
    });
    expect(WORLD_MAPS["pewter-mart"]).toMatchObject({
      spawn: { x: 4, y: 6 },
      fallbackMusicId: 303,
    });
    expect(WORLD_MAPS["pewter-gym"]).toMatchObject({
      spawn: { x: 6, y: 13 },
      fallbackMusicId: 275,
    });
  });

  it("connects the real Pewter City facility doors", () => {
    expect(resolveWarpTransitionAt("pewter-city", 15, 16)).toEqual({
      mapId: "pewter-gym",
      spawn: { x: 6, y: 13 },
    });
    expect(resolveWarpTransitionAt("pewter-gym", 6, 14)).toEqual({
      mapId: "pewter-city",
      spawn: { x: 15, y: 17 },
    });
    expect(resolveWarpTransitionAt("pewter-city", 17, 25)).toEqual({
      mapId: "pewter-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
    expect(resolveWarpTransitionAt("pewter-city", 28, 18)).toEqual({
      mapId: "pewter-mart",
      spawn: { x: 4, y: 6 },
    });
  });

  it("uses Pewter Center for storage and whiteout after registering it", () => {
    expect(
      isPokemonStoragePcAt(
        "pewter-pokemon-center",
        11,
        1,
      ),
    ).toBe(true);

    const healed = registerStoryHealLocation(
      DEFAULT_STORY_STATE,
      "pewter-city",
    );
    expect(healed.healLocationId).toBe("pewter-city");
    expect(
      resolveWhiteOutRespawn(healed.healLocationId),
    ).toEqual({
      mapId: "pewter-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
  });

  it("normalizes Boulder Badge persistence", () => {
    expect(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        badgeIds: ["boulder"],
      }).badgeIds,
    ).toEqual(["boulder"]);
  });

  it("defines Brock's FireRed roster and prize money", () => {
    const brock = OVERWORLD_TRAINERS.find(
      (trainer) => trainer.id === "pewter-brock",
    )!;

    expect(brock.mapId).toBe("pewter-gym");
    expect(brock.preferredPosition).toEqual({
      x: 6,
      y: 5,
    });
    expect(brock.badgeId).toBe("boulder");
    expect([...brock.party.slice(0, 1), brock.party[brock.party.length - 1]]).toEqual([
      {
        species: "geodude",
        level: 12,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "onix",
        level: 14,
        moves: ["tackle", "bind", "rock-tomb"],
      },
    ]);
    expect(
      trainerPrizeMoney(
        brock.party,
        brock.moneyMultiplier,
      ),
    ).toBe(1400);
  });
});
