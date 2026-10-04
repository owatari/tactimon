import { describe, expect, it } from "vitest";
import {
  chooseMtMoonFossil,
  collectOverworldItem,
  completeStoryPlayerEvent,
  DEFAULT_STORY_STATE,
  getStoryFossilChoice,
  getStoryPlayerChoice,
  grantStoryBadge,
  hasStoryBadge,
  hasStoryCollectedItem,
  hasStoryFieldTechnique,
  interactWithCutObstacle,
  interactWithSsAnneCaptain,
  isStoryObstacleCleared,
  isStoryTrainerDefeated,
  markStoryTrainerDefeated,
  normalizeStoryState,
  setStoryPlayerChoice,
} from "../apps/client/lib/story";
import {
  playerWorldEventId,
} from "../apps/client/lib/playerWorldState";
import {
  resolvePlayerOverworldPickups,
} from "../apps/client/lib/overworldPickups";
import {
  resolvePlayerOverworldTrainers,
} from "../apps/client/lib/trainers";
import type {
  MapLayout,
} from "../apps/client/lib/maps";

describe("per-player world state", () => {
  it("migrates legacy progression into namespaced player events", () => {
    const story = normalizeStoryState({
      ...DEFAULT_STORY_STATE,
      collectedItemIds: ["viridian-city-potion"],
      defeatedTrainerIds: ["mtmoon-miguel"],
      clearedObstacleIds: ["vermilion-gym-cut-tree"],
      keyItemIds: ["ss-ticket"],
      fieldTechniqueIds: ["cut"],
      mtMoonFossil: "helix",
      playerWorld: undefined,
    });

    expect(
      story.playerWorld?.completedEventIds,
    ).toEqual(
      expect.arrayContaining([
        playerWorldEventId(
          "pickup",
          "viridian-city-potion",
        ),
        playerWorldEventId(
          "trainer",
          "mtmoon-miguel",
        ),
        playerWorldEventId(
          "obstacle",
          "vermilion-gym-cut-tree",
        ),
        playerWorldEventId(
          "key-item",
          "ss-ticket",
        ),
        playerWorldEventId(
          "field-technique",
          "cut",
        ),
      ]),
    );
    expect(
      story.playerWorld?.choices["mt-moon-fossil"],
    ).toBe("helix");
  });

  it("collecting an item changes only that player instance", () => {
    const playerA = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const result = collectOverworldItem(
      playerA,
      "viridian-city-potion",
      "potion",
    );

    expect(result.accepted).toBe(true);
    expect(
      hasStoryCollectedItem(
        result.story,
        "viridian-city-potion",
      ),
    ).toBe(true);
    expect(
      hasStoryCollectedItem(
        playerB,
        "viridian-city-potion",
      ),
    ).toBe(false);
    expect(playerB.inventory.potion).toBe(1);
  });

  it("badges unlock gates only for the owning player", () => {
    const playerA = grantStoryBadge(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "boulder",
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    expect(
      hasStoryBadge(playerA, "boulder"),
    ).toBe(true);
    expect(
      hasStoryBadge(playerB, "boulder"),
    ).toBe(false);
  });

  it("Cut removes an obstacle only for the player who used it", () => {
    const playerA = interactWithSsAnneCaptain(
      normalizeStoryState(DEFAULT_STORY_STATE),
    ).story;
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const cut = interactWithCutObstacle(
      playerA,
      "vermilion-gym-cut-tree",
    );

    expect(
      hasStoryFieldTechnique(cut.story, "cut"),
    ).toBe(true);
    expect(
      isStoryObstacleCleared(
        cut.story,
        "vermilion-gym-cut-tree",
      ),
    ).toBe(true);
    expect(
      isStoryObstacleCleared(
        playerB,
        "vermilion-gym-cut-tree",
      ),
    ).toBe(false);
  });

  it("trainer and fossil progression is private to each player", () => {
    const playerA = markStoryTrainerDefeated(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "mtmoon-miguel",
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const fossilA = chooseMtMoonFossil(
      playerA,
      "dome",
    );

    expect(fossilA.accepted).toBe(true);
    expect(
      isStoryTrainerDefeated(
        fossilA.story,
        "mtmoon-miguel",
      ),
    ).toBe(true);
    expect(
      getStoryFossilChoice(fossilA.story),
    ).toBe("dome");

    expect(
      isStoryTrainerDefeated(
        playerB,
        "mtmoon-miguel",
      ),
    ).toBe(false);
    expect(
      getStoryFossilChoice(playerB),
    ).toBeNull();
  });
});


describe("generic future player progression", () => {
  it("keeps arbitrary events and branch choices private", () => {
    const playerA = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const eventA = completeStoryPlayerEvent(
      playerA,
      "story",
      "future-door-open",
    );
    const choiceA = setStoryPlayerChoice(
      eventA,
      "future-branch",
      "left",
    );

    expect(
      choiceA.playerWorld?.completedEventIds,
    ).toContain(
      playerWorldEventId(
        "story",
        "future-door-open",
      ),
    );
    expect(
      playerB.playerWorld?.completedEventIds,
    ).not.toContain(
      playerWorldEventId(
        "story",
        "future-door-open",
      ),
    );
    expect(
      getStoryPlayerChoice(
        choiceA,
        "future-branch",
      ),
    ).toBe("left");
    expect(
      getStoryPlayerChoice(
        playerB,
        "future-branch",
      ),
    ).toBeNull();
  });
});

describe("player-scoped world projection", () => {
  it("projects pickups independently from private player events", () => {
    const base = normalizeStoryState(DEFAULT_STORY_STATE);
    const playerA = collectOverworldItem(
      base,
      "viridian-city-potion",
      "potion",
    ).story;
    const playerB = normalizeStoryState(DEFAULT_STORY_STATE);

    expect(
      resolvePlayerOverworldPickups(
        "viridian-city",
        playerA,
      ).some(
        (pickup) =>
          pickup.id === "viridian-city-potion",
      ),
    ).toBe(false);
    expect(
      resolvePlayerOverworldPickups(
        "viridian-city",
        playerB,
      ).some(
        (pickup) =>
          pickup.id === "viridian-city-potion",
      ),
    ).toBe(true);
  });

  it("projects trainer defeat independently from private player events", () => {
    const width = 80;
    const height = 40;
    const layout: MapLayout = {
      index: 0,
      id: "TEST_ROUTE3",
      name: "Test Route 3",
      width,
      height,
      primary_tileset: "test",
      secondary_tileset: "test",
      cells: Array.from(
        { length: width * height },
        () => ({
          raw: 0,
          metatile: 0,
          collision: 0,
          elevation: 0,
        }),
      ),
    };

    const playerA = markStoryTrainerDefeated(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "route3-calvin",
    );
    const playerB = normalizeStoryState(DEFAULT_STORY_STATE);

    const trainersA = resolvePlayerOverworldTrainers(
      "route-3",
      layout,
      [],
      playerA,
    );
    const trainersB = resolvePlayerOverworldTrainers(
      "route-3",
      layout,
      [],
      playerB,
    );

    expect(
      trainersA.find(
        (trainer) => trainer.id === "route3-calvin",
      )?.defeated,
    ).toBe(true);
    expect(
      trainersB.find(
        (trainer) => trainer.id === "route3-calvin",
      )?.defeated,
    ).toBe(false);
  });
});
