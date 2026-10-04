import { describe, expect, it } from "vitest";
import {
  isSsAnneBoardingWarpAt,
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  hasStoryKeyItem,
} from "../apps/client/lib/story";

describe("S.S. Anne boarding", () => {
  it("registers the extracted exterior with FireRed music", () => {
    expect(WORLD_MAPS["ss-anne-exterior"]).toMatchObject({
      label: "S.S. Anne",
      spawn: { x: 32, y: 6 },
      fallbackMusicId: 304,
    });
  });

  it("marks exactly the three harbor warps", () => {
    for (const x of [22, 23, 24]) {
      expect(
        isSsAnneBoardingWarpAt("vermilion-city", x, 34),
      ).toBe(true);
      expect(
        resolveWarpTransitionAt("vermilion-city", x, 34),
      ).toEqual({
        mapId: "ss-anne-exterior",
        spawn: { x: 32, y: 6 },
      });
    }

    expect(
      isSsAnneBoardingWarpAt("vermilion-city", 23, 33),
    ).toBe(false);
  });

  it("returns from the ship exterior to the pier", () => {
    for (const x of [31, 32, 33]) {
      expect(
        resolveWarpTransitionAt("ss-anne-exterior", x, 5),
      ).toEqual({
        mapId: "vermilion-city",
        spawn: { x: x - 9, y: 33 },
      });
    }
  });

  it("connects the exterior entrance to the 1F corridor", () => {
    expect(
      WORLD_MAPS["ss-anne-1f-corridor"],
    ).toMatchObject({
      label: "S.S. Anne 1F",
      spawn: { x: 19, y: 1 },
      fallbackMusicId: 304,
    });

    expect(
      resolveWarpTransitionAt(
        "ss-anne-exterior",
        32,
        14,
      ),
    ).toEqual({
      mapId: "ss-anne-1f-corridor",
      spawn: { x: 19, y: 1 },
    });

    expect(
      resolveWarpTransitionAt(
        "ss-anne-1f-corridor",
        19,
        1,
      ),
    ).toEqual({
      mapId: "ss-anne-exterior",
      spawn: { x: 32, y: 14 },
    });
  });

  it("uses Bill's S.S. Ticket as the boarding key", () => {
    expect(
      hasStoryKeyItem(DEFAULT_STORY_STATE, "ss-ticket"),
    ).toBe(false);
    expect(
      hasStoryKeyItem(
        {
          ...DEFAULT_STORY_STATE,
          keyItemIds: ["ss-ticket"],
        },
        "ss-ticket",
      ),
    ).toBe(true);
  });
});
