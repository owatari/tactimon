import { describe, expect, it } from "vitest";
import {
  OVERWORLD_TRAINERS,
  resolveOverworldTrainers,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";
import {
  resolveOverworldPickups,
} from "../apps/client/lib/overworldPickups";
import type {
  MapLayout,
} from "../apps/client/lib/maps";

function openForestLayout(): MapLayout {
  const width = 54;
  const height = 69;

  return {
    index: 116,
    id: "LAYOUT_VIRIDIAN_FOREST",
    name: "ViridianForest_Layout",
    width,
    height,
    primary_tileset: "General",
    secondary_tileset: "ViridianForest",
    cells: Array.from(
      { length: width * height },
      () => ({
        raw: 0,
        metatile: 1,
        collision: 0,
        elevation: 3,
      }),
    ),
  };
}

describe("Viridian Forest content", () => {
  it("defines the five FireRed Bug Catchers at their map positions", () => {
    const trainers = OVERWORLD_TRAINERS.filter(
      (trainer) =>
        trainer.mapId === "viridian-forest",
    );

    expect(
      trainers.map((trainer) => ({
        id: trainer.id,
        position: trainer.preferredPosition,
        sightRange: trainer.sightRange,
      })),
    ).toEqual([
      {
        id: "viridian-forest-rick",
        position: { x: 47, y: 45 },
        sightRange: 5,
      },
      {
        id: "viridian-forest-doug",
        position: { x: 47, y: 29 },
        sightRange: 4,
      },
      {
        id: "viridian-forest-sammy",
        position: { x: 7, y: 22 },
        sightRange: 4,
      },
      {
        id: "viridian-forest-anthony",
        position: { x: 43, y: 6 },
        sightRange: 1,
      },
      {
        id: "viridian-forest-charlie",
        position: { x: 16, y: 5 },
        sightRange: 1,
      },
    ]);
  });

  it("uses the original Bug Catcher party levels and money factor", () => {
    const rick = OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.id === "viridian-forest-rick",
    )!;
    const doug = OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.id === "viridian-forest-doug",
    )!;
    const sammy = OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.id === "viridian-forest-sammy",
    )!;

    expect(
      rick.party.map(({ species, level }) => ({
        species,
        level,
      })),
    ).toEqual([
      { species: "weedle", level: 6 },
      { species: "caterpie", level: 6 },
    ]);
    expect(
      doug.party.map(({ species, level }) => ({
        species,
        level,
      })),
    ).toEqual([
      { species: "weedle", level: 7 },
      { species: "kakuna", level: 7 },
      { species: "weedle", level: 7 },
    ]);
    expect(
      trainerPrizeMoney(sammy.party, sammy.moneyMultiplier),
    ).toBe(108);
  });

  it("resolves all five trainers on an unobstructed forest layout", () => {
    expect(
      resolveOverworldTrainers(
        "viridian-forest",
        openForestLayout(),
        [],
        [],
      ),
    ).toHaveLength(5);
  });

  it("exposes only supported visible item balls and persists each independently", () => {
    expect(
      resolveOverworldPickups("viridian-forest", []),
    ).toEqual([
      {
        id: "viridian-forest-poke-ball",
        mapId: "viridian-forest",
        itemId: "poke-ball",
        itemName: "Poké Ball",
        x: 5,
        y: 41,
      },
      {
        id: "viridian-forest-potion-center",
        mapId: "viridian-forest",
        itemId: "potion",
        itemName: "Potion",
        x: 21,
        y: 34,
      },
      {
        id: "viridian-forest-potion-south",
        mapId: "viridian-forest",
        itemId: "potion",
        itemName: "Potion",
        x: 49,
        y: 60,
      },
    ]);

    expect(
      resolveOverworldPickups("viridian-forest", [
        "viridian-forest-potion-center",
      ]).map((pickup) => pickup.id),
    ).toEqual([
      "viridian-forest-poke-ball",
      "viridian-forest-potion-south",
    ]);
  });
});
