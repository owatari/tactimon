import {
  calculateHpStat,
  calculateOtherStat,
} from "./stats";
import {
  experimentalCaptureChance,
  getCaptureEligibility,
  resolveCaptureRoll,
  type CaptureEligibility,
} from "./capture";

export type StarterSpeciesId =
  | "bulbasaur"
  | "charmander"
  | "squirtle";

export type WildSpeciesId =
  | "pidgey"
  | "abra"
  | "oddish"
  | "meowth"
  | "rattata"
  | "caterpie"
  | "weedle"
  | "spearow"
  | "mankey"
  | "metapod"
  | "kakuna"
  | "pikachu"
  | "ekans"
  | "nidoran-f"
  | "nidoran-m"
  | "jigglypuff"
  | "zubat"
  | "paras"
  | "parasect"
  | "clefairy"
  | "geodude";
export type TrainerSpeciesId =
  | "pidgeotto"
  | "bellsprout"
  | "machop"
  | "slowpoke"
  | "drowzee"
  | "butterfree"
  | "raticate"
  | "wartortle"
  | "ivysaur"
  | "charmeleon"
  | "kadabra"
  | "onix"
  | "sandshrew"
  | "grimer"
  | "voltorb"
  | "koffing"
  | "horsea"
  | "shellder"
  | "goldeen"
  | "staryu"
  | "starmie";
export type DuelSpeciesId =
  | StarterSpeciesId
  | WildSpeciesId
  | TrainerSpeciesId;
export type DuelType =
  | "normal"
  | "fighting"
  | "flying"
  | "poison"
  | "ground"
  | "rock"
  | "bug"
  | "ghost"
  | "steel"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "psychic"
  | "ice"
  | "dragon"
  | "dark";

export type DuelSide = "player" | "rival";
export type DuelStatus = "active" | "finished";
export type DuelBattleKind = "trainer" | "wild";
export type DuelMajorStatus = "poison" | "paralysis" | "burn" | null;
export type DuelItemId = "potion" | "poke-ball";
export type DuelInventory = Record<DuelItemId, number>;
export type DuelMoveId =
  | "tackle"
  | "scratch"
  | "growl"
  | "tail-whip"
  | "sand-attack"
  | "gust"
  | "quick-attack"
  | "fury-attack"
  | "teleport"
  | "withdraw"
  | "sleep-powder"
  | "leech-seed"
  | "absorb"
  | "sweet-scent"
  | "growth"
  | "wrap"
  | "string-shot"
  | "poison-sting"
  | "stun-spore"
  | "poison-powder"
  | "peck"
  | "leer"
  | "harden"
  | "defense-curl"
  | "bind"
  | "rock-tomb"
  | "thunder-shock"
  | "thunder-wave"
  | "double-team"
  | "vine-whip"
  | "razor-leaf"
  | "seed-bomb"
  | "ember"
  | "metal-claw"
  | "flame-burst"
  | "water-gun"
  | "bubble"
  | "icicle-spear"
  | "horn-attack"
  | "low-kick"
  | "focus-energy"
  | "karate-chop"
  | "confusion"
  | "hypnosis"
  | "disable"
  | "headbutt"
  | "supersonic"
  | "hyper-fang"
  | "kinesis"
  | "smokescreen"
  | "recover"
  | "water-pulse"
  | "swift"
  | "rapid-spin"
  | "bite"
  | "aqua-jet"
  | "pound"
  | "astonish"
  | "struggle";

export type DuelMovePp = Partial<Record<DuelMoveId, number>>;

export type DuelMoveTargeting =
  | "single-enemy"
  | "self";
export type DuelMoveMotion = "contact" | "status" | "projectile";
export type DuelStatId =
  | "attack"
  | "defense"
  | "speed";

export interface DuelPoint {
  x: number;
  y: number;
}

export interface DuelEvSpread {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface DuelPokemonBuild {
  species: DuelSpeciesId;
  level: number;
  moves: DuelMoveId[];
  /** Persistent current PP keyed by learned move. Missing entries start full. */
  movePp?: DuelMovePp;
  evs?: Partial<DuelEvSpread>;
  /** Persistent HP carried between battles. Omit to start at full HP. */
  currentHp?: number;
  /** Persistent major status carried between battles. */
  status?: DuelMajorStatus;
}

export interface TrainerDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  players: readonly DuelPokemonBuild[];
  rivals: readonly DuelPokemonBuild[];
  trainerName?: string;
  items?: Partial<DuelInventory>;
}

export interface StarterDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  /** Backward-compatible single-member party input. */
  player?: DuelPokemonBuild;
  /** Every member is deployed at battle start, capped at six. */
  players?: readonly DuelPokemonBuild[];
  /** Optional explicit rival party; defaults to Blue's counter starter. */
  rivals?: readonly DuelPokemonBuild[];
  items?: Partial<DuelInventory>;
}

export interface WildDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  /** Backward-compatible single-member party input. */
  player?: DuelPokemonBuild;
  /** Every member is deployed at battle start, capped at six. */
  players?: readonly DuelPokemonBuild[];
  captureAllowed?: boolean;
  items?: Partial<DuelInventory>;
  wildSpecies: WildSpeciesId;
  wildLevel: number;
}

export type DuelItem =
  | { id: "potion"; name: string; kind: "heal"; target: "ally"; heal: number }
  | { id: "poke-ball"; name: string; kind: "capture"; target: "wild-enemy"; ballModifier: number };

export function normalizeDuelMajorStatus(
  value: unknown,
): DuelMajorStatus {
  return value === "poison" ||
    value === "paralysis" ||
    value === "burn"
    ? value
    : null;
}

export interface DuelMove {
  id: DuelMoveId;
  name: string;
  type: DuelType;
  category: "physical" | "special" | "status";
  targeting: DuelMoveTargeting;
  motion: DuelMoveMotion;
  vfxId: DuelMoveId;
  description: string;
  power: number | null;
  apCost: number;
  maxPp: number;
  minRange: number;
  maxRange: number;
  secondaryStatus?: Exclude<DuelMajorStatus, null>;
  secondaryEffectChance?: number;
  effect?:
    | "attack-down"
    | "defense-down"
    | "defense-up"
    | "speed-down"
    | "heal-self"
    | "drain-half"
    | "teleport";
}

export type DuelPresentationEvent =
  | {
      kind: "movement";
      actorId: string;
      from: DuelPoint;
      to: DuelPoint;
      cost: number;
    }
  | {
      kind: "move";
      actorId: string;
      moveId: DuelMoveId;
      targetIds: string[];
      vfxId: DuelMoveId;
      motion: DuelMoveMotion;
      results: Array<{
        targetId: string;
        damage: number;
        fainted: boolean;
        statChanges: Array<{
          stat: DuelStatId;
          delta: number;
        }>;
        statusApplied?: Exclude<DuelMajorStatus, null>;
        sameTypeAttackBonus?: boolean;
        typeEffectiveness?: number;
      }>;
    }
  | {
      kind: "item";
      actorId: string;
      itemId: DuelItemId;
      targetIds: string[];
      healed: number;
    }
  | {
      kind: "capture";
      actorId: string;
      itemId: "poke-ball";
      targetIds: string[];
      success: boolean;
      chance: number;
      xpRatio: number;
      targetFlees: boolean;
    };

export interface DuelUnit {
  id: string;
  side: DuelSide;
  species: DuelSpeciesId;
  displayName: string;
  type: DuelType;
  types: DuelType[];
  level: number;
  hp: number;
  maxHp: number;
  status: DuelMajorStatus;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  attackStage: number;
  defenseStage: number;
  speedStage: number;
  ap: number;
  maxAp: number;
  mp: number;
  maxMp: number;
  position: DuelPoint;
  moves: DuelMoveId[];
  movePp: DuelMovePp;
  captureAttempted: boolean;
}

export interface DuelState {
  width: number;
  height: number;
  seed: number;
  blocked: DuelPoint[];
  battleKind: DuelBattleKind;
  escaped: boolean;
  escapedBy: DuelSide | null;
  captureAllowed: boolean;
  items: DuelInventory;
  round: number;
  turnOrder: string[];
  turnIndex: number;
  activeUnitId: string;
  status: DuelStatus;
  winner: DuelSide | null;
  captureResult: {
    success: boolean;
    species: WildSpeciesId;
    level: number;
    xpRatio: number;
    chance: number;
    status: DuelMajorStatus;
  } | null;
  units: DuelUnit[];
  log: string[];
}

export type DuelAction =
  | {
      kind: "move";
      unitId: string;
      to: DuelPoint;
    }
  | {
      kind: "use-move";
      unitId: string;
      moveId: DuelMoveId;
      targetId: string;
    }
  | {
      kind: "use-item";
      unitId: string;
      itemId: DuelItemId;
      targetId: string;
    }
  | {
      kind: "flee";
      unitId: string;
    }
  | {
      kind: "end-turn";
      unitId: string;
    };

export interface DuelActionResult {
  state: DuelState;
  accepted: boolean;
  reason?: string;
  presentation?: DuelPresentationEvent;
}

export interface DuelAiTurnResult {
  state: DuelState;
  steps: DuelActionResult[];
}

const LEVEL = 5;
const FIXED_IV = 15;
const MAX_STAGE = 6;

type SpeciesData = {
  name: string;
  type: DuelType;
  types: readonly DuelType[];
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  moves: DuelMoveId[];
};

const TYPE_EFFECTIVENESS: Partial<
  Record<DuelType, Partial<Record<DuelType, 0 | 0.5 | 2>>>
> = {
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    ground: 2,
    rock: 2,
    dragon: 0.5,
  },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: {
    fighting: 2,
    poison: 2,
    psychic: 0.5,
    dark: 0,
    steel: 0.5,
  },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: {
    normal: 0,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    steel: 0.5,
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    steel: 0.5,
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
  },
};

export function calculateTypeEffectiveness(
  attackingType: DuelType,
  defendingTypes: readonly DuelType[],
): number {
  let effectiveness = 1;

  for (const defendingType of new Set(defendingTypes)) {
    effectiveness *=
      TYPE_EFFECTIVENESS[attackingType]?.[defendingType] ?? 1;
  }

  return effectiveness;
}

