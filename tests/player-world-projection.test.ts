import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_STATE,
  completeStoryPlayerEvent,
  normalizeStoryState,
  setStoryPlayerChoice,
} from "../apps/client/lib/story";
import {
  isPlayerWorldConditionMet,
  projectPlayerWorldDefinitions,
  type PlayerWorldCondition,
} from "../apps/client/lib/playerWorldProjection";

describe("player world visibility projection", () => {
  it("evaluates completed and incomplete player events independently", () => {
    const playerA = completeStoryPlayerEvent(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "obstacle",
      "tree-a",
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const visibleUntilCleared: PlayerWorldCondition = {
      kind: "event",
      namespace: "obstacle",
      id: "tree-a",
      completed: false,
    };

    expect(
      isPlayerWorldConditionMet(
        playerA,
        visibleUntilCleared,
      ),
    ).toBe(false);
    expect(
      isPlayerWorldConditionMet(
        playerB,
        visibleUntilCleared,
      ),
    ).toBe(true);
  });

  it("supports serializable choice and boolean composition rules", () => {
    const base = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const helped = setStoryPlayerChoice(
      base,
      "bill-stage",
      "helped",
    );

    const rule: PlayerWorldCondition = {
      kind: "all",
      conditions: [
        {
          kind: "choice",
          id: "bill-stage",
          equals: "helped",
        },
        {
          kind: "not",
          condition: {
            kind: "event",
            namespace: "story",
            id: "hidden",
          },
        },
      ],
    };

    expect(
      isPlayerWorldConditionMet(helped, rule),
    ).toBe(true);
    expect(
      isPlayerWorldConditionMet(base, rule),
    ).toBe(false);
  });

  it("projects the same static definitions differently for two players", () => {
    const definitions = [
      {
        id: "shared-tree",
        visibleWhen: {
          kind: "event" as const,
          namespace: "obstacle" as const,
          id: "tree-a",
          completed: false,
        },
      },
      {
        id: "always-visible",
      },
    ];

    const playerA = completeStoryPlayerEvent(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "obstacle",
      "tree-a",
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    expect(
      projectPlayerWorldDefinitions(
        definitions,
        playerA,
      ).map((entry) => entry.id),
    ).toEqual(["always-visible"]);

    expect(
      projectPlayerWorldDefinitions(
        definitions,
        playerB,
      ).map((entry) => entry.id),
    ).toEqual([
      "shared-tree",
      "always-visible",
    ]);
  });
});
