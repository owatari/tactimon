import {
  GENERATED_BASE_EXPERIENCE,
  GENERATED_GROWTH_RATE,
  GENERATED_INITIAL_MOVES,
  GENERATED_LEARNSETS,
  GENERATED_LEVEL_EVOLUTIONS,
  GENERATED_STONE_EVOLUTIONS,
  type GeneratedSpeciesId,
} from "./generated/kanto";
import {
  calculateDuelPokemonMaxHp,
  DUEL_MOVES,
  normalizeDuelMajorStatus,
  normalizeDuelMovePp,
  normalizeDuelSleepTurns,
  restoreDuelMovePp,
  type DuelMajorStatus,
  type DuelMoveId,
  type DuelMovePp,
  type DuelSpeciesId,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "./duel";
import { GENERATED_EV_YIELD } from "./generated/evYield";
import {
  isNatureId,
  normalizeIvs,
  type IvSpread,
  type NatureId,
  type Personality,
} from "./personality";

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
  /** Individual values; absent on old saves (treated as 15 everywhere). */
  ivs?: IvSpread;
  /** Absent on old saves (neutral). */
  nature?: NatureId;
  /** Current persistent HP. Zero means fainted. */
  currentHp: number;
  /** Persistent non-volatile status. */
  status: DuelMajorStatus;
  /** Persistent FireRed Sleep counter; zero for every other status. */
  sleepTurnsRemaining?: number;
  activeMoves: DuelMoveId[];
  /** Current PP for each active move; persisted between battles. */
  movePp: DuelMovePp;
}

