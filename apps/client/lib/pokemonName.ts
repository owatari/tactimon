import { localizedSpeciesName } from "./i18n/names";

/** Nickname when the player gave one, otherwise the localized species name. */
export function pokemonDisplayName(pokemon: {
  species: string;
  nickname?: string;
}): string {
  return pokemon.nickname?.trim() || localizedSpeciesName(pokemon.species);
}
