import {
  completeStoryPlayerEvent,
  getStoryPlayerChoice,
  hasStoryPlayerEvent,
  setStoryPlayerChoice,
  type StoryState,
} from "./story";

export const VERMILION_GYM_LOCK_EVENT_ID =
  "vermilion-gym-locks-open";

const ATTEMPT_CHOICE_ID =
  "vermilion-gym-switch-attempt";
const FIRST_SWITCH_CHOICE_ID =
  "vermilion-gym-first-switch";
const TARGET_ONE_CHOICE_ID =
  "vermilion-gym-switch-one";
const TARGET_TWO_CHOICE_ID =
  "vermilion-gym-switch-two";

export const VERMILION_GYM_TRASH_CANS = [
  { id: "vermilion-gym-trash-1", x: 1, y: 10 },
  { id: "vermilion-gym-trash-2", x: 3, y: 10 },
  { id: "vermilion-gym-trash-3", x: 5, y: 10 },
  { id: "vermilion-gym-trash-4", x: 7, y: 10 },
  { id: "vermilion-gym-trash-5", x: 9, y: 10 },
  { id: "vermilion-gym-trash-6", x: 1, y: 12 },
  { id: "vermilion-gym-trash-7", x: 3, y: 12 },
  { id: "vermilion-gym-trash-8", x: 5, y: 12 },
  { id: "vermilion-gym-trash-9", x: 7, y: 12 },
  { id: "vermilion-gym-trash-10", x: 9, y: 12 },
  { id: "vermilion-gym-trash-11", x: 1, y: 14 },
  { id: "vermilion-gym-trash-12", x: 3, y: 14 },
  { id: "vermilion-gym-trash-13", x: 5, y: 14 },
  { id: "vermilion-gym-trash-14", x: 7, y: 14 },
  { id: "vermilion-gym-trash-15", x: 9, y: 14 },
] as const;

export type VermilionGymTrashCanId =
  (typeof VERMILION_GYM_TRASH_CANS)[number]["id"];

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeAttempt(story: StoryState): number {
  const value = Number.parseInt(
    getStoryPlayerChoice(story, ATTEMPT_CHOICE_ID) ?? "0",
    10,
  );

  return Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function switchPairForAttempt(
  story: StoryState,
  attempt: number,
): {
  first: VermilionGymTrashCanId;
  second: VermilionGymTrashCanId;
} {
  const seed = stableHash(
    `${story.starter ?? "none"}:${story.rivalStarter ?? "none"}:${attempt}`,
  );
  const first =
    VERMILION_GYM_TRASH_CANS[
      seed % VERMILION_GYM_TRASH_CANS.length
    ];

  const adjacent = VERMILION_GYM_TRASH_CANS.filter(
    (candidate) =>
      Math.abs(candidate.x - first.x) +
        Math.abs(candidate.y - first.y) ===
      2,
  );
  const second =
    adjacent[
      ((seed >>> 8) + attempt) % adjacent.length
    ];

  return {
    first: first.id,
    second: second.id,
  };
}

function assignSwitchPair(
  story: StoryState,
  attempt: number,
): StoryState {
  const pair = switchPairForAttempt(story, attempt);
  let next = setStoryPlayerChoice(
    story,
    ATTEMPT_CHOICE_ID,
    String(attempt),
  );
  next = setStoryPlayerChoice(
    next,
    TARGET_ONE_CHOICE_ID,
    pair.first,
  );
  return setStoryPlayerChoice(
    next,
    TARGET_TWO_CHOICE_ID,
    pair.second,
  );
}

function storyWithSwitchPair(story: StoryState): StoryState {
  const targetOne = getStoryPlayerChoice(
    story,
    TARGET_ONE_CHOICE_ID,
  );
  const targetTwo = getStoryPlayerChoice(
    story,
    TARGET_TWO_CHOICE_ID,
  );

  if (targetOne && targetTwo) {
    return story;
  }

  return assignSwitchPair(
    story,
    normalizeAttempt(story),
  );
}

export function isVermilionGymLocksOpen(
  story: StoryState,
): boolean {
  return hasStoryPlayerEvent(
    story,
    "story",
    VERMILION_GYM_LOCK_EVENT_ID,
  );
}

export function isVermilionGymBeamWalkable(
  story: StoryState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "vermilion-gym" &&
    isVermilionGymLocksOpen(story) &&
    (y === 6 || y === 7) &&
    x >= 4 &&
    x <= 6
  );
}

export function interactWithVermilionGymTrashCan(
  story: StoryState,
  canId: string,
): {
  story: StoryState;
  message: string;
} {
  if (
    !VERMILION_GYM_TRASH_CANS.some(
      (can) => can.id === canId,
    )
  ) {
    return {
      story,
      message: "Esta lixeira não pertence ao puzzle do Ginásio.",
    };
  }

  if (isVermilionGymLocksOpen(story)) {
    return {
      story,
      message: "Nada além de lixo aqui. As travas elétricas já estão abertas.",
    };
  }

  let next = storyWithSwitchPair(story);
  const targetOne = getStoryPlayerChoice(
    next,
    TARGET_ONE_CHOICE_ID,
  );
  const targetTwo = getStoryPlayerChoice(
    next,
    TARGET_TWO_CHOICE_ID,
  );
  const firstFound =
    getStoryPlayerChoice(
      next,
      FIRST_SWITCH_CHOICE_ID,
    ) === targetOne;

  if (!firstFound) {
    if (canId !== targetOne) {
      return {
        story: next,
        message: "Não! Só tem lixo aqui.",
      };
    }

    next = setStoryPlayerChoice(
      next,
      FIRST_SWITCH_CHOICE_ID,
      targetOne,
    );
    return {
      story: next,
      message:
        "Ei! Há um interruptor embaixo do lixo. A primeira trava elétrica abriu! A segunda está em uma lixeira ao lado.",
    };
  }

  if (canId === targetTwo) {
    next = completeStoryPlayerEvent(
      next,
      "story",
      VERMILION_GYM_LOCK_EVENT_ID,
    );
    return {
      story: next,
      message:
        "A segunda trava elétrica abriu! A barreira para Lt. Surge foi desativada.",
    };
  }

  const nextAttempt = normalizeAttempt(next) + 1;
  next = assignSwitchPair(next, nextAttempt);
  next = setStoryPlayerChoice(
    next,
    FIRST_SWITCH_CHOICE_ID,
    "none",
  );

  return {
    story: next,
    message:
      "Não! Só tem lixo aqui. As travas elétricas foram resetadas!",
  };
}
