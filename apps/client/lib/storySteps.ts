import { applySafariStep } from "./safari";
import { applyStoryOverworldStep, type StoryState } from "./story";

/**
 * Everything that advances by one completed overworld step: field poison,
 * the Safari Zone counter. Pure; `mapId` is where the step ended.
 */
export function advanceStoryStep(
  story: StoryState,
  mapId: string,
): StoryState {
  return applySafariStep(applyStoryOverworldStep(story), mapId).story;
}
