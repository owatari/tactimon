import { partyCanUseHm } from "./hmParty";
import { t, tx } from "./i18n";
import {
  calculateDuelPokemonMaxHp,
  createPokemonProgression,
  createStarterProgression,
  isDuelSpeciesId,
  normalizeDuelMajorStatus,
  normalizePokemonProgression,
  restoreDuelMovePp,
  rivalStarterFor,
  starterDisplayName,
  type DuelInventory,
  type DuelItemId,
  type PokemonProgression,
  type StarterSpeciesId,
  type WildSpeciesId, rollPersonality,
} from "@tactimon/battle-engine";
import {
  findHealLocation,
  type HealLocationId,
} from "./healLocations";
import {
  normalizePokedex,
  type PokedexData,
} from "./pokedex";
import {
  BAG_ITEM_MAX_QUANTITY,
  isBagItemId,
  normalizeBagItems,
  type BagItems,
  type OverworldItemId,
} from "./items";
import {
  completePlayerWorldEvent,
  createEmptyPlayerWorldState,
  getPlayerWorldChoice,
  hasPlayerWorldEvent,
  normalizePlayerWorldState,
  setPlayerWorldChoice,
  type PlayerWorldEventNamespace,
  type PlayerWorldState,
} from "./playerWorldState";

export type CapturedPokemon = PokemonProgression & {
  species: WildSpeciesId;
};

export const POKEMON_STORAGE_BOX_COUNT = 14;
export const POKEMON_PER_BOX = 30;
export const POKEMON_STORAGE_CAPACITY =
  POKEMON_STORAGE_BOX_COUNT * POKEMON_PER_BOX;

export type StoryHealLocationId =
  | "pallet-town"
  | HealLocationId;

export type StoryBadgeId =
  | "boulder"
  | "cascade"
  | "thunder"
  | "rainbow"
  | "soul"
  | "marsh"
  | "volcano"
  | "earth";
export type MtMoonFossilId = "dome" | "helix";
export type StoryValuableId = "nugget";
export type StoryValuables = Record<StoryValuableId, number>;
export type StoryKeyItemId =
  | "oaks-parcel"
  | "ss-ticket"
  | "town-map"
  | "old-amber"
  | "bike-voucher"
  | "bicycle"
  | "tea"
  | "silph-scope"
  | "poke-flute"
  | "card-key"
  | "lift-key"
  | "secret-key"
  | "gold-teeth"
  | "coin-case"
  | "old-rod"
  | "good-rod"
  | "super-rod";
export const STORY_KEY_ITEM_IDS: readonly StoryKeyItemId[] = [
  "oaks-parcel",
  "ss-ticket",
  "town-map",
  "old-amber",
  "bike-voucher",
  "bicycle",
  "tea",
  "silph-scope",
  "poke-flute",
  "card-key",
  "lift-key",
  "secret-key",
  "gold-teeth",
  "coin-case",
  "old-rod",
  "good-rod",
  "super-rod",
];
export const STORY_FIELD_TECHNIQUE_IDS = [
  "cut",
  "surf",
  "strength",
  "flash",
  "fly",
] as const;
export type StoryFieldTechniqueId =
  (typeof STORY_FIELD_TECHNIQUE_IDS)[number];
export type BillStoryStage =
  | "unmet"
  | "teleporter-ready"
  | "helped";

/** Safari Zone game in progress (FireRed: 30 Safari Balls, 500 steps). */
export type SafariSession = {
  steps: number;
  balls: number;
  /** Regular Poké Balls set aside while the player holds Safari Balls. */
  savedBalls: number;
};

/** Pokémon left at the Route 5 Day Care (gains 1 XP per step walked). */
export type DayCareState = {
  pokemon: CapturedPokemon;
  startLevel: number;
  steps: number;
};

export const MAX_GAME_CORNER_COINS = 9999;

