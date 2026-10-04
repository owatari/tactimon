import {
  createPokemonProgression,
  createStarterProgression,
  normalizePokemonProgression,
  rivalStarterFor,
  starterDisplayName,
  type DuelInventory,
  type PokemonProgression,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "@tactimon/battle-engine";

export type CapturedPokemon = PokemonProgression & {
  species: WildSpeciesId;
};

export type StoryState = {
  starter: StarterSpeciesId | null;
  rivalStarter: StarterSpeciesId | null;
  firstBattleComplete: boolean;
  playerPokemon: PokemonProgression | null;
  capturedPokemon: CapturedPokemon[];
  defeatedTrainerIds: string[];
  money: number;
  inventory: DuelInventory;
};

export const DEFAULT_STORY_STATE: StoryState = {
  starter: null,
  rivalStarter: null,
  firstBattleComplete: false,
  playerPokemon: null,
  capturedPokemon: [],
  defeatedTrainerIds: [],
  money: 3000,
  inventory: {
    potion: 1,
    "poke-ball": 5,
  },
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
    defeatedTrainerIds: [],
    money: 3000,
    inventory: {
      potion: 1,
      "poke-ball": 5,
    },
  };
}

function normalizeCapturedPokemon(
  input: unknown,
): CapturedPokemon | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as {
    species?: unknown;
    level?: unknown;
    experience?: unknown;
    evs?: PokemonProgression["evs"];
    activeMoves?: PokemonProgression["activeMoves"];
  };

  if (
    (candidate.species !== "pidgey" &&
      candidate.species !== "rattata") ||
    typeof candidate.level !== "number" ||
    !Number.isFinite(candidate.level)
  ) {
    return null;
  }

  const level = Math.max(
    1,
    Math.min(100, Math.trunc(candidate.level)),
  );
  const base = createPokemonProgression(
    candidate.species,
    level,
  );
  const normalized = normalizePokemonProgression({
    ...base,
    experience:
      typeof candidate.experience === "number"
        ? candidate.experience
        : base.experience,
    evs: candidate.evs ?? base.evs,
    activeMoves: Array.isArray(candidate.activeMoves)
      ? candidate.activeMoves
      : base.activeMoves,
  });

  return {
    ...normalized,
    species: candidate.species,
  };
}

function normalizeMoney(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 3000;
  }

  return Math.max(
    0,
    Math.min(999_999, Math.trunc(value)),
  );
}

function normalizeInventory(
  value: unknown,
): DuelInventory {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<DuelInventory>)
      : {};

  const normalizeCount = (
    count: unknown,
    fallback: number,
  ) =>
    typeof count === "number" &&
    Number.isFinite(count)
      ? Math.max(
          0,
          Math.min(999, Math.trunc(count)),
        )
      : fallback;

  return {
    potion: normalizeCount(
      candidate.potion,
      1,
    ),
    "poke-ball": normalizeCount(
      candidate["poke-ball"],
      5,
    ),
  };
}

export function normalizeStoryState(
  input: Partial<StoryState> | null | undefined,
): StoryState {
  const starter = input?.starter ?? null;
  const rawCaptured = Array.isArray(
    (input as { capturedPokemon?: unknown } | null | undefined)
      ?.capturedPokemon,
  )
    ? (input as { capturedPokemon: unknown[] }).capturedPokemon
    : [];

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
    capturedPokemon: rawCaptured
      .map(normalizeCapturedPokemon)
      .filter(
        (pokemon): pokemon is CapturedPokemon =>
          pokemon !== null,
      )
      .slice(0, 5),
    defeatedTrainerIds: Array.isArray(
      input?.defeatedTrainerIds,
    )
      ? Array.from(
          new Set(
            input.defeatedTrainerIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.length > 0,
            ),
          ),
        ).slice(0, 128)
      : [],
    money: normalizeMoney(input?.money),
    inventory: normalizeInventory(input?.inventory),
  };
}

export function storyStarterSummary(
  story: StoryState,
): string | null {
  if (!story.starter || !story.rivalStarter) {
    return null;
  }

  const partySize = 1 + story.capturedPokemon.length;

  return (
    `Você escolheu ${starterDisplayName(story.starter)}. ` +
    `Blue escolheu ${starterDisplayName(story.rivalStarter)}. ` +
    `Seu time tem ${partySize} Pokémon.`
  );
}
