import {
  resolveDialogueScript,
  resolveWorldObjectDialogueId,
  resolveWorldObjectDialogueRequest,
  runDialogueInteraction,
} from "./dialogueSystem";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "./story";

export function resolveNpcDialogueId(
  mapId: string,
  x: number,
  y: number,
): string | null {
  return resolveWorldObjectDialogueId(mapId, x, y);
}

export function resolveNpcDialogue(
  mapId: string,
  x: number,
  y: number,
  firstBattleComplete: boolean,
): string | null {
  const id = resolveNpcDialogueId(mapId, x, y);
  const story = normalizeStoryState({
    ...DEFAULT_STORY_STATE,
    firstBattleComplete,
  });
  const presentation = id
    ? resolveDialogueScript(
        story,
        id,
      )
    : runDialogueInteraction(
        story,
        resolveWorldObjectDialogueRequest(
          mapId,
          x,
          y,
          "NPC",
        ),
      ).presentation;

  return presentation?.pages
    .map((entry) =>
      entry.speaker
        ? `${entry.speaker}: ${entry.text}`
        : entry.text,
    )
    .join(" ") ?? null;
}
