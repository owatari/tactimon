import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  CERULEAN_RIVAL_TRAINER_ID,
  ceruleanRivalEncounter,
  ceruleanRivalParty,
  isCeruleanRivalTriggerAt,
} from "../apps/client/lib/trainers";

describe("Cerulean rival and Route 24", () => {
  it("registers the extracted Route 24 layout and music", () => {
    expect(WORLD_MAPS["route-24"]).toMatchObject({
      label: "Route 24",
      spawn: { x: 11, y: 39 },
      fallbackMusicId: 292,
      layoutUrl: "/game-assets/maps/route-24/layout.json",
      previewUrl: "/game-assets/maps/route-24/preview.png",
    });
  });

  it("connects all 24 overlapping Cerulean and Route 24 edge tiles", () => {
    for (let ceruleanX = 12; ceruleanX <= 35; ceruleanX += 1) {
      expect(
        resolveWorldTransition(
          "cerulean-city",
          ceruleanX,
          0,
          "north",
        ),
      ).toEqual({
        mapId: "route-24",
        spawn: { x: ceruleanX - 12, y: 39 },
      });
    }

    for (let routeX = 0; routeX <= 23; routeX += 1) {
      expect(
        resolveWorldTransition(
          "route-24",
          routeX,
          39,
          "south",
        ),
      ).toEqual({
        mapId: "cerulean-city",
        spawn: { x: routeX + 12, y: 0 },
      });
    }
  });

  it("uses the three canonical Cerulean rival trigger tiles until Blue is beaten", () => {
    for (const x of [22, 23, 24]) {
      expect(
        isCeruleanRivalTriggerAt(
          "cerulean-city",
          x,
          6,
          [],
        ),
      ).toBe(true);
    }

    expect(
      isCeruleanRivalTriggerAt(
        "cerulean-city",
        23,
        6,
        [CERULEAN_RIVAL_TRAINER_ID],
      ),
    ).toBe(false);
    expect(
      isCeruleanRivalTriggerAt(
        "cerulean-city",
        21,
        6,
        [],
      ),
    ).toBe(false);
  });

  it("builds Blue's exact FireRed party from his chosen starter", () => {
    expect(ceruleanRivalParty("squirtle")).toEqual([
      {
        species: "pidgeotto",
        level: 17,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "abra",
        level: 16,
        moves: ["teleport"],
      },
      {
        species: "rattata",
        level: 15,
        moves: ["tackle", "tail-whip", "quick-attack"],
      },
      {
        species: "squirtle",
        level: 18,
        moves: ["tackle", "tail-whip", "withdraw", "water-gun"],
      },
    ]);

    const bulbasaurParty = ceruleanRivalParty("bulbasaur");
    expect(
      bulbasaurParty?.[bulbasaurParty.length - 1],
    ).toEqual({
      species: "bulbasaur",
      level: 18,
      moves: ["sleep-powder", "poison-powder", "vine-whip", "leech-seed"],
    });
    const charmanderParty = ceruleanRivalParty("charmander");
    expect(
      charmanderParty?.[charmanderParty.length - 1],
    ).toEqual({
      species: "charmander",
      level: 18,
      moves: ["metal-claw", "ember", "growl", "scratch"],
    });
  });

  it("uses FireRed's Rival Early payout factor", () => {
    expect(
      ceruleanRivalEncounter("charmander"),
    ).toMatchObject({
      id: CERULEAN_RIVAL_TRAINER_ID,
      name: "Blue",
      rewardMoney: 288,
    });
  });
});
