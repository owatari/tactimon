import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";

describe("Route 3", () => {
  it("registers the extracted FireRed Route 3 layout and music", () => {
    expect(WORLD_MAPS["route-3"]).toMatchObject({
      label: "Route 3",
      spawn: { x: 0, y: 10 },
      fallbackMusicId: 293,
      layoutUrl: "/game-assets/maps/route-3/layout.json",
      previewUrl: "/game-assets/maps/route-3/preview.png",
    });
  });

  it("uses the real Pewter/Route 3 four-tile connection", () => {
    for (let pewterY = 20; pewterY <= 23; pewterY += 1) {
      expect(
        resolveWorldTransition(
          "pewter-city",
          47,
          pewterY,
          "east",
        ),
      ).toEqual({
        mapId: "route-3",
        spawn: { x: 0, y: pewterY - 11 },
      });
    }

    for (let routeY = 9; routeY <= 12; routeY += 1) {
      expect(
        resolveWorldTransition(
          "route-3",
          0,
          routeY,
          "west",
        ),
      ).toEqual({
        mapId: "pewter-city",
        spawn: { x: 47, y: routeY + 11 },
      });
    }
  });

  it("matches FireRed's 21 percent land encounter table", () => {
    expect(
      LAND_ENCOUNTERS["route-3"].encounterRate,
    ).toBe(21);

    expect(resolveLandEncounter("route-3", 0)).toEqual({
      species: "spearow",
      level: 6,
    });
    expect(resolveLandEncounter("route-3", 60)).toEqual({
      species: "nidoran-m",
      level: 6,
    });
    expect(resolveLandEncounter("route-3", 85)).toEqual({
      species: "jigglypuff",
      level: 3,
    });
    expect(resolveLandEncounter("route-3", 98)).toEqual({
      species: "nidoran-f",
      level: 6,
    });
    expect(resolveLandEncounter("route-3", 99)).toEqual({
      species: "jigglypuff",
      level: 7,
    });
  });

  it("places all eight canonical Route 3 trainers", () => {
    const route3 = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "route-3",
    );

    expect(route3).toHaveLength(8);
    expect(
      route3.map((trainer) => [
        trainer.name,
        trainer.preferredPosition,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["Youngster Ben", { x: 17, y: 4 }],
        ["Youngster Calvin", { x: 29, y: 10 }],
        ["Bug Catcher Colton", { x: 12, y: 6 }],
        ["Bug Catcher Greg", { x: 25, y: 4 }],
        ["Bug Catcher James", { x: 32, y: 6 }],
        ["Lass Janice", { x: 19, y: 9 }],
        ["Lass Sally", { x: 30, y: 3 }],
        ["Lass Robin", { x: 40, y: 11 }],
      ]),
    );
  });

  it("keeps the canonical trainer party levels", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(byId.get("route3-ben")?.party).toEqual([
      expect.objectContaining({
        species: "rattata",
        level: 11,
      }),
      expect.objectContaining({
        species: "ekans",
        level: 11,
      }),
    ]);
    expect(byId.get("route3-robin")?.party).toEqual([
      expect.objectContaining({
        species: "jigglypuff",
        level: 14,
      }),
    ]);
    expect(
      byId.get("route3-greg")?.party,
    ).toHaveLength(4);
  });
});
