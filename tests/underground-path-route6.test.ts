import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";
import {
  resolveOverworldPickups,
} from "../apps/client/lib/overworldPickups";
import {
  OVERWORLD_TRAINERS,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";

describe("Underground Path and Route 6", () => {
  it("registers the canonical path chain and Route 6", () => {
    expect(
      WORLD_MAPS["underground-path-north-entrance"],
    ).toMatchObject({
      spawn: { x: 6, y: 7 },
      fallbackMusicId: 314,
    });
    expect(
      WORLD_MAPS["underground-path-tunnel"],
    ).toMatchObject({
      spawn: { x: 4, y: 4 },
      fallbackMusicId: 291,
    });
    expect(
      WORLD_MAPS["underground-path-south-entrance"],
    ).toMatchObject({
      spawn: { x: 6, y: 7 },
      fallbackMusicId: 314,
    });
    expect(WORLD_MAPS["route-6"]).toMatchObject({
      label: "Route 6",
      spawn: { x: 19, y: 14 },
      fallbackMusicId: 293,
    });
  });

  it("connects Route 5 through the tunnel to Route 6", () => {
    expect(
      resolveWarpTransitionAt("route-5", 31, 31),
    ).toEqual({
      mapId: "underground-path-north-entrance",
      spawn: { x: 6, y: 7 },
    });
    expect(
      resolveWarpTransitionAt(
        "underground-path-north-entrance",
        7,
        4,
      ),
    ).toEqual({
      mapId: "underground-path-tunnel",
      spawn: { x: 4, y: 4 },
    });
    expect(
      resolveWarpTransitionAt(
        "underground-path-tunnel",
        3,
        60,
      ),
    ).toEqual({
      mapId: "underground-path-south-entrance",
      spawn: { x: 7, y: 5 },
    });
    expect(
      resolveWarpTransitionAt(
        "underground-path-south-entrance",
        6,
        8,
      ),
    ).toEqual({
      mapId: "route-6",
      spawn: { x: 19, y: 14 },
    });
    expect(
      resolveWarpTransitionAt("route-6", 19, 13),
    ).toEqual({
      mapId: "underground-path-south-entrance",
      spawn: { x: 6, y: 7 },
    });
  });

  it("reuses FireRed's Route 5 land table on Route 6", () => {
    expect(LAND_ENCOUNTERS["route-6"].encounterRate).toBe(21);
    expect(resolveLandEncounter("route-6", 0)).toEqual({
      species: "meowth",
      level: 10,
    });
    expect(resolveLandEncounter("route-6", 40)).toEqual({
      species: "oddish",
      level: 13,
    });
    expect(resolveLandEncounter("route-6", 99)).toEqual({
      species: "meowth",
      level: 16,
    });
  });

  it("places all six FireRed Route 6 trainers", () => {
    const route6 = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "route-6",
    );

    expect(route6).toHaveLength(6);
    expect(
      route6.map((trainer) => [
        trainer.id,
        trainer.preferredPosition,
        trainer.facing,
        trainer.sightRange,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["route6-keigo", { x: 3, y: 16 }, "east", 5],
        ["route6-ricky", { x: 12, y: 21 }, "east", 0],
        ["route6-nancy", { x: 13, y: 21 }, "west", 0],
        ["route6-elijah", { x: 20, y: 25 }, "west", 3],
        ["route6-isabelle", { x: 13, y: 32 }, "west", 3],
        ["route6-jeff", { x: 13, y: 33 }, "west", 3],
      ]),
    );
  });

  it("uses FireRed Route 6 parties, moves and prize factors", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(
      byId.get("route6-ricky")?.party,
    ).toEqual([
      {
        species: "squirtle",
        level: 20,
        moves: ["bubble", "withdraw", "water-gun", "bite"],
      },
    ]);

    expect(
      byId.get("route6-nancy")?.party,
    ).toEqual([
      {
        species: "rattata",
        level: 16,
        moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
      },
      {
        species: "pikachu",
        level: 16,
        moves: ["tail-whip", "thunder-wave", "quick-attack", "double-team"],
      },
    ]);

    expect(
      byId.get("route6-elijah")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([["butterfree", 20]]);

    expect(
      byId.get("route6-jeff")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["spearow", 16],
      ["raticate", 16],
    ]);

    const expectedMoney: Record<string, number> = {
      "route6-keigo": 192,
      "route6-ricky": 400,
      "route6-nancy": 320,
      "route6-elijah": 240,
      "route6-isabelle": 320,
      "route6-jeff": 320,
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

  it("does not expose Route 6's Sitrus Berry as a common overworld held reward", () => {
    // Held items stay exclusive to raids and dungeons in Tactimon.
    expect(
      resolveOverworldPickups("route-6", []).some(
        (pickup) => pickup.x === 5 && pickup.y === 5,
      ),
    ).toBe(false);
  });
});
