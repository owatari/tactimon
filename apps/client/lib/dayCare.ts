import { localizedSpeciesName as speciesDisplayName } from "./i18n/names";
import {
  grantExperiencePoints,
  type PokemonProgression,
} from "@tactimon/battle-engine";
import {
  placeCapturedPokemon,
  type CapturedPokemon,
  type StoryState,
} from "./story";

/**
 * Route 5 Day Care. One Pokémon stays behind and gains 1 experience point
 * per overworld step; the fee is ₽100 plus ₽100 per level gained (FireRed).
 * The starter in the lead slot is typed apart and cannot be left there.
 */

export const DAY_CARE_BASE_FEE = 100;
export const DAY_CARE_MAP_ID = "route-5-day-care";

export type DayCareDepositFailure =
  | "occupied"
  | "invalid"
  | "last-healthy";

export function dayCareFee(levelsGained: number): number {
  return DAY_CARE_BASE_FEE * (1 + Math.max(0, levelsGained));
}

function healthyCount(story: StoryState): number {
  return [story.playerPokemon, ...story.capturedPokemon].filter(
    (pokemon) => pokemon && pokemon.currentHp > 0,
  ).length;
}

export type DayCareDepositResult =
  | { ok: true; story: StoryState; name: string }
  | { ok: false; reason: DayCareDepositFailure };

/** `capturedIndex` indexes `story.capturedPokemon` (party slots 2–6). */
export function depositAtDayCare(
  story: StoryState,
  capturedIndex: number,
): DayCareDepositResult {
  if (story.dayCare) return { ok: false, reason: "occupied" };

  const pokemon = story.capturedPokemon[capturedIndex];
  if (!pokemon) return { ok: false, reason: "invalid" };

  const remaining = story.capturedPokemon.filter(
    (_, index) => index !== capturedIndex,
  );
  const hasHealthyLeft = [story.playerPokemon, ...remaining].some(
    (entry) => entry && entry.currentHp > 0,
  );
  if (!hasHealthyLeft && healthyCount(story) > 0) {
    return { ok: false, reason: "last-healthy" };
  }

  return {
    ok: true,
    name: speciesDisplayName(pokemon.species),
    story: {
      ...story,
      capturedPokemon: remaining,
      dayCare: { pokemon, startLevel: pokemon.level, steps: 0 },
    },
  };
}

export type DayCareStatus = {
  name: string;
  startLevel: number;
  level: number;
  levelsGained: number;
  fee: number;
  progression: PokemonProgression;
};

/** What the Pokémon would look like if picked up right now. */
export function dayCareStatus(story: StoryState): DayCareStatus | null {
  const stay = story.dayCare;
  if (!stay) return null;

  const reward =
    stay.steps > 0
      ? grantExperiencePoints(stay.pokemon, stay.steps)
      : null;
  const progression = reward?.progression ?? stay.pokemon;
  const levelsGained = Math.max(0, progression.level - stay.startLevel);

  return {
    name: speciesDisplayName(progression.species),
    startLevel: stay.startLevel,
    level: progression.level,
    levelsGained,
    fee: dayCareFee(levelsGained),
    progression,
  };
}

export type DayCareWithdrawResult =
  | { ok: true; story: StoryState; fee: number; name: string; level: number }
  | { ok: false; reason: "empty" | "money" | "storage-full"; fee?: number };

export function withdrawFromDayCare(
  story: StoryState,
): DayCareWithdrawResult {
  const status = dayCareStatus(story);
  if (!status || !story.dayCare) return { ok: false, reason: "empty" };
  if (story.money < status.fee) {
    return { ok: false, reason: "money", fee: status.fee };
  }

  const placed = placeCapturedPokemon(
    { ...story, dayCare: null, money: story.money - status.fee },
    {
      ...status.progression,
      species: status.progression.species,
    } as CapturedPokemon,
  );
  if (!placed.accepted) {
    return { ok: false, reason: "storage-full" };
  }

  return {
    ok: true,
    story: placed.story,
    fee: status.fee,
    name: status.name,
    level: status.level,
  };
}

/** One walked step: the Pokémon at the Day Care gains experience. */
export function applyDayCareStep(story: StoryState): StoryState {
  if (!story.dayCare) return story;
  return {
    ...story,
    dayCare: {
      ...story.dayCare,
      steps: Math.min(1_000_000, story.dayCare.steps + 1),
    },
  };
}