export interface ProgressionEvolution {
  from: DuelSpeciesId;
  to: DuelSpeciesId;
  level: number;
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
  evolutions: ProgressionEvolution[];
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

const HAND_LEVEL_EVOLUTIONS: Partial<
  Record<
    DuelSpeciesId,
    { level: number; species: DuelSpeciesId }
  >
> = {
  bulbasaur: { level: 16, species: "ivysaur" },
  ivysaur: { level: 32, species: "venusaur" },
  charmander: { level: 16, species: "charmeleon" },
  charmeleon: { level: 36, species: "charizard" },
  squirtle: { level: 16, species: "wartortle" },
  wartortle: { level: 36, species: "blastoise" },
  pidgey: { level: 18, species: "pidgeotto" },
  pidgeotto: { level: 36, species: "pidgeot" },
  rattata: { level: 20, species: "raticate" },
  caterpie: { level: 7, species: "metapod" },
  metapod: { level: 10, species: "butterfree" },
  weedle: { level: 7, species: "kakuna" },
  abra: { level: 16, species: "kadabra" },
  paras: { level: 24, species: "parasect" },
};

const LEVEL_EVOLUTIONS: Partial<
  Record<DuelSpeciesId, { level: number; species: DuelSpeciesId }>
> = {
  ...(GENERATED_LEVEL_EVOLUTIONS as Partial<
    Record<DuelSpeciesId, { level: number; species: DuelSpeciesId }>
  >),
  ...HAND_LEVEL_EVOLUTIONS,
};

function applyEligibleLevelEvolutions(
  progression: PokemonProgression,
  evolutions: ProgressionEvolution[],
): void {
  for (let guard = 0; guard < 3; guard += 1) {
    const evolution =
      LEVEL_EVOLUTIONS[progression.species];
    if (
      !evolution ||
      progression.level < evolution.level
    ) {
      return;
    }

    const from = progression.species;
    progression.species = evolution.species;
    evolutions.push({
      from,
      to: evolution.species,
      level: progression.level,
    });
  }
}

const HAND_POKEMON_LEARNSETS: Record<
  Exclude<DuelSpeciesId, GeneratedSpeciesId>,
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
  meowth: [
    { level: 1, moveId: "scratch" },
    { level: 1, moveId: "growl" },
    { level: 10, moveId: "bite" },
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
    { level: 7, moveId: "quick-attack" },
    { level: 13, moveId: "hyper-fang" },
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
    { level: 13, moveId: "fury-attack" },
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
  drowzee: [
    { level: 1, moveId: "pound" },
    { level: 1, moveId: "hypnosis" },
    { level: 7, moveId: "disable" },
    { level: 11, moveId: "confusion" },
    { level: 17, moveId: "headbutt" },
  ],
  butterfree: [
    { level: 1, moveId: "confusion" },
    { level: 10, moveId: "confusion" },
    { level: 13, moveId: "poison-powder" },
    { level: 14, moveId: "stun-spore" },
    { level: 15, moveId: "sleep-powder" },
    { level: 18, moveId: "supersonic" },
  ],
  raticate: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "tail-whip" },
    { level: 1, moveId: "quick-attack" },
    { level: 7, moveId: "quick-attack" },
    { level: 13, moveId: "hyper-fang" },
  ],
  wartortle: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "tail-whip" },
    { level: 1, moveId: "bubble" },
    { level: 10, moveId: "withdraw" },
    { level: 13, moveId: "water-gun" },
    { level: 19, moveId: "bite" },
  ],
  ivysaur: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "growl" },
    { level: 1, moveId: "leech-seed" },
    { level: 10, moveId: "vine-whip" },
    { level: 15, moveId: "poison-powder" },
    { level: 15, moveId: "sleep-powder" },
  ],
  charmeleon: [
    { level: 1, moveId: "scratch" },
    { level: 1, moveId: "growl" },
    { level: 1, moveId: "ember" },
    { level: 13, moveId: "metal-claw" },
    { level: 20, moveId: "smokescreen" },
  ],
  kadabra: [
    { level: 1, moveId: "teleport" },
    { level: 1, moveId: "kinesis" },
    { level: 1, moveId: "confusion" },
    { level: 18, moveId: "disable" },
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
    { level: 8, moveId: "thunder-wave" },
    { level: 11, moveId: "quick-attack" },
    { level: 15, moveId: "double-team" },
    { level: 20, moveId: "slam" },
  ],
  raichu: [
    { level: 1, moveId: "thunder-shock" },
    { level: 1, moveId: "tail-whip" },
    { level: 1, moveId: "quick-attack" },
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
    { level: 8, moveId: "screech" },
    { level: 15, moveId: "sonic-boom" },
    { level: 21, moveId: "spark" },
  ],
  magnemite: [
    { level: 1, moveId: "tackle" },
    { level: 6, moveId: "thunder-shock" },
    { level: 11, moveId: "supersonic" },
    { level: 16, moveId: "sonic-boom" },
    { level: 21, moveId: "thunder-wave" },
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
  tentacool: [
    { level: 1, moveId: "poison-sting" },
    { level: 6, moveId: "supersonic" },
    { level: 12, moveId: "wrap" },
  ],
  ponyta: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "growl" },
    { level: 10, moveId: "tail-whip" },
    { level: 17, moveId: "ember" },
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
  pidgeot: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "sand-attack" },
    { level: 1, moveId: "gust" },
    { level: 1, moveId: "quick-attack" },
    { level: 34, moveId: "feather-dance" },
    { level: 48, moveId: "agility" },
  ],
  rhyhorn: [
    { level: 1, moveId: "horn-attack" },
    { level: 1, moveId: "tail-whip" },
    { level: 15, moveId: "fury-attack" },
    { level: 24, moveId: "scary-face" },
  ],
  growlithe: [
    { level: 1, moveId: "bite" },
    { level: 7, moveId: "ember" },
    { level: 13, moveId: "leer" },
    { level: 43, moveId: "agility" },
  ],
  exeggcute: [
    { level: 1, moveId: "hypnosis" },
    { level: 13, moveId: "leech-seed" },
    { level: 19, moveId: "confusion" },
    { level: 25, moveId: "stun-spore" },
    { level: 31, moveId: "poison-powder" },
    { level: 37, moveId: "sleep-powder" },
  ],
  gyarados: [
    { level: 20, moveId: "bite" },
    { level: 30, moveId: "leer" },
  ],
  alakazam: [
    { level: 1, moveId: "teleport" },
    { level: 1, moveId: "kinesis" },
    { level: 1, moveId: "confusion" },
    { level: 18, moveId: "disable" },
    { level: 25, moveId: "recover" },
  ],
  blastoise: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "tail-whip" },
    { level: 1, moveId: "bubble" },
    { level: 1, moveId: "withdraw" },
    { level: 13, moveId: "water-gun" },
    { level: 19, moveId: "bite" },
    { level: 25, moveId: "rapid-spin" },
  ],
  venusaur: [
    { level: 1, moveId: "tackle" },
    { level: 1, moveId: "growl" },
    { level: 1, moveId: "leech-seed" },
    { level: 1, moveId: "vine-whip" },
    { level: 15, moveId: "poison-powder" },
    { level: 15, moveId: "sleep-powder" },
    { level: 22, moveId: "razor-leaf" },
    { level: 29, moveId: "sweet-scent" },
    { level: 41, moveId: "growth" },
  ],
  charizard: [
    { level: 1, moveId: "scratch" },
    { level: 1, moveId: "growl" },
    { level: 1, moveId: "ember" },
    { level: 1, moveId: "metal-claw" },
    { level: 20, moveId: "smokescreen" },
    { level: 27, moveId: "scary-face" },
  ],
};

