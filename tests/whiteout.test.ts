import { describe, expect, it } from "vitest";
import {
  applyStoryWhiteOut,
  computeWhiteOutMoneyLoss,
  normalizeStoryState,
  registerStoryHealLocation,
  storyHasHealthyPokemon,
  type StoryState,
} from "../apps/client/lib/story";
import {
  resolveWhiteOutRespawn,
} from "../apps/client/lib/maps";
import {
  calculateDuelPokemonMaxHp,
  createPokemonProgression,
} from "../packages/battle-engine/src";

function faintedStory(): StoryState {
  const starter = createPokemonProgression(
    "bulbasaur",
    5,
  );
  const pidgey = createPokemonProgression(
    "pidgey",
    7,
  );

  return {
    starter: "bulbasaur",
    rivalStarter: "charmander",
    firstBattleComplete: true,
    playerPokemon: {
      ...starter,
      currentHp: 0,
    },
    capturedPokemon: [
      {
        ...pidgey,
        species: "pidgey",
        currentHp: 0,
      },
    ],
    boxedPokemon: [],
    collectedItemIds: [],
    defeatedTrainerIds: [],
    healLocationId: "pallet-town",
    money: 3_000,
    inventory: {
      potion: 1,
      "poke-ball": 5,
    },
  };
}

describe("FireRed-style whiteout", () => {
  it("migrates old saves to Pallet as the initial heal location", () => {
    expect(
      normalizeStoryState({
        starter: "bulbasaur",
      }).healLocationId,
    ).toBe("pallet-town");
  });

  it("uses the zero-badge FireRed money-loss formula", () => {
    const story = faintedStory();

    expect(
      computeWhiteOutMoneyLoss(story),
    ).toBe(7 * 4 * 2);
  });

  it("heals the party and removes the calculated money", () => {
    const story = faintedStory();
    const result = applyStoryWhiteOut(story);

    expect(result.moneyLost).toBe(56);
    expect(result.story.money).toBe(2_944);
    expect(
      storyHasHealthyPokemon(result.story),
    ).toBe(true);
    expect(result.story.playerPokemon?.currentHp).toBe(
      calculateDuelPokemonMaxHp(
        result.story.playerPokemon!,
      ),
    );
    expect(
      result.story.capturedPokemon[0].currentHp,
    ).toBe(
      calculateDuelPokemonMaxHp(
        result.story.capturedPokemon[0],
      ),
    );
  });

  it("registers Viridian as the respawn after reaching its Center", () => {
    const story = registerStoryHealLocation(
      faintedStory(),
      "viridian-city",
    );

    expect(story.healLocationId).toBe(
      "viridian-city",
    );
    expect(
      resolveWhiteOutRespawn(
        story.healLocationId,
      ),
    ).toEqual({
      mapId: "viridian-pokemon-center",
      spawn: { x: 7, y: 7 },
    });
  });

  it("falls back to the real Pallet heal coordinate before Viridian", () => {
    expect(
      resolveWhiteOutRespawn("pallet-town"),
    ).toEqual({
      mapId: "pallet-town",
      spawn: { x: 6, y: 8 },
    });
  });

  it("caps the money loss at the amount currently held", () => {
    const story = {
      ...faintedStory(),
      money: 20,
    };

    const result = applyStoryWhiteOut(story);

    expect(result.moneyLost).toBe(20);
    expect(result.story.money).toBe(0);
  });
});
