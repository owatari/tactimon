import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_STATE,
  grantRunningShoes,
  grantStoryBadge,
  normalizeStoryState,
  shouldGrantRunningShoes,
} from "../apps/client/lib/story";

describe("Running Shoes progression", () => {
  it("starts locked and persists the unlock through normalization", () => {
    expect(normalizeStoryState(DEFAULT_STORY_STATE).runningShoesReceived).toBe(false);

    const unlocked = grantRunningShoes(DEFAULT_STORY_STATE);
    expect(unlocked.runningShoesReceived).toBe(true);
    expect(normalizeStoryState(unlocked).runningShoesReceived).toBe(true);
  });

  it("does not duplicate state changes after the unlock", () => {
    const unlocked = grantRunningShoes(DEFAULT_STORY_STATE);
    expect(grantRunningShoes(unlocked)).toBe(unlocked);
  });

  it("is delivered on Route 3 only after the Boulder Badge and only once", () => {
    const beforeBrock = DEFAULT_STORY_STATE;
    const afterBrock = grantStoryBadge(DEFAULT_STORY_STATE, "boulder");

    expect(shouldGrantRunningShoes(beforeBrock, "route-3")).toBe(false);
    expect(shouldGrantRunningShoes(afterBrock, "pewter-city")).toBe(false);
    expect(shouldGrantRunningShoes(afterBrock, "route-3")).toBe(true);
    expect(
      shouldGrantRunningShoes(grantRunningShoes(afterBrock), "route-3"),
    ).toBe(false);
  });

  it("keeps old saves without the flag locked", () => {
    const legacy = { ...DEFAULT_STORY_STATE } as Partial<typeof DEFAULT_STORY_STATE>;
    delete legacy.runningShoesReceived;
    expect(normalizeStoryState(legacy).runningShoesReceived).toBe(false);
  });
});
