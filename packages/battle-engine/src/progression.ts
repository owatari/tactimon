import {
  calculateDuelPokemonMaxHp,
  type DuelMoveId,
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

export type GrowthRate = "medium-slow" | "medium-fast";

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
  activeMoves: DuelMoveId[];
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
  rattata: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "tail-whip" },
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
  rattata: [
    "speed",
    "attack",
    "speed",
    "attack",
    "speed",
    "defense",
  ],
};

const INITIAL_MOVES: Record<DuelSpeciesId, DuelMoveId[]> = {
  bulbasaur: ["tackle", "growl"],
  charmander: ["scratch", "growl"],
  squirtle: ["tackle", "tail-whip"],
  pidgey: ["tackle"],
  rattata: ["tackle", "tail-whip"],
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
  rattata: 57,
};

export const POKEMON_GROWTH_RATE: Record<
  DuelSpeciesId,
  GrowthRate
> = {
  bulbasaur: "medium-slow",
  charmander: "medium-slow",
  squirtle: "medium-slow",
  pidgey: "medium-slow",
  rattata: "medium-fast",
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
    activeMoves: [...INITIAL_MOVES[species]],
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

  return {
    species: input.species,
    level,
    experience: migratedExperience,
    evs,
    currentHp,
    activeMoves:
      Array.isArray(input.activeMoves) &&
      input.activeMoves.length > 0
        ? [...input.activeMoves].slice(0, 4)
        : [...base.activeMoves],
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

  progression.activeMoves[replaceIndex] = newMoveId;
  return progression;
}
