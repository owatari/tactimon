import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";

describe("Pewter City route", () => {
  it("registers the extracted FireRed city layout", () => {
    expect(WORLD_MAPS["pewter-city"]).toMatchObject({
      label: "Pewter City",
      spawn: { x: 21, y: 39 },
      fallbackMusicId: 314,
      layoutUrl: "/game-assets/maps/pewter-city/layout.json",
      previewUrl: "/game-assets/maps/pewter-city/preview.png",
    });
  });

  it("uses FireRed's Route 2 to Pewter offset", () => {
    expect(
      resolveWorldTransition(
        "route-2",
        9,
        0,
        "north",
      ),
    ).toEqual({
      mapId: "pewter-city",
      spawn: { x: 21, y: 39 },
    });

    expect(
      resolveWorldTransition(
        "pewter-city",
        21,
        39,
        "south",
      ),
    ).toEqual({
      mapId: "route-2",
      spawn: { x: 9, y: 0 },
    });
  });

  it("keeps the full four-tile FireRed connection walkable", () => {
    for (let routeX = 8; routeX <= 11; routeX += 1) {
      expect(
        resolveWorldTransition(
          "route-2",
          routeX,
          0,
          "north",
        ),
      ).toEqual({
        mapId: "pewter-city",
        spawn: { x: routeX + 12, y: 39 },
      });
    }

    for (let pewterX = 20; pewterX <= 23; pewterX += 1) {
      expect(
        resolveWorldTransition(
          "pewter-city",
          pewterX,
          39,
          "south",
        ),
      ).toEqual({
        mapId: "route-2",
        spawn: { x: pewterX - 12, y: 0 },
      });
    }
  });

  it("does not transition through blocked edge coordinates", () => {
    expect(
      resolveWorldTransition(
        "route-2",
        7,
        0,
        "north",
      ),
    ).toBeNull();

    expect(
      resolveWorldTransition(
        "pewter-city",
        19,
        39,
        "south",
      ),
    ).toBeNull();
  });
});
