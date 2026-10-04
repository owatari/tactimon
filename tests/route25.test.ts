import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  OVERWORLD_TRAINERS,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";
import {
  resolveOverworldPickups,
} from "../apps/client/lib/overworldPickups";

describe("Route 25", () => {
  it("registers the extracted FireRed route and connects it to Route 24", () => {
    expect(WORLD_MAPS["route-25"]).toMatchObject({
      label: "Route 25",
      spawn: { x: 0, y: 10 },
      fallbackMusicId: 292,
      layoutUrl: "/game-assets/maps/route-25/layout.json",
      previewUrl: "/game-assets/maps/route-25/preview.png",
    });

    for (let y = 0; y <= 19; y += 1) {
      expect(
        resolveWorldTransition(
          "route-24",
          23,
          y,
          "east",
        ),
      ).toEqual({
        mapId: "route-25",
        spawn: { x: 0, y },
      });

      expect(
        resolveWorldTransition(
          "route-25",
          0,
          y,
          "west",
        ),
      ).toEqual({
        mapId: "route-24",
        spawn: { x: 23, y },
      });
    }
  });

  it("matches FireRed's Route 25 land table", () => {
    expect(
      LAND_ENCOUNTERS["route-25"].encounterRate,
    ).toBe(21);

    expect(resolveLandEncounter("route-25", 0)).toEqual({
      species: "weedle",
      level: 8,
    });
    expect(resolveLandEncounter("route-25", 40)).toEqual({
      species: "pidgey",
      level: 13,
    });
    expect(resolveLandEncounter("route-25", 50)).toEqual({
      species: "oddish",
      level: 14,
    });
    expect(resolveLandEncounter("route-25", 70)).toEqual({
      species: "abra",
      level: 11,
    });
    expect(resolveLandEncounter("route-25", 94)).toEqual({
      species: "abra",
      level: 9,
    });
    expect(resolveLandEncounter("route-25", 99)).toEqual({
      species: "abra",
      level: 13,
    });
  });

  it("places all nine FireRed trainers at their route events", () => {
    const route25 = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "route-25",
    );

    expect(route25).toHaveLength(9);
    expect(
      route25.map((trainer) => [
        trainer.id,
        trainer.preferredPosition,
        trainer.sightRange,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["route25-franklin", { x: 11, y: 4 }, 4],
        ["route25-joey", { x: 18, y: 2 }, 2],
        ["route25-wayne", { x: 17, y: 7 }, 2],
        ["route25-dan", { x: 22, y: 4 }, 2],
        ["route25-kelsey", { x: 22, y: 8 }, 2],
        ["route25-nob", { x: 27, y: 9 }, 3],
        ["route25-flint", { x: 28, y: 4 }, 3],
        ["route25-chad", { x: 36, y: 4 }, 2],
        ["route25-haley", { x: 42, y: 5 }, 3],
      ]),
    );
  });

  it("uses FireRed party levels and trainer-class money factors", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(
      byId.get("route25-franklin")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["machop", 15],
      ["geodude", 15],
    ]);
    expect(
      byId.get("route25-dan")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([["slowpoke", 17]]);
    expect(
      byId.get("route25-nob")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["geodude", 13],
      ["geodude", 13],
      ["machop", 13],
      ["geodude", 13],
    ]);

    const expectedMoney: Record<string, number> = {
      "route25-franklin": 540,
      "route25-joey": 240,
      "route25-wayne": 612,
      "route25-dan": 272,
      "route25-kelsey": 300,
      "route25-nob": 468,
      "route25-flint": 280,
      "route25-chad": 224,
      "route25-haley": 208,
    };

    for (const [id, money] of Object.entries(expectedMoney)) {
      const trainer = byId.get(id)!;
      expect(
        trainerPrizeMoney(
          trainer.party,
          trainer.moneyMultiplier,
        ),
      ).toBe(money);
    }
  });

  it("does not expose Route 25's canonical TM43 tile as an overworld reward", () => {
    // Project rule: TMs and held-item rewards are exclusive to raids/dungeons.
    expect(
      resolveOverworldPickups("route-25", []).some(
        (pickup) =>
          pickup.x === 26 &&
          pickup.y === 2,
      ),
    ).toBe(false);
  });
});
