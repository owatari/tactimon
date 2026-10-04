import { describe, expect, it } from "vitest";
import { resolveWarpTransitionAt, WORLD_MAPS } from "../apps/client/lib/maps";

describe("S.S. Anne upper decks", () => {
  it("registers 2F, 3F and Deck", () => {
    expect(WORLD_MAPS["ss-anne-2f-corridor"]).toBeDefined();
    expect(WORLD_MAPS["ss-anne-3f-corridor"]).toBeDefined();
    expect(WORLD_MAPS["ss-anne-deck"]).toBeDefined();
  });

  it("connects the public ship floors without opening the captain office", () => {
    expect(resolveWarpTransitionAt("ss-anne-1f-corridor", 3, 8)).toEqual({
      mapId: "ss-anne-2f-corridor", spawn: { x: 2, y: 3 },
    });
    expect(resolveWarpTransitionAt("ss-anne-2f-corridor", 3, 12)).toEqual({
      mapId: "ss-anne-3f-corridor", spawn: { x: 18, y: 3 },
    });
    expect(resolveWarpTransitionAt("ss-anne-3f-corridor", 1, 4)).toEqual({
      mapId: "ss-anne-deck", spawn: { x: 16, y: 10 },
    });
    expect(resolveWarpTransitionAt("ss-anne-2f-corridor", 30, 2)).toBeNull();
  });
});
