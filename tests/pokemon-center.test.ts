import { describe, expect, it } from "vitest";
import {
  calculateDuelPokemonMaxHp,
  createPokemonProgression,
} from "../packages/battle-engine/src";
import {
  healStoryParty,
  storyHasHealthyPokemon,
  type StoryState,
} from "../apps/client/lib/story";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";

function damagedStory(): StoryState {
  const starter = createPokemonProgression(
    "bulbasaur",
    5,
  );
  const pidgey = createPokemonProgression(
    "pidgey",
    3,
  );

  return {
    starter: "bulbasaur",
    rivalStarter: "charmander",
    firstBattleComplete: true,
    playerPokemon: {
      ...starter,
      currentHp: 1,
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
    badgeIds: [],
    healLocationId: "pallet-town",
    money: 3_000,
    inventory: {
      potion: 1,
      "poke-ball": 5,
    },
  };
}

describe("Viridian Pokémon Center", () => {
  it("registers the real 1F interior and city warps", () => {
    expect(
      WORLD_MAPS["viridian-pokemon-center"],
    ).toMatchObject({
      label: "Viridian Pokémon Center",
      spawn: { x: 7, y: 7 },
      fallbackMusicId: 303,
    });

    expect(
      resolveWarpTransitionAt(
        "viridian-city",
        26,
        26,
      ),
    ).toEqual({
      mapId: "viridian-pokemon-center",
      spawn: { x: 7, y: 7 },
    });

    expect(
      resolveWarpTransitionAt(
        "viridian-pokemon-center",
        7,
        8,
      ),
    ).toEqual({
      mapId: "viridian-city",
      spawn: { x: 26, y: 27 },
    });
  });

  it("fully heals hurt and fainted party members", () => {
    const story = damagedStory();
    expect(storyHasHealthyPokemon(story)).toBe(true);

    const healed = healStoryParty(story);

    expect(healed.playerPokemon?.currentHp).toBe(
      calculateDuelPokemonMaxHp(
        healed.playerPokemon!,
      ),
    );
    expect(healed.capturedPokemon[0].currentHp).toBe(
      calculateDuelPokemonMaxHp(
        healed.capturedPokemon[0],
      ),
    );
  });

  it("detects when the entire party has fainted", () => {
    const story = damagedStory();
    const fainted: StoryState = {
      ...story,
      playerPokemon: story.playerPokemon
        ? {
            ...story.playerPokemon,
            currentHp: 0,
          }
        : null,
      capturedPokemon: story.capturedPokemon.map(
        (pokemon) => ({
          ...pokemon,
          currentHp: 0,
        }),
      ),
    };

    expect(
      storyHasHealthyPokemon(fainted),
    ).toBe(false);
    expect(
      storyHasHealthyPokemon(
        healStoryParty(fainted),
      ),
    ).toBe(true);
  });
});