export const POKEMON_LEARNSETS: Record<DuelSpeciesId, LearnsetEntry[]> = {
  ...HAND_POKEMON_LEARNSETS,
  ...(GENERATED_LEARNSETS as unknown as Record<GeneratedSpeciesId, LearnsetEntry[]>),
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

const HAND_INITIAL_MOVES: Record<Exclude<DuelSpeciesId, GeneratedSpeciesId>, DuelMoveId[]> = {
  bulbasaur: ["tackle", "growl"],
  charmander: ["scratch", "growl"],
  squirtle: ["tackle", "tail-whip"],
  pidgey: ["tackle"],
  pidgeotto: ["tackle", "sand-attack", "gust", "quick-attack"],
  abra: ["teleport"],
  meowth: ["scratch", "growl", "bite"],
  oddish: ["absorb", "sweet-scent"],
  bellsprout: ["vine-whip", "growth", "wrap"],
  rattata: ["tackle", "tail-whip"],
  caterpie: ["tackle", "string-shot"],
  weedle: ["poison-sting", "string-shot"],
  spearow: ["peck", "growl"],
  mankey: ["scratch", "leer"],
  machop: ["low-kick", "leer", "focus-energy", "karate-chop"],
  slowpoke: ["tackle", "growl", "water-gun", "confusion"],
  drowzee: ["hypnosis", "disable", "confusion", "headbutt"],
  butterfree: ["poison-powder", "stun-spore", "sleep-powder", "supersonic"],
  raticate: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
  wartortle: ["bubble", "withdraw", "water-gun", "bite"],
  ivysaur: ["leech-seed", "vine-whip", "poison-powder", "sleep-powder"],
  charmeleon: ["growl", "ember", "metal-claw", "smokescreen"],
  kadabra: ["teleport", "kinesis", "confusion", "disable"],
  metapod: ["harden"],
  kakuna: ["harden"],
  pikachu: ["thunder-shock", "growl"],
  raichu: ["quick-attack", "thunder-wave", "double-team", "shock-wave"],
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
  magnemite: ["thunder-shock", "supersonic", "sonic-boom", "thunder-wave"],
  koffing: ["tackle"],
  geodude: ["tackle", "defense-curl"],
  onix: ["tackle", "bind"],
  horsea: ["bubble", "leer"],
  tentacool: ["poison-sting", "supersonic", "wrap"],
  ponyta: ["tackle", "growl", "tail-whip", "ember"],
  shellder: ["tackle", "icicle-spear"],
  goldeen: ["peck", "tail-whip", "horn-attack"],
  staryu: ["tackle", "harden", "water-gun", "recover"],
  starmie: ["water-gun", "rapid-spin", "recover", "swift"],
  pidgeot: ["tackle", "sand-attack", "gust", "quick-attack"],
  rhyhorn: ["horn-attack", "tail-whip"],
  growlithe: ["bite"],
  exeggcute: ["hypnosis"],
  gyarados: ["bite"],
  alakazam: ["teleport", "kinesis", "confusion"],
  blastoise: ["tackle", "tail-whip", "bubble", "withdraw"],
  venusaur: ["tackle", "growl", "leech-seed", "vine-whip"],
  charizard: ["scratch", "growl", "ember", "metal-claw"],
};

const INITIAL_MOVES: Record<DuelSpeciesId, DuelMoveId[]> = {
  ...HAND_INITIAL_MOVES,
  ...(GENERATED_INITIAL_MOVES as Record<GeneratedSpeciesId, DuelMoveId[]>),
};

/**
 * FireRed / Generation III base EXP yields.
 * These are the values used by the defeated species in the flat Gen I-IV
 * experience formula.
 */
const HAND_GEN_III_BASE_EXPERIENCE: Record<
  Exclude<DuelSpeciesId, GeneratedSpeciesId>,
  number
> = {
  bulbasaur: 64,
  charmander: 65,
  squirtle: 66,
  pidgey: 55,
  pidgeotto: 113,
  abra: 73,
  meowth: 69,
  oddish: 78,
  bellsprout: 84,
  rattata: 57,
  caterpie: 53,
  weedle: 52,
  spearow: 58,
  mankey: 74,
  machop: 88,
  slowpoke: 99,
  drowzee: 102,
  butterfree: 160,
  raticate: 116,
  wartortle: 143,
  ivysaur: 141,
  charmeleon: 142,
  kadabra: 145,
  metapod: 72,
  kakuna: 71,
  pikachu: 82,
  raichu: 122,
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
  magnemite: 89,
  koffing: 114,
  geodude: 86,
  onix: 108,
  horsea: 83,
  tentacool: 105,
  ponyta: 152,
  shellder: 97,
  goldeen: 111,
  staryu: 106,
  starmie: 207,
  pidgeot: 172,
  rhyhorn: 135,
  growlithe: 91,
  exeggcute: 98,
  gyarados: 214,
  alakazam: 186,
  blastoise: 210,
  venusaur: 208,
  charizard: 209,
};

export const GEN_III_BASE_EXPERIENCE: Record<DuelSpeciesId, number> = {
  ...HAND_GEN_III_BASE_EXPERIENCE,
  ...GENERATED_BASE_EXPERIENCE,
};

const HAND_POKEMON_GROWTH_RATE: Record<
  Exclude<DuelSpeciesId, GeneratedSpeciesId>,
  GrowthRate
> = {
  bulbasaur: "medium-slow",
  charmander: "medium-slow",
  squirtle: "medium-slow",
  pidgey: "medium-slow",
  pidgeotto: "medium-slow",
  abra: "medium-slow",
  meowth: "medium-fast",
  oddish: "medium-slow",
  bellsprout: "medium-slow",
  rattata: "medium-fast",
  caterpie: "medium-fast",
  weedle: "medium-fast",
  spearow: "medium-fast",
  mankey: "medium-fast",
  machop: "medium-slow",
  slowpoke: "medium-fast",
  drowzee: "medium-fast",
  butterfree: "medium-fast",
  raticate: "medium-fast",
  wartortle: "medium-slow",
  ivysaur: "medium-slow",
  charmeleon: "medium-slow",
  kadabra: "medium-slow",
  metapod: "medium-fast",
  kakuna: "medium-fast",
  pikachu: "medium-fast",
  raichu: "medium-fast",
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
  magnemite: "medium-fast",
  koffing: "medium-fast",
  geodude: "medium-slow",
  onix: "medium-fast",
  horsea: "medium-fast",
  tentacool: "slow",
  ponyta: "medium-fast",
  shellder: "slow",
  goldeen: "medium-fast",
  staryu: "slow",
  starmie: "slow",
  pidgeot: "medium-slow",
  rhyhorn: "slow",
  growlithe: "slow",
  exeggcute: "slow",
  gyarados: "slow",
  alakazam: "medium-slow",
  blastoise: "medium-slow",
  venusaur: "medium-slow",
  charizard: "medium-slow",
};

export const POKEMON_GROWTH_RATE: Record<DuelSpeciesId, GrowthRate> = {
  ...HAND_POKEMON_GROWTH_RATE,
  ...(GENERATED_GROWTH_RATE as Record<GeneratedSpeciesId, GrowthRate>),
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
const VITAMIN_EV_AMOUNT = 10;
/** Vitamins stop working once a stat has this many EVs (Gen III). */
export const VITAMIN_EV_CAP = 100;

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
  personality?: Personality,
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
    ...(personality
      ? { ivs: { ...personality.ivs }, nature: personality.nature }
      : {}),
    currentHp: calculateDuelPokemonMaxHp({
      species,
      level: bounded,
      evs,
      ivs: personality?.ivs,
    }),
    status: null,
    sleepTurnsRemaining: 0,
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
  const ivs = normalizeIvs(input.ivs);
  const nature = isNatureId(input.nature) ? input.nature : undefined;
  const maxHp = calculateDuelPokemonMaxHp({
    species: input.species,
    level,
    evs,
    ivs,
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

  const status = normalizeDuelMajorStatus(
    input.status,
  );

  return {
    species: input.species,
    level,
    experience: migratedExperience,
    evs,
    ...(ivs ? { ivs } : {}),
    ...(nature ? { nature } : {}),
    currentHp,
    status,
    sleepTurnsRemaining: normalizeDuelSleepTurns(
      status,
      input.sleepTurnsRemaining,
    ),
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

/** Gen III EV yield of a defeated species (what every participant receives). */
export function evYieldFor(species: DuelSpeciesId): Partial<EvSpread> {
  return GENERATED_EV_YIELD[species] ?? {};
}

/**
 * Adds EVs the way the cartridge does: each stat is capped at 252 and the whole spread at 510.
 * `statCap` lowers the per-stat cap (vitamins stop at 100).
 */
export function addEvs(
  current: EvSpread,
  gain: Partial<EvSpread>,
  statCap = MAX_EV_PER_STAT,
): { evs: EvSpread; gained: EvSpread } {
  const evs = { ...current };
  const gained = emptyEvDelta();

  for (const stat of Object.keys(evs) as EvStat[]) {
    const wanted = Math.max(0, Math.trunc(gain[stat] ?? 0));
    const room = Math.min(
      statCap - evs[stat],
      MAX_TOTAL_EV - totalEv(evs),
    );
    const added = Math.max(0, Math.min(wanted, room));
    evs[stat] += added;
    gained[stat] += added;
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
  evYield: Partial<EvSpread> = {},
): ProgressionReward {
  const progression = normalizePokemonProgression(input);
  const oldMaxHp = calculateDuelPokemonMaxHp(progression);
  const hpBefore = progression.currentHp;
  const oldLevel = progression.level;
  const experienceBefore = progression.experience;
  const evolutions: ProgressionEvolution[] = [];
  applyEligibleLevelEvolutions(
    progression,
    evolutions,
  );
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
  // FireRed: EVs are applied when the foe faints, before any level-up recalculates the stats.
  const evAllocation = addEvs(progression.evs, evYield);
  progression.evs = evAllocation.evs;
  const evGained = evAllocation.gained;
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
    applyEligibleLevelEvolutions(
      progression,
      evolutions,
    );

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
    evolutions,
  };
}

/** Evolution stone (Fire/Thunder/Water/Leaf/Moon). Null when it has no effect. */
export function evolveWithStone(
  input: PokemonProgression,
  stone: string,
): PokemonProgression | null {
  const target = (
    GENERATED_STONE_EVOLUTIONS as Record<
      string,
      Record<string, string>
    >
  )[input.species]?.[stone];
  if (!target) {
    return null;
  }

  const progression = normalizePokemonProgression(input);
  const oldMaxHp = calculateDuelPokemonMaxHp(progression);
  progression.species = target as DuelSpeciesId;
  const newMaxHp = calculateDuelPokemonMaxHp(progression);
  progression.currentHp =
    progression.currentHp <= 0
      ? 0
      : Math.min(
          newMaxHp,
          progression.currentHp +
            Math.max(0, newMaxHp - oldMaxHp),
        );

  return progression;
}

/** Raw experience (Day Care steps): levels up, learns moves and evolves as usual. */
export function grantExperiencePoints(
  input: PokemonProgression,
  experience: number,
): ProgressionReward {
  return grantExperience(input, experience);
}

/** Rare Candy: grants exactly the experience needed for the next level. */
export function grantRareCandy(
  input: PokemonProgression,
): ProgressionReward | null {
  const progression = normalizePokemonProgression(input);
  if (progression.level >= 100) {
    return null;
  }

  return grantExperience(
    progression,
    fireRedExperienceAtLevel(
      progression.species,
      progression.level + 1,
    ) - progression.experience,
  );
}

export function grantWildBattleProgress(
  input: PokemonProgression,
  enemy: {
    species: WildSpeciesId;
    level: number;
    /** false for a captured Pokémon: nothing fainted, so no EVs. */
    evYield?: boolean;
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
    enemy.evYield === false ? {} : evYieldFor(enemy.species),
  );
}

export function grantWildBattleProgressToParty(
  party: readonly PokemonProgression[],
  enemy: {
    species: WildSpeciesId;
    level: number;
    evYield?: boolean;
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

export function grantWildBattlesProgressToParty(
  party: readonly PokemonProgression[],
  enemies: readonly {
    species: WildSpeciesId;
    level: number;
    xpRatio?: number;
    /** false for a captured Pokémon: nothing fainted, so no EVs. */
    evYield?: boolean;
  }[],
  defaultXpRatio = 1,
): ProgressionReward[] {
  if (
    party.length === 0 ||
    enemies.length === 0
  ) {
    return [];
  }

  const defaultRatio = Math.max(
    0,
    Math.min(1, defaultXpRatio),
  );
  const totalXp = enemies.reduce(
    (total, enemy) => {
      const ratio = Math.max(
        0,
        Math.min(
          1,
          enemy.xpRatio ?? defaultRatio,
        ),
      );

      return (
        total +
        experienceRewardForWild(
          enemy.species,
          enemy.level,
        ) *
          ratio
      );
    },
    0,
  );
  const xpPerParticipant = Math.floor(
    totalXp / party.length,
  );

  const evYield = sumEvYield(
    enemies
      .filter((enemy) => enemy.evYield !== false)
      .map((enemy) => enemy.species),
  );

  return party.map((progression) =>
    grantExperience(
      progression,
      xpPerParticipant,
      evYield,
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

  const evYield = sumEvYield(enemies.map((enemy) => enemy.species));

  return party.map((progression) =>
    grantExperience(
      progression,
      xpPerParticipant,
      evYield,
    ),
  );
}

/** Every participant receives the full yield of each defeated foe (not split like EXP). */
function sumEvYield(species: readonly DuelSpeciesId[]): EvSpread {
  const total = emptyEvDelta();
  for (const id of species) {
    const yields = evYieldFor(id);
    for (const stat of Object.keys(total) as EvStat[]) {
      total[stat] += yields[stat] ?? 0;
    }
  }
  return total;
}

/**
 * Vitamins (HP Up, Protein, Iron, Calcium, Zinc, Carbos): +10 EVs, but no effect once the stat has 100
 * EVs or the 510 total is reached. HP Up raises max HP, and current HP rises with it.
 */
export function grantVitamin(
  input: PokemonProgression,
  stat: EvStat,
): PokemonProgression | null {
  const progression = normalizePokemonProgression(input);
  const allocation = addEvs(
    progression.evs,
    { [stat]: VITAMIN_EV_AMOUNT },
    VITAMIN_EV_CAP,
  );
  if (allocation.gained[stat] <= 0) {
    return null;
  }

  const oldMaxHp = calculateDuelPokemonMaxHp(progression);
  progression.evs = allocation.evs;
  const newMaxHp = calculateDuelPokemonMaxHp(progression);
  progression.currentHp =
    progression.currentHp <= 0
      ? 0
      : Math.min(
          newMaxHp,
          progression.currentHp + Math.max(0, newMaxHp - oldMaxHp),
        );

  return progression;
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
