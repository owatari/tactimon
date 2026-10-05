import { withHmUsers } from "./helpers/hmParty";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_STATE,
  interactWithCutObstacle,
  interactWithSsAnneCaptain,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("Vermilion Cut obstacle", () => {
  const obstacleId = "vermilion-gym-cut-tree";

  it("does not clear the tree before Cut is learned", () => {
    const result = interactWithCutObstacle(
      DEFAULT_STORY_STATE,
      obstacleId,
    );
    expect(result.story.clearedObstacleIds).toEqual([]);
  });

  it("persists the cleared tree after the Captain teaches Cut", () => {
    const withCut = interactWithSsAnneCaptain(
      withHmUsers(DEFAULT_STORY_STATE, "rattata"),
    ).story;
    const cut = interactWithCutObstacle(
      withCut,
      obstacleId,
    );
    expect(cut.story.clearedObstacleIds).toEqual([
      obstacleId,
    ]);
    expect(
      normalizeStoryState(cut.story).clearedObstacleIds,
    ).toEqual([obstacleId]);

    const again = interactWithCutObstacle(
      cut.story,
      obstacleId,
    );
    expect(again.story.clearedObstacleIds).toEqual([
      obstacleId,
    ]);
  });
});
