import { describe, expect, it } from "vitest";
import {
  resolveWorldTransition,
  WORLD_MAPS,
} from "../apps/client/lib/maps";

describe("Cerulean City", () => {
  it("registers the extracted FireRed city map and music", () => {
    expect(WORLD_MAPS["cerulean-city"]).toMatchObject({
      label: "Cerulean City",
      layoutUrl: "/game-assets/maps/cerulean-city/layout.json",
      previewUrl: "/game-assets/maps/cerulean-city/preview.png",
      spawn: { x: 0, y: 13 },
      fallbackMusicId: 308,
    });
  });

  it("connects every overlapping Route 4/Cerulean edge tile", () => {
    for (let route4Y = 0; route4Y <= 19; route4Y += 1) {
      expect(
        resolveWorldTransition(
          "route-4",
          107,
          route4Y,
          "east",
        ),
      ).toEqual({
        mapId: "cerulean-city",
        spawn: { x: 0, y: route4Y + 10 },
      });
    }

    for (let ceruleanY = 10; ceruleanY <= 29; ceruleanY += 1) {
      expect(
        resolveWorldTransition(
          "cerulean-city",
          0,
          ceruleanY,
          "west",
        ),
      ).toEqual({
        mapId: "route-4",
        spawn: { x: 107, y: ceruleanY - 10 },
      });
    }
  });

  it("does not connect non-overlapping west/east edge rows", () => {
    expect(
      resolveWorldTransition("cerulean-city", 0, 9, "west"),
    ).toBeNull();
    expect(
      resolveWorldTransition("cerulean-city", 0, 30, "west"),
    ).toBeNull();
  });
});
