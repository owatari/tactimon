import { describe, expect, it } from "vitest";
import {
  collectOverworldItem,
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";
import {
  createPokemonProgression,
} from "../packages/battle-engine/src";

function storyWithPotionCount(
  potion: number,
): StoryState {
  return {
    starter: "bulbasaur",
    rivalStarter: "charmander",
    firstBattleComplete: true,
    playerPokemon:
      createPokemonProgression("bulbasaur", 5),
    capturedPokemon: [],
    boxedPokemon: [],
    collectedItemIds: [],
    defeatedTrainerIds: [],
    healLocationId: "pallet-town",
    money: 3_000,
    inventory: {
      potion,
      "poke-ball": 5,
    },
  };
}

describe("persistent overworld items", () => {
  it("migrates old saves with no collected item flags", () => {
    expect(
      normalizeStoryState({
        starter: "bulbasaur",
      }).collectedItemIds,
    ).toEqual([]);
  });

  it("collects Viridian's Potion exactly once", () => {
    const story = storyWithPotionCount(1);
    const first = collectOverworldItem(
      story,
      "viridian-city-potion",
      "potion",
    );

    expect(first.accepted).toBe(true);
    expect(first.story.inventory.potion).toBe(2);
    expect(first.story.collectedItemIds).toEqual([
      "viridian-city-potion",
    ]);

    const second = collectOverworldItem(
      first.story,
      "viridian-city-potion",
      "potion",
    );

    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("already-collected");
    expect(second.story.inventory.potion).toBe(2);
  });

  it("does not remove the pickup when the item stack is full", () => {
    const result = collectOverworldItem(
      storyWithPotionCount(999),
      "viridian-city-potion",
      "potion",
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("inventory-full");
    expect(result.story.collectedItemIds).toEqual([]);
    expect(result.story.inventory.potion).toBe(999);
  });
});
