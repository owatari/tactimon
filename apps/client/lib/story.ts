import {
  calculateDuelPokemonMaxHp,
  createPokemonProgression,
  createStarterProgression,
  normalizeDuelMajorStatus,
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

export const POKEMON_STORAGE_BOX_COUNT = 14;
export const POKEMON_PER_BOX = 30;
export const POKEMON_STORAGE_CAPACITY =
  POKEMON_STORAGE_BOX_COUNT * POKEMON_PER_BOX;

export type StoryHealLocationId =
  | "pallet-town"
  | "viridian-city";

export type StoryState = {
  starter: StarterSpeciesId | null;
  rivalStarter: StarterSpeciesId | null;
  firstBattleComplete: boolean;
  playerPokemon: PokemonProgression | null;
  capturedPokemon: CapturedPokemon[];
  boxedPokemon: CapturedPokemon[];
  collectedItemIds: string[];
  defeatedTrainerIds: string[];
  healLocationId: StoryHealLocationId;
  money: number;
  inventory: DuelInventory;
};

export const DEFAULT_STORY_STATE: StoryState = {
  starter: null,
  rivalStarter: null,
  firstBattleComplete: false,
  playerPokemon: null,
  capturedPokemon: [],
  boxedPokemon: [],
  collectedItemIds: [],
  defeatedTrainerIds: [],
  healLocationId: "pallet-town",
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
    boxedPokemon: [],
    collectedItemIds: [],
    defeatedTrainerIds: [],
    healLocationId: "pallet-town",
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
    currentHp?: unknown;
    status?: unknown;
    activeMoves?: PokemonProgression["activeMoves"];
  };

  if (
    (candidate.species !== "pidgey" &&
      candidate.species !== "rattata" &&
      candidate.species !== "caterpie" &&
      candidate.species !== "weedle" &&
      candidate.species !== "spearow" &&
      candidate.species !== "mankey" &&
      candidate.species !== "metapod" &&
      candidate.species !== "kakuna" &&
      candidate.species !== "pikachu") ||
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
    currentHp:
      typeof candidate.currentHp === "number"
        ? candidate.currentHp
        : base.currentHp,
    status: normalizeDuelMajorStatus(candidate.status),
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
  const rawBoxed = Array.isArray(
    (input as { boxedPokemon?: unknown } | null | undefined)
      ?.boxedPokemon,
  )
    ? (input as { boxedPokemon: unknown[] }).boxedPokemon
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
    boxedPokemon: rawBoxed
      .map(normalizeCapturedPokemon)
      .filter(
        (pokemon): pokemon is CapturedPokemon =>
          pokemon !== null,
      )
      .slice(0, POKEMON_STORAGE_CAPACITY),
    collectedItemIds: Array.isArray(
      input?.collectedItemIds,
    )
      ? Array.from(
          new Set(
            input.collectedItemIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.length > 0,
            ),
          ),
        ).slice(0, 512)
      : [],
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
    healLocationId:
      input?.healLocationId === "viridian-city"
        ? "viridian-city"
        : "pallet-town",
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


export function storyHasHealthyPokemon(
  story: StoryState,
): boolean {
  return (
    (story.playerPokemon?.currentHp ?? 0) > 0 ||
    story.capturedPokemon.some(
      (pokemon) => pokemon.currentHp > 0,
    )
  );
}

function healPokemonProgression(
  pokemon: PokemonProgression,
): PokemonProgression {
  return {
    ...pokemon,
    currentHp: calculateDuelPokemonMaxHp(pokemon),
    status: null,
  };
}

export function healStoryParty(
  story: StoryState,
): StoryState {
  return {
    ...story,
    playerPokemon: story.playerPokemon
      ? healPokemonProgression(story.playerPokemon)
      : null,
    capturedPokemon: story.capturedPokemon.map(
      (pokemon) => ({
        ...healPokemonProgression(pokemon),
        species: pokemon.species,
      }),
    ),
  };
}


export type PokemonStorageFailureReason =
  | "invalid-index"
  | "party-full"
  | "storage-full";

export type PokemonStorageActionResult = {
  accepted: boolean;
  story: StoryState;
  reason?: PokemonStorageFailureReason;
};

export type CapturedPokemonPlacementResult = {
  accepted: boolean;
  story: StoryState;
  destination?: "party" | "storage";
  reason?: "storage-full";
};

export function storyCanCapturePokemon(
  story: StoryState,
): boolean {
  return (
    story.capturedPokemon.length < 5 ||
    story.boxedPokemon.length <
      POKEMON_STORAGE_CAPACITY
  );
}

export function placeCapturedPokemon(
  story: StoryState,
  pokemon: CapturedPokemon,
): CapturedPokemonPlacementResult {
  if (story.capturedPokemon.length < 5) {
    return {
      accepted: true,
      destination: "party",
      story: {
        ...story,
        capturedPokemon: [
          ...story.capturedPokemon,
          pokemon,
        ],
      },
    };
  }

  if (
    story.boxedPokemon.length <
    POKEMON_STORAGE_CAPACITY
  ) {
    return {
      accepted: true,
      destination: "storage",
      story: {
        ...story,
        boxedPokemon: [
          ...story.boxedPokemon,
          pokemon,
        ],
      },
    };
  }

  return {
    accepted: false,
    story,
    reason: "storage-full",
  };
}

export function depositCapturedPokemon(
  story: StoryState,
  capturedIndex: number,
): PokemonStorageActionResult {
  if (
    !Number.isInteger(capturedIndex) ||
    capturedIndex < 0 ||
    capturedIndex >= story.capturedPokemon.length
  ) {
    return {
      accepted: false,
      story,
      reason: "invalid-index",
    };
  }

  if (
    story.boxedPokemon.length >=
    POKEMON_STORAGE_CAPACITY
  ) {
    return {
      accepted: false,
      story,
      reason: "storage-full",
    };
  }

  const pokemon = story.capturedPokemon[capturedIndex];
  const capturedPokemon = story.capturedPokemon.filter(
    (_, index) => index !== capturedIndex,
  );

  return {
    accepted: true,
    story: {
      ...story,
      capturedPokemon,
      boxedPokemon: [
        ...story.boxedPokemon,
        pokemon,
      ],
    },
  };
}

export function withdrawBoxedPokemon(
  story: StoryState,
  boxedIndex: number,
): PokemonStorageActionResult {
  if (
    !Number.isInteger(boxedIndex) ||
    boxedIndex < 0 ||
    boxedIndex >= story.boxedPokemon.length
  ) {
    return {
      accepted: false,
      story,
      reason: "invalid-index",
    };
  }

  if (story.capturedPokemon.length >= 5) {
    return {
      accepted: false,
      story,
      reason: "party-full",
    };
  }

  const pokemon = story.boxedPokemon[boxedIndex];
  const boxedPokemon = story.boxedPokemon.filter(
    (_, index) => index !== boxedIndex,
  );

  return {
    accepted: true,
    story: {
      ...story,
      capturedPokemon: [
        ...story.capturedPokemon,
        pokemon,
      ],
      boxedPokemon,
    },
  };
}


export type OverworldItemPickupResult = {
  accepted: boolean;
  story: StoryState;
  reason?: "already-collected" | "inventory-full";
};

export function collectOverworldItem(
  story: StoryState,
  pickupId: string,
  itemId: DuelItemId,
): OverworldItemPickupResult {
  if (story.collectedItemIds.includes(pickupId)) {
    return {
      accepted: false,
      story,
      reason: "already-collected",
    };
  }

  const current = story.inventory[itemId] ?? 0;
  if (current >= 999) {
    return {
      accepted: false,
      story,
      reason: "inventory-full",
    };
  }

  return {
    accepted: true,
    story: {
      ...story,
      inventory: {
        ...story.inventory,
        [itemId]: current + 1,
      },
      collectedItemIds: [
        ...story.collectedItemIds,
        pickupId,
      ],
    },
  };
}


export function registerStoryHealLocation(
  story: StoryState,
  healLocationId: StoryHealLocationId,
): StoryState {
  if (story.healLocationId === healLocationId) {
    return story;
  }

  return {
    ...story,
    healLocationId,
  };
}

export function computeWhiteOutMoneyLoss(
  story: StoryState,
): number {
  const highestLevel = Math.max(
    story.playerPokemon?.level ?? 0,
    ...story.capturedPokemon.map(
      (pokemon) => pokemon.level,
    ),
  );

  // FireRed uses level * 4 * multiplier. This slice has
  // no badges yet, so the original zero-badge multiplier is 2.
  const loss = highestLevel * 4 * 2;

  return Math.min(
    story.money,
    Math.max(0, loss),
  );
}

export type StoryWhiteOutResult = {
  story: StoryState;
  moneyLost: number;
  healLocationId: StoryHealLocationId;
};

export function applyStoryWhiteOut(
  story: StoryState,
): StoryWhiteOutResult {
  const moneyLost = computeWhiteOutMoneyLoss(story);
  const healed = healStoryParty(story);

  return {
    story: {
      ...healed,
      money: Math.max(0, healed.money - moneyLost),
    },
    moneyLost,
    healLocationId: story.healLocationId,
  };
}
