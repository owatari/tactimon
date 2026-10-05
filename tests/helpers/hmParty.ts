import { createPokemonProgression } from "../../packages/battle-engine/src";
import {
  normalizeStoryState,
  type StoryState,
} from "../../apps/client/lib/story";

/** Adds party members of the given species (e.g. a Pokémon able to use an HM). */
export function withHmUsers(
  story: StoryState,
  ...species: string[]
): StoryState {
  return normalizeStoryState({
    ...story,
    capturedPokemon: [
      ...story.capturedPokemon,
      ...species.map((id) => ({
        ...createPokemonProgression("pidgey", 10),
        species: id,
      })),
    ].slice(0, 5),
  } as never);
}