const SPECIES: Record<DuelSpeciesId, SpeciesData> = {
  bulbasaur: {
    name: "Bulbasaur",
    type: "grass",
    types: ["grass", "poison"],
    hp: 45,
    attack: 49,
    defense: 49,
    specialAttack: 65,
    specialDefense: 65,
    speed: 45,
    moves: ["tackle", "growl"],
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    types: ["fire"],
    hp: 39,
    attack: 52,
    defense: 43,
    specialAttack: 60,
    specialDefense: 50,
    speed: 65,
    moves: ["scratch", "growl"],
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    types: ["water"],
    hp: 44,
    attack: 48,
    defense: 65,
    specialAttack: 50,
    specialDefense: 64,
    speed: 43,
    moves: ["tackle", "tail-whip"],
  },
  pidgey: {
    name: "Pidgey",
    type: "flying",
    types: ["normal", "flying"],
    hp: 40,
    attack: 45,
    defense: 40,
    specialAttack: 35,
    specialDefense: 35,
    speed: 56,
    moves: ["tackle", "growl"],
  },
  pidgeotto: {
    name: "Pidgeotto",
    type: "flying",
    types: ["normal", "flying"],
    hp: 63,
    attack: 60,
    defense: 55,
    specialAttack: 50,
    specialDefense: 50,
    speed: 71,
    moves: ["tackle", "sand-attack", "gust", "quick-attack"],
  },
  abra: {
    name: "Abra",
    type: "psychic",
    types: ["psychic"],
    hp: 25,
    attack: 20,
    defense: 15,
    specialAttack: 105,
    specialDefense: 55,
    speed: 90,
    moves: ["teleport"],
  },
  oddish: {
    name: "Oddish",
    type: "grass",
    types: ["grass", "poison"],
    hp: 45,
    attack: 50,
    defense: 55,
    specialAttack: 75,
    specialDefense: 65,
    speed: 30,
    moves: ["absorb", "sweet-scent"],
  },
  meowth: {
    name: "Meowth",
    type: "normal",
    types: ["normal"],
    hp: 40,
    attack: 45,
    defense: 35,
    specialAttack: 40,
    specialDefense: 40,
    speed: 90,
    moves: ["scratch", "growl", "bite"],
  },
  bellsprout: {
    name: "Bellsprout",
    type: "grass",
    types: ["grass", "poison"],
    hp: 50,
    attack: 75,
    defense: 35,
    specialAttack: 70,
    specialDefense: 30,
    speed: 40,
    moves: ["vine-whip", "growth", "wrap"],
  },
  rattata: {
    name: "Rattata",
    type: "normal",
    types: ["normal"],
    hp: 30,
    attack: 56,
    defense: 35,
    specialAttack: 25,
    specialDefense: 35,
    speed: 72,
    moves: ["tackle", "tail-whip"],
  },
  caterpie: {
    name: "Caterpie",
    type: "bug",
    types: ["bug"],
    hp: 45,
    attack: 30,
    defense: 35,
    specialAttack: 20,
    specialDefense: 20,
    speed: 45,
    moves: ["tackle", "string-shot"],
  },
  weedle: {
    name: "Weedle",
    type: "bug",
    types: ["bug", "poison"],
    hp: 40,
    attack: 35,
    defense: 30,
    specialAttack: 20,
    specialDefense: 20,
    speed: 50,
    moves: ["poison-sting", "string-shot"],
  },
  spearow: {
    name: "Spearow",
    type: "flying",
    types: ["normal", "flying"],
    hp: 40,
    attack: 60,
    defense: 30,
    specialAttack: 31,
    specialDefense: 31,
    speed: 70,
    moves: ["peck", "growl"],
  },
  mankey: {
    name: "Mankey",
    type: "fighting",
    types: ["fighting"],
    hp: 40,
    attack: 80,
    defense: 35,
    specialAttack: 35,
    specialDefense: 45,
    speed: 70,
    moves: ["scratch", "leer"],
  },
  machop: {
    name: "Machop",
    type: "fighting",
    types: ["fighting"],
    hp: 70,
    attack: 80,
    defense: 50,
    specialAttack: 35,
    specialDefense: 35,
    speed: 35,
    moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
  },
  slowpoke: {
    name: "Slowpoke",
    type: "water",
    types: ["water", "psychic"],
    hp: 90,
    attack: 65,
    defense: 65,
    specialAttack: 40,
    specialDefense: 40,
    speed: 15,
    moves: ["tackle", "growl", "water-gun", "confusion"],
  },
  drowzee: {
    name: "Drowzee",
    type: "psychic",
    types: ["psychic"],
    hp: 60,
    attack: 48,
    defense: 45,
    specialAttack: 43,
    specialDefense: 90,
    speed: 42,
    moves: ["hypnosis", "disable", "confusion", "headbutt"],
  },
  butterfree: {
    name: "Butterfree",
    type: "bug",
    types: ["bug", "flying"],
    hp: 60,
    attack: 45,
    defense: 50,
    specialAttack: 80,
    specialDefense: 80,
    speed: 70,
    moves: ["poison-powder", "stun-spore", "sleep-powder", "supersonic"],
  },
  raticate: {
    name: "Raticate",
    type: "normal",
    types: ["normal"],
    hp: 55,
    attack: 81,
    defense: 60,
    specialAttack: 50,
    specialDefense: 70,
    speed: 97,
    moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
  },
  wartortle: {
    name: "Wartortle",
    type: "water",
    types: ["water"],
    hp: 59,
    attack: 63,
    defense: 80,
    specialAttack: 65,
    specialDefense: 80,
    speed: 58,
    moves: ["bubble", "withdraw", "water-gun", "bite"],
  },
  ivysaur: {
    name: "Ivysaur",
    type: "grass",
    types: ["grass", "poison"],
    hp: 60,
    attack: 62,
    defense: 63,
    specialAttack: 80,
    specialDefense: 80,
    speed: 60,
    moves: ["leech-seed", "vine-whip", "poison-powder", "sleep-powder"],
  },
  charmeleon: {
    name: "Charmeleon",
    type: "fire",
    types: ["fire"],
    hp: 58,
    attack: 64,
    defense: 58,
    specialAttack: 80,
    specialDefense: 65,
    speed: 80,
    moves: ["growl", "ember", "metal-claw", "smokescreen"],
  },
  kadabra: {
    name: "Kadabra",
    type: "psychic",
    types: ["psychic"],
    hp: 40,
    attack: 35,
    defense: 30,
    specialAttack: 120,
    specialDefense: 70,
    speed: 105,
    moves: ["teleport", "kinesis", "confusion", "disable"],
  },
  metapod: {
    name: "Metapod",
    type: "bug",
    types: ["bug"],
    hp: 50,
    attack: 20,
    defense: 55,
    specialAttack: 25,
    specialDefense: 25,
    speed: 30,
    moves: ["harden"],
  },
  kakuna: {
    name: "Kakuna",
    type: "bug",
    types: ["bug", "poison"],
    hp: 45,
    attack: 25,
    defense: 50,
    specialAttack: 25,
    specialDefense: 25,
    speed: 35,
    moves: ["harden"],
  },
  pikachu: {
    name: "Pikachu",
    type: "electric",
    types: ["electric"],
    hp: 35,
    attack: 55,
    defense: 30,
    specialAttack: 50,
    specialDefense: 40,
    speed: 90,
    moves: ["thunder-shock", "growl"],
  },
  ekans: {
    name: "Ekans",
    type: "poison",
    types: ["poison"],
    hp: 35,
    attack: 60,
    defense: 44,
    specialAttack: 40,
    specialDefense: 54,
    speed: 55,
    moves: ["bind", "leer", "poison-sting"],
  },
  "nidoran-f": {
    name: "Nidoran♀",
    type: "poison",
    types: ["poison"],
    hp: 55,
    attack: 47,
    defense: 52,
    specialAttack: 40,
    specialDefense: 40,
    speed: 41,
    moves: ["scratch", "growl"],
  },
  "nidoran-m": {
    name: "Nidoran♂",
    type: "poison",
    types: ["poison"],
    hp: 46,
    attack: 57,
    defense: 40,
    specialAttack: 40,
    specialDefense: 40,
    speed: 50,
    moves: ["peck", "leer"],
  },
  jigglypuff: {
    name: "Jigglypuff",
    type: "normal",
    types: ["normal"],
    hp: 115,
    attack: 45,
    defense: 20,
    specialAttack: 45,
    specialDefense: 25,
    speed: 20,
    // Sing/Disable are not modeled yet; Pound keeps low-level encounters
    // tactically active while Defense Curl preserves its defensive identity.
    moves: ["pound", "defense-curl"],
  },
  zubat: {
    name: "Zubat",
    type: "flying",
    types: ["poison", "flying"],
    hp: 40,
    attack: 45,
    defense: 35,
    specialAttack: 30,
    specialDefense: 40,
    speed: 55,
    moves: ["astonish"],
  },
  paras: {
    name: "Paras",
    type: "bug",
    types: ["bug", "grass"],
    hp: 35,
    attack: 70,
    defense: 55,
    specialAttack: 45,
    specialDefense: 55,
    speed: 25,
    moves: ["scratch", "stun-spore", "poison-powder"],
  },
  parasect: {
    name: "Parasect",
    type: "bug",
    types: ["bug", "grass"],
    hp: 60,
    attack: 95,
    defense: 80,
    specialAttack: 60,
    specialDefense: 80,
    speed: 30,
    moves: ["scratch", "stun-spore", "poison-powder"],
  },
  clefairy: {
    name: "Clefairy",
    type: "normal",
    types: ["normal"],
    hp: 70,
    attack: 45,
    defense: 48,
    specialAttack: 60,
    specialDefense: 65,
    speed: 35,
    moves: ["pound", "growl"],
  },
  sandshrew: {
    name: "Sandshrew",
    type: "ground",
    types: ["ground"],
    hp: 50,
    attack: 75,
    defense: 85,
    specialAttack: 20,
    specialDefense: 30,
    speed: 40,
    moves: ["scratch", "defense-curl"],
  },
  grimer: {
    name: "Grimer",
    type: "poison",
    types: ["poison"],
    hp: 80,
    attack: 80,
    defense: 50,
    specialAttack: 40,
    specialDefense: 50,
    speed: 25,
    moves: ["pound", "harden"],
  },
  voltorb: {
    name: "Voltorb",
    type: "electric",
    types: ["electric"],
    hp: 40,
    attack: 30,
    defense: 50,
    specialAttack: 55,
    specialDefense: 55,
    speed: 100,
    moves: ["tackle"],
  },
  koffing: {
    name: "Koffing",
    type: "poison",
    types: ["poison"],
    hp: 40,
    attack: 65,
    defense: 95,
    specialAttack: 60,
    specialDefense: 45,
    speed: 35,
    moves: ["tackle"],
  },
  horsea: {
    name: "Horsea",
    type: "water",
    types: ["water"],
    hp: 30,
    attack: 40,
    defense: 70,
    specialAttack: 70,
    specialDefense: 25,
    speed: 60,
    moves: ["bubble", "leer"],
  },
  shellder: {
    name: "Shellder",
    type: "water",
    types: ["water"],
    hp: 30,
    attack: 65,
    defense: 100,
    specialAttack: 45,
    specialDefense: 25,
    speed: 40,
    moves: ["tackle", "icicle-spear"],
  },
  goldeen: {
    name: "Goldeen",
    type: "water",
    types: ["water"],
    hp: 45,
    attack: 67,
    defense: 60,
    specialAttack: 35,
    specialDefense: 50,
    speed: 63,
    moves: ["peck", "tail-whip", "horn-attack"],
  },
  staryu: {
    name: "Staryu",
    type: "water",
    types: ["water"],
    hp: 30,
    attack: 45,
    defense: 55,
    specialAttack: 70,
    specialDefense: 55,
    speed: 85,
    moves: ["tackle", "harden", "recover", "water-pulse"],
  },
  starmie: {
    name: "Starmie",
    type: "water",
    types: ["water", "psychic"],
    hp: 60,
    attack: 75,
    defense: 85,
    specialAttack: 100,
    specialDefense: 85,
    speed: 115,
    moves: ["swift", "recover", "rapid-spin", "water-pulse"],
  },
  geodude: {
    name: "Geodude",
    type: "rock",
    types: ["rock", "ground"],
    hp: 40,
    attack: 80,
    defense: 100,
    specialAttack: 30,
    specialDefense: 30,
    speed: 20,
    moves: ["tackle", "defense-curl"],
  },
  onix: {
    name: "Onix",
    type: "rock",
    types: ["rock", "ground"],
    hp: 35,
    attack: 45,
    defense: 160,
    specialAttack: 30,
    specialDefense: 45,
    speed: 70,
    moves: ["tackle", "bind", "rock-tomb"],
  },
};