export type StoryState = {
  starter: StarterSpeciesId | null;
  rivalStarter: StarterSpeciesId | null;
  firstBattleComplete: boolean;
  playerPokemon: PokemonProgression | null;
  capturedPokemon: CapturedPokemon[];
  boxedPokemon: CapturedPokemon[];
  /** A freshly caught Pokémon waiting for the player to name it and pick team or box. */
  pendingCapture?: CapturedPokemon | null;
  collectedItemIds: string[];
  defeatedTrainerIds: string[];
  badgeIds: StoryBadgeId[];
  mtMoonFossil: MtMoonFossilId | null;
  healLocationId: StoryHealLocationId;
  money: number;
  inventory: DuelInventory;
  valuables?: StoryValuables;
  /** Overworld finds the battle engine cannot use yet (see `lib/items.ts`). */
  bagItems?: BagItems;
  /** Game Corner coins (needs the Coin Case). */
  coins?: number;
  safari?: SafariSession | null;
  dayCare?: DayCareState | null;
  /** Seconds played, shown on the Trainer Card. */
  playTimeSeconds?: number;
  /** Player name printed on the Trainer Card (FireRed default: RED). */
  trainerName?: string;
  /** 16-bit Trainer ID, rolled once when the adventure starts (Trainer Card "IDNo."). */
  trainerId?: number;
  /** Play time (seconds) when the player first entered the Hall of Fame; Trainer Card back + 1st star. */
  hofDebutSeconds?: number;
  /** Completed in-game trades (Trainer Card back). */
  pokemonTrades?: number;
  /** Remaining Repel steps (FireRed: 100 per item). */
  repelSteps?: number;
  /** Pokémon seen/caught (owned Pokémon always count as caught). */
  pokedex?: PokedexData;
  keyItemIds?: StoryKeyItemId[];
  fieldTechniqueIds?: StoryFieldTechniqueId[];
  clearedObstacleIds?: string[];
  billStage?: BillStoryStage;
  /** FireRed-style progression flag: Prof. Oak's aide grants these on Route 3 after Brock. */
  runningShoesReceived?: boolean;
  /** FireRed field poison advances once per completed overworld step. */
  poisonStepCounter?: number;
  /**
   * Private world-instance state for this player only.
   *
   * Multiplayer code must replicate playerWorld with the owning player,
   * never as shared map/world state.
   */
  playerWorld?: PlayerWorldState;
};

export const DEFAULT_STORY_STATE: StoryState = {
  starter: null,
  rivalStarter: null,
  firstBattleComplete: false,
  playerPokemon: null,
  capturedPokemon: [],
  boxedPokemon: [],
  pendingCapture: null,
  collectedItemIds: [],
  defeatedTrainerIds: [],
  badgeIds: [],
  mtMoonFossil: null,
  healLocationId: "pallet-town",
  money: 3000,
  inventory: {
    potion: 1,
    "poke-ball": 5,
  },
  valuables: {
    nugget: 0,
  },
  bagItems: {},
  playTimeSeconds: 0,
  keyItemIds: [],
  fieldTechniqueIds: [],
  clearedObstacleIds: [],
  billStage: "unmet",
  runningShoesReceived: false,
  poisonStepCounter: 0,
  playerWorld: createEmptyPlayerWorldState(),
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
    description: tx("Balanced, sturdy and great for control."),
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    description: tx("Faster and more offensive from the start."),
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    description: tx("Defensive, steady and hard to take down."),
  },
};

export function chooseStarter(
  starter: StarterSpeciesId,
): StoryState {
  const playerWorld = completePlayerWorldEvent(
    createEmptyPlayerWorldState(),
    "story",
    "starter-chosen",
  );

  return {
    starter,
    rivalStarter: rivalStarterFor(starter),
    firstBattleComplete: false,
    // The starter rolls its own nature and IVs like any other Pokémon.
    playerPokemon: createPokemonProgression(starter, 5, rollPersonality()),
    capturedPokemon: [],
    boxedPokemon: [],
    collectedItemIds: [],
    defeatedTrainerIds: [],
    badgeIds: [],
    mtMoonFossil: null,
    healLocationId: "pallet-town",
    money: 3000,
    inventory: {
      potion: 1,
      "poke-ball": 5,
    },
    valuables: {
      nugget: 0,
    },
    bagItems: {},
    playTimeSeconds: 0,
    trainerName: "RED",
    trainerId: Math.floor(Math.random() * 65536),
    keyItemIds: [],
    fieldTechniqueIds: [],
    clearedObstacleIds: [],
    billStage: "unmet",
    runningShoesReceived: false,
    poisonStepCounter: 0,
    playerWorld,
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
    ivs?: PokemonProgression["ivs"];
    nature?: PokemonProgression["nature"];
    nickname?: PokemonProgression["nickname"];
    shiny?: PokemonProgression["shiny"];
    currentHp?: unknown;
    status?: unknown;
    sleepTurnsRemaining?: unknown;
    activeMoves?: PokemonProgression["activeMoves"];
    movePp?: PokemonProgression["movePp"];
  };

  if (
    typeof candidate.species !== "string" ||
    !isDuelSpeciesId(candidate.species) ||
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
    candidate.species as WildSpeciesId,
    level,
  );
  const normalized = normalizePokemonProgression({
    ...base,
    experience:
      typeof candidate.experience === "number"
        ? candidate.experience
        : base.experience,
    evs: candidate.evs ?? base.evs,
    ivs: candidate.ivs,
    nature: candidate.nature,
    nickname: candidate.nickname,
    shiny: candidate.shiny,
    currentHp:
      typeof candidate.currentHp === "number"
        ? candidate.currentHp
        : base.currentHp,
    status: normalizeDuelMajorStatus(candidate.status),
    sleepTurnsRemaining:
      typeof candidate.sleepTurnsRemaining === "number" &&
      Number.isFinite(candidate.sleepTurnsRemaining)
        ? candidate.sleepTurnsRemaining
        : undefined,
    activeMoves: Array.isArray(candidate.activeMoves)
      ? candidate.activeMoves
      : base.activeMoves,
    movePp: candidate.movePp ?? base.movePp,
  });

  return {
    ...normalized,
    species: candidate.species as WildSpeciesId,
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

function normalizeValuables(
  value: unknown,
): StoryValuables {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<StoryValuables>)
      : {};

  const nugget =
    typeof candidate.nugget === "number" &&
    Number.isFinite(candidate.nugget)
      ? Math.max(
          0,
          Math.min(999, Math.trunc(candidate.nugget)),
        )
      : 0;

  return { nugget };
}

function normalizeKeyItemIds(
  value: unknown,
): StoryKeyItemId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (item): item is StoryKeyItemId =>
          STORY_KEY_ITEM_IDS.includes(item as StoryKeyItemId),
      ),
    ),
  );
}

