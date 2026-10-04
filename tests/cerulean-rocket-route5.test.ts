import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  CERULEAN_ROCKET_TRAINER_ID,
  isCeruleanRocketTriggerAt,
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

describe("Cerulean Rocket and Route 5", () => {
  it("registers the burgled house and Route 5 maps", () => {
    expect(WORLD_MAPS["cerulean-house2"]).toMatchObject({
      label: "Burgled House",
      spawn: { x: 3, y: 6 },
      fallbackMusicId: 308,
    });
    expect(WORLD_MAPS["route-5"]).toMatchObject({
      label: "Route 5",
      spawn: { x: 24, y: 0 },
      fallbackMusicId: 293,
    });
  });

  it("connects the house front door, rear hole, and Route 5 border", () => {
    expect(
      resolveWarpTransitionAt(
        "cerulean-city",
        30,
        11,
      ),
    ).toEqual({
      mapId: "cerulean-house2",
      spawn: { x: 3, y: 6 },
    });
    expect(
      resolveWarpTransitionAt(
        "cerulean-house2",
        4,
        1,
      ),
    ).toEqual({
      mapId: "cerulean-city",
      spawn: { x: 31, y: 8 },
    });

    for (let x = 0; x <= 47; x += 1) {
      expect(
        resolveWorldTransition(
          "cerulean-city",
          x,
          39,
          "south",
        ),
      ).toEqual({
        mapId: "route-5",
        spawn: { x, y: 0 },
      });
      expect(
        resolveWorldTransition(
          "route-5",
          x,
          0,
          "north",
        ),
      ).toEqual({
        mapId: "cerulean-city",
        spawn: { x, y: 39 },
      });
    }
  });

  it("uses the exact two FireRed coordinate triggers for Grunt 5", () => {
    for (const y of [5, 7]) {
      expect(
        isCeruleanRocketTriggerAt(
          "cerulean-city",
          33,
          y,
          true,
          [],
        ),
      ).toBe(true);
    }

    expect(
      isCeruleanRocketTriggerAt(
        "cerulean-city",
        33,
        6,
        true,
        [],
      ),
    ).toBe(false);
    expect(
      isCeruleanRocketTriggerAt(
        "cerulean-city",
        33,
        5,
        false,
        [],
      ),
    ).toBe(false);
    expect(
      isCeruleanRocketTriggerAt(
        "cerulean-city",
        33,
        5,
        true,
        [CERULEAN_ROCKET_TRAINER_ID],
      ),
    ).toBe(false);
  });

  it("uses FireRed Grunt 5's party and Team Rocket payout", () => {
    const rocket = OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.id === CERULEAN_ROCKET_TRAINER_ID,
    )!;

    expect(
      rocket.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["machop", 17],
      ["drowzee", 17],
    ]);
    expect(
      trainerPrizeMoney(
        rocket.party,
        rocket.moneyMultiplier,
      ),
    ).toBe(544);
  });

  it("matches FireRed's Route 5 land encounters", () => {
    expect(
      LAND_ENCOUNTERS["route-5"].encounterRate,
    ).toBe(21);

    expect(resolveLandEncounter("route-5", 0)).toEqual({
      species: "meowth",
      level: 10,
    });
    expect(resolveLandEncounter("route-5", 20)).toEqual({
      species: "pidgey",
      level: 13,
    });
    expect(resolveLandEncounter("route-5", 40)).toEqual({
      species: "oddish",
      level: 13,
    });
    expect(resolveLandEncounter("route-5", 50)).toEqual({
      species: "meowth",
      level: 12,
    });
    expect(resolveLandEncounter("route-5", 99)).toEqual({
      species: "meowth",
      level: 16,
    });
  });

  it("does not expose TM28 as an overworld pickup", () => {
    // Tactimon rule: TMs and held items are raid/dungeon exclusives.
    expect(
      resolveOverworldPickups(
        "cerulean-city",
        [],
      ).some(
        (pickup) =>
          pickup.id.toLowerCase().includes("tm28"),
      ),
    ).toBe(false);
  });
});
