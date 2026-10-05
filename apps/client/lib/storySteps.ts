import { applyDayCareStep } from "./dayCare";
import { applySafariStep } from "./safari";
import { applyStoryOverworldStep, type StoryState } from "./story";

/**
 * Everything that advances by one completed overworld step: field poison,
 * Day Care experience and the Safari Zone counter. Pure; `mapId` is where the
 * step ended.
 */
export function advanceStoryStep(
  story: StoryState,
  mapId: string,
): StoryState {
  return applySafariStep(
    applyDayCareStep(applyStoryOverworldStep(story)),
    mapId,
  ).story;
}
