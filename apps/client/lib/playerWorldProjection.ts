import {
  getStoryPlayerChoice,
  hasStoryPlayerEvent,
  type StoryState,
} from "./story";
import type {
  PlayerWorldEventNamespace,
} from "./playerWorldState";

export type PlayerWorldCondition =
  | {
      kind: "event";
      namespace: PlayerWorldEventNamespace;
      id: string;
      completed?: boolean;
    }
  | {
      kind: "choice";
      id: string;
      equals?: string;
      set?: boolean;
    }
  | {
      kind: "all";
      conditions: readonly PlayerWorldCondition[];
    }
  | {
      kind: "any";
      conditions: readonly PlayerWorldCondition[];
    }
  | {
      kind: "not";
      condition: PlayerWorldCondition;
    };

export type PlayerWorldProjectedDefinition = {
  visibleWhen?: PlayerWorldCondition;
};

export function isPlayerWorldConditionMet(
  story: StoryState,
  condition: PlayerWorldCondition,
): boolean {
  if (condition.kind === "event") {
    const completed = hasStoryPlayerEvent(
      story,
      condition.namespace,
      condition.id,
    );
    return condition.completed === false
      ? !completed
      : completed;
  }

  if (condition.kind === "choice") {
    const value = getStoryPlayerChoice(
      story,
      condition.id,
    );

    if (condition.equals !== undefined) {
      return value === condition.equals;
    }

    if (condition.set !== undefined) {
      return condition.set
        ? value !== null
        : value === null;
    }

    return value !== null;
  }

  if (condition.kind === "all") {
    return condition.conditions.every((entry) =>
      isPlayerWorldConditionMet(story, entry),
    );
  }

  if (condition.kind === "any") {
    return condition.conditions.some((entry) =>
      isPlayerWorldConditionMet(story, entry),
    );
  }

  return !isPlayerWorldConditionMet(
    story,
    condition.condition,
  );
}

export function projectPlayerWorldDefinitions<
  T extends PlayerWorldProjectedDefinition,
>(
  definitions: readonly T[],
  story: StoryState,
): T[] {
  return definitions.filter(
    (definition) =>
      !definition.visibleWhen ||
      isPlayerWorldConditionMet(
        story,
        definition.visibleWhen,
      ),
  );
}
