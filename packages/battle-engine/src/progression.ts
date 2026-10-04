import {
  calculateDuelPokemonMaxHp,
  DUEL_MOVES,
  normalizeDuelMajorStatus,
  normalizeDuelMovePp,
  restoreDuelMovePp,
  type DuelMajorStatus,
  type DuelMoveId,
  type DuelMovePp,
  type DuelSpeciesId,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "./duel";

export type EvStat =
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

export type EvSpread = Record<EvStat, number>;

export type GrowthRate =
  | "medium-slow"
  | "medium-fast"
  | "fast"
  | "slow";

export interface PokemonProgression {
  species: DuelSpeciesId;
  level: number;
  /**
   * Cumulative EXP, matching the core-series representation.
   * Example: a Medium Slow level 5 Pokémon has 135 total EXP.
   */
  experience: number;
  evs: EvSpread;
  /** Current persistent HP. Zero means fainted. */
  currentHp: number;
  /** Persistent non-volatile status. */
  status: DuelMajorStatus;
  activeMoves: DuelMoveId[];
  /** Current PP for each active move; persisted between battles. */
  movePp: DuelMovePp;
}

export interface ProgressionReward {
  progression: PokemonProgression;
  xpGained: number;
  experienceBefore: number;
  experienceAfter: number;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  evGained: EvSpread;
  autoLearnedMoves: DuelMoveId[];
  pendingMoves: DuelMoveId[];
}

export interface ExperienceProgress {
  total: number;
  levelStart: number;
  nextLevelTotal: number;
  current: number;
  required: number;
  percent: number;
}

export interface LearnsetEntry {
  level: number;
  moveId: DuelMoveId;
}

export const POKEMON_LEARNSETS: Record<
  DuelSpeciesId,
  LearnsetEntry[]
> = {
  bulbasaur: [
    { level: 1, moveId: "tackle" },
    { level: 3, moveId: "growl" },
    { level: 7, moveId: "vine-whip" },
    { level: 9, moveId: "razor-leaf" },
    { level: 11, moveId: "seed-bomb" },
  ],
  charmander: [
    { level: 1, moveId: "scratch" },
    { level: 3, moveId: "growl" },
    { level: 7, moveId: "ember" },
    { level: 9, moveId: "metal-claw" },
    { level: 11, moveId: "flame-burst" },
  ],
  squirtle: [
    { level: 1, moveId: "tackle" },
    { level: 3, moveId: "tail-whip" },
    { level: 7, moveId: "water-gun" },
    { level: 9, moveId: "bite" },
    { level: 11, moveId: "aqua-jet" },
  ],
  pidgey: [
    { level: 1, moveId: "tackle" },
  ],
  pidgeotto: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "sand-attack" },
    { level: 1, moveId: "gust" },
    { level: 13, moveId: "quick-attack" },
  ],
  abra: [
    { level: 1, moveId: "teleport" },
  ],
  oddish: [
    { level: 1, moveId: "absorb" },
    { level: 7, moveId: "sweet-scent" },
    { level: 14, moveId: "poison-powder" },
    { level: 16, moveId: "stun-spore" },
    { level: 18, moveId: "sleep-powder" },
  ],
  bellsprout: [
    { level: 1, moveId: "vine-whip" },
    { level: 6, moveId: "growth" },
    { level: 11, moveId: "wrap" },
    { level: 15, moveId: "sleep-powder" },
    { level: 17, moveId: "poison-powder" },
    { level: 19, moveId: "stun-spore" },
  ],
  rattata: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "tail-whip" },
  ],
  caterpie: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "string-shot" },
  ],
  weedle: [
    { level: 1, moveId: "poison-sting" },
    { level: 1, moveId: "string-shot" },
  ],
  spearow: [
    { level: 1, moveId: "peck" },
    { level: 1, moveId: "growl" },
    { level: 7, moveId: "leer" },
  ],
  mankey: [
    { level: 1, moveId: "scratch" },
    { level: 1, moveId: "leer" },
  ],
  machop: [
    { level: 1, moveId: "low-kick" },
    { level: 1, moveId: "leer" },
    { level: 7, moveId: "focus-energy" },
    { level: 13, moveId: "karate-chop" },
  ],
  slowpoke: [
    { level: 1, moveId: "tackle" },
    { level: 6, moveId: "growl" },
    { level: 13, moveId: "water-gun" },
    { level: 17, moveId: "confusion" },
  ],
  metapod: [
    { level: 1, moveId: "harden" },
    { level: 7, moveId: "harden" },
  ],
  kakuna: [
    { level: 1, moveId: "harden" },
    { level: 7, moveId: "harden" },
  ],
  pikachu: [
    { level: 1, moveId: "thunder-shock" },
    { level: 1, moveId: "growl" },
    { level: 6, moveId: "tail-whip" },
  ],
  ekans: [
    { level: 1, moveId: "bind" },
    { level: 1, moveId: "leer" },
    { level: 8, moveId: "poison-sting" },
    { level: 13, moveId: "bite" },
  ],
  "nidoran-f": [
    { level: 1, moveId: "growl" },
    { level: 1, moveId: "scratch" },
    { level: 8, moveId: "tail-whip" },
    { level: 17, moveId: "poison-sting" },
    { level: 20, moveId: "bite" },
  ],
  "nidoran-m": [
    { level: 1, moveId: "leer" },
    { level: 1, moveId: "peck" },
    { level: 17, moveId: "poison-sting" },
  ],
  jigglypuff: [
    { level: 4, moveId: "defense-curl" },
    { level: 9, moveId: "pound" },
  ],
  zubat: [
    { level: 6, moveId: "astonish" },
    { level: 16, moveId: "bite" },
  ],
  paras: [
    { level: 1, moveId: "scratch" },
    { level: 7, moveId: "stun-spore" },
    { level: 13, moveId: "poison-powder" },
  ],
  parasect: [
    { level: 1, moveId: "scratch" },
    { level: 1, moveId: "stun-spore" },
    { level: 1, moveId: "poison-powder" },
  ],
  clefairy: [
    { level: 1, moveId: "pound" },
    { level: 1, moveId: "growl" },
    { level: 25, moveId: "defense-curl" },
  ],
  sandshrew: [
    { level: 1, moveId: "scratch" },
    { level: 6, moveId: "defense-curl" },
    { level: 17, moveId: "poison-sting" },
  ],
  grimer: [
    { level: 1, moveId: "pound" },
    { level: 4, moveId: "harden" },
  ],
  voltorb: [
    { level: 1, moveId: "tackle" },
  ],
  koffing: [
    { level: 1, moveId: "tackle" },
  ],
  geodude: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "defense-curl" },
  ],
  onix: [
    { level: 1, moveId: "tackle" },
    { level: 8, moveId: "bind" },
  ],
  horsea: [
    { level: 1, moveId: "bubble" },
    { level: 15, moveId: "leer" },
    { level: 22, moveId: "water-gun" },
  ],
  shellder: [
    { level: 1, moveId: "tackle" },
    { level: 8, moveId: "icicle-spear" },
    { level: 36, moveId: "leer" },
  ],
  goldeen: [
    { level: 1, moveId: "peck" },
    { level: 1, moveId: "tail-whip" },
    { level: 15, moveId: "horn-attack" },
  ],
  staryu: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "harden" },
    { level: 6, moveId: "water-gun" },
    { level: 15, moveId: "recover" },
    { level: 24, moveId: "swift" },
  ],
  starmie: [
    { level: 1, moveId: "water-gun" },
    { level: 1, moveId: "rapid-spin" },
    { level: 1, moveId: "recover" },
    { level: 1, moveId: "swift" },
  ],
};

