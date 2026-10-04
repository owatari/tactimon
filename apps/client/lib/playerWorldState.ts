export const PLAYER_WORLD_STATE_VERSION = 1 as const;

export type PlayerWorldEventNamespace =
  | "pickup"
  | "trainer"
  | "badge"
  | "obstacle"
  | "key-item"
  | "field-technique"
  | "story"
  | "reward";

export type PlayerWorldState = {
  version: typeof PLAYER_WORLD_STATE_VERSION;
  completedEventIds: string[];
  choices: Record<string, string>;
};

export type LegacyPlayerWorldSeed = {
  collectedItemIds?: unknown;
  defeatedTrainerIds?: unknown;
  badgeIds?: unknown;
  clearedObstacleIds?: unknown;
  keyItemIds?: unknown;
  fieldTechniqueIds?: unknown;
  mtMoonFossil?: unknown;
  billStage?: unknown;
};

const MAX_EVENTS = 4096;
const MAX_CHOICES = 256;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (entry): entry is string =>
          typeof entry === "string" &&
          entry.length > 0,
      ),
    ),
  );
}

function normalizeChoices(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, entry]) =>
          key.length > 0 &&
          typeof entry === "string" &&
          entry.length > 0,
      )
      .slice(0, MAX_CHOICES),
  );
}

export function playerWorldEventId(
  namespace: PlayerWorldEventNamespace,
  id: string,
): string {
  return `${namespace}:${id}`;
}

export function createEmptyPlayerWorldState(): PlayerWorldState {
  return {
    version: PLAYER_WORLD_STATE_VERSION,
    completedEventIds: [],
    choices: {},
  };
}

function addSeedEvents(
  target: Set<string>,
  namespace: PlayerWorldEventNamespace,
  value: unknown,
): void {
  for (const id of normalizeStringArray(value)) {
    target.add(playerWorldEventId(namespace, id));
  }
}

export function normalizePlayerWorldState(
  value: unknown,
  legacy: LegacyPlayerWorldSeed = {},
): PlayerWorldState {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<PlayerWorldState>)
      : {};

  const completed = new Set(
    normalizeStringArray(candidate.completedEventIds),
  );

  addSeedEvents(completed, "pickup", legacy.collectedItemIds);
  addSeedEvents(completed, "trainer", legacy.defeatedTrainerIds);
  addSeedEvents(completed, "badge", legacy.badgeIds);
  addSeedEvents(completed, "obstacle", legacy.clearedObstacleIds);
  addSeedEvents(completed, "key-item", legacy.keyItemIds);
  addSeedEvents(
    completed,
    "field-technique",
    legacy.fieldTechniqueIds,
  );

  const choices = normalizeChoices(candidate.choices);

  if (
    (legacy.mtMoonFossil === "dome" ||
      legacy.mtMoonFossil === "helix") &&
    !choices["mt-moon-fossil"]
  ) {
    choices["mt-moon-fossil"] = legacy.mtMoonFossil;
  }

  if (
    (legacy.billStage === "unmet" ||
      legacy.billStage === "teleporter-ready" ||
      legacy.billStage === "helped") &&
    !choices["bill-stage"]
  ) {
    choices["bill-stage"] = legacy.billStage;
  }

  return {
    version: PLAYER_WORLD_STATE_VERSION,
    completedEventIds: Array.from(completed).slice(0, MAX_EVENTS),
    choices,
  };
}

export function hasPlayerWorldEvent(
  state: PlayerWorldState,
  namespace: PlayerWorldEventNamespace,
  id: string,
): boolean {
  return state.completedEventIds.includes(
    playerWorldEventId(namespace, id),
  );
}

export function completePlayerWorldEvent(
  state: PlayerWorldState,
  namespace: PlayerWorldEventNamespace,
  id: string,
): PlayerWorldState {
  const eventId = playerWorldEventId(namespace, id);
  if (state.completedEventIds.includes(eventId)) return state;

  return {
    ...state,
    completedEventIds: [
      ...state.completedEventIds,
      eventId,
    ].slice(0, MAX_EVENTS),
  };
}

export function getPlayerWorldChoice(
  state: PlayerWorldState,
  choiceId: string,
): string | null {
  return state.choices[choiceId] ?? null;
}

export function setPlayerWorldChoice(
  state: PlayerWorldState,
  choiceId: string,
  value: string,
): PlayerWorldState {
  if (state.choices[choiceId] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      [choiceId]: value,
    },
  };
}
