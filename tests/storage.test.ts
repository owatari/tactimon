import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
} from "../packages/battle-engine/src";
import {
  POKEMON_STORAGE_CAPACITY,
  depositCapturedPokemon,
  normalizeStoryState,
  placeCapturedPokemon,
  storyCanCapturePokemon,
  withdrawBoxedPokemon,
  type CapturedPokemon,
  type StoryState,
} from "../apps/client/lib/story";
import {
  isPokemonStoragePcAt,
} from "../apps/client/lib/maps";

function caught(
  species: "pidgey" | "rattata",
  level = 3,
): CapturedPokemon {
  return {
    ...createPokemonProgression(species, level),
    species,
  };
}

function storyWithParty(
  capturedPokemon: CapturedPokemon[],
  boxedPokemon: CapturedPokemon[] = [],
): StoryState {
  return {
    starter: "bulbasaur",
    rivalStarter: "charmander",
    firstBattleComplete: true,
    playerPokemon:
      createPokemonProgression("bulbasaur", 5),
    capturedPokemon,
    boxedPokemon,
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

describe("Pokémon PC storage", () => {
  it("migrates old saves with an empty storage", () => {
    const story = normalizeStoryState({
      starter: "bulbasaur",
    });

    expect(story.boxedPokemon).toEqual([]);
  });

  it("uses the FireRed total capacity of 14 boxes by 30 slots", () => {
    expect(POKEMON_STORAGE_CAPACITY).toBe(420);
  });

  it("places a capture in storage when the party is full", () => {
    const party = Array.from(
      { length: 5 },
      (_, index) =>
        caught(
          index % 2 === 0 ? "pidgey" : "rattata",
        ),
    );
    const story = storyWithParty(party);
    const result = placeCapturedPokemon(
      story,
      caught("rattata", 4),
    );

    expect(result.accepted).toBe(true);
    expect(result.destination).toBe("storage");
    expect(result.story.capturedPokemon).toHaveLength(5);
    expect(result.story.boxedPokemon).toHaveLength(1);
  });

  it("deposits and withdraws captured Pokémon without changing their HP", () => {
    const pokemon = {
      ...caught("pidgey", 4),
      currentHp: 1,
    };
    const story = storyWithParty([pokemon]);

    const deposited = depositCapturedPokemon(
      story,
      0,
    );
    expect(deposited.accepted).toBe(true);
    expect(deposited.story.capturedPokemon).toHaveLength(0);
    expect(deposited.story.boxedPokemon[0].currentHp).toBe(1);

    const withdrawn = withdrawBoxedPokemon(
      deposited.story,
      0,
    );
    expect(withdrawn.accepted).toBe(true);
    expect(withdrawn.story.boxedPokemon).toHaveLength(0);
    expect(
      withdrawn.story.capturedPokemon[0].currentHp,
    ).toBe(1);
  });

  it("disables capture only when both party and PC are full", () => {
    const party = Array.from(
      { length: 5 },
      () => caught("pidgey"),
    );
    const box = Array.from(
      { length: POKEMON_STORAGE_CAPACITY },
      () => caught("rattata"),
    );
    const story = storyWithParty(party, box);

    expect(storyCanCapturePokemon(story)).toBe(false);
    expect(
      storyCanCapturePokemon(
        storyWithParty(party, box.slice(1)),
      ),
    ).toBe(true);
  });

  it("recognizes the real PC metatile coordinate", () => {
    expect(
      isPokemonStoragePcAt(
        "viridian-pokemon-center",
        11,
        1,
      ),
    ).toBe(true);
    expect(
      isPokemonStoragePcAt(
        "viridian-pokemon-center",
        10,
        1,
      ),
    ).toBe(false);
  });
});
