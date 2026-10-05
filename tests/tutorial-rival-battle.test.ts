import { describe, expect, it } from "vitest";
import {
  chooseStarter,
  completeTutorialRivalBattle,
  shouldStartStoryWhiteOut,
  storyHasHealthyPokemon,
  type StoryState,
} from "../apps/client/lib/story";
import { calculateDuelPokemonMaxHp } from "../packages/battle-engine/src";

function labStory(): StoryState {
  const story = chooseStarter("bulbasaur");
  return { ...story, money: 3000, healLocationId: "pallet-town" };
}

describe("Oak's Lab tutorial rival battle", () => {
  it("restores the party and stays in the lab after a loss", () => {
    const story = labStory();
    const lost: StoryState = {
      ...story,
      playerPokemon: {
        ...story.playerPokemon!,
        currentHp: 0,
        status: "poison",
        movePp: Object.fromEntries(
          story.playerPokemon!.activeMoves.map((move) => [move, 0]),
        ),
      },
    };

    const result = completeTutorialRivalBattle(lost);

    expect(result.firstBattleComplete).toBe(true);
    expect(result.playerPokemon!.currentHp).toBe(
      calculateDuelPokemonMaxHp(result.playerPokemon!),
    );
    expect(result.playerPokemon!.status).toBeNull();
    for (const move of result.playerPokemon!.activeMoves) {
      expect(result.playerPokemon!.movePp[move]).toBeGreaterThan(0);
    }
    // No whiteout: no money loss and nothing left for the whiteout effect.
    expect(result.money).toBe(3000);
    expect(storyHasHealthyPokemon(result)).toBe(true);
    expect(
      shouldStartStoryWhiteOut(result, {
        battleActive: false,
        whiteOutPending: false,
      }),
    ).toBe(false);
  });

  it("also restores the party after a win", () => {
    const story = labStory();
    const won: StoryState = {
      ...story,
      playerPokemon: { ...story.playerPokemon!, currentHp: 3 },
    };

    const result = completeTutorialRivalBattle(won);

    expect(result.firstBattleComplete).toBe(true);
    expect(result.playerPokemon!.currentHp).toBe(
      calculateDuelPokemonMaxHp(result.playerPokemon!),
    );
  });
});

describe("whiteout trigger", () => {
  const fainted = (): StoryState => {
    const story = labStory();
    return {
      ...story,
      firstBattleComplete: true,
      playerPokemon: { ...story.playerPokemon!, currentHp: 0 },
    };
  };

  it("starts for a fully fainted party outside battle", () => {
    expect(
      shouldStartStoryWhiteOut(fainted(), {
        battleActive: false,
        whiteOutPending: false,
      }),
    ).toBe(true);
  });

  it("never starts during battle, twice, or before the journey begins", () => {
    expect(
      shouldStartStoryWhiteOut(fainted(), {
        battleActive: true,
        whiteOutPending: false,
      }),
    ).toBe(false);
    expect(
      shouldStartStoryWhiteOut(fainted(), {
        battleActive: false,
        whiteOutPending: true,
      }),
    ).toBe(false);
    expect(
      shouldStartStoryWhiteOut(
        { ...fainted(), playerPokemon: null },
        { battleActive: false, whiteOutPending: false },
      ),
    ).toBe(false);
  });
});
