import { describe, expect, it } from "vitest";
import {
  completeStoryPlayerEvent,
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";
import {
  resolveBlockedPlayerEdgeGate,
  resolveBlockedPlayerTileGate,
} from "../apps/client/lib/playerWorldGates";

describe("player world movement gates", () => {
  it("instances the Pallet starter gate per player", () => {
    const playerA = completeStoryPlayerEvent(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "story",
      "starter-chosen",
    );
    const playerB = normalizeStoryState(DEFAULT_STORY_STATE);

    expect(resolveBlockedPlayerEdgeGate(
      playerA, "pallet-town", "route-1",
    )).toBeNull();
    expect(resolveBlockedPlayerEdgeGate(
      playerB, "pallet-town", "route-1",
    )?.id).toBe("pallet-route1-starter");
  });

  it("opens badge and trainer gates only for the owning player", () => {
    let playerA = normalizeStoryState(DEFAULT_STORY_STATE);
    playerA = completeStoryPlayerEvent(
      playerA, "badge", "boulder",
    );
    playerA = completeStoryPlayerEvent(
      playerA, "trainer", "cerulean-rival",
    );
    const playerB = normalizeStoryState(DEFAULT_STORY_STATE);

    expect(resolveBlockedPlayerEdgeGate(
      playerA, "pewter-city", "route-3",
    )).toBeNull();
    expect(resolveBlockedPlayerEdgeGate(
      playerB, "pewter-city", "route-3",
    )).not.toBeNull();
    expect(resolveBlockedPlayerEdgeGate(
      playerA, "cerulean-city", "route-24",
    )).toBeNull();
    expect(resolveBlockedPlayerEdgeGate(
      playerB, "cerulean-city", "route-24",
    )).not.toBeNull();
  });

  it("instances ticket gates per player", () => {
    const owner = completeStoryPlayerEvent(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "key-item",
      "ss-ticket",
    );
    const other = normalizeStoryState(DEFAULT_STORY_STATE);

    expect(resolveBlockedPlayerTileGate(
      owner, "vermilion-city", 23, 34,
    )).toBeNull();
    expect(resolveBlockedPlayerTileGate(
      other, "vermilion-city", 23, 34,
    )).not.toBeNull();
    expect(resolveBlockedPlayerTileGate(
      owner, "cerulean-city", 30, 11,
    )).toBeNull();
    expect(resolveBlockedPlayerTileGate(
      other, "cerulean-city", 30, 11,
    )).not.toBeNull();
  });

  it("prepares the League gate for all eight badge events", () => {
    const badges = [
      "boulder", "cascade", "thunder", "rainbow",
      "soul", "marsh", "volcano", "earth",
    ];
    let champion = normalizeStoryState(DEFAULT_STORY_STATE);
    for (const badge of badges) {
      champion = completeStoryPlayerEvent(
        champion, "badge", badge,
      );
    }

    expect(resolveBlockedPlayerTileGate(
      champion, "route-22", 8, 5,
    )).toBeNull();
    expect(resolveBlockedPlayerTileGate(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "route-22", 8, 5,
    )).not.toBeNull();
  });
});