export const DUEL_ITEMS: Record<DuelItemId, DuelItem> = {
  potion: {
    id: "potion",
    name: "Potion",
    kind: "heal",
    target: "ally",
    heal: 20,
  },
  "poke-ball": {
    id: "poke-ball",
    name: "Poké Ball",
    kind: "capture",
    target: "wild-enemy",
    ballModifier: 1,
  },
};

const WILD_CATCH_RATE: Record<WildSpeciesId, number> = {
  pidgey: 255,
  abra: 200,
  oddish: 255,
  meowth: 255,
  rattata: 255,
  caterpie: 255,
  weedle: 255,
  spearow: 255,
  mankey: 190,
  metapod: 120,
  kakuna: 120,
  pikachu: 190,
  ekans: 255,
  "nidoran-f": 235,
  "nidoran-m": 235,
  jigglypuff: 170,
  zubat: 255,
  paras: 190,
  parasect: 75,
  clefairy: 150,
  geodude: 255,
};

function normalizeDuelItems(
  input: Partial<DuelInventory> | undefined,
  fallback: DuelInventory,
): DuelInventory {
  const normalize = (value: unknown, fallbackValue: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(999, Math.trunc(value)))
      : fallbackValue;

  return {
    potion: normalize(input?.potion, fallback.potion),
    "poke-ball": normalize(
      input?.["poke-ball"],
      fallback["poke-ball"],
    ),
  };
}

export const DUEL_MOVES: Record<DuelMoveId, DuelMove> = {
  tackle: {
    id: "tackle",
    name: "Tackle",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Avança sobre um inimigo adjacente e causa dano físico.",
    power: 40,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
  },
  pound: {
    id: "pound",
    name: "Pound",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Golpe físico simples contra um alvo adjacente.",
    power: 40,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
  },
  astonish: {
    id: "astonish",
    name: "Astonish",
    type: "ghost",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Ataque fantasmagórico de curta distância.",
    power: 30,
    apCost: 3,
    maxPp: 15,
    minRange: 1,
    maxRange: 1,
  },
  scratch: {
    id: "scratch",
    name: "Scratch",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "scratch",
    description: "Golpe de contato em um inimigo adjacente.",
    power: 40,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
  },
  growl: {
    id: "growl",
    name: "Growl",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description: "Reduz o Attack do alvo em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 1,
    maxRange: 3,
    effect: "attack-down",
  },
  "tail-whip": {
    id: "tail-whip",
    name: "Tail Whip",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "tail-whip",
    description: "Reduz a Defense do alvo em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 1,
    maxRange: 3,
    effect: "defense-down",
  },
  "sand-attack": {
    id: "sand-attack",
    name: "Sand Attack",
    type: "ground",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "tail-whip",
    description:
      "Ofusca o alvo; Accuracy ainda não é uma estatística tática do motor.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
  },
  gust: {
    id: "gust",
    name: "Gust",
    type: "flying",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "razor-leaf",
    description: "Rajada Flying de médio alcance.",
    power: 40,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 4,
  },
  "quick-attack": {
    id: "quick-attack",
    name: "Quick Attack",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Investida rápida contra um alvo próximo.",
    power: 40,
    apCost: 3,
    maxPp: 30,
    minRange: 1,
    maxRange: 2,
  },
  "fury-attack": {
    id: "fury-attack",
    name: "Fury Attack",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "peck",
    description:
      "Multi-hit no FireRed; enquanto multi-hit não é modelado, resolve um impacto de 15 power.",
    power: 15,
    apCost: 3,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
  },
  teleport: {
    id: "teleport",
    name: "Teleport",
    type: "psychic",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "growl",
    description:
      "Foge de encontros selvagens; falha em batalha de Treinador.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 0,
    maxRange: 0,
    effect: "teleport",
  },
  withdraw: {
    id: "withdraw",
    name: "Withdraw",
    type: "water",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description: "Aumenta a Defense do usuário em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 0,
    maxRange: 0,
    effect: "defense-up",
  },
  "sleep-powder": {
    id: "sleep-powder",
    name: "Sleep Powder",
    type: "grass",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "stun-spore",
    description:
      "Pó sonífero; Sleep ainda não é um status persistente do motor.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
  },
  "leech-seed": {
    id: "leech-seed",
    name: "Leech Seed",
    type: "grass",
    category: "status",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "seed-bomb",
    description:
      "Planta sementes drenantes; o efeito volátil ainda não está modelado.",
    power: null,
    apCost: 2,
    maxPp: 10,
    minRange: 1,
    maxRange: 3,
  },
  absorb: {
    id: "absorb",
    name: "Absorb",
    type: "grass",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "vine-whip",
    description:
      "Drena energia do alvo e recupera metade do dano causado.",
    power: 20,
    apCost: 3,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    effect: "drain-half",
  },
  "sweet-scent": {
    id: "sweet-scent",
    name: "Sweet Scent",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Reduz evasão no jogo original; evasão ainda não é modelada no motor.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
  },
  growth: {
    id: "growth",
    name: "Growth",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description:
      "Aumenta Special Attack no jogo original; estágio de Sp. Atk ainda não é modelado.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 0,
    maxRange: 0,
  },
  wrap: {
    id: "wrap",
    name: "Wrap",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "bind",
    description:
      "Aperta um alvo adjacente; o aprisionamento ainda não é modelado.",
    power: 15,
    apCost: 3,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
  },
  "string-shot": {
    id: "string-shot",
    name: "String Shot",
    type: "bug",
    category: "status",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "string-shot",
    description:
      "Prende o alvo em seda e reduz sua Speed em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 1,
    maxRange: 3,
    effect: "speed-down",
  },
  "poison-sting": {
    id: "poison-sting",
    name: "Poison Sting",
    type: "poison",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "poison-sting",
    description:
      "Dispara um ferrão venenoso com 30% de chance de envenenar.",
    power: 15,
    apCost: 3,
    maxPp: 35,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "poison",
    secondaryEffectChance: 30,
  },
  "stun-spore": {
    id: "stun-spore",
    name: "Stun Spore",
    type: "grass",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Espalha esporos com 75% de chance de paralisar o alvo.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "paralysis",
    secondaryEffectChance: 75,
  },
  "poison-powder": {
    id: "poison-powder",
    name: "PoisonPowder",
    type: "poison",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "poison-sting",
    description:
      "Espalha pó venenoso com 75% de chance de envenenar o alvo.",
    power: null,
    apCost: 2,
    maxPp: 35,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "poison",
    secondaryEffectChance: 75,
  },
  peck: {
    id: "peck",
    name: "Peck",
    type: "flying",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "peck",
    description: "Bica um inimigo adjacente.",
    power: 35,
    apCost: 3,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
  },
  leer: {
    id: "leer",
    name: "Leer",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "leer",
    description: "Intimida o alvo e reduz sua Defense em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 1,
    maxRange: 3,
    effect: "defense-down",
  },
  harden: {
    id: "harden",
    name: "Harden",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description: "Enrijece o corpo e aumenta a própria Defense em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 0,
    maxRange: 0,
    effect: "defense-up",
  },
  "defense-curl": {
    id: "defense-curl",
    name: "Defense Curl",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "defense-curl",
    description:
      "Enrola o corpo e aumenta a própria Defense em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 0,
    maxRange: 0,
    effect: "defense-up",
  },
  bind: {
    id: "bind",
    name: "Bind",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "bind",
    description: "Aperta um inimigo adjacente e causa dano físico.",
    power: 15,
    apCost: 3,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
  },
  "rock-tomb": {
    id: "rock-tomb",
    name: "Rock Tomb",
    type: "rock",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "rock-tomb",
    description:
      "Derruba rochas sobre o alvo e reduz sua Speed em 1 estágio.",
    power: 50,
    apCost: 4,
    maxPp: 10,
    minRange: 1,
    maxRange: 3,
    effect: "speed-down",
  },
  "thunder-shock": {
    id: "thunder-shock",
    name: "Thunder Shock",
    type: "electric",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "thunder-shock",
    description:
      "Dispara uma descarga com 10% de chance de paralisar.",
    power: 40,
    apCost: 4,
    maxPp: 30,
    minRange: 1,
    maxRange: 4,
    secondaryStatus: "paralysis",
    secondaryEffectChance: 10,
  },
  "thunder-wave": {
    id: "thunder-wave",
    name: "Thunder Wave",
    type: "electric",
    category: "status",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "thunder-shock",
    description: "Paralisa o alvo com uma onda elétrica.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "paralysis",
    secondaryEffectChance: 100,
  },
  "double-team": {
    id: "double-team",
    name: "Double Team",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description:
      "Aumenta Evasion no FireRed; Evasion ainda não é um estágio tático do motor.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 0,
    maxRange: 0,
  },
  "vine-whip": {
    id: "vine-whip",
    name: "Vine Whip",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "vine-whip",
    description: "Chicoteia um alvo a até 2 tiles de distância.",
    power: 45,
    apCost: 4,
    maxPp: 10,
    minRange: 1,
    maxRange: 2,
  },
  "razor-leaf": {
    id: "razor-leaf",
    name: "Razor Leaf",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "razor-leaf",
    description: "Lança folhas cortantes a média distância.",
    power: 55,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 4,
  },
  "seed-bomb": {
    id: "seed-bomb",
    name: "Seed Bomb",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "seed-bomb",
    description: "Projétil de sementes de alto impacto.",
    power: 65,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 4,
  },
  ember: {
    id: "ember",
    name: "Ember",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "ember",
    description:
      "Dispara brasas com 10% de chance de causar Burn.",
    power: 40,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 4,
    secondaryStatus: "burn",
    secondaryEffectChance: 10,
  },
  "metal-claw": {
    id: "metal-claw",
    name: "Metal Claw",
    type: "steel",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "metal-claw",
    description: "Ataque físico pesado contra um alvo adjacente.",
    power: 50,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
  },
  "flame-burst": {
    id: "flame-burst",
    name: "Flame Burst",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "flame-burst",
    description: "Projétil de fogo mais forte para média distância.",
    power: 65,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 4,
  },
  "water-gun": {
    id: "water-gun",
    name: "Water Gun",
    type: "water",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "water-gun",
    description: "Jato d'água que alcança até 4 tiles.",
    power: 40,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 4,
  },
  bubble: {
    id: "bubble",
    name: "Bubble",
    type: "water",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "water-gun",
    description: "Rajada leve de bolhas d'água.",
    power: 20,
    apCost: 3,
    maxPp: 30,
    minRange: 1,
    maxRange: 4,
  },
  "icicle-spear": {
    id: "icicle-spear",
    name: "Icicle Spear",
    type: "ice",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "rock-tomb",
    description: "Dispara uma lança de gelo contra o alvo.",
    power: 10,
    apCost: 3,
    maxPp: 30,
    minRange: 1,
    maxRange: 4,
  },
  "horn-attack": {
    id: "horn-attack",
    name: "Horn Attack",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Ataca com o chifre em alcance adjacente.",
    power: 65,
    apCost: 5,
    maxPp: 25,
    minRange: 1,
    maxRange: 1,
  },
  "low-kick": {
    id: "low-kick",
    name: "Low Kick",
    type: "fighting",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description:
      "Golpe Fighting de contato. O peso do alvo ainda não altera a potência tática.",
    power: 50,
    apCost: 4,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
  },
  "focus-energy": {
    id: "focus-energy",
    name: "Focus Energy",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description:
      "Aumenta chance de crítico no jogo original; critical-stage ainda não é modelado.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 0,
    maxRange: 0,
  },
  "karate-chop": {
    id: "karate-chop",
    name: "Karate Chop",
    type: "fighting",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Golpe Fighting de contato com boa potência.",
    power: 50,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 1,
  },
  confusion: {
    id: "confusion",
    name: "Confusion",
    type: "psychic",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "thunder-shock",
    description:
      "Ataque Psychic; a chance de confusão ainda não é um status persistente do motor.",
    power: 50,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 4,
  },
  hypnosis: {
    id: "hypnosis",
    name: "Hypnosis",
    type: "psychic",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Induz Sleep no jogo original; Sleep ainda não é um status persistente do motor.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
  },
  disable: {
    id: "disable",
    name: "Disable",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Bloqueia um golpe no jogo original; Disable ainda não é um efeito volátil do motor.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
  },
  headbutt: {
    id: "headbutt",
    name: "Headbutt",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description:
      "Cabeçada forte de contato; flinch ainda não é modelado.",
    power: 70,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 1,
  },
  supersonic: {
    id: "supersonic",
    name: "Supersonic",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Confunde no jogo original; confusion ainda não é um status persistente do motor.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
  },
  "hyper-fang": {
    id: "hyper-fang",
    name: "Hyper Fang",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "bite",
    description:
      "Mordida forte de contato; a chance de flinch ainda não é modelada.",
    power: 80,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 1,
  },
  kinesis: {
    id: "kinesis",
    name: "Kinesis",
    type: "psychic",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Reduz Accuracy no jogo original; Accuracy ainda não é uma estatística tática do motor.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
  },
  smokescreen: {
    id: "smokescreen",
    name: "Smokescreen",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Reduz Accuracy no jogo original; Accuracy ainda não é uma estatística tática do motor.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
  },
  recover: {
    id: "recover",
    name: "Recover",
    type: "normal",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description: "Recupera metade do HP máximo do usuário.",
    power: null,
    apCost: 3,
    maxPp: 20,
    minRange: 0,
    maxRange: 0,
    effect: "heal-self",
  },
  "water-pulse": {
    id: "water-pulse",
    name: "Water Pulse",
    type: "water",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "water-gun",
    description: "Pulso de água de médio alcance.",
    power: 60,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 4,
  },
  swift: {
    id: "swift",
    name: "Swift",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "razor-leaf",
    description: "Dispara estrelas contra um alvo distante.",
    power: 60,
    apCost: 4,
    maxPp: 20,
    minRange: 1,
    maxRange: 4,
  },
  "rapid-spin": {
    id: "rapid-spin",
    name: "Rapid Spin",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Gira rapidamente e acerta um inimigo adjacente.",
    power: 20,
    apCost: 3,
    maxPp: 40,
    minRange: 1,
    maxRange: 1,
  },
  bite: {
    id: "bite",
    name: "Bite",
    type: "dark",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "bite",
    description: "Mordida forte contra um alvo adjacente.",
    power: 60,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 1,
  },
  "aqua-jet": {
    id: "aqua-jet",
    name: "Aqua Jet",
    type: "water",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "aqua-jet",
    description: "Investida aquática rápida em curto alcance.",
    power: 65,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 2,
  },
  struggle: {
    id: "struggle",
    name: "Struggle",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description:
      "Ataque de emergência usado apenas quando todos os outros golpes estão sem PP.",
    power: 50,
    apCost: 4,
    maxPp: 0,
    minRange: 1,
    maxRange: 1,
  },

};

