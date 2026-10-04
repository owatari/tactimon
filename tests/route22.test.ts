import { describe, expect, it } from "vitest";
import {
  isVictoryRoadLeagueGateAt,
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";
import {
  isRoute22EarlyRivalTriggerTile,
  route22EarlyRivalParty,
} from "../apps/client/lib/trainers";

describe("Route 22", () => {
  it("registers the extracted FireRed route with Route 3 music", () => {
    expect(WORLD_MAPS["route-22"]).toMatchObject({
      label: "Route 22",
      spawn: { x: 47, y: 6 },
      fallbackMusicId: 293,
    });
  });

  it("uses the ROM connection offset between Viridian and Route 22", () => {
    expect(
      resolveWorldTransition(
        "viridian-city",
        0,
        17,
        "west",
      ),
    ).toEqual({
      mapId: "route-22",
      spawn: { x: 47, y: 7 },
    });

    expect(
      resolveWorldTransition(
        "route-22",
        47,
        7,
        "east",
      ),
    ).toEqual({
      mapId: "viridian-city",
      spawn: { x: 0, y: 17 },
    });
  });

  it("keeps the grass patch available at the FireRed encounter rate", () => {
    expect(
      LAND_ENCOUNTERS["route-22"].encounterRate,
    ).toBe(21);
    expect(resolveLandEncounter("route-22", 0)).toEqual({
      species: "rattata",
      level: 3,
    });
    expect(resolveLandEncounter("route-22", 20)).toEqual({
      species: "mankey",
      level: 3,
    });
    expect(resolveLandEncounter("route-22", 80)).toEqual({
      species: "spearow",
      level: 3,
    });
    expect(resolveLandEncounter("route-22", 85)).toEqual({
      species: "spearow",
      level: 5,
    });
    expect(resolveLandEncounter("route-22", 99)).toEqual({
      species: "mankey",
      level: 5,
    });
  });

  it("keeps the Victory Road gate explicitly late-game", () => {
    expect(
      isVictoryRoadLeagueGateAt("route-22", 8, 5),
    ).toBe(true);
    expect(
      isVictoryRoadLeagueGateAt("route-22", 9, 5),
    ).toBe(true);
    expect(
      isVictoryRoadLeagueGateAt("route-22", 10, 5),
    ).toBe(false);
  });
});


describe("Route 22 early rival", () => {
  it("uses FireRed trigger geometry and the level 9 Pidgey plus starter party", () => {
    expect(
      isRoute22EarlyRivalTriggerTile(
        "route-22",
        33,
        4,
      ),
    ).toBe(true);
    expect(
      isRoute22EarlyRivalTriggerTile(
        "route-22",
        33,
        6,
      ),
    ).toBe(true);
    expect(
      isRoute22EarlyRivalTriggerTile(
        "route-22",
        32,
        5,
      ),
    ).toBe(false);

    expect(
      route22EarlyRivalParty("charmander"),
    ).toEqual([
      {
        species: "pidgey",
        level: 9,
        moves: ["tackle", "sand-attack"],
      },
      {
        species: "charmander",
        level: 9,
        moves: ["scratch", "growl"],
      },
    ]);
  });
});
