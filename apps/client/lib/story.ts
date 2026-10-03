import {
  createStarterProgression,
  normalizePokemonProgression,
  rivalStarterFor,
  starterDisplayName,
  type PokemonProgression,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "@tactimon/battle-engine";

export type CapturedPokemon = {
  species: WildSpeciesId;
  level: number;
};

export type StoryState = {
  starter: StarterSpeciesId | null;
  rivalStarter: StarterSpeciesId | null;
  firstBattleComplete: boolean;
  playerPokemon: PokemonProgression | null;
  capturedPokemon: CapturedPokemon[];
};

export const DEFAULT_STORY_STATE: StoryState = {
  starter: null,
  rivalStarter: null,
  firstBattleComplete: false,
  playerPokemon: null,
  capturedPokemon: [],
};

export const STARTER_META: Record<
  StarterSpeciesId,
  {
    name: string;
    type: "grass" | "fire" | "water";
    description: string;
  }
> = {
  bulbasaur: {
    name: "Bulbasaur",
    type: "grass",
    description: "Equilibrado, resistente e ótimo para controle.",
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    description: "Mais rápido e ofensivo desde o começo.",
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    description: "Defensivo, estável e difícil de derrubar.",
  },
};

export function chooseStarter(
  starter: StarterSpeciesId,
): StoryState {
  return {
    starter,
    rivalStarter: rivalStarterFor(starter),
    firstBattleComplete: false,
    playerPokemon: createStarterProgression(starter),
    capturedPokemon: [],
  };
}

export function normalizeStoryState(
  input: Partial<StoryState> | null | undefined,
): StoryState {
  const starter = input?.starter ?? null;

  return {
    starter,
    rivalStarter:
      input?.rivalStarter ??
      (starter ? rivalStarterFor(starter) : null),
    firstBattleComplete:
      input?.firstBattleComplete ?? false,
    playerPokemon: input?.playerPokemon
      ? normalizePokemonProgression(input.playerPokemon)
      : starter
        ? createStarterProgression(starter)
        : null,
    capturedPokemon: Array.isArray(input?.capturedPokemon)
      ? input.capturedPokemon
          .filter(
            (pokemon): pokemon is CapturedPokemon =>
              (pokemon?.species === "pidgey" ||
                pokemon?.species === "rattata") &&
              Number.isFinite(pokemon?.level),
          )
          .map((pokemon) => ({
            species: pokemon.species,
            level: Math.max(1, Math.min(100, Math.trunc(pokemon.level))),
          }))
      : [],
  };
}

export function storyStarterSummary(
  story: StoryState,
): string | null {
  if (!story.starter || !story.rivalStarter) {
    return null;
  }

  return (
    `Você escolheu ${starterDisplayName(story.starter)}. ` +
    `Blue escolheu ${starterDisplayName(story.rivalStarter)}.`
  );
}