export function normalizeDuelMovePp(
  moveIds: readonly DuelMoveId[],
  input?: DuelMovePp | null,
): DuelMovePp {
  const normalized: DuelMovePp = {};

  for (const moveId of moveIds) {
    if (moveId === "struggle") continue;
    const move = DUEL_MOVES[moveId];
    if (!move) continue;

    const raw = input?.[moveId];
    normalized[moveId] =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.max(
            0,
            Math.min(move.maxPp, Math.trunc(raw)),
          )
        : move.maxPp;
  }

  return normalized;
}

export function restoreDuelMovePp(
  moveIds: readonly DuelMoveId[],
): DuelMovePp {
  return normalizeDuelMovePp(moveIds);
}

export function getDuelMovePp(
  unit: Pick<DuelUnit, "moves" | "movePp">,
  moveId: DuelMoveId,
): number {
  if (moveId === "struggle") {
    return unit.moves.every(
      (knownMoveId) =>
        (unit.movePp[knownMoveId] ?? 0) <= 0,
    )
      ? 1
      : 0;
  }

  return Math.max(
    0,
    Math.min(
      DUEL_MOVES[moveId]?.maxPp ?? 0,
      Math.trunc(unit.movePp[moveId] ?? 0),
    ),
  );
}

export function rivalStarterFor(
  playerStarter: StarterSpeciesId,
): StarterSpeciesId {
  switch (playerStarter) {
    case "bulbasaur":
      return "charmander";
    case "charmander":
      return "squirtle";
    case "squirtle":
      return "bulbasaur";
  }
}

export function speciesDisplayName(
  species: DuelSpeciesId,
): string {
  return SPECIES[species].name;
}

export function starterDisplayName(
  species: StarterSpeciesId,
): string {
  return speciesDisplayName(species);
}

export function defaultMovesForSpecies(
  species: DuelSpeciesId,
): DuelMoveId[] {
  return [...SPECIES[species].moves];
}

function pointKey(point: DuelPoint): string {
  return `${point.x},${point.y}`;
}

function createSeededRandom(seed: number): () => number {
  let value = (seed >>> 0) || 0x9e3779b9;

  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 0x100000000;
  };
}

function randomItem<T>(
  values: readonly T[],
  random: () => number,
): T {
  return values[
    Math.min(
      values.length - 1,
      Math.floor(random() * values.length),
    )
  ];
}

function connectedOpenCells(
  start: DuelPoint,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
): DuelPoint[] {
  const queue: DuelPoint[] = [{ ...start }];
  const visited = new Set<string>([pointKey(start)]);
  const result: DuelPoint[] = [{ ...start }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      const key = pointKey(next);

      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= width ||
        next.y >= height ||
        blockedKeys.has(key) ||
        visited.has(key)
      ) {
        continue;
      }

      visited.add(key);
      queue.push(next);
      result.push(next);
    }
  }

  return result;
}

function pickSpawnPositions(
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
  seed: number,
): [DuelPoint, DuelPoint] {
  const blockedKeys = new Set(blocked.map(pointKey));
  const open: DuelPoint[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const point = { x, y };
      if (!blockedKeys.has(pointKey(point))) {
        open.push(point);
      }
    }
  }

  if (open.length < 2) {
    return [
      { x: 0, y: 0 },
      { x: Math.max(0, width - 1), y: Math.max(0, height - 1) },
    ];
  }

  const random = createSeededRandom(seed);
  const interiorOpen = open.filter(
    (point) =>
      point.x > 0 &&
      point.y > 0 &&
      point.x < width - 1 &&
      point.y < height - 1,
  );
  const player = randomItem(
    interiorOpen.length >= 2 ? interiorOpen : open,
    random,
  );
  const connected = connectedOpenCells(
    player,
    width,
    height,
    blockedKeys,
  ).filter(
    (point) => pointKey(point) !== pointKey(player),
  );

  const minimumDistance = Math.max(
    4,
    Math.floor((width + height) / 3),
  );
  const interiorConnected = connected.filter(
    (point) =>
      point.x > 0 &&
      point.y > 0 &&
      point.x < width - 1 &&
      point.y < height - 1,
  );
  const rivalPool =
    interiorConnected.length > 0
      ? interiorConnected
      : connected;

  const preferredRivalCells = rivalPool.filter(
    (point) =>
      manhattanDistance(point, player) >= minimumDistance,
  );
  const fallbackRivalCells =
    rivalPool.length > 0
      ? rivalPool
      : open.filter(
          (point) => pointKey(point) !== pointKey(player),
        );

  const rival = randomItem(
    preferredRivalCells.length > 0
      ? preferredRivalCells
      : fallbackRivalCells,
    random,
  );

  return [
    { ...player },
    { ...rival },
  ];
}

function clusterSpawnPositions(
  anchor: DuelPoint,
  opposingAnchor: DuelPoint,
  count: number,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
  reserved: Set<string>,
): DuelPoint[] {
  const positions: DuelPoint[] = [];

  const add = (point: DuelPoint): boolean => {
    const key = pointKey(point);
    if (blockedKeys.has(key) || reserved.has(key)) {
      return false;
    }

    positions.push({ ...point });
    reserved.add(key);
    return true;
  };

  add(anchor);

  const candidates = connectedOpenCells(
    anchor,
    width,
    height,
    blockedKeys,
  )
    .filter((point) => !reserved.has(pointKey(point)))
    .sort((a, b) => {
      const aBorder =
        a.x === 0 ||
        a.y === 0 ||
        a.x === width - 1 ||
        a.y === height - 1
          ? 1
          : 0;
      const bBorder =
        b.x === 0 ||
        b.y === 0 ||
        b.x === width - 1 ||
        b.y === height - 1
          ? 1
          : 0;

      return (
        aBorder - bBorder ||
        manhattanDistance(a, anchor) -
          manhattanDistance(b, anchor) ||
        manhattanDistance(b, opposingAnchor) -
          manhattanDistance(a, opposingAnchor) ||
        a.y - b.y ||
        a.x - b.x
      );
    });

  for (const point of candidates) {
    if (positions.length >= count) break;
    add(point);
  }

  if (positions.length < count) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (positions.length >= count) break;
        add({ x, y });
      }
      if (positions.length >= count) break;
    }
  }

  return positions.slice(0, count);
}

function pickTeamSpawnPositions(
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
  seed: number,
  playerSize: number,
  rivalSize: number,
): {
  players: DuelPoint[];
  rivals: DuelPoint[];
} {
  const [playerAnchor, rivalAnchor] =
    pickSpawnPositions(
      width,
      height,
      blocked,
      seed,
    );
  const blockedKeys = new Set(blocked.map(pointKey));
  const reserved = new Set<string>();

  // Keep both team anchors free while the first cluster is selected.
  reserved.add(pointKey(rivalAnchor));
  const players = clusterSpawnPositions(
    playerAnchor,
    rivalAnchor,
    playerSize,
    width,
    height,
    blockedKeys,
    reserved,
  );

  reserved.delete(pointKey(rivalAnchor));
  reserved.add(pointKey(playerAnchor));
  for (const point of players) {
    reserved.add(pointKey(point));
  }

  const rivals = clusterSpawnPositions(
    rivalAnchor,
    playerAnchor,
    rivalSize,
    width,
    height,
    blockedKeys,
    reserved,
  );

  return {
    players,
    rivals,
  };
}

function effectiveSpeed(unit: DuelUnit): number {
  const paralysisMultiplier =
    unit.status === "paralysis" ? 0.25 : 1;

  return (
    unit.speed *
    stageMultiplier(unit.speedStage) *
    paralysisMultiplier
  );
}

function createTurnOrder(units: readonly DuelUnit[]): string[] {
  return [...units]
    .sort(
      (a, b) =>
        effectiveSpeed(b) - effectiveSpeed(a) ||
        (a.side === b.side
          ? 0
          : a.side === "player"
            ? -1
            : 1) ||
        a.id.localeCompare(b.id),
    )
    .map((unit) => unit.id);
}

