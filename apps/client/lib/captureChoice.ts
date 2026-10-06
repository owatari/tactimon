import { normalizeNickname } from "@tactimon/battle-engine";
import {
  POKEMON_STORAGE_CAPACITY,
  depositCapturedPokemon,
  type CapturedPokemon,
  type StoryState,
} from "./story";

export const MAX_PARTY_COMPANIONS = 5;

export type CaptureDestination = "team" | "box";
export type CaptureChoiceFailure =
  | "no-pending"
  | "box-full"
  | "invalid-swap"
  | "swap-required";

export type CaptureChoiceResult =
  | { ok: true; story: StoryState; destination: CaptureDestination }
  | { ok: false; reason: CaptureChoiceFailure };

export function pendingCaptures(story: Pick<StoryState, "pendingCaptures">): CapturedPokemon[] {
  return story.pendingCaptures ?? [];
}

/** Keeps a catch aside (persisted in the save) until the player chooses where it goes; catches queue up. */
export function holdCapturedPokemon(
  story: StoryState,
  pokemon: CapturedPokemon,
): StoryState {
  return { ...story, pendingCaptures: [...pendingCaptures(story), pokemon] };
}

export function captureRoster(story: StoryState): {
  teamHasRoom: boolean;
  boxHasRoom: boolean;
} {
  return {
    teamHasRoom: story.capturedPokemon.length < MAX_PARTY_COMPANIONS,
    boxHasRoom: story.boxedPokemon.length < POKEMON_STORAGE_CAPACITY,
  };
}

/**
 * Applies the player's choice for the FIRST pending catch: optional nickname, then the team
 * (a full team needs `swapIndex`, the companion that goes to the box instead) or the box.
 */
export function resolvePendingCapture(
  story: StoryState,
  choice: { destination: CaptureDestination; nickname?: string; swapIndex?: number },
): CaptureChoiceResult {
  const [pending, ...rest] = pendingCaptures(story);
  if (!pending) return { ok: false, reason: "no-pending" };

  const nickname = normalizeNickname(choice.nickname);
  const named: CapturedPokemon = { ...pending };
  if (nickname) named.nickname = nickname;
  else delete named.nickname;
  const base: StoryState = { ...story, pendingCaptures: rest };
  const roster = captureRoster(story);

  if (choice.destination === "box") {
    if (!roster.boxHasRoom) return { ok: false, reason: "box-full" };
    return {
      ok: true,
      destination: "box",
      story: { ...base, boxedPokemon: [...base.boxedPokemon, named] },
    };
  }

  if (roster.teamHasRoom) {
    return {
      ok: true,
      destination: "team",
      story: { ...base, capturedPokemon: [...base.capturedPokemon, named] },
    };
  }

  const index = choice.swapIndex;
  if (index === undefined) return { ok: false, reason: "swap-required" };
  if (!Number.isInteger(index) || index < 0 || index >= base.capturedPokemon.length) {
    return { ok: false, reason: "invalid-swap" };
  }
  const deposited = depositCapturedPokemon(base, index);
  if (!deposited.accepted) return { ok: false, reason: "box-full" };
  return {
    ok: true,
    destination: "team",
    story: {
      ...deposited.story,
      capturedPokemon: [...deposited.story.capturedPokemon, named],
    },
  };
}

/**
 * SEND ALL TO BOX: every pending catch goes to the box without a nickname. If the box fills up,
 * the ones that did not fit stay pending (the player decides what to do with them).
 */
export function sendAllPendingToBox(story: StoryState): {
  story: StoryState;
  moved: number;
  remaining: number;
} {
  const queue = pendingCaptures(story);
  const room = Math.max(0, POKEMON_STORAGE_CAPACITY - story.boxedPokemon.length);
  const moving = queue.slice(0, room).map((pokemon) => {
    const plain: CapturedPokemon = { ...pokemon };
    delete plain.nickname;
    return plain;
  });
  const remaining = queue.slice(moving.length);
  return {
    story: {
      ...story,
      boxedPokemon: [...story.boxedPokemon, ...moving],
      pendingCaptures: remaining,
    },
    moved: moving.length,
    remaining: remaining.length,
  };
}
