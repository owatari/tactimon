import { HM_COMPAT, type FieldHmMove } from "./generated/hmCompat";
import type { StoryState } from "./story";

/**
 * Field HMs (and Rock Smash) are never taught: they work as soon as any party
 * member's species is able to use the move (FireRed `gTMHMLearnsets`).
 */
export function speciesCanUseHm(
  species: string,
  hm: FieldHmMove,
): boolean {
  return HM_COMPAT[species]?.includes(hm) ?? false;
}

export function partyCanUseHm(
  story: StoryState,
  hm: FieldHmMove,
): boolean {
  return [story.playerPokemon, ...story.capturedPokemon].some(
    (pokemon) => pokemon !== null && speciesCanUseHm(pokemon.species, hm),
  );
}

/** Who in the party can use the move (for messages and menus). */
export function partyHmUsers(
  story: StoryState,
  hm: FieldHmMove,
): string[] {
  return [story.playerPokemon, ...story.capturedPokemon]
    .filter(
      (pokemon): pokemon is NonNullable<typeof pokemon> =>
        pokemon !== null && speciesCanUseHm(pokemon.species, hm),
    )
    .map((pokemon) => pokemon.species);
}