function stageMultiplier(stage: number): number {
  const bounded = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, stage));
  return bounded >= 0
    ? (2 + bounded) / 2
    : 2 / (2 - bounded);
}

export function calculateDuelPokemonMaxHp(
  build: Pick<
    DuelPokemonBuild,
    "species" | "level" | "evs"
  >,
): number {
  const base = SPECIES[build.species];
  const level = Math.max(
    1,
    Math.min(100, Math.trunc(build.level)),
  );

  return calculateHpStat({
    base: base.hp,
    iv: FIXED_IV,
    ev: build.evs?.hp ?? 0,
    level,
  });
}

function makeUnit(
  build: DuelPokemonBuild,
  side: DuelSide,
  position: DuelPoint,
  slot = 0,
): DuelUnit {
  const base = SPECIES[build.species];
  const evs = {
    hp: build.evs?.hp ?? 0,
    attack: build.evs?.attack ?? 0,
    defense: build.evs?.defense ?? 0,
    specialAttack: build.evs?.specialAttack ?? 0,
    specialDefense: build.evs?.specialDefense ?? 0,
    speed: build.evs?.speed ?? 0,
  };
  const level = Math.max(1, Math.min(100, Math.trunc(build.level)));

  const maxHp = calculateDuelPokemonMaxHp(build);
  const currentHp =
    typeof build.currentHp === "number" &&
    Number.isFinite(build.currentHp)
      ? Math.max(
          0,
          Math.min(maxHp, Math.trunc(build.currentHp)),
        )
      : maxHp;

  return {
    id: `${side}-${slot}-${build.species}`,
    side,
    species: build.species,
    displayName: base.name,
    type: base.type,
    types: [...base.types],
    level,
    hp: currentHp,
    maxHp,
    status: normalizeDuelMajorStatus(build.status),
    attack: calculateOtherStat({
      base: base.attack,
      iv: FIXED_IV,
      ev: evs.attack,
      level,
    }),
    defense: calculateOtherStat({
      base: base.defense,
      iv: FIXED_IV,
      ev: evs.defense,
      level,
    }),
    specialAttack: calculateOtherStat({
      base: base.specialAttack,
      iv: FIXED_IV,
      ev: evs.specialAttack,
      level,
    }),
    specialDefense: calculateOtherStat({
      base: base.specialDefense,
      iv: FIXED_IV,
      ev: evs.specialDefense,
      level,
    }),
    speed: calculateOtherStat({
      base: base.speed,
      iv: FIXED_IV,
      ev: evs.speed,
      level,
    }),
    attackStage: 0,
    defenseStage: 0,
    speedStage: 0,
    ap: 6,
    maxAp: 6,
    mp: 3,
    maxMp: 3,
    position,
    moves: [...build.moves].slice(0, 4),
    movePp: normalizeDuelMovePp(
      [...build.moves].slice(0, 4),
      build.movePp,
    ),
    captureAttempted: false,
  };
}

function normalizeArenaOptions(options: {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
}) {
  const width = Math.max(3, Math.trunc(options.width ?? 7));
  const height = Math.max(3, Math.trunc(options.height ?? 5));
  const seed = (options.seed ?? 1) >>> 0;
  const blocked = (options.blocked ?? [])
    .filter(
      (point) =>
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < width &&
        point.y < height,
    )
    .map((point) => ({ ...point }));

  return { width, height, seed, blocked };
}

export function createTrainerDuel(
  options: TrainerDuelOptions,
): DuelState {
  const { width, height, seed, blocked } =
    normalizeArenaOptions(options);
  const party = [...options.players].slice(0, 6);
  const rivalParty = [...options.rivals].slice(0, 6);

  if (party.length === 0) {
    throw new Error(
      "Trainer duel requires at least one player Pokémon.",
    );
  }
  if (rivalParty.length === 0) {
    throw new Error(
      "Trainer duel requires at least one rival Pokémon.",
    );
  }

  const positions = pickTeamSpawnPositions(
    width,
    height,
    blocked,
    seed,
    party.length,
    rivalParty.length,
  );
  if (
    positions.players.length < party.length ||
    positions.rivals.length < rivalParty.length
  ) {
    throw new Error(
      "Trainer duel arena does not have enough open cells for both teams.",
    );
  }

  const players = party.map((build, index) =>
    makeUnit(
      build,
      "player",
      positions.players[index],
      index,
    ),
  );
  const rivals = rivalParty.map((build, index) =>
    makeUnit(
      build,
      "rival",
      positions.rivals[index],
      index,
    ),
  );
  const units = [...players, ...rivals];
  const turnOrder = createTurnOrder(units);
  const active = units.find(
    (unit) => unit.id === turnOrder[0],
  )!;
  const trainerName =
    options.trainerName?.trim() || "Treinador rival";

  return {
    width,
    height,
    seed,
    blocked,
    battleKind: "trainer",
    escaped: false,
    escapedBy: null,
    captureAllowed: false,
    items: normalizeDuelItems(
      options.items,
      {
        potion: 1,
        "poke-ball": 0,
      },
    ),
    round: 1,
    turnOrder,
    turnIndex: 0,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    captureResult: null,
    units,
    log: [
      `${trainerName} desafia você!`,
      players.length > 1
        ? `${players.length} Pokémon do seu time entram na arena.`
        : `${players[0].displayName} entra na arena.`,
      rivals.length > 1
        ? `${trainerName} coloca ${rivals.length} Pokémon na arena.`
        : `${rivals[0].displayName} entra pelo lado rival.`,
      `${active.displayName} age primeiro pela Speed.`,
    ],
  };
}

export function createStarterDuel(
  playerStarter: StarterSpeciesId,
  options: StarterDuelOptions = {},
): DuelState {
  const rivalStarter = rivalStarterFor(playerStarter);
  const fallbackPlayer: DuelPokemonBuild = {
    species: playerStarter,
    level: LEVEL,
    moves: SPECIES[playerStarter].moves,
  };
  const party = (
    options.players && options.players.length > 0
      ? [...options.players]
      : options.player
        ? [options.player]
        : [fallbackPlayer]
  ).slice(0, 6);
  const rivals = (
    options.rivals && options.rivals.length > 0
      ? [...options.rivals]
      : [
          {
            species: rivalStarter,
            level: LEVEL,
            moves: SPECIES[rivalStarter].moves,
          },
        ]
  ).slice(0, 6);

  return createTrainerDuel({
    ...(options.seed !== undefined
      ? { seed: options.seed }
      : {}),
    ...(options.width !== undefined
      ? { width: options.width }
      : {}),
    ...(options.height !== undefined
      ? { height: options.height }
      : {}),
    ...(options.blocked !== undefined
      ? { blocked: options.blocked }
      : {}),
    ...(options.items !== undefined
      ? { items: options.items }
      : {}),
    players: party,
    rivals,
    trainerName: "Blue",
  });
}

export function createWildDuel(
  options: WildDuelOptions,
): DuelState {
  const { width, height, seed, blocked } =
    normalizeArenaOptions(options);
  const party = (
    options.players && options.players.length > 0
      ? [...options.players]
      : options.player
        ? [options.player]
        : []
  ).slice(0, 6);

  if (party.length === 0) {
    throw new Error("Wild duel requires at least one player Pokémon.");
  }

  const positions = pickTeamSpawnPositions(
    width,
    height,
    blocked,
    seed,
    party.length,
    1,
  );
  if (
    positions.players.length < party.length ||
    positions.rivals.length < 1
  ) {
    throw new Error(
      "Wild duel arena does not have enough open cells for the encounter.",
    );
  }

  const players = party.map((build, index) =>
    makeUnit(
      build,
      "player",
      positions.players[index],
      index,
    ),
  );
  const wild = makeUnit(
    {
      species: options.wildSpecies,
      level: options.wildLevel,
      moves: SPECIES[options.wildSpecies].moves,
    },
    "rival",
    positions.rivals[0],
    0,
  );
  const units = [...players, wild];
  const turnOrder = createTurnOrder(units);
  const active = units.find(
    (unit) => unit.id === turnOrder[0],
  )!;
  const captureAllowed = options.captureAllowed ?? true;

  return {
    width,
    height,
    seed,
    blocked,
    battleKind: "wild",
    escaped: false,
    escapedBy: null,
    captureAllowed,
    items: normalizeDuelItems(
      options.items,
      {
        potion: 1,
        "poke-ball": captureAllowed ? 3 : 0,
      },
    ),
    round: 1,
    turnOrder,
    turnIndex: 0,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    captureResult: null,
    units,
    log: [
      `Um ${wild.displayName} selvagem apareceu!`,
      players.length > 1
        ? `${players.length} Pokémon do seu time entram na arena.`
        : `${players[0].displayName} entra na arena.`,
      `${active.displayName} age primeiro pela Speed.`,
    ],
  };
}

export function manhattanDistance(
  a: DuelPoint,
  b: DuelPoint,
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getActiveDuelUnit(
  state: DuelState,
): DuelUnit | null {
  return (
    state.units.find(
      (unit) => unit.id === state.activeUnitId,
    ) ?? null
  );
}

function cloneState(state: DuelState): DuelState {
  return {
    ...state,
    blocked: state.blocked.map((point) => ({ ...point })),
    turnOrder: [...state.turnOrder],
    items: { ...state.items },
    captureResult: state.captureResult ? { ...state.captureResult } : null,
    units: state.units.map((unit) => ({
      ...unit,
      position: { ...unit.position },
      types: [...unit.types],
      moves: [...unit.moves],
      movePp: { ...unit.movePp },
    })),
    log: [...state.log],
  };
}

function appendLog(state: DuelState, message: string): void {
  state.log = [...state.log, message].slice(-12);
}

function inBounds(
  state: DuelState,
  point: DuelPoint,
): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < state.width &&
    point.y < state.height
  );
}

export function getReachableCells(
  state: DuelState,
  unitId: string,
): DuelPoint[] {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId,
  );
  if (!unit || unit.hp <= 0 || unit.mp <= 0) {
    return [];
  }

  const occupied = new Set(
    state.units
      .filter(
        (candidate) =>
          candidate.hp > 0 && candidate.id !== unitId,
      )
      .map((candidate) => pointKey(candidate.position)),
  );
  const blocked = new Set(state.blocked.map(pointKey));

  const visited = new Map<string, number>();
  const queue: Array<{ point: DuelPoint; cost: number }> = [
    { point: { ...unit.position }, cost: 0 },
  ];
  visited.set(pointKey(unit.position), 0);

  const result: DuelPoint[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const neighbors = [
      { x: current.point.x + 1, y: current.point.y },
      { x: current.point.x - 1, y: current.point.y },
      { x: current.point.x, y: current.point.y + 1 },
      { x: current.point.x, y: current.point.y - 1 },
    ];

    for (const next of neighbors) {
      const cost = current.cost + 1;
      const key = pointKey(next);

      if (
        cost > unit.mp ||
        !inBounds(state, next) ||
        occupied.has(key) ||
        blocked.has(key)
      ) {
        continue;
      }

      const known = visited.get(key);
      if (known !== undefined && known <= cost) {
        continue;
      }

      visited.set(key, cost);
      queue.push({ point: next, cost });
      result.push(next);
    }
  }

  return result;
}

function sideHasLivingUnit(
  state: DuelState,
  side: DuelSide,
): boolean {
  return state.units.some(
    (unit) => unit.side === side && unit.hp > 0,
  );
}

