import {
  DUEL_MOVES,
  duelSpeciesTypes,
  isDuelSpeciesId,
  resolveMoveLearning,
  speciesDisplayName,
  type DuelMoveId,
  type PokemonProgression,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import { getStoryParty } from "./gameMenu";
import {
  getStoryPlayerChoice,
  setStoryPlayerChoice,
  type StoryState,
} from "./story";

/**
 * Route 4 move tutors (FireRed): two black belts teach MEGA PUNCH or MEGA
 * KICK for free, but only one of the two moves can be learned per player.
 */

export type MoveTutor = {
  id: "mega-punch" | "mega-kick";
  moveId: DuelMoveId;
  moveName: string;
  mapId: string;
  x: number;
  y: number;
};

export const MOVE_TUTORS: readonly MoveTutor[] = [
  { id: "mega-punch", moveId: "mega-punch" as DuelMoveId, moveName: "Mega Punch", mapId: "route-4", x: 47, y: 3 },
  { id: "mega-kick", moveId: "mega-kick" as DuelMoveId, moveName: "Mega Kick", mapId: "route-4", x: 50, y: 3 },
];

export const MEGA_TUTOR_CHOICE = "route-4-mega-tutor";

export function findMoveTutor(id: string): MoveTutor | null {
  return MOVE_TUTORS.find((tutor) => tutor.id === id) ?? null;
}

/** Types whose Pokémon can use the tutors' punches and kicks (compat approximation). */
const COMPATIBLE_TYPES = new Set([
  "normal",
  "fighting",
  "rock",
  "ground",
  "psychic",
  "fire",
  "electric",
  "ice",
  "steel",
]);

export function canLearnTutorMove(pokemon: PokemonProgression): boolean {
  if (!isDuelSpeciesId(pokemon.species)) return false;
  return duelSpeciesTypes(pokemon.species).some((type) =>
    COMPATIBLE_TYPES.has(type),
  );
}

export type TutorCandidate = {
  /** Party slot (0 = lead). */
  partyIndex: number;
  pokemon: PokemonProgression;
  knows: boolean;
};

export function tutorCandidates(
  story: StoryState,
  tutor: MoveTutor,
): TutorCandidate[] {
  return getStoryParty(story)
    .map((pokemon, partyIndex) => ({
      partyIndex,
      pokemon,
      knows: pokemon.activeMoves.includes(tutor.moveId),
    }))
    .filter(
      (candidate) =>
        canLearnTutorMove(candidate.pokemon) && !candidate.knows,
    );
}

/** Which of the two tutors the player already used (`null` = none yet). */
export function chosenMegaTutor(story: StoryState): MoveTutor["id"] | null {
  const value = getStoryPlayerChoice(story, MEGA_TUTOR_CHOICE);
  return value === "mega-punch" || value === "mega-kick" ? value : null;
}

export type TeachResult =
  | { ok: true; story: StoryState; name: string }
  | {
      ok: false;
      reason:
        | "unknown"
        | "other-tutor"
        | "invalid-pokemon"
        | "knows"
        | "incompatible"
        | "no-slot";
    };

function withPartyMember(
  story: StoryState,
  partyIndex: number,
  update: (pokemon: PokemonProgression) => PokemonProgression,
): StoryState {
  if (partyIndex === 0 && story.playerPokemon) {
    return { ...story, playerPokemon: update(story.playerPokemon) };
  }
  return {
    ...story,
    capturedPokemon: story.capturedPokemon.map((pokemon, index) =>
      index === partyIndex - 1
        ? { ...(update(pokemon) as typeof pokemon) }
        : pokemon,
    ),
  };
}

/**
 * Teaches the tutor's move to a party member. With four moves already known the
 * caller must pass `replaceIndex` (the move to forget).
 */
export function teachTutorMove(
  story: StoryState,
  tutorId: string,
  partyIndex: number,
  replaceIndex: number | null,
): TeachResult {
  const tutor = findMoveTutor(tutorId);
  if (!tutor || !DUEL_MOVES[tutor.moveId]) {
    return { ok: false, reason: "unknown" };
  }

  const used = chosenMegaTutor(story);
  if (used && used !== tutor.id) {
    return { ok: false, reason: "other-tutor" };
  }

  const pokemon = getStoryParty(story)[partyIndex];
  if (!pokemon) return { ok: false, reason: "invalid-pokemon" };
  if (!canLearnTutorMove(pokemon)) {
    return { ok: false, reason: "incompatible" };
  }
  if (pokemon.activeMoves.includes(tutor.moveId)) {
    return { ok: false, reason: "knows" };
  }

  let learned: PokemonProgression;
  if (pokemon.activeMoves.length < 4) {
    learned = {
      ...pokemon,
      activeMoves: [...pokemon.activeMoves, tutor.moveId],
      movePp: {
        ...pokemon.movePp,
        [tutor.moveId]: DUEL_MOVES[tutor.moveId].maxPp,
      },
    };
  } else if (replaceIndex === null) {
    return { ok: false, reason: "no-slot" };
  } else {
    learned = resolveMoveLearning(pokemon, tutor.moveId, replaceIndex);
    if (!learned.activeMoves.includes(tutor.moveId)) {
      return { ok: false, reason: "no-slot" };
    }
  }

  return {
    ok: true,
    name: speciesDisplayName(pokemon.species as WildSpeciesId),
    story: setStoryPlayerChoice(
      withPartyMember(story, partyIndex, () => learned),
      MEGA_TUTOR_CHOICE,
      tutor.id,
    ),
  };
}