function normalizeFieldTechniqueIds(
  value: unknown,
): StoryFieldTechniqueId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (technique): technique is StoryFieldTechniqueId =>
          STORY_FIELD_TECHNIQUE_IDS.includes(
            technique as StoryFieldTechniqueId,
          ),
      ),
    ),
  );
}

function normalizeBillStage(
  value: unknown,
): BillStoryStage {
  return value === "teleporter-ready" ||
    value === "helped"
    ? value
    : "unmet";
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

  let playerWorld = normalizePlayerWorldState(
    input?.playerWorld,
    {
      collectedItemIds: input?.collectedItemIds,
      defeatedTrainerIds: input?.defeatedTrainerIds,
      badgeIds: input?.badgeIds,
      clearedObstacleIds: input?.clearedObstacleIds,
      keyItemIds: input?.keyItemIds,
      fieldTechniqueIds: input?.fieldTechniqueIds,
      mtMoonFossil: input?.mtMoonFossil,
      billStage: input?.billStage,
    },
  );
  if (starter) {
    playerWorld = completePlayerWorldEvent(
      playerWorld,
      "story",
      "starter-chosen",
    );
  }

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
    pendingCapture: normalizeCapturedPokemon(
      (input as { pendingCapture?: unknown } | null | undefined)
        ?.pendingCapture,
    ),
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
    badgeIds: Array.isArray(input?.badgeIds)
      ? Array.from(
          new Set(
            input.badgeIds.filter(
              (badge): badge is StoryBadgeId =>
                badge === "boulder" ||
                badge === "cascade" ||
                badge === "thunder" ||
                badge === "rainbow" ||
                badge === "soul" ||
                badge === "marsh" ||
                badge === "volcano" ||
                badge === "earth",
            ),
          ),
        )
      : [],
    mtMoonFossil:
      input?.mtMoonFossil === "dome" ||
      input?.mtMoonFossil === "helix"
        ? input.mtMoonFossil
        : null,
    healLocationId:
      typeof input?.healLocationId === "string" &&
      findHealLocation(input.healLocationId)
        ? (input.healLocationId as HealLocationId)
        : "pallet-town",
    money: normalizeMoney(input?.money),
    inventory: normalizeInventory(input?.inventory),
    valuables: normalizeValuables(input?.valuables),
    bagItems: normalizeBagItems(input?.bagItems),
    pokedex: normalizePokedex(input?.pokedex),
    repelSteps:
      typeof input?.repelSteps === "number" &&
      Number.isFinite(input.repelSteps)
        ? Math.max(0, Math.min(250, Math.trunc(input.repelSteps)))
        : 0,
    playTimeSeconds:
      typeof input?.playTimeSeconds === "number" &&
      Number.isFinite(input.playTimeSeconds)
        ? Math.max(
            0,
            Math.min(
              359_999 * 60,
              Math.trunc(input.playTimeSeconds),
            ),
          )
        : 0,
    trainerName:
      typeof input?.trainerName === "string" &&
      input.trainerName.trim()
        ? input.trainerName.trim().slice(0, 7)
        : "RED",
    trainerId:
      typeof input?.trainerId === "number" &&
      Number.isFinite(input.trainerId)
        ? Math.max(0, Math.min(65535, Math.trunc(input.trainerId)))
        : undefined,
    hofDebutSeconds:
      typeof input?.hofDebutSeconds === "number" &&
      Number.isFinite(input.hofDebutSeconds)
        ? Math.max(0, Math.trunc(input.hofDebutSeconds))
        : undefined,
    pokemonTrades:
      typeof input?.pokemonTrades === "number" &&
      Number.isFinite(input.pokemonTrades)
        ? Math.max(0, Math.min(65535, Math.trunc(input.pokemonTrades)))
        : 0,
    keyItemIds: normalizeKeyItemIds(input?.keyItemIds),
    fieldTechniqueIds: normalizeFieldTechniqueIds(
      input?.fieldTechniqueIds,
    ),
    clearedObstacleIds: Array.isArray(
      input?.clearedObstacleIds,
    )
      ? Array.from(
          new Set(
            input.clearedObstacleIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.length > 0,
            ),
          ),
        ).slice(0, 128)
      : [],
    billStage:
      normalizeKeyItemIds(input?.keyItemIds).includes(
        "ss-ticket",
      )
        ? "helped"
        : normalizeBillStage(input?.billStage),
    runningShoesReceived: input?.runningShoesReceived === true,
    poisonStepCounter:
      typeof input?.poisonStepCounter === "number" &&
      Number.isFinite(input.poisonStepCounter)
        ? Math.max(
            0,
            Math.min(
              4,
              Math.trunc(input.poisonStepCounter),
            ),
          )
        : 0,
    coins: normalizeCoins(input?.coins),
    safari: normalizeSafari(input?.safari),
    dayCare: normalizeDayCare(input?.dayCare),
    playerWorld,
  };
}

