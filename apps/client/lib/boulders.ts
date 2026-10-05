import {
  getStoryPlayerChoice,
  setStoryPlayerChoice,
  type StoryState,
} from "./story";

/**
 * Strength boulders are pushed one tile at a time. Pushed positions live in
 * the per-player world state (`choices["boulder:<id>"] = "x,y"`) and are
 * reset whenever the player loads the map again, as in FireRed.
 */

const boulderChoiceKey = (boulderId: string) => `boulder:${boulderId}`;

export function resolveBoulderPosition(
  story: StoryState,
  boulderId: string,
  home: { x: number; y: number },
): { x: number; y: number } {
  const value = getStoryPlayerChoice(story, boulderChoiceKey(boulderId));
  if (!value) return home;

  const [x, y] = value.split(",").map(Number);
  return Number.isInteger(x) && Number.isInteger(y)
    ? { x, y }
    : home;
}

export function setBoulderPosition(
  story: StoryState,
  boulderId: string,
  position: { x: number; y: number },
): StoryState {
  return setStoryPlayerChoice(
    story,
    boulderChoiceKey(boulderId),
    `${position.x},${position.y}`,
  );
}

/** Puts every listed boulder back at its home tile. */
export function resetBoulders(
  story: StoryState,
  boulderIds: readonly string[],
): StoryState {
  let next = story;
  for (const id of boulderIds) {
    if (getStoryPlayerChoice(next, boulderChoiceKey(id))) {
      next = setStoryPlayerChoice(next, boulderChoiceKey(id), "");
    }
  }
  return next;
}

export type PushDirection = { x: number; y: number };

/**
 * Pure push rule: the boulder moves one tile if the destination is free.
 * `isFree` answers for walls, water, warps and other objects.
 */
export function resolveBoulderPush(
  boulder: { x: number; y: number },
  direction: PushDirection,
  isFree: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  const target = {
    x: boulder.x + direction.x,
    y: boulder.y + direction.y,
  };
  return isFree(target.x, target.y) ? target : null;
}