export const STARTER_LEARNSETS: Record<
  StarterSpeciesId,
  LearnsetEntry[]
> = {
  bulbasaur: POKEMON_LEARNSETS.bulbasaur,
  charmander: POKEMON_LEARNSETS.charmander,
  squirtle: POKEMON_LEARNSETS.squirtle,
};

const ZERO_EVS: EvSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

const AUTO_EV_CYCLES: Record<DuelSpeciesId, EvStat[]> = {
  bulbasaur: [
    "hp",
    "specialAttack",
    "hp",
    "specialAttack",
    "defense",
    "speed",
  ],
  charmander: [
    "speed",
    "specialAttack",
    "attack",
    "speed",
    "specialAttack",
    "attack",
  ],
  squirtle: [
    "defense",
    "hp",
    "specialDefense",
    "defense",
    "hp",
    "specialDefense",
  ],
  pidgey: [
    "speed",
    "attack",
    "speed",
    "specialDefense",
    "speed",
    "attack",
  ],
  pidgeotto: [
    "speed",
    "speed",
    "attack",
    "speed",
    "specialDefense",
    "speed",
  ],
  abra: [
    "specialAttack",
    "speed",
    "specialAttack",
    "speed",
    "specialDefense",
    "specialAttack",
  ],
  oddish: [
    "specialAttack",
    "specialDefense",
    "specialAttack",
    "hp",
    "specialAttack",
    "defense",
  ],
  bellsprout: [
    "attack",
    "specialAttack",
    "attack",
    "speed",
    "attack",
    "specialAttack",
  ],
  rattata: [
    "speed",
    "attack",
    "speed",
    "attack",
    "speed",
    "defense",
  ],
  caterpie: [
    "hp",
    "hp",
    "defense",
    "hp",
    "specialDefense",
    "hp",
  ],
  weedle: [
    "speed",
    "speed",
    "attack",
    "speed",
    "defense",
    "speed",
  ],
  spearow: [
    "speed",
    "attack",
    "speed",
    "attack",
    "speed",
    "specialDefense",
  ],
  mankey: [
    "attack",
    "speed",
    "attack",
    "defense",
    "attack",
    "speed",
  ],
  machop: [
    "attack",
    "hp",
    "attack",
    "defense",
    "attack",
    "hp",
  ],
  slowpoke: [
    "hp",
    "defense",
    "hp",
    "specialAttack",
    "hp",
    "specialDefense",
  ],
  metapod: [
    "defense",
    "defense",
    "hp",
    "defense",
    "specialDefense",
    "defense",
  ],
  kakuna: [
    "defense",
    "defense",
    "hp",
    "defense",
    "specialDefense",
    "defense",
  ],
  pikachu: [
    "speed",
    "speed",
    "specialAttack",
    "speed",
    "attack",
    "speed",
  ],
  ekans: [
    "attack",
    "speed",
    "attack",
    "specialDefense",
    "attack",
    "speed",
  ],
  "nidoran-f": [
    "hp",
    "defense",
    "hp",
    "defense",
    "specialDefense",
    "hp",
  ],
  "nidoran-m": [
    "attack",
    "speed",
    "attack",
    "speed",
    "defense",
    "attack",
  ],
  jigglypuff: [
    "hp",
    "hp",
    "hp",
    "specialAttack",
    "hp",
    "specialDefense",
  ],
  zubat: ["speed", "speed", "attack", "speed", "specialDefense", "speed"],
  paras: ["attack", "defense", "attack", "specialDefense", "attack", "hp"],
  parasect: ["attack", "defense", "attack", "specialDefense", "attack", "defense"],
  clefairy: ["hp", "specialDefense", "hp", "specialAttack", "hp", "defense"],
  sandshrew: [
    "defense",
    "attack",
    "defense",
    "attack",
    "defense",
    "hp",
  ],
  grimer: [
    "hp",
    "attack",
    "hp",
    "defense",
    "attack",
    "hp",
  ],
  voltorb: [
    "speed",
    "specialAttack",
    "speed",
    "specialDefense",
    "speed",
    "defense",
  ],
  koffing: [
    "defense",
    "specialAttack",
    "defense",
    "attack",
    "defense",
    "hp",
  ],
  geodude: [
    "defense",
    "attack",
    "defense",
    "hp",
    "defense",
    "attack",
  ],
  onix: [
    "defense",
    "speed",
    "defense",
    "hp",
    "defense",
    "speed",
  ],
  horsea: [
    "specialAttack",
    "specialAttack",
    "speed",
    "specialAttack",
    "defense",
    "specialAttack",
  ],
  shellder: [
    "defense",
    "defense",
    "attack",
    "defense",
    "hp",
    "defense",
  ],
  goldeen: [
    "attack",
    "speed",
    "attack",
    "specialDefense",
    "attack",
    "speed",
  ],
  staryu: [
    "speed",
    "specialAttack",
    "speed",
    "specialAttack",
    "defense",
    "speed",
  ],
  starmie: [
    "speed",
    "speed",
    "specialAttack",
    "speed",
    "specialAttack",
    "speed",
  ],
};

