import type {
  DuelMoveId,
  StarterSpeciesId,
} from "./duel";

export type EvStat =
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

export type EvSpread = Record<EvStat, number>;

export interface PokemonProgression {
  species: StarterSpeciesId;
  level: number;
  experience: number;
  evs: EvSpread;
  activeMoves: DuelMoveId[];
}

export interface ProgressionReward {
  progression: PokemonProgression;
  xpGained: number;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  evGained: EvSpread;
  autoLearnedMoves: DuelMoveId[];
  pendingMoves: DuelMoveId[];
}

export interface LearnsetEntry {
  level: number;
  moveId: DuelMoveId;
}

export const STARTER_LEARNSETS: Record<
  StarterSpeciesId,
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
};

const ZERO_EVS: EvSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

const AUTO_EV_CYCLES: Record<StarterSpeciesId, EvStat[]> = {
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
};

const INITIAL_MOVES: Record<StarterSpeciesId, DuelMoveId[]> = {
  bulbasaur: ["tackle", "growl"],
  charmander: ["scratch", "growl"],
  squirtle: ["tackle", "tail-whip"],
};

const MAX_EV_PER_STAT = 252;
const MAX_TOTAL_EV = 510;
const EV_PER_LEVEL = 6;

export function createStarterProgression(
  species: StarterSpeciesId,
): PokemonProgression {
  return {
    species,
    level: 5,
    experience: 0,
    evs: { ...ZERO_EVS },
    activeMoves: [...INITIAL_MOVES[species]],
  };
}

export function experienceForNextLevel(level: number): number {
  return 40 + Math.max(1, Math.trunc(level)) * 15;
}

export function experienceRewardForWild(
  enemyLevel: number,
): number {
  return 40 + Math.max(1, Math.trunc(enemyLevel)) * 22;
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
  species: StarterSpeciesId,
  level: number,
): DuelMoveId[] {
  return STARTER_LEARNSETS[species]
    .filter((entry) => entry.level === level)
    .map((entry) => entry.moveId);
}

export function grantWildBattleProgress(
  input: PokemonProgression,
  enemyLevel: number,
): ProgressionReward {
  const progression: PokemonProgression = {
    ...input,
    evs: { ...input.evs },
    activeMoves: [...input.activeMoves],
  };
  const oldLevel = progression.level;
  const xpGained = experienceRewardForWild(enemyLevel);
  const evGained = emptyEvDelta();
  const autoLearnedMoves: DuelMoveId[] = [];
  const pendingMoves: DuelMoveId[] = [];

  progression.experience += xpGained;

  while (
    progression.experience >=
      experienceForNextLevel(progression.level) &&
    progression.level < 100
  ) {
    progression.experience -= experienceForNextLevel(
      progression.level,
    );
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

  return {
    progression,
    xpGained,
    oldLevel,
    newLevel: progression.level,
    levelsGained: progression.level - oldLevel,
    evGained,
    autoLearnedMoves,
    pendingMoves,
  };
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
