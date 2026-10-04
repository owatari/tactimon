import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
} from "../packages/battle-engine/src";
import {
  chooseStarter,
  completeStoryPlayerEvent,
  setStoryPlayerChoice,
} from "../apps/client/lib/story";
import {
  chooseBestStorySave,
  parseStorySave,
  serializeStorySave,
} from "../apps/client/lib/storyPersistence";

function progressedStory() {
  let story = chooseStarter("bulbasaur");
  const starter = story.playerPokemon!;
  const captured = createPokemonProgression(
    "pikachu",
    12,
  );
  const boxed = createPokemonProgression(
    "geodude",
    10,
  );

  story = {
    ...story,
    firstBattleComplete: true,
    playerPokemon: {
      ...starter,
      currentHp: 3,
      status: "poison",
      movePp: {
        ...starter.movePp,
        tackle: 7,
      },
    },
    capturedPokemon: [
      {
        ...captured,
        species: "pikachu",
        currentHp: 5,
        status: "paralysis",
      },
    ],
    boxedPokemon: [
      {
        ...boxed,
        species: "geodude",
      },
    ],
    money: 4321,
    inventory: {
      potion: 7,
      "poke-ball": 12,
    },
    badgeIds: ["boulder", "cascade", "thunder"],
    defeatedTrainerIds: [
      "pewter-brock",
      "cerulean-misty",
    ],
    collectedItemIds: [
      "viridian-city-potion",
    ],
    keyItemIds: ["ss-ticket"],
    fieldTechniqueIds: ["cut"],
    clearedObstacleIds: [
      "vermilion-gym-cut-tree",
    ],
    billStage: "helped",
  };

  story = completeStoryPlayerEvent(
    story,
    "story",
    "vermilion-gym-locks-open",
  );
  story = setStoryPlayerChoice(
    story,
    "vermilion-gym-switch-attempt",
    "2",
  );

  return story;
}

describe("Sleep save persistence", () => {
  it("round-trips the remaining Sleep counter", () => {
    const story = chooseStarter("bulbasaur");
    if (!story.playerPokemon) {
      throw new Error("Starter missing");
    }

    const sleeping = {
      ...story,
      playerPokemon: {
        ...story.playerPokemon,
        status: "sleep" as const,
        sleepTurnsRemaining: 4,
      },
    };
    const restored = parseStorySave(
      serializeStorySave(sleeping),
    );

    expect(restored).not.toBeNull();
    expect(restored?.playerPokemon?.status).toBe(
      "sleep",
    );
    expect(
      restored?.playerPokemon?.sleepTurnsRemaining,
    ).toBe(4);
  });

  it("migrates an old Sleep save without a counter", () => {
    const story = chooseStarter("bulbasaur");
    if (!story.playerPokemon) {
      throw new Error("Starter missing");
    }

    const legacy = {
      ...story,
      playerPokemon: {
        ...story.playerPokemon,
        status: "sleep" as const,
      },
    };
    delete (
      legacy.playerPokemon as {
        sleepTurnsRemaining?: number;
      }
    ).sleepTurnsRemaining;

    const restored = parseStorySave(
      JSON.stringify(legacy),
    );

    expect(restored?.playerPokemon?.status).toBe(
      "sleep",
    );
    expect(
      restored?.playerPokemon?.sleepTurnsRemaining,
    ).toBe(2);
  });
});


describe("story persistence", () => {
  it("round-trips full gameplay progression", () => {
    const story = progressedStory();
    const restored = parseStorySave(
      serializeStorySave(story),
    );

    expect(restored).not.toBeNull();
    expect(restored).toMatchObject({
      starter: "bulbasaur",
      firstBattleComplete: true,
      money: 4321,
      inventory: {
        potion: 7,
        "poke-ball": 12,
      },
      badgeIds: ["boulder", "cascade", "thunder"],
      defeatedTrainerIds: [
        "pewter-brock",
        "cerulean-misty",
      ],
      collectedItemIds: [
        "viridian-city-potion",
      ],
      keyItemIds: ["ss-ticket"],
      fieldTechniqueIds: ["cut"],
      clearedObstacleIds: [
        "vermilion-gym-cut-tree",
      ],
      billStage: "helped",
    });
    expect(restored?.playerPokemon).toMatchObject({
      currentHp: 3,
      status: "poison",
    });
    expect(
      restored?.playerPokemon?.movePp.tackle,
    ).toBe(7);
    expect(restored?.capturedPokemon[0]).toMatchObject({
      species: "pikachu",
      level: 12,
      currentHp: 5,
      status: "paralysis",
    });
    expect(restored?.boxedPokemon[0]).toMatchObject({
      species: "geodude",
      level: 10,
    });
    expect(
      restored?.playerWorld?.completedEventIds,
    ).toContain(
      "story:vermilion-gym-locks-open",
    );
    expect(
      restored?.playerWorld?.choices[
        "vermilion-gym-switch-attempt"
      ],
    ).toBe("2");
  });

  it("continues to load legacy raw StoryState saves", () => {
    const story = progressedStory();
    const restored = parseStorySave(
      JSON.stringify(story),
    );

    expect(restored?.starter).toBe("bulbasaur");
    expect(restored?.badgeIds).toEqual([
      "boulder",
      "cascade",
      "thunder",
    ]);
    expect(restored?.capturedPokemon).toHaveLength(1);
  });

  it("prefers a progressed backup over a clobbered empty primary save", () => {
    const progressed = progressedStory();
    const empty = chooseStarter("charmander");

    const restored = chooseBestStorySave(
      JSON.stringify({
        starter: null,
        rivalStarter: null,
        firstBattleComplete: false,
        playerPokemon: null,
        capturedPokemon: [],
        boxedPokemon: [],
        collectedItemIds: [],
        defeatedTrainerIds: [],
        badgeIds: [],
        mtMoonFossil: null,
        healLocationId: "pallet-town",
        money: 3000,
        inventory: {
          potion: 1,
          "poke-ball": 5,
        },
      }),
      serializeStorySave(progressed),
    );

    expect(restored.starter).toBe("bulbasaur");
    expect(restored.badgeIds).toContain("thunder");

    expect(
      chooseBestStorySave(
        serializeStorySave(empty),
        null,
      ).starter,
    ).toBe("charmander");
  });
});