const INITIAL_MOVES: Record<DuelSpeciesId, DuelMoveId[]> = {
  bulbasaur: ["tackle", "growl"],
  charmander: ["scratch", "growl"],
  squirtle: ["tackle", "tail-whip"],
  pidgey: ["tackle"],
  pidgeotto: ["tackle", "sand-attack", "gust", "quick-attack"],
  abra: ["teleport"],
  oddish: ["absorb", "sweet-scent"],
  bellsprout: ["vine-whip", "growth", "wrap"],
  rattata: ["tackle", "tail-whip"],
  caterpie: ["tackle", "string-shot"],
  weedle: ["poison-sting", "string-shot"],
  spearow: ["peck", "growl"],
  mankey: ["scratch", "leer"],
  machop: ["low-kick", "leer", "focus-energy", "karate-chop"],
  slowpoke: ["tackle", "growl", "water-gun", "confusion"],
  metapod: ["harden"],
  kakuna: ["harden"],
  pikachu: ["thunder-shock", "growl"],
  ekans: ["bind", "leer", "poison-sting"],
  "nidoran-f": ["scratch", "growl"],
  "nidoran-m": ["peck", "leer"],
  jigglypuff: ["pound", "defense-curl"],
  zubat: ["astonish"],
  paras: ["scratch", "stun-spore", "poison-powder"],
  parasect: ["scratch", "stun-spore", "poison-powder"],
  clefairy: ["pound", "growl"],
  sandshrew: ["scratch", "defense-curl"],
  grimer: ["pound", "harden"],
  voltorb: ["tackle"],
  koffing: ["tackle"],
  geodude: ["tackle", "defense-curl"],
  onix: ["tackle", "bind"],
  horsea: ["bubble", "leer"],
  shellder: ["tackle", "icicle-spear"],
  goldeen: ["peck", "tail-whip", "horn-attack"],
  staryu: ["tackle", "harden", "water-gun", "recover"],
  starmie: ["water-gun", "rapid-spin", "recover", "swift"],
};

