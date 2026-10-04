import { describe, expect, it } from "vitest";
import {
  chooseMtMoonFossil,
  collectOverworldItem,
  DEFAULT_STORY_STATE,
  getStoryFossilChoice,
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
} from "../apps/client/lib/story";
import {
  playerWorldEventId,
} from "../apps/client/lib/playerWorldState";

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