function isMajorStatusImmune(
  unit: DuelUnit,
  status: Exclude<DuelMajorStatus, null>,
): boolean {
  switch (status) {
    case "poison":
      return (
        unit.types.includes("poison") ||
        unit.types.includes("steel")
      );
    case "burn":
      return unit.types.includes("fire");
    case "paralysis":
      return false;
  }
}

function statusRollSucceeds(
  state: DuelState,
  actor: DuelUnit,
  salt: number,
  chancePercent: number,
): boolean {
  const chance = Math.max(
    0,
    Math.min(100, Math.trunc(chancePercent)),
  );
  if (chance <= 0) {
    return false;
  }

  const seed =
    (
      Math.imul(state.seed + 1, 0x9e3779b1) ^
      Math.imul(state.round + 1, 0x85ebca6b) ^
      Math.imul(state.turnIndex + 1, 0xc2b2ae35) ^
      Math.imul(actor.ap + 1, 0x27d4eb2d) ^
      Math.imul(salt + 1, 0x165667b1)
    ) >>> 0;

  return createSeededRandom(seed)() < chance / 100;
}

function secondaryStatusSucceeds(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): boolean {
  const chance = Math.max(
    0,
    Math.min(100, Math.trunc(move.secondaryEffectChance ?? 0)),
  );
  if (!move.secondaryStatus || chance <= 0) {
    return false;
  }

  return statusRollSucceeds(
    state,
    actor,
    target.hp,
    chance,
  );
}

function paralysisBlocksMove(
  state: DuelState,
  actor: DuelUnit,
): boolean {
  return (
    actor.status === "paralysis" &&
    statusRollSucceeds(
      state,
      actor,
      actor.hp,
      25,
    )
  );
}

function statusAppliedMessage(
  target: DuelUnit,
  status: Exclude<DuelMajorStatus, null>,
): string {
  switch (status) {
    case "poison":
      return `${target.displayName} foi envenenado.`;
    case "paralysis":
      return `${target.displayName} ficou paralisado.`;
    case "burn":
      return `${target.displayName} ficou queimado.`;
  }
}

function applyEndTurnMajorStatus(
  state: DuelState,
  current: DuelUnit,
): void {
  if (
    (current.status !== "poison" &&
      current.status !== "burn") ||
    current.hp <= 0
  ) {
    return;
  }

  const damage = Math.max(
    1,
    Math.floor(current.maxHp / 8),
  );
  current.hp = Math.max(0, current.hp - damage);
  const statusName =
    current.status === "poison" ? "Poison" : "Burn";

  appendLog(
    state,
    `${statusName} causou ${damage} de dano em ${current.displayName}.`,
  );

  if (current.hp <= 0) {
    appendLog(
      state,
      `${current.displayName} desmaiou por causa de ${statusName}.`,
    );
  }
}

function resolveTurnEnd(
  state: DuelState,
  current: DuelUnit,
): void {
  applyEndTurnMajorStatus(state, current);

  const playerAlive = sideHasLivingUnit(state, "player");
  const rivalAlive = sideHasLivingUnit(state, "rival");

  if (!playerAlive || !rivalAlive) {
    state.status = "finished";
    state.winner = playerAlive
      ? "player"
      : rivalAlive
        ? "rival"
        : null;
    return;
  }

  const currentIndex = Math.max(
    0,
    state.turnOrder.indexOf(current.id),
  );

  for (
    let nextIndex = currentIndex + 1;
    nextIndex < state.turnOrder.length;
    nextIndex += 1
  ) {
    const nextId = state.turnOrder[nextIndex];
    const next = state.units.find(
      (unit) => unit.id === nextId && unit.hp > 0,
    );

    if (!next) continue;

    next.ap = next.maxAp;
    next.mp = next.maxMp;
    state.activeUnitId = next.id;
    state.turnIndex = nextIndex;
    appendLog(
      state,
      `Turno de ${next.displayName}. AP ${next.ap}, MP ${next.mp}.`,
    );
    return;
  }

  state.round += 1;
  state.turnOrder = createTurnOrder(state.units);

  for (
    let nextIndex = 0;
    nextIndex < state.turnOrder.length;
    nextIndex += 1
  ) {
    const nextId = state.turnOrder[nextIndex];
    const next = state.units.find(
      (unit) => unit.id === nextId && unit.hp > 0,
    );

    if (!next) continue;

    next.ap = next.maxAp;
    next.mp = next.maxMp;
    state.activeUnitId = next.id;
    state.turnIndex = nextIndex;
    appendLog(
      state,
      `Turno de ${next.displayName}. AP ${next.ap}, MP ${next.mp}.`,
    );
    return;
  }

  state.status = "finished";
  state.winner = current.side;
}

type DuelDamageResult = {
  damage: number;
  sameTypeAttackBonus: boolean;
  typeEffectiveness: number;
};

function calculateDamage(
  attacker: DuelUnit,
  defender: DuelUnit,
  move: DuelMove,
): DuelDamageResult {
  if (move.power === null) {
    return {
      damage: 0,
      sameTypeAttackBonus: false,
      typeEffectiveness: 1,
    };
  }

  const isSpecial = move.category === "special";
  const attack = isSpecial
    ? attacker.specialAttack
    : attacker.attack * stageMultiplier(attacker.attackStage);
  const defense = Math.max(
    1,
    isSpecial
      ? defender.specialDefense
      : defender.defense * stageMultiplier(defender.defenseStage),
  );

  let damage = Math.max(
    1,
    Math.floor(
      (((2 * attacker.level) / 5 + 2) *
        move.power *
        attack) /
        defense /
        50 +
        2,
    ),
  );

  if (
    move.category === "physical" &&
    attacker.status === "burn"
  ) {
    damage = Math.max(1, Math.floor(damage / 2));
  }

  const sameTypeAttackBonus =
    attacker.types.includes(move.type);
  if (sameTypeAttackBonus) {
    damage = Math.max(
      1,
      Math.floor((damage * 15) / 10),
    );
  }

  const defendingTypes = [...new Set(defender.types)];
  const typeEffectiveness = calculateTypeEffectiveness(
    move.type,
    defendingTypes,
  );

  for (const defendingType of defendingTypes) {
    const multiplier =
      TYPE_EFFECTIVENESS[move.type]?.[defendingType] ?? 1;

    if (multiplier === 0) {
      damage = 0;
      break;
    }

    damage = Math.max(
      1,
      Math.floor(damage * multiplier),
    );
  }

  return {
    damage,
    sameTypeAttackBonus,
    typeEffectiveness,
  };
}

export function getDuelCaptureEligibility(
  state: DuelState,
  targetId: string,
): CaptureEligibility {
  const target = state.units.find((unit) => unit.id === targetId);
  if (!target) return { allowed: false, reason: "target-not-wild" };
  return getCaptureEligibility(
    {
      id: target.id,
      ownerId: target.side === "player" ? "player" : null,
      wild: state.battleKind === "wild" && target.side === "rival",
      boss: false,
      currentHp: target.hp,
      maxHp: target.maxHp,
      speed: target.speed,
      position: target.position,
      captureAttempted: target.captureAttempted,
    },
    {
      capturePolicy:
        state.battleKind === "wild" && state.captureAllowed
          ? "allowed"
          : "forbidden",
      captureHpThresholdRatio: 0.5,
    },
  );
}