/**
 * FireRed / Generation III base EXP yields.
 * These are the values used by the defeated species in the flat Gen I-IV
 * experience formula.
 */
export const GEN_III_BASE_EXPERIENCE: Record<
  DuelSpeciesId,
  number
> = {
  bulbasaur: 64,
  charmander: 65,
  squirtle: 66,
  pidgey: 55,
  pidgeotto: 113,
  abra: 73,
  oddish: 78,
  bellsprout: 84,
  rattata: 57,
  caterpie: 53,
  weedle: 52,
  spearow: 58,
  mankey: 74,
  machop: 88,
  slowpoke: 99,
  metapod: 72,
  kakuna: 71,
  pikachu: 82,
  ekans: 62,
  "nidoran-f": 59,
  "nidoran-m": 60,
  jigglypuff: 76,
  zubat: 54,
  paras: 70,
  parasect: 128,
  clefairy: 68,
  sandshrew: 93,
  grimer: 90,
  voltorb: 103,
  koffing: 114,
  geodude: 86,
  onix: 108,
  horsea: 83,
  shellder: 97,
  goldeen: 111,
  staryu: 106,
  starmie: 207,
};

export const POKEMON_GROWTH_RATE: Record<
  DuelSpeciesId,
  GrowthRate
> = {
  bulbasaur: "medium-slow",
  charmander: "medium-slow",
  squirtle: "medium-slow",
  pidgey: "medium-slow",
  pidgeotto: "medium-slow",
  abra: "medium-slow",
  oddish: "medium-slow",
  bellsprout: "medium-slow",
  rattata: "medium-fast",
  caterpie: "medium-fast",
  weedle: "medium-fast",
  spearow: "medium-fast",
  mankey: "medium-fast",
  machop: "medium-slow",
  slowpoke: "medium-fast",
  metapod: "medium-fast",
  kakuna: "medium-fast",
  pikachu: "medium-fast",
  ekans: "medium-fast",
  "nidoran-f": "medium-slow",
  "nidoran-m": "medium-slow",
  jigglypuff: "fast",
  zubat: "medium-fast",
  paras: "medium-fast",
  parasect: "medium-fast",
  clefairy: "fast",
  sandshrew: "medium-fast",
  grimer: "medium-fast",
  voltorb: "medium-fast",
  koffing: "medium-fast",
  geodude: "medium-slow",
  onix: "medium-fast",
  horsea: "medium-fast",
  shellder: "slow",
  goldeen: "medium-fast",
  staryu: "slow",
  starmie: "slow",
};

