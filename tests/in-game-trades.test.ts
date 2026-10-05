import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  IN_GAME_TRADES,
  hasCompletedTrade,
  performTrade,
  tradeCandidates,
} from "../apps/client/lib/inGameTrades";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import {
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";
import { resolveWorldObjectDialogueId } from "../apps/client/lib/dialogueSystem";

function player(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    capturedPokemon: [
      { ...createPokemonProgression("pidgey", 6), species: "pidgey" },
      { ...createPokemonProgression("abra", 12), species: "abra" },
    ],
  } as never);
}

describe("in-game trades", () => {
  it("covers the nine FireRed trades, each on a real map with an NPC script", () => {
    expect(IN_GAME_TRADES).toHaveLength(9);
    for (const trade of IN_GAME_TRADES) {
      expect(WORLD_MAPS[trade.mapId], trade.mapId).toBeDefined();
      expect(resolveWorldObjectDialogueId(trade.mapId, trade.x, trade.y)).toBe(
        `trade-${trade.id}`,
      );
    }
  });

  it("swaps Abra for Mr. Mime at the same level, once", () => {
    const trade = IN_GAME_TRADES.find((entry) => entry.id === "mr-mime")!;
    const [candidate] = tradeCandidates(player(), trade);
    expect(candidate.pokemon.species).toBe("abra");

    const result = performTrade(player(), "mr-mime", candidate.captureIndex);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.capturedPokemon[candidate.captureIndex].species).toBe(
      "mr-mime",
    );
    expect(result.story.capturedPokemon[candidate.captureIndex].level).toBe(12);
    expect(hasCompletedTrade(result.story, "mr-mime")).toBe(true);
    expect(performTrade(result.story, "mr-mime", candidate.captureIndex)).toEqual({
      ok: false,
      reason: "done",
    });
  });

  it("refuses the wrong Pokémon and unknown trades", () => {
    expect(performTrade(player(), "mr-mime", 0)).toEqual({
      ok: false,
      reason: "invalid-pokemon",
    });
    expect(performTrade(player(), "nope", 0)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("offers matching party members through the NPC and completes via choice", () => {
    const talk = runDialogueInteraction(player(), {
      kind: "script",
      id: "trade-mr-mime",
    });
    const choice = talk.presentation.pages[0].choices![0];
    expect(choice.label).toContain("Lv. 12");

    const done = runDialogueInteraction(player(), choice.request);
    expect(done.story.capturedPokemon[1].species).toBe("mr-mime");

    const without = runDialogueInteraction(player(), {
      kind: "script",
      id: "trade-jynx",
    });
    expect(without.presentation.pages[0].choices).toBeUndefined();
  });
});
