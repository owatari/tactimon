import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_STATE,
  hasStoryFieldTechnique,
  interactWithSsAnneCaptain,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("S.S. Anne Captain", () => {
  it("grants Cut as a persistent field technique rather than an item", () => {
    expect(
      hasStoryFieldTechnique(DEFAULT_STORY_STATE, "cut"),
    ).toBe(false);

    const first = interactWithSsAnneCaptain(
      DEFAULT_STORY_STATE,
    );
    expect(
      hasStoryFieldTechnique(first.story, "cut"),
    ).toBe(true);
    expect(first.story.inventory).toEqual(
      DEFAULT_STORY_STATE.inventory,
    );
    expect(first.story.keyItemIds).toEqual(
      DEFAULT_STORY_STATE.keyItemIds,
    );

    const second = interactWithSsAnneCaptain(first.story);
    expect(second.story.fieldTechniqueIds).toEqual(["cut"]);
  });

  it("migrates legacy saves without field-technique state", () => {
    const normalized = normalizeStoryState({
      ...DEFAULT_STORY_STATE,
      fieldTechniqueIds: undefined,
    });
    expect(normalized.fieldTechniqueIds).toEqual([]);
  });
});