function normalizeCoins(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_GAME_CORNER_COINS, Math.trunc(value)))
    : 0;
}

function normalizeSafari(value: unknown): SafariSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<SafariSession>;
  const clamp = (entry: unknown, max: number) =>
    typeof entry === "number" && Number.isFinite(entry)
      ? Math.max(0, Math.min(max, Math.trunc(entry)))
      : 0;
  return {
    steps: clamp(raw.steps, 500),
    balls: clamp(raw.balls, 30),
    savedBalls: clamp(raw.savedBalls, 999),
  };
}

function normalizeDayCare(value: unknown): DayCareState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<DayCareState>;
  const pokemon = normalizeCapturedPokemon(raw.pokemon);
  if (!pokemon) return null;
  return {
    pokemon,
    startLevel:
      typeof raw.startLevel === "number" &&
      Number.isFinite(raw.startLevel)
        ? Math.max(1, Math.min(100, Math.trunc(raw.startLevel)))
        : pokemon.level,
    steps:
      typeof raw.steps === "number" && Number.isFinite(raw.steps)
        ? Math.max(0, Math.min(1_000_000, Math.trunc(raw.steps)))
        : 0,
  };
}

export function storyStarterSummary(
  story: StoryState,
): string | null {
  if (!story.starter || !story.rivalStarter) {
    return null;
  }

  const partySize = 1 + story.capturedPokemon.length;

  return t(
    "You chose {starter}. Blue chose {rival}. Your team has {count} Pokémon.",
    {
      starter: starterDisplayName(story.starter),
      rival: starterDisplayName(story.rivalStarter),
      count: partySize,
    },
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

/** True only when the player owns Pokémon and every one has fainted (a new save has none, and must still walk). */
export function storyIsKnockedOut(
  story: StoryState,
): boolean {
  const hasAnyPokemon =
    story.playerPokemon !== null ||
    story.capturedPokemon.length > 0;

  return (
    hasAnyPokemon && !storyHasHealthyPokemon(story)
  );
}

function healPokemonProgression(
  pokemon: PokemonProgression,
): PokemonProgression {
  return {
    ...pokemon,
    currentHp: calculateDuelPokemonMaxHp(pokemon),
    status: null,
    sleepTurnsRemaining: 0,
    movePp: restoreDuelMovePp(
      pokemon.activeMoves,
    ),
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
    poisonStepCounter: 0,
  };
}

function applyFieldPoisonToPokemon(
  pokemon: PokemonProgression,
): PokemonProgression {
  if (
    pokemon.status !== "poison" ||
    pokemon.currentHp <= 0
  ) {
    return pokemon;
  }

  return {
    ...pokemon,
    currentHp: Math.max(
      0,
      pokemon.currentHp - 1,
    ),
  };
}

/**
 * FireRed increments a poison field counter after movement and applies
 * exactly 1 HP of poison damage to every poisoned party member every fifth
 * step. Field poison is allowed to faint a Pokémon.
 */
export function applyStoryOverworldStep(
  input: StoryState,
): StoryState {
  const story =
    (input.repelSteps ?? 0) > 0
      ? { ...input, repelSteps: (input.repelSteps ?? 0) - 1 }
      : input;
  const nextCounter =
    ((story.poisonStepCounter ?? 0) + 1) % 5;

  if (nextCounter !== 0) {
    return {
      ...story,
      poisonStepCounter: nextCounter,
    };
  }

  return {
    ...story,
    poisonStepCounter: 0,
    playerPokemon: story.playerPokemon
      ? applyFieldPoisonToPokemon(
          story.playerPokemon,
        )
      : null,
    capturedPokemon: story.capturedPokemon.map(
      (pokemon) => ({
        ...applyFieldPoisonToPokemon(pokemon),
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


export type StoryScriptInteractionResult = {
  story: StoryState;
  message: string;
};

function storyPlayerWorld(
  story: StoryState,
): PlayerWorldState {
  return (
    story.playerWorld ??
    normalizePlayerWorldState(undefined, {
      collectedItemIds: story.collectedItemIds,
      defeatedTrainerIds: story.defeatedTrainerIds,
      badgeIds: story.badgeIds,
      clearedObstacleIds: story.clearedObstacleIds,
      keyItemIds: story.keyItemIds,
      fieldTechniqueIds: story.fieldTechniqueIds,
      mtMoonFossil: story.mtMoonFossil,
      billStage: story.billStage,
    })
  );
}

export function hasStoryPlayerEvent(
  story: StoryState,
  namespace: PlayerWorldEventNamespace,
  id: string,
): boolean {
  return hasPlayerWorldEvent(
    storyPlayerWorld(story),
    namespace,
    id,
  );
}

export function completeStoryPlayerEvent(
  story: StoryState,
  namespace: PlayerWorldEventNamespace,
  id: string,
): StoryState {
  return {
    ...story,
    playerWorld: completePlayerWorldEvent(
      storyPlayerWorld(story),
      namespace,
      id,
    ),
  };
}

export function getStoryPlayerChoice(
  story: StoryState,
  choiceId: string,
): string | null {
  return getPlayerWorldChoice(
    storyPlayerWorld(story),
    choiceId,
  );
}

export function setStoryPlayerChoice(
  story: StoryState,
  choiceId: string,
  value: string,
): StoryState {
  return {
    ...story,
    playerWorld: setPlayerWorldChoice(
      storyPlayerWorld(story),
      choiceId,
      value,
    ),
  };
}

export function isStoryTrainerDefeated(
  story: StoryState,
  trainerId: string,
): boolean {
  return (
    hasStoryPlayerEvent(story, "trainer", trainerId) ||
    story.defeatedTrainerIds.includes(trainerId)
  );
}

export function markStoryTrainerDefeated(
  story: StoryState,
  trainerId: string,
): StoryState {
  let next = completeStoryPlayerEvent(
    story,
    "trainer",
    trainerId,
  );

  if (!next.defeatedTrainerIds.includes(trainerId)) {
    next = {
      ...next,
      defeatedTrainerIds: [
        ...next.defeatedTrainerIds,
        trainerId,
      ],
    };
  }

  return next;
}

export function hasStoryBadge(
  story: StoryState,
  badgeId: StoryBadgeId,
): boolean {
  return (
    hasStoryPlayerEvent(story, "badge", badgeId) ||
    story.badgeIds.includes(badgeId)
  );
}

export function grantStoryBadge(
  story: StoryState,
  badgeId: StoryBadgeId,
): StoryState {
  let next = completeStoryPlayerEvent(
    story,
    "badge",
    badgeId,
  );

  if (!next.badgeIds.includes(badgeId)) {
    next = {
      ...next,
      badgeIds: [...next.badgeIds, badgeId],
    };
  }

  return next;
}

export const RUNNING_SHOES_MAP_ID = "route-3";

/** Oak's aide waits at the Pewter City exit once the Boulder Badge is earned. */
export function shouldGrantRunningShoes(
  story: StoryState,
  mapId: string,
): boolean {
  return (
    mapId === RUNNING_SHOES_MAP_ID &&
    hasStoryBadge(story, "boulder") &&
    story.runningShoesReceived !== true
  );
}

export function grantRunningShoes(
  story: StoryState,
): StoryState {
  if (story.runningShoesReceived) {
    return story;
  }

  return {
    ...story,
    runningShoesReceived: true,
  };
}

export function isStoryObstacleCleared(
  story: StoryState,
  obstacleId: string,
): boolean {
  return (
    hasStoryPlayerEvent(story, "obstacle", obstacleId) ||
    (story.clearedObstacleIds ?? []).includes(obstacleId)
  );
}

export function hasStoryCollectedItem(
  story: StoryState,
  pickupId: string,
): boolean {
  return (
    hasStoryPlayerEvent(story, "pickup", pickupId) ||
    story.collectedItemIds.includes(pickupId)
  );
}

export function getStoryFossilChoice(
  story: StoryState,
): MtMoonFossilId | null {
  const choice = getPlayerWorldChoice(
    storyPlayerWorld(story),
    "mt-moon-fossil",
  );

  return choice === "dome" || choice === "helix"
    ? choice
    : story.mtMoonFossil;
}

export function getStoryBillStage(
  story: StoryState,
): BillStoryStage {
  const choice = getPlayerWorldChoice(
    storyPlayerWorld(story),
    "bill-stage",
  );

  return choice === "teleporter-ready" ||
    choice === "helped"
    ? choice
    : story.billStage ?? "unmet";
}

export function hasStoryKeyItem(
  story: StoryState,
  itemId: StoryKeyItemId,
): boolean {
  return (
    hasStoryPlayerEvent(story, "key-item", itemId) ||
    (story.keyItemIds ?? []).includes(itemId)
  );
}

export function hasStoryFieldTechnique(
  story: StoryState,
  techniqueId: StoryFieldTechniqueId,
): boolean {
  return (
    hasStoryPlayerEvent(
      story,
      "field-technique",
      techniqueId,
    ) ||
    (story.fieldTechniqueIds ?? []).includes(
      techniqueId,
    )
  );
}

export function interactWithCutObstacle(
  story: StoryState,
  obstacleId: string,
): StoryScriptInteractionResult {
  if (isStoryObstacleCleared(story, obstacleId)) {
    return {
      story,
      message: "A pequena árvore já foi cortada.",
    };
  }

  if (!hasStoryFieldTechnique(story, "cut")) {
    return {
      story,
      message: t(
        "A small tree blocks the way. You need the HM Cut to remove it.",
      ),
    };
  }

  if (!partyCanUseHm(story, "cut")) {
    return {
      story,
      message: t(
        "A small tree blocks the way. None of your Pokémon can use Cut.",
      ),
    };
  }

  let next = completeStoryPlayerEvent(
    story,
    "obstacle",
    obstacleId,
  );
  if (
    !(next.clearedObstacleIds ?? []).includes(obstacleId)
  ) {
    next = {
      ...next,
      clearedObstacleIds: [
        ...(next.clearedObstacleIds ?? []),
        obstacleId,
      ],
    };
  }

  return {
    story: next,
    message:
      "Você usou Cut! A pequena árvore foi removida.",
  };
}

export function interactWithSsAnneCaptain(
  story: StoryState,
): StoryScriptInteractionResult {
  if (hasStoryFieldTechnique(story, "cut")) {
    return {
      story,
      message:
        "Capitão: Agora que melhorei, o S.S. Anne partirá em breve. Use Cut nas pequenas árvores de Vermilion!",
    };
  }

  let next = completeStoryPlayerEvent(
    story,
    "field-technique",
    "cut",
  );
  if (!(next.fieldTechniqueIds ?? []).includes("cut")) {
    next = {
      ...next,
      fieldTechniqueIds: [
        ...(next.fieldTechniqueIds ?? []),
        "cut",
      ],
    };
  }

  return {
    story: next,
    message:
      "Você ajudou o Capitão a se recuperar. Ele ensinou a técnica de campo Cut! Agora pequenas árvores podem ser cortadas.",
  };
}

export function interactWithBill(
  story: StoryState,
): StoryScriptInteractionResult {
  const stage = getStoryBillStage(story);

  if (stage === "unmet") {
    return {
      story: {
        ...setStoryPlayerChoice(
          story,
          "bill-stage",
          "teleporter-ready",
        ),
        billStage: "teleporter-ready",
      },
      message:
        "Bill: Eu sou o Bill! Um experimento deu errado e eu me misturei com um Pokémon. Vou entrar no teleporter; use meu PC e execute o Cell Separator!",
    };
  }

  if (stage === "teleporter-ready") {
    return {
      story,
      message:
        "Bill está dentro do teleporter. Use o computador à esquerda para executar o Cell Separator.",
    };
  }

  if (!hasStoryKeyItem(story, "ss-ticket")) {
    return {
      story: {
        ...completeStoryPlayerEvent(
          story,
          "key-item",
          "ss-ticket",
        ),
        keyItemIds: [
          ...(story.keyItemIds ?? []),
          "ss-ticket",
        ],
      },
      message:
        "Bill: Yeehah! Obrigado! Pegue este S.S. Ticket. O S.S. Anne está em Vermilion City; vá à festa no meu lugar!",
    };
  }

  return {
    story,
    message:
      "Bill: O S.S. Anne está em Vermilion City. Há muitos Treinadores a bordo — aproveite a viagem!",
  };
}

export function runBillCellSeparator(
  story: StoryState,
): StoryScriptInteractionResult {
  const stage = getStoryBillStage(story);

  if (stage === "unmet") {
    return {
      story,
      message:
        "O monitor mostra o teleporter. Bill ainda precisa entrar na máquina antes de iniciar a separação.",
    };
  }

  if (stage === "teleporter-ready") {
    return {
      story: {
        ...setStoryPlayerChoice(
          story,
          "bill-stage",
          "helped",
        ),
        billStage: "helped",
      },
      message:
        "Você executou o Cell Separator. O sistema concluiu a separação e Bill voltou ao normal!",
    };
  }

  return {
    story,
    message:
      "O Cell Separator está ocioso. Bill já voltou ao normal.",
  };
}

export type StoryValuableCollectionResult = {
  accepted: boolean;
  story: StoryState;
  reason?: "already-collected" | "inventory-full";
};

export function collectStoryValuable(
  story: StoryState,
  sourceId: string,
  itemId: StoryValuableId,
): StoryValuableCollectionResult {
  if (hasStoryCollectedItem(story, sourceId)) {
    return {
      accepted: false,
      story,
      reason: "already-collected",
    };
  }

  const valuables = story.valuables ?? { nugget: 0 };
  const current = valuables[itemId] ?? 0;
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
      ...completeStoryPlayerEvent(
        story,
        "pickup",
        sourceId,
      ),
      valuables: {
        ...valuables,
        [itemId]: current + 1,
      },
      collectedItemIds: [
        ...story.collectedItemIds,
        sourceId,
      ],
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
  itemId: OverworldItemId,
): OverworldItemPickupResult {
  if (hasStoryCollectedItem(story, pickupId)) {
    return {
      accepted: false,
      story,
      reason: "already-collected",
    };
  }

  const bagItemId = isBagItemId(itemId) ? itemId : null;
  const current = bagItemId
    ? (story.bagItems?.[bagItemId] ?? 0)
    : (story.inventory[itemId as DuelItemId] ?? 0);
  if (
    current >=
    (bagItemId ? BAG_ITEM_MAX_QUANTITY : 999)
  ) {
    return {
      accepted: false,
      story,
      reason: "inventory-full",
    };
  }

  const collected = {
    ...completeStoryPlayerEvent(
      story,
      "pickup",
      pickupId,
    ),
    collectedItemIds: [
      ...story.collectedItemIds,
      pickupId,
    ],
  };

  return {
    accepted: true,
    story: bagItemId
      ? {
          ...collected,
          bagItems: {
            ...story.bagItems,
            [bagItemId]: current + 1,
          },
        }
      : {
          ...collected,
          inventory: {
            ...story.inventory,
            [itemId as DuelItemId]: current + 1,
          },
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

  // FireRed uses highest level * 4 * a badge-count multiplier.
  // The full table is 2, 4, 6, 9, 12, 16, 20, 25, 30.
  const whiteOutMultipliers = [
    2,
    4,
    6,
    9,
    12,
    16,
    20,
    25,
    30,
  ] as const;
  const badgeCount = Math.max(
    0,
    Math.min(8, story.badgeIds.length),
  );
  const loss =
    highestLevel *
    4 *
    whiteOutMultipliers[badgeCount];

  return Math.min(
    story.money,
    Math.max(0, loss),
  );
}

/**
 * The Oak's Lab rival battle is a tutorial: like FireRed's lab script, the
 * party is fully restored afterwards whatever the result, and a loss never
 * whites out to a Pokémon Center.
 */
export function completeTutorialRivalBattle(
  story: StoryState,
): StoryState {
  return {
    ...healStoryParty(story),
    firstBattleComplete: true,
  };
}

/**
 * Whiteout is only legitimate outside battle, once, when the party really
 * has no conscious Pokémon left.
 */
export function shouldStartStoryWhiteOut(
  story: StoryState,
  context: {
    battleActive: boolean;
    whiteOutPending: boolean;
  },
): boolean {
  return (
    !context.battleActive &&
    !context.whiteOutPending &&
    Boolean(story.playerPokemon) &&
    !storyHasHealthyPokemon(story)
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


export type MtMoonFossilChoiceResult = {
  accepted: boolean;
  story: StoryState;
  reason?: "miguel-not-defeated" | "already-chosen";
};

export function chooseMtMoonFossil(
  story: StoryState,
  fossil: MtMoonFossilId,
): MtMoonFossilChoiceResult {
  if (!isStoryTrainerDefeated(story, "mtmoon-miguel")) {
    return {
      accepted: false,
      story,
      reason: "miguel-not-defeated",
    };
  }

  if (getStoryFossilChoice(story)) {
    return {
      accepted: false,
      story,
      reason: "already-chosen",
    };
  }

  return {
    accepted: true,
    story: {
      ...setStoryPlayerChoice(
        story,
        "mt-moon-fossil",
        fossil,
      ),
      mtMoonFossil: fossil,
    },
  };
}


export type KeyItemGiftResult = {
  story: StoryState;
  granted: boolean;
};

/** One-shot key item gift, remembered per player (never granted twice). */
export function grantStoryKeyItemOnce(
  story: StoryState,
  itemId: StoryKeyItemId,
): KeyItemGiftResult {
  if (hasStoryKeyItem(story, itemId)) {
    return { story, granted: false };
  }

  return {
    granted: true,
    story: {
      ...completeStoryPlayerEvent(story, "key-item", itemId),
      keyItemIds: [...(story.keyItemIds ?? []), itemId],
    },
  };
}

/** Spends a key item (e.g. the Bike Voucher); the gift flag stays set. */
export function removeStoryKeyItem(
  story: StoryState,
  itemId: StoryKeyItemId,
): StoryState {
  return {
    ...story,
    keyItemIds: (story.keyItemIds ?? []).filter(
      (id) => id !== itemId,
    ),
  };
}


/** Surf needs the HM (field technique) and the Soul Badge, as in FireRed. */
export function canStoryUseSurf(story: StoryState): boolean {
  return (
    hasStoryFieldTechnique(story, "surf") &&
    story.badgeIds.includes("soul") &&
    partyCanUseHm(story, "surf")
  );
}

export function grantStoryFieldTechniqueOnce(
  story: StoryState,
  techniqueId: StoryFieldTechniqueId,
): { story: StoryState; granted: boolean } {
  if (hasStoryFieldTechnique(story, techniqueId)) {
    return { story, granted: false };
  }

  const next = completeStoryPlayerEvent(
    story,
    "field-technique",
    techniqueId,
  );

  return {
    granted: true,
    story: {
      ...next,
      fieldTechniqueIds: [
        ...(next.fieldTechniqueIds ?? []),
        techniqueId,
      ],
    },
  };
}

/**
 * FireRed FLAG_SYS_POKEDEX_GET: Prof. Oak hands the Pokédex over once OAK'S PARCEL (from the Viridian
 * Poké Mart clerk) is delivered. Saves that already progressed past that point keep their Pokédex.
 */
export function hasPokedex(story: StoryState): boolean {
  return (
    hasStoryPlayerEvent(story, "story", "pokedex-received") ||
    story.badgeIds.length > 0 ||
    story.capturedPokemon.length > 0 ||
    story.boxedPokemon.length > 0
  );
}

/** Viridian Mart clerk: gives OAK'S PARCEL once, before the Pokédex exists. */
export function receiveOaksParcel(story: StoryState): {
  story: StoryState;
  granted: boolean;
} {
  if (hasPokedex(story) || hasStoryKeyItem(story, "oaks-parcel")) {
    return { story, granted: false };
  }
  const result = grantStoryKeyItemOnce(story, "oaks-parcel");
  return { story: result.story, granted: result.granted };
}

/** Prof. Oak takes the parcel and gives the Pokédex. */
export function deliverOaksParcel(story: StoryState): StoryState {
  return completeStoryPlayerEvent(
    removeStoryKeyItem(story, "oaks-parcel"),
    "story",
    "pokedex-received",
  );
}