export function applyDuelAction(
  input: DuelState,
  action: DuelAction,
): DuelActionResult {
  if (input.status !== "active") {
    return {
      state: input,
      accepted: false,
      reason: "battle-finished",
    };
  }

  const state = cloneState(input);
  const actor = state.units.find(
    (unit) => unit.id === action.unitId,
  );

  if (
    !actor ||
    actor.hp <= 0 ||
    actor.id !== state.activeUnitId
  ) {
    return {
      state: input,
      accepted: false,
      reason: "not-active-unit",
    };
  }

  if (action.kind === "end-turn") {
    resolveTurnEnd(state, actor);
    return { state, accepted: true };
  }

  if (action.kind === "flee") {
    if (state.battleKind === "trainer") {
      appendLog(
        state,
        "Não é possível fugir de uma batalha de treinador.",
      );
      return {
        state,
        accepted: false,
        reason: "cannot-flee-trainer",
      };
    }

    state.status = "finished";
    state.escaped = true;
    state.escapedBy = actor.side;
    state.winner = null;
    appendLog(state, `${actor.displayName} escapou da batalha.`);
    return { state, accepted: true };
  }

  if (action.kind === "use-item") {
    const item = DUEL_ITEMS[action.itemId];
    const target = state.units.find((unit) => unit.id === action.targetId);
    if (!item || !target || target.hp <= 0) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if ((state.items[item.id] ?? 0) <= 0) {
      return { state: input, accepted: false, reason: "item-unavailable" };
    }

    if (item.kind === "capture") {
      const eligibility = getDuelCaptureEligibility(state, target.id);
      if (!eligibility.allowed) {
        return {
          state: input,
          accepted: false,
          reason: eligibility.reason === "hp-too-high"
            ? "capture-hp-too-high"
            : eligibility.reason ?? "capture-not-allowed",
        };
      }
      const species = target.species as WildSpeciesId;
      const chance = experimentalCaptureChance({
        catchRate: WILD_CATCH_RATE[species],
        ballModifier: item.ballModifier,
        statusModifier:
          target.status === "poison" ||
          target.status === "paralysis" ||
          target.status === "burn"
            ? 1.5
            : 1,
        hpRatio: target.hp / target.maxHp,
        thresholdRatio: 0.5,
      });
      const random = createSeededRandom(
        (state.seed ^ Math.imul(state.round, 0x9e3779b9) ^ target.hp) >>> 0,
      );
      const resolution = resolveCaptureRoll(random(), chance, target.hp, target.maxHp);
      target.captureAttempted = true;
      state.items[item.id] -= 1;
      state.status = "finished";
      state.winner = resolution.success ? "player" : null;
      state.captureResult = {
        success: resolution.success,
        species,
        level: target.level,
        xpRatio: resolution.xpRatio,
        chance,
        status: target.status,
      };
      appendLog(
        state,
        resolution.success
          ? `${target.displayName} foi capturado!`
          : `${target.displayName} escapou da Poké Ball e fugiu.`,
      );
      return {
        state,
        accepted: true,
        presentation: {
          kind: "capture",
          actorId: actor.id,
          itemId: "poke-ball",
          targetIds: [target.id],
          success: resolution.success,
          chance,
          xpRatio: resolution.xpRatio,
          targetFlees: resolution.targetFlees,
        },
      };
    }

    if (target.side !== actor.side) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if (target.hp >= target.maxHp) {
      return { state: input, accepted: false, reason: "target-full-hp" };
    }
    const healed = Math.min(item.heal, target.maxHp - target.hp);
    target.hp += healed;
    state.items[item.id] -= 1;
    appendLog(state, `${target.displayName} recuperou ${healed} HP com ${item.name}.`);
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      presentation: {
        kind: "item",
        actorId: actor.id,
        itemId: item.id,
        targetIds: [target.id],
        healed,
      },
    };
  }

  if (action.kind === "move") {
    const reachable = getReachableCells(state, actor.id);
    const target = reachable.find(
      (cell) =>
        cell.x === action.to.x && cell.y === action.to.y,
    );

    if (!target) {
      return {
        state: input,
        accepted: false,
        reason: "cell-not-reachable",
      };
    }

    const from = { ...actor.position };
    const cost = manhattanDistance(
      actor.position,
      action.to,
    );
    actor.position = { ...action.to };
    actor.mp -= cost;

    appendLog(
      state,
      `${actor.displayName} se moveu ${cost} tile${cost === 1 ? "" : "s"}.`,
    );

    return {
      state,
      accepted: true,
      presentation: {
        kind: "movement",
        actorId: actor.id,
        from,
        to: { ...action.to },
        cost,
      },
    };
  }

  const move = DUEL_MOVES[action.moveId];
  const target = state.units.find(
    (unit) => unit.id === action.targetId,
  );

  const targetMatchesMove =
    move?.targeting === "self"
      ? target?.id === actor.id
      : target?.side !== actor.side;
  const usingStruggle =
    action.moveId === "struggle";
  const struggleAllowed =
    usingStruggle &&
    actor.moves.length > 0 &&
    actor.moves.every(
      (moveId) => getDuelMovePp(actor, moveId) <= 0,
    );

  if (
    !move ||
    (!actor.moves.includes(move.id) &&
      !struggleAllowed) ||
    !target ||
    target.hp <= 0 ||
    !targetMatchesMove
  ) {
    return {
      state: input,
      accepted: false,
      reason: "invalid-move-target",
    };
  }

  if (
    !usingStruggle &&
    getDuelMovePp(actor, move.id) <= 0
  ) {
    return {
      state: input,
      accepted: false,
      reason: "no-pp",
    };
  }

  if (actor.ap < move.apCost) {
    return {
      state: input,
      accepted: false,
      reason: "not-enough-ap",
    };
  }

  const distance = manhattanDistance(
    actor.position,
    target.position,
  );

  if (
    distance < move.minRange ||
    distance > move.maxRange
  ) {
    return {
      state: input,
      accepted: false,
      reason: "target-out-of-range",
    };
  }

  if (!usingStruggle) {
    actor.movePp[move.id] = Math.max(
      0,
      getDuelMovePp(actor, move.id) - 1,
    );
  }

  if (paralysisBlocksMove(state, actor)) {
    appendLog(
      state,
      `${actor.displayName} está paralisado e não conseguiu atacar.`,
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      reason: "fully-paralyzed",
    };
  }

  actor.ap -= move.apCost;

  let damage = 0;
  let statusApplied: Exclude<DuelMajorStatus, null> | undefined;
  const statChanges: Array<{
    stat: DuelStatId;
    delta: number;
  }> = [];

  let sameTypeAttackBonus = false;
  let typeEffectiveness = 1;

  if (move.category !== "status") {
    const damageResult = calculateDamage(
      actor,
      target,
      move,
    );
    damage = damageResult.damage;
    sameTypeAttackBonus =
      damageResult.sameTypeAttackBonus;
    typeEffectiveness =
      damageResult.typeEffectiveness;
    target.hp = Math.max(0, target.hp - damage);

    appendLog(
      state,
      `${actor.displayName} usou ${move.name}: ${damage} de dano.`,
    );

    if (typeEffectiveness === 0) {
      appendLog(
        state,
        `Não afeta ${target.displayName}.`,
      );
    } else if (typeEffectiveness > 1) {
      appendLog(state, "É super efetivo!");
    } else if (typeEffectiveness < 1) {
      appendLog(state, "Não é muito efetivo.");
    }

    if (
      target.hp > 0 &&
      typeEffectiveness > 0 &&
      move.secondaryStatus &&
      target.status === null &&
      !isMajorStatusImmune(target, move.secondaryStatus) &&
      secondaryStatusSucceeds(state, actor, target, move)
    ) {
      target.status = move.secondaryStatus;
      statusApplied = move.secondaryStatus;
      appendLog(
        state,
        statusAppliedMessage(target, move.secondaryStatus),
      );
    }

    if (
      target.hp > 0 &&
      typeEffectiveness > 0 &&
      move.effect === "speed-down"
    ) {
      const before = target.speedStage;
      target.speedStage = Math.max(
        -MAX_STAGE,
        target.speedStage - 1,
      );
      statChanges.push({
        stat: "speed",
        delta: target.speedStage - before,
      });
      appendLog(
        state,
        `${move.name} reduziu a Speed de ${target.displayName}.`,
      );
    }

    if (
      move.effect === "drain-half" &&
      damage > 0 &&
      actor.hp > 0 &&
      actor.hp < actor.maxHp
    ) {
      const healed = Math.min(
        Math.max(1, Math.floor(damage / 2)),
        actor.maxHp - actor.hp,
      );
      actor.hp += healed;
      appendLog(
        state,
        `${actor.displayName} drenou ${healed} HP com ${move.name}.`,
      );
    }

    if (target.hp <= 0) {
      appendLog(
        state,
        `${target.displayName} desmaiou.`,
      );

      if (!sideHasLivingUnit(state, target.side)) {
        state.status = "finished";
        state.winner = actor.side;
      }
    }

    if (usingStruggle && actor.hp > 0) {
      const recoil = Math.max(
        1,
        Math.floor(actor.maxHp / 4),
      );
      actor.hp = Math.max(0, actor.hp - recoil);
      appendLog(
        state,
        `Struggle causou ${recoil} de recoil em ${actor.displayName}.`,
      );

      if (actor.hp <= 0) {
        appendLog(
          state,
          `${actor.displayName} desmaiou com o recoil de Struggle.`,
        );

        const actorSideAlive = sideHasLivingUnit(
          state,
          actor.side,
        );
        const targetSideAlive = sideHasLivingUnit(
          state,
          target.side,
        );

        if (!actorSideAlive || !targetSideAlive) {
          state.status = "finished";
          state.winner = actorSideAlive
            ? actor.side
            : targetSideAlive
              ? target.side
              : null;
        } else {
          resolveTurnEnd(state, actor);
        }
      }
    }
  } else if (move.effect === "attack-down") {
    const before = target.attackStage;
    target.attackStage = Math.max(
      -MAX_STAGE,
      target.attackStage - 1,
    );
    statChanges.push({
      stat: "attack",
      delta: target.attackStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu o Attack de ${target.displayName}.`,
    );
  } else if (move.effect === "defense-down") {
    const before = target.defenseStage;
    target.defenseStage = Math.max(
      -MAX_STAGE,
      target.defenseStage - 1,
    );
    statChanges.push({
      stat: "defense",
      delta: target.defenseStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu a Defense de ${target.displayName}.`,
    );
  } else if (move.effect === "defense-up") {
    const before = target.defenseStage;
    target.defenseStage = Math.min(
      MAX_STAGE,
      target.defenseStage + 1,
    );
    statChanges.push({
      stat: "defense",
      delta: target.defenseStage - before,
    });
    appendLog(
      state,
      `${move.name} aumentou a Defense de ${target.displayName}.`,
    );
  } else if (move.effect === "speed-down") {
    const before = target.speedStage;
    target.speedStage = Math.max(
      -MAX_STAGE,
      target.speedStage - 1,
    );
    statChanges.push({
      stat: "speed",
      delta: target.speedStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu a Speed de ${target.displayName}.`,
    );
  } else if (move.effect === "heal-self") {
    const healed = Math.min(
      Math.max(1, Math.floor(actor.maxHp / 2)),
      actor.maxHp - actor.hp,
    );
    actor.hp += healed;
    appendLog(
      state,
      `${actor.displayName} recuperou ${healed} HP com ${move.name}.`,
    );
  } else if (move.effect === "teleport") {
    if (state.battleKind === "wild") {
      state.status = "finished";
      state.escaped = true;
      state.escapedBy = actor.side;
      state.winner = null;
      appendLog(
        state,
        `${actor.displayName} usou ${move.name} e fugiu da batalha.`,
      );
    } else {
      appendLog(
        state,
        `${actor.displayName} tentou usar ${move.name}, mas não pode fugir de uma batalha de Treinador.`,
      );
    }
  }

  return {
    state,
    accepted: true,
    presentation: {
      kind: "move",
      actorId: actor.id,
      moveId: move.id,
      targetIds: [target.id],
      vfxId: move.vfxId,
      motion: move.motion,
      results: [
        {
          targetId: target.id,
          damage,
          fainted: target.hp <= 0,
          statChanges,
          ...(move.category !== "status"
            ? {
                sameTypeAttackBonus,
                typeEffectiveness,
              }
            : {}),
          ...(statusApplied ? { statusApplied } : {}),
        },
      ],
    },
  };
}

type AiCandidate = {
  move: DuelMove;
  target: DuelUnit;
  score: number;
  damage: number;
  path: DuelPoint[];
};

function aiNeighbors(point: DuelPoint): DuelPoint[] {
  // Stable order keeps identical states deterministic.
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y - 1 },
  ];
}

function shortestAiPathToRange(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): DuelPoint[] | null {
  if (move.targeting === "self") {
    return [];
  }

  const inMoveRange = (point: DuelPoint) => {
    const distance = manhattanDistance(
      point,
      target.position,
    );
    return (
      distance >= move.minRange &&
      distance <= move.maxRange
    );
  };

  if (inMoveRange(actor.position)) {
    return [];
  }

  const blocked = new Set(state.blocked.map(pointKey));
  const occupied = new Set(
    state.units
      .filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== actor.id,
      )
      .map((unit) => pointKey(unit.position)),
  );
  const startKey = pointKey(actor.position);
  const queue: DuelPoint[] = [{ ...actor.position }];
  const previous = new Map<string, string | null>([
    [startKey, null],
  ]);
  const points = new Map<string, DuelPoint>([
    [startKey, { ...actor.position }],
  ]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const next of aiNeighbors(current)) {
      const key = pointKey(next);
      if (
        !inBounds(state, next) ||
        blocked.has(key) ||
        occupied.has(key) ||
        previous.has(key)
      ) {
        continue;
      }

      previous.set(key, pointKey(current));
      points.set(key, next);

      if (inMoveRange(next)) {
        const reversed: DuelPoint[] = [];
        let cursor: string | null = key;

        while (cursor && cursor !== startKey) {
          const point = points.get(cursor);
          if (!point) break;
          reversed.push(point);
          cursor = previous.get(cursor) ?? null;
        }

        return reversed.reverse();
      }

      queue.push(next);
    }
  }

  return null;
}

function aiThreatScore(unit: DuelUnit): number {
  const physical =
    unit.attack * stageMultiplier(unit.attackStage);
  const special = unit.specialAttack;
  const speed = effectiveSpeed(unit);

  return (
    Math.max(physical, special) * 0.45 +
    speed * 0.3 +
    (unit.hp / Math.max(1, unit.maxHp)) * 25
  );
}

function aiStatusUtility(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): number {
  if (move.category !== "status") {
    return 0;
  }

  if (move.effect === "attack-down") {
    if (target.attackStage <= -4) return -Infinity;
    const physicalBias =
      target.attack >= target.specialAttack ? 18 : -8;
    return Math.max(
      0,
      66 + target.attackStage * 18 + physicalBias,
    );
  }

  if (move.effect === "defense-down") {
    if (target.defenseStage <= -4) return -Infinity;
    return Math.max(
      0,
      64 + target.defenseStage * 18,
    );
  }

  if (move.effect === "speed-down") {
    if (target.speedStage <= -4) return -Infinity;
    const speedLead =
      effectiveSpeed(target) > effectiveSpeed(actor)
        ? 20
        : 0;
    return Math.max(
      0,
      48 + target.speedStage * 15 + speedLead,
    );
  }

  if (move.effect === "defense-up") {
    if (actor.defenseStage >= 4) return -Infinity;
    const hpPressure =
      actor.hp / Math.max(1, actor.maxHp) < 0.5
        ? 18
        : 0;
    return Math.max(
      0,
      54 - Math.max(0, actor.defenseStage) * 12 +
        hpPressure,
    );
  }

  if (move.effect === "heal-self") {
    const missingRatio =
      (actor.maxHp - actor.hp) /
      Math.max(1, actor.maxHp);
    if (missingRatio <= 0) return -Infinity;
    return 35 + missingRatio * 120;
  }

  if (move.effect === "teleport") {
    if (
      state.battleKind === "wild" &&
      actor.side === "rival"
    ) {
      return 240;
    }

    return state.battleKind === "trainer"
      ? 1
      : -Infinity;
  }

  return -Infinity;
}

function aiSecondaryStatusUtility(
  target: DuelUnit,
  move: DuelMove,
): number {
  if (
    !move.secondaryStatus ||
    !move.secondaryEffectChance ||
    target.status !== null ||
    isMajorStatusImmune(target, move.secondaryStatus)
  ) {
    return 0;
  }

  const statusValue =
    move.secondaryStatus === "burn"
      ? 72
      : move.secondaryStatus === "paralysis"
        ? 66
        : 58;

  return (
    statusValue *
    (move.secondaryEffectChance / 100)
  );
}

function aiThreatToTeam(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
): number {
  const allies = state.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.side === actor.side,
  );
  let pressure = 0;

  for (const ally of allies) {
    let bestRatio = 0;

    for (const moveId of target.moves) {
      if (getDuelMovePp(target, moveId) <= 0) {
        continue;
      }
      const move = DUEL_MOVES[moveId];
      if (
        !move ||
        move.category === "status"
      ) {
        continue;
      }

      const result = calculateDamage(
        target,
        ally,
        move,
      );
      bestRatio = Math.max(
        bestRatio,
        result.damage / Math.max(1, ally.maxHp),
      );
    }

    pressure += Math.min(1.5, bestRatio) * 28;
  }

  return pressure;
}

function aiCoverageBonus(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  typeEffectiveness: number,
): number {
  if (typeEffectiveness <= 1) {
    return 0;
  }

  let teammateHasAnswer = false;

  for (const ally of state.units) {
    if (
      ally.hp <= 0 ||
      ally.side !== actor.side ||
      ally.id === actor.id
    ) {
      continue;
    }

    for (const moveId of ally.moves) {
      if (getDuelMovePp(ally, moveId) <= 0) {
        continue;
      }
      const move = DUEL_MOVES[moveId];
      if (
        !move ||
        move.category === "status"
      ) {
        continue;
      }

      if (
        calculateDamage(
          ally,
          target,
          move,
        ).typeEffectiveness > 1
      ) {
        teammateHasAnswer = true;
        break;
      }
    }

    if (teammateHasAnswer) break;
  }

  return teammateHasAnswer ? 0 : 24;
}

function scoreAiCandidate(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
  path: DuelPoint[],
): { score: number; damage: number } {
  const livingAllies = state.units.filter(
    (unit) =>
      unit.hp > 0 && unit.side === actor.side,
  ).length;
  const livingEnemies = state.units.filter(
    (unit) =>
      unit.hp > 0 && unit.side !== actor.side,
  ).length;
  const pathCost = path.length;
  const futureTurnPenalty =
    Math.max(0, pathCost - actor.mp) * 8;
  const positioningScore =
    pathCost === 0
      ? 14
      : -pathCost * 9 - futureTurnPenalty;
  const resourceScore = -move.apCost * 3;
  const targetThreat =
    aiThreatScore(target) * 0.16 +
    aiThreatToTeam(state, actor, target);
  const numbersPressure =
    (livingEnemies - livingAllies) * 5;

  if (move.category === "status") {
    const utility = aiStatusUtility(
      state,
      actor,
      target,
      move,
    );
    if (!Number.isFinite(utility) || utility <= 0) {
      return { score: -Infinity, damage: 0 };
    }

    const nearlyDefeatedPenalty =
      target.side !== actor.side &&
      target.hp / Math.max(1, target.maxHp) <= 0.2
        ? 30
        : 0;

    return {
      damage: 0,
      score:
        utility +
        positioningScore +
        resourceScore +
        targetThreat +
        numbersPressure -
        nearlyDefeatedPenalty,
    };
  }

  const result = calculateDamage(
    actor,
    target,
    move,
  );
  if (result.damage <= 0) {
    return { score: -Infinity, damage: 0 };
  }

  const hpRatio =
    target.hp / Math.max(1, target.maxHp);
  const damageRatio =
    Math.min(1.5, result.damage / Math.max(1, target.maxHp));
  const knockoutScore =
    result.damage >= target.hp
      ? 230 + Math.max(0, 40 - target.hp)
      : 0;
  const stabScore =
    result.sameTypeAttackBonus ? 14 : 0;
  const matchupScore =
    result.typeEffectiveness >= 4
      ? 72
      : result.typeEffectiveness >= 2
        ? 42
        : result.typeEffectiveness < 1
          ? -28
          : 0;
  const lowHpFocus =
    (1 - hpRatio) * 38;
  const coverageBonus = aiCoverageBonus(
    state,
    actor,
    target,
    result.typeEffectiveness,
  );
  const secondaryUtility =
    aiSecondaryStatusUtility(target, move);
  const riderUtility =
    move.effect === "speed-down" &&
    target.speedStage > -MAX_STAGE
      ? Math.max(
          0,
          22 + target.speedStage * 5,
        )
      : 0;

  return {
    damage: result.damage,
    score:
      result.damage * 7 +
      damageRatio * 125 +
      (move.power ?? 0) * 0.35 +
      knockoutScore +
      stabScore +
      matchupScore +
      lowHpFocus +
      coverageBonus +
      secondaryUtility +
      riderUtility +
      positioningScore +
      resourceScore +
      targetThreat +
      numbersPressure,
  };
}

function compareAiCandidates(
  a: AiCandidate,
  b: AiCandidate,
): number {
  return (
    b.score - a.score ||
    b.damage - a.damage ||
    a.path.length - b.path.length ||
    a.target.hp - b.target.hp ||
    a.move.apCost - b.move.apCost ||
    a.move.id.localeCompare(b.move.id) ||
    a.target.id.localeCompare(b.target.id)
  );
}

function chooseAiCandidate(
  state: DuelState,
  actor: DuelUnit,
  options: {
    requireInRange: boolean;
    statusAlreadyUsed: boolean;
    damageAlreadyUsed: boolean;
  },
): AiCandidate | null {
  const enemies = state.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.side !== actor.side,
  );
  const candidates: AiCandidate[] = [];

  const usableMoveIds = actor.moves.filter(
    (moveId) => getDuelMovePp(actor, moveId) > 0,
  );
  const candidateMoveIds: DuelMoveId[] =
    usableMoveIds.length > 0
      ? usableMoveIds
      : actor.moves.length > 0
        ? ["struggle"]
        : [];

  for (const moveId of candidateMoveIds) {
    const move = DUEL_MOVES[moveId];
    if (!move || actor.ap < move.apCost) {
      continue;
    }
    if (
      move.category === "status" &&
      (
        options.statusAlreadyUsed ||
        (
          options.damageAlreadyUsed &&
          move.targeting === "single-enemy"
        )
      )
    ) {
      continue;
    }

    const targets =
      move.targeting === "self"
        ? [actor]
        : enemies;

    for (const target of targets) {
      const path = shortestAiPathToRange(
        state,
        actor,
        target,
        move,
      );
      if (!path) continue;
      if (
        options.requireInRange &&
        path.length > 0
      ) {
        continue;
      }

      const scored = scoreAiCandidate(
        state,
        actor,
        target,
        move,
        path,
      );
      if (!Number.isFinite(scored.score)) {
        continue;
      }

      candidates.push({
        move,
        target,
        path,
        score: scored.score,
        damage: scored.damage,
      });
    }
  }

  candidates.sort(compareAiCandidates);
  return candidates[0] ?? null;
}

function aiMovementDestination(
  state: DuelState,
  actor: DuelUnit,
  path: readonly DuelPoint[],
): DuelPoint | null {
  if (actor.mp <= 0 || path.length === 0) {
    return null;
  }

  const reachable = new Set(
    getReachableCells(state, actor.id).map(pointKey),
  );
  const maxIndex = Math.min(
    path.length,
    actor.mp,
  ) - 1;

  for (
    let index = maxIndex;
    index >= 0;
    index -= 1
  ) {
    if (reachable.has(pointKey(path[index]))) {
      return path[index];
    }
  }

  return null;
}

export function resolveSimpleAiTurnDetailed(
  input: DuelState,
  side: DuelSide = "rival",
): DuelAiTurnResult {
  let state = input;
  const steps: DuelActionResult[] = [];
  let actor = getActiveDuelUnit(state);
  let statusUsed = false;
  let damageUsed = false;

  const run = (action: DuelAction): DuelActionResult => {
    const result = applyDuelAction(state, action);
    if (result.accepted) {
      state = result.state;
      steps.push(result);
    }
    return result;
  };

  if (
    state.status !== "active" ||
    !actor ||
    actor.side !== side
  ) {
    return { state, steps };
  }

  // Plan against every living opponent. The plan may intentionally spend
  // the whole MP budget walking around obstacles toward a superior attack.
  const strategicPlan = chooseAiCandidate(
    state,
    actor,
    {
      requireInRange: false,
      statusAlreadyUsed: false,
      damageAlreadyUsed: false,
    },
  );

  if (
    strategicPlan &&
    strategicPlan.path.length > 0
  ) {
    const destination = aiMovementDestination(
      state,
      actor,
      strategicPlan.path,
    );

    if (destination) {
      run({
        kind: "move",
        unitId: actor.id,
        to: destination,
      });
      actor = getActiveDuelUnit(state);
    }
  }

  // Spend remaining AP on the best tactical actions available now. A status
  // move is used at most once per turn. After committing to damage, the AI
  // keeps offensive pressure instead of dumping leftover AP into a debuff.
  for (
    let actionIndex = 0;
    actionIndex < 3;
    actionIndex += 1
  ) {
    actor = getActiveDuelUnit(state);
    if (
      state.status !== "active" ||
      !actor ||
      actor.side !== side
    ) {
      return { state, steps };
    }

    const candidate = chooseAiCandidate(
      state,
      actor,
      {
        requireInRange: true,
        statusAlreadyUsed: statusUsed,
        damageAlreadyUsed: damageUsed,
      },
    );
    if (!candidate || candidate.score <= 0) {
      break;
    }

    const result = run({
      kind: "use-move",
      unitId: actor.id,
      moveId: candidate.move.id,
      targetId: candidate.target.id,
    });

    if (!result.accepted) {
      break;
    }

    if (candidate.move.category === "status") {
      statusUsed = true;
    } else {
      damageUsed = true;
    }

    if (result.state.status === "finished") {
      return { state, steps };
    }
  }

  actor = getActiveDuelUnit(state);
  if (
    state.status === "active" &&
    actor?.side === side
  ) {
    run({
      kind: "end-turn",
      unitId: actor.id,
    });
  }

  return { state, steps };
}

export function resolveSimpleAiTurn(
  input: DuelState,
  side: DuelSide = "rival",
): DuelState {
  return resolveSimpleAiTurnDetailed(input, side).state;
}
