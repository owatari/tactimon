import { describe, expect, it } from "vitest";
import { GENERATED_WARPS } from "../apps/client/lib/generatedWarps";
import {
  WORLD_MAPS,
  resolveWarpTransitionAt,
} from "../apps/client/lib/maps";

describe("generated interior warps", () => {
  it("only connects known maps", () => {
    for (const [key, target] of Object.entries(GENERATED_WARPS)) {
      expect(Object.keys(WORLD_MAPS), key).toContain(key.split(":")[0]);
      expect(Object.keys(WORLD_MAPS), key).toContain(target.mapId);
    }
  });

  it("enters the Pewter Museum and the player's house", () => {
    expect(resolveWarpTransitionAt("pewter-city", 17, 6)?.mapId).toBe(
      "pewter-museum-1f",
    );
    expect(resolveWarpTransitionAt("pallet-town", 6, 7)?.mapId).toBe(
      "pallet-players-house-1f",
    );
  });

  it("keeps hand-written warps authoritative", () => {
    expect(resolveWarpTransitionAt("pallet-town", 16, 13)?.mapId).toBe(
      "oak-lab",
    );
  });
});