export const STARTER_GROWTH_RATE: Record<
  StarterSpeciesId,
  GrowthRate
> = {
  bulbasaur: POKEMON_GROWTH_RATE.bulbasaur,
  charmander: POKEMON_GROWTH_RATE.charmander,
  squirtle: POKEMON_GROWTH_RATE.squirtle,
};

const MAX_EV_PER_STAT = 252;
const MAX_TOTAL_EV = 510;
const EV_PER_LEVEL = 6;

function boundedLevel(level: number): number {
  return Math.max(1, Math.min(100, Math.trunc(level)));
}

/**
 * Generation III uses a lookup table. For Medium Slow, its table follows
 * floor(6/5*n^3 - 15*n^2 + 100*n - 140), except level 1 is explicitly 0.
 * The Kanto starters and Pidgey use Medium Slow in FireRed; Rattata uses
 * Medium Fast.
 */
export function fireRedExperienceAtLevel(
  species: DuelSpeciesId,
  level: number,
): number {
  const n = boundedLevel(level);
  const growthRate = POKEMON_GROWTH_RATE[species];

  if (n <= 1) {
    return 0;
  }

  switch (growthRate) {
    case "medium-slow":
      return Math.max(
        0,
        Math.floor(
          (6 * n * n * n) / 5 -
            15 * n * n +
            100 * n -
            140,
        ),
      );
    case "medium-fast":
      return n * n * n;
    case "fast":
      return Math.floor((4 * n * n * n) / 5);
    case "slow":
      return Math.floor((5 * n * n * n) / 4);
  }
}

export function experienceForNextLevel(
  level: number,
  species: DuelSpeciesId = "bulbasaur",
): number {
  const currentLevel = boundedLevel(level);
  if (currentLevel >= 100) {
    return 0;
  }

  return (
    fireRedExperienceAtLevel(species, currentLevel + 1) -
    fireRedExperienceAtLevel(species, currentLevel)
  );
}

export function experienceProgress(
  progression: Pick<
    PokemonProgression,
    "species" | "level" | "experience"
  >,
): ExperienceProgress {
  const level = boundedLevel(progression.level);
  const levelStart = fireRedExperienceAtLevel(
    progression.species,
    level,
  );
  const nextLevelTotal =
    level >= 100
      ? levelStart
      : fireRedExperienceAtLevel(
          progression.species,
          level + 1,
        );
  const required = Math.max(0, nextLevelTotal - levelStart);
  const current = Math.max(
    0,
    Math.min(
      required,
      Math.trunc(progression.experience) - levelStart,
    ),
  );

  return {
    total: Math.max(levelStart, Math.trunc(progression.experience)),
    levelStart,
    nextLevelTotal,
    current,
    required,
    percent:
      required <= 0
        ? 100
        : Math.max(0, Math.min(100, (current / required) * 100)),
  };
}

export function createPokemonProgression<T extends DuelSpeciesId>(
  species: T,
  level: number,
): PokemonProgression & { species: T } {
  const bounded = boundedLevel(level);

  const evs = { ...ZERO_EVS };

  const activeMoves =
    species === "paras" && bounded < 13
      ? INITIAL_MOVES.paras.filter(
          (moveId) => moveId !== "poison-powder",
        )
      : [...INITIAL_MOVES[species]];

  return {
    species,
    level: bounded,
    experience: fireRedExperienceAtLevel(species, bounded),
    evs,
    currentHp: calculateDuelPokemonMaxHp({
      species,
      level: bounded,
      evs,
    }),
    status: null,
    activeMoves,
    movePp: restoreDuelMovePp(activeMoves),
  };
}

export function createStarterProgression(
  species: StarterSpeciesId,
): PokemonProgression {
  return createPokemonProgression(species, 5);
}

/**
 * Migrates the previous Tactimon prototype save format where experience
 * stored only progress within the current level.
 */
