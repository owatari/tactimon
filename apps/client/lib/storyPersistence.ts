import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
  type StoryState,
} from "./story";

export const STORY_STORAGE_KEY =
  "tactimon.story.v1";
export const STORY_BACKUP_STORAGE_KEY =
  "tactimon.story.v1.backup";
export const STORY_SAVE_VERSION = 2 as const;

type StorySaveEnvelope = {
  version: typeof STORY_SAVE_VERSION;
  story: StoryState;
};

export function serializeStorySave(
  story: StoryState,
): string {
  return JSON.stringify({
    version: STORY_SAVE_VERSION,
    story,
  } satisfies StorySaveEnvelope);
}

export function parseStorySave(
  raw: string | null,
): StoryState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "version" in parsed &&
      "story" in parsed &&
      (parsed as { version?: unknown }).version ===
        STORY_SAVE_VERSION
    ) {
      return normalizeStoryState(
        (parsed as { story?: Partial<StoryState> })
          .story,
      );
    }

    // Legacy v1 saves stored StoryState directly.
    return normalizeStoryState(
      parsed as Partial<StoryState>,
    );
  } catch {
    return null;
  }
}

function storyProgressScore(
  story: StoryState,
): number {
  return (
    (story.starter ? 10_000 : 0) +
    (story.firstBattleComplete ? 5_000 : 0) +
    (story.playerPokemon?.level ?? 0) * 20 +
    story.capturedPokemon.length * 200 +
    story.boxedPokemon.length * 50 +
    story.badgeIds.length * 1_000 +
    story.defeatedTrainerIds.length * 100 +
    story.collectedItemIds.length * 20 +
    (story.keyItemIds?.length ?? 0) * 500 +
    (story.fieldTechniqueIds?.length ?? 0) * 500 +
    (story.clearedObstacleIds?.length ?? 0) * 50 +
    (story.playerWorld?.completedEventIds.length ??
      0) *
      10
  );
}

export function chooseBestStorySave(
  primaryRaw: string | null,
  backupRaw: string | null,
): StoryState {
  const primary = parseStorySave(primaryRaw);
  const backup = parseStorySave(backupRaw);

  if (!primary && !backup) {
    return normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
  }

  if (!primary) {
    return backup!;
  }

  if (!backup) {
    return primary;
  }

  return storyProgressScore(backup) >
    storyProgressScore(primary)
    ? backup
    : primary;
}
