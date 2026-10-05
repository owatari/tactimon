import { describe, expect, it } from "vitest";
import {
  BAG_ITEM_CATALOG,
  normalizeBagItems,
} from "../apps/client/lib/items";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import {
  OVERWORLD_PICKUPS,
} from "../apps/client/lib/overworldPickups";
import {
  collectOverworldItem,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("FireRed overworld items", () => {
  it("keeps unique ids on known maps", () => {
    const ids = OVERWORLD_PICKUPS.map((pickup) => pickup.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pickup of OVERWORLD_PICKUPS) {
      expect(
        Object.keys(WORLD_MAPS),
        pickup.id,
      ).toContain(pickup.mapId);
    }
  });

  it("does not place TMs or held items in the overworld", () => {
    const names = OVERWORLD_PICKUPS.map((pickup) =>
      pickup.itemName.toLowerCase(),
    );
    expect(names.some((name) => /^tm\d|berry|brace/.test(name))).toBe(false);
  });

  it("collects bag items once per player and migrates old saves", () => {
    const story = normalizeStoryState({ starter: "bulbasaur" });
    expect(story.bagItems).toEqual({});

    const first = collectOverworldItem(story, "t-antidote", "antidote");
    expect(first.accepted).toBe(true);
    expect(first.story.bagItems?.antidote).toBe(1);
    expect(first.story.inventory.potion).toBe(story.inventory.potion);

    const second = collectOverworldItem(first.story, "t-antidote", "antidote");
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("already-collected");
  });

  it("drops unknown or invalid bag entries on load", () => {
    expect(
      normalizeBagItems({ antidote: 2.9, bogus: 5, ether: -1, revive: "x" }),
    ).toEqual({ antidote: 2 });
    expect(Object.keys(BAG_ITEM_CATALOG)).toContain("rare-candy");
  });

  it("covers the FireRed Viridian Forest, Mt. Moon and Route 2 finds", () => {
    const at = (mapId: string, x: number, y: number) =>
      OVERWORLD_PICKUPS.find(
        (pickup) =>
          pickup.mapId === mapId && pickup.x === x && pickup.y === y,
      );
    expect(at("viridian-forest", 40, 21)?.itemId).toBe("antidote");
    expect(at("mt-moon-1f", 42, 35)?.itemId).toBe("rare-candy");
    expect(at("mt-moon-1f", 3, 2)?.itemId).toBe("moon-stone");
    expect(at("route-2", 17, 54)?.itemId).toBe("ether");
    expect(at("pewter-city", 6, 3)?.hidden).toBe(true);
  });
});