export function normalizePokemonProgression(
  input: Partial<PokemonProgression> &
    Pick<PokemonProgression, "species" | "level">,
): PokemonProgression {
  const level = boundedLevel(input.level);
  const base = createPokemonProgression(input.species, level);
  const levelStart = fireRedExperienceAtLevel(
    input.species,
    level,
  );
  const rawExperience = Math.max(
    0,
    Math.trunc(input.experience ?? levelStart),
  );

  const oldPrototypeRequirement = 40 + level * 15;
  const currentRequirement = experienceForNextLevel(
    level,
    input.species,
  );
  const migratedExperience =
    rawExperience < levelStart
      ? levelStart +
        Math.floor(
          Math.min(
            0.999,
            rawExperience /
              Math.max(1, oldPrototypeRequirement),
          ) * currentRequirement,
        )
      : rawExperience;

  const evs: EvSpread = {
    ...ZERO_EVS,
    ...input.evs,
  };
  const maxHp = calculateDuelPokemonMaxHp({
    species: input.species,
    level,
    evs,
  });
  const currentHp =
    typeof input.currentHp === "number" &&
    Number.isFinite(input.currentHp)
      ? Math.max(
          0,
          Math.min(maxHp, Math.trunc(input.currentHp)),
        )
      : maxHp;

  const activeMoves =
    Array.isArray(input.activeMoves) &&
    input.activeMoves.length > 0
      ? [...input.activeMoves].slice(0, 4)
      : [...base.activeMoves];

  return {
    species: input.species,
    level,
    experience: migratedExperience,
    evs,
    currentHp,
    status: normalizeDuelMajorStatus(input.status),
    activeMoves,
    movePp: normalizeDuelMovePp(
      activeMoves,
      input.movePp,
    ),
  };
}

/**
 * FireRed / Gen III flat wild EXP formula for one participating Pokémon:
 * floor(baseExpYield * defeatedLevel / 7).
 *
 * Exp. Share, traded-Pokémon and Lucky Egg modifiers are not active in the
 * current early prototype, so every other multiplier is 1.
 */
export function experienceRewardForWild(
  species: DuelSpeciesId,
  enemyLevel: number,
): number {
  const baseExperience = GEN_III_BASE_EXPERIENCE[species];
  const level = boundedLevel(enemyLevel);

  return Math.floor((baseExperience * level) / 7);
}

export function experienceRewardForTrainer(
  species: DuelSpeciesId,
  enemyLevel: number,
  participants = 1,
): number {
  const base = experienceRewardForWild(
    species,
    enemyLevel,
  );
  const shared = Math.max(
    1,
    Math.floor(
      base /
        Math.max(1, Math.trunc(participants)),
    ),
  );

  // FireRed divides the base reward between participants first,
  // then applies the trainer-battle 150% multiplier.
  return Math.floor((shared * 150) / 100);
}

export function totalEv(evs: EvSpread): number {
  return Object.values(evs).reduce(
    (sum, value) => sum + value,
    0,
  );
}

function emptyEvDelta(): EvSpread {
  return { ...ZERO_EVS };
}

function grantAutoEv(
  progression: PokemonProgression,
  points: number,
): {
  evs: EvSpread;
  gained: EvSpread;
} {
  const evs = { ...progression.evs };
  const gained = emptyEvDelta();
  const cycle = AUTO_EV_CYCLES[progression.species];
  let cursor = totalEv(evs);

  for (let awarded = 0; awarded < points; awarded += 1) {
    if (totalEv(evs) >= MAX_TOTAL_EV) {
      break;
    }

    let assigned = false;

    for (let attempt = 0; attempt < cycle.length; attempt += 1) {
      const stat = cycle[(cursor + attempt) % cycle.length];

      if (evs[stat] >= MAX_EV_PER_STAT) {
        continue;
      }

      evs[stat] += 1;
      gained[stat] += 1;
      cursor += attempt + 1;
      assigned = true;
      break;
    }

    if (!assigned) {
      break;
    }
  }

  return { evs, gained };
}

function movesLearnedAtLevel(
  species: DuelSpeciesId,
  level: number,
): DuelMoveId[] {
  return POKEMON_LEARNSETS[species]
    .filter((entry) => entry.level === level)
    .map((entry) => entry.moveId);
}

