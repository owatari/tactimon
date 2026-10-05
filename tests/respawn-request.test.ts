import { describe, expect, it } from "vitest";
import {
  resolveWhiteOutRespawn,
  shouldApplyRespawnRequest,
} from "../apps/client/lib/maps";
import {
  applyStoryOverworldStep,
  chooseStarter,
  shouldStartStoryWhiteOut,
  type StoryState,
} from "../apps/client/lib/story";
import { createPokemonProgression } from "../packages/battle-engine/src";

describe("respawn requests", () => {
  it("applies a whiteout respawn exactly once per request id", () => {
    const request = { id: 1, ...resolveWhiteOutRespawn("viridian-city") };

    expect(shouldApplyRespawnRequest(request, null)).toBe(true);
    // Re-running the effect (remount, Fast Refresh, new callback identity)
    // must not teleport the player back to the Pokémon Center.
    expect(shouldApplyRespawnRequest(request, 1)).toBe(false);
    expect(shouldApplyRespawnRequest(null, 1)).toBe(false);
    // A genuinely new whiteout is applied.
    expect(shouldApplyRespawnRequest({ ...request, id: 2 }, 1)).toBe(true);
  });
});

describe("field poison and whiteout", () => {
  function poisonedParty(): StoryState {
    const story = chooseStarter("bulbasaur");
    const pidgey = createPokemonProgression("pidgey", 7);
    return {
      ...story,
      firstBattleComplete: true,
      poisonStepCounter: 4,
      playerPokemon: {
        ...story.playerPokemon!,
        currentHp: 1,
        status: "poison",
      },
      capturedPokemon: [{ ...pidgey, species: "pidgey", currentHp: 12 }],
    };
  }

  it("does not white out when poison faints one Pokémon but another is healthy", () => {
    const next = applyStoryOverworldStep(poisonedParty());
    expect(next.playerPokemon!.currentHp).toBe(0);
    expect(
      shouldStartStoryWhiteOut(next, {
        battleActive: false,
        whiteOutPending: false,
      }),
    ).toBe(false);
  });

  it("whites out when poison faints the last conscious Pokémon", () => {
    const story = poisonedParty();
    const next = applyStoryOverworldStep({
      ...story,
      capturedPokemon: [{ ...story.capturedPokemon[0], currentHp: 0 }],
    });
    expect(
      shouldStartStoryWhiteOut(next, {
        battleActive: false,
        whiteOutPending: false,
      }),
    ).toBe(true);
  });
});
