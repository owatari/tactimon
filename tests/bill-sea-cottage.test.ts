import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  hasStoryKeyItem,
  interactWithBill,
  normalizeStoryState,
  runBillCellSeparator,
} from "../apps/client/lib/story";

describe("Bill and Sea Cottage", () => {
  it("registers the extracted Sea Cottage and canonical door warp", () => {
    expect(WORLD_MAPS["sea-cottage"]).toMatchObject({
      label: "Sea Cottage",
      spawn: { x: 7, y: 8 },
      fallbackMusicId: 308,
      layoutUrl: "/game-assets/maps/sea-cottage/layout.json",
      previewUrl: "/game-assets/maps/sea-cottage/preview.png",
    });

    expect(
      resolveWarpTransitionAt("route-25", 51, 4),
    ).toEqual({
      mapId: "sea-cottage",
      spawn: { x: 7, y: 8 },
    });

    for (const x of [6, 7, 8]) {
      expect(
        resolveWarpTransitionAt(
          "sea-cottage",
          x,
          9,
        ),
      ).toEqual({
        mapId: "route-25",
        spawn: { x: 51, y: 5 },
      });
    }
  });

  it("requires the Cell Separator before Bill can reward the ticket", () => {
    const initial = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    expect(initial.billStage).toBe("unmet");
    expect(
      hasStoryKeyItem(initial, "ss-ticket"),
    ).toBe(false);

    const asked = interactWithBill(initial);
    expect(asked.story.billStage).toBe(
      "teleporter-ready",
    );
    expect(
      hasStoryKeyItem(asked.story, "ss-ticket"),
    ).toBe(false);

    const transformed =
      runBillCellSeparator(asked.story);
    expect(transformed.story.billStage).toBe(
      "helped",
    );
    expect(
      hasStoryKeyItem(
        transformed.story,
        "ss-ticket",
      ),
    ).toBe(false);

    const rewarded = interactWithBill(
      transformed.story,
    );
    expect(
      hasStoryKeyItem(
        rewarded.story,
        "ss-ticket",
      ),
    ).toBe(true);
  });

  it("never duplicates the S.S. Ticket", () => {
    const asked = interactWithBill(
      DEFAULT_STORY_STATE,
    );
    const transformed = runBillCellSeparator(
      asked.story,
    );
    const first = interactWithBill(
      transformed.story,
    );
    const second = interactWithBill(first.story);

    expect(
      first.story.keyItemIds,
    ).toEqual(["ss-ticket"]);
    expect(
      second.story.keyItemIds,
    ).toEqual(["ss-ticket"]);
  });

  it("migrates older saves without Bill fields", () => {
    const legacy = {
      ...DEFAULT_STORY_STATE,
      billStage: undefined,
      keyItemIds: undefined,
    };

    const normalized =
      normalizeStoryState(legacy);
    expect(normalized.billStage).toBe("unmet");
    expect(normalized.keyItemIds).toEqual([]);
  });
});