function grantExperience(
  input: PokemonProgression,
  requestedXp: number,
): ProgressionReward {
  const progression = normalizePokemonProgression(input);
  const oldMaxHp = calculateDuelPokemonMaxHp(progression);
  const hpBefore = progression.currentHp;
  const oldLevel = progression.level;
  const experienceBefore = progression.experience;
  const awardedXp =
    progression.level >= 100
      ? 0
      : Math.max(0, Math.trunc(requestedXp));
  const level100Cap = fireRedExperienceAtLevel(
    progression.species,
    100,
  );

  progression.experience = Math.min(
    level100Cap,
    progression.experience + awardedXp,
  );

  const xpGained =
    progression.experience - experienceBefore;
  const evGained = emptyEvDelta();
  const autoLearnedMoves: DuelMoveId[] = [];
  const pendingMoves: DuelMoveId[] = [];

  while (
    progression.level < 100 &&
    progression.experience >=
      fireRedExperienceAtLevel(
        progression.species,
        progression.level + 1,
      )
  ) {
    progression.level += 1;

    const allocation = grantAutoEv(
      progression,
      EV_PER_LEVEL,
    );
    progression.evs = allocation.evs;

    for (const stat of Object.keys(evGained) as EvStat[]) {
      evGained[stat] += allocation.gained[stat];
    }

    for (const moveId of movesLearnedAtLevel(
      progression.species,
      progression.level,
    )) {
      if (progression.activeMoves.includes(moveId)) {
        continue;
      }

      if (progression.activeMoves.length < 4) {
        progression.activeMoves.push(moveId);
        progression.movePp[moveId] =
          DUEL_MOVES[moveId].maxPp;
        autoLearnedMoves.push(moveId);
      } else {
        pendingMoves.push(moveId);
      }
    }
  }

  const newMaxHp = calculateDuelPokemonMaxHp(progression);
  progression.currentHp =
    hpBefore <= 0
      ? 0
      : Math.min(
          newMaxHp,
          hpBefore + Math.max(0, newMaxHp - oldMaxHp),
        );

  return {
    progression,
    xpGained,
    experienceBefore,
    experienceAfter: progression.experience,
    oldLevel,
    newLevel: progression.level,
    levelsGained: progression.level - oldLevel,
    evGained,
    autoLearnedMoves,
    pendingMoves,
  };
}

export function grantWildBattleProgress(
  input: PokemonProgression,
  enemy: {
    species: WildSpeciesId;
    level: number;
  },
  xpRatio = 1,
): ProgressionReward {
  const requestedXp = Math.floor(
    experienceRewardForWild(
      enemy.species,
      enemy.level,
    ) * Math.max(0, Math.min(1, xpRatio)),
  );

  return grantExperience(
    input,
    requestedXp,
  );
}

export function grantWildBattleProgressToParty(
  party: readonly PokemonProgression[],
  enemy: {
    species: WildSpeciesId;
    level: number;
  },
  xpRatio = 1,
): ProgressionReward[] {
  if (party.length === 0) {
    return [];
  }

  const participantRatio =
    Math.max(0, Math.min(1, xpRatio)) / party.length;

  return party.map((progression) =>
    grantWildBattleProgress(
      progression,
      enemy,
      participantRatio,
    ),
  );
}

export function grantTrainerBattleProgressToParty(
  party: readonly PokemonProgression[],
  enemies: readonly {
    species: DuelSpeciesId;
    level: number;
  }[],
): ProgressionReward[] {
  if (party.length === 0) {
    return [];
  }

  const xpPerParticipant = enemies.reduce(
    (total, enemy) =>
      total +
      experienceRewardForTrainer(
        enemy.species,
        enemy.level,
        party.length,
      ),
    0,
  );

  return party.map((progression) =>
    grantExperience(
      progression,
      xpPerParticipant,
    ),
  );
}


export function resolveMoveLearning(
  input: PokemonProgression,
  newMoveId: DuelMoveId,
  replaceIndex: number | null,
): PokemonProgression {
  const progression: PokemonProgression = {
    ...input,
    evs: { ...input.evs },
    activeMoves: [...input.activeMoves],
    movePp: { ...input.movePp },
  };

  if (replaceIndex === null) {
    return progression;
  }

  if (
    replaceIndex < 0 ||
    replaceIndex >= progression.activeMoves.length
  ) {
    return progression;
  }

  const replacedMoveId =
    progression.activeMoves[replaceIndex];
  progression.activeMoves[replaceIndex] = newMoveId;
  progression.movePp[newMoveId] =
    DUEL_MOVES[newMoveId].maxPp;

  if (
    replacedMoveId !== newMoveId &&
    !progression.activeMoves.includes(replacedMoveId)
  ) {
    delete progression.movePp[replacedMoveId];
  }

  return progression;
}
