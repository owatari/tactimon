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
  | "magnemite"
  | "raichu"
  | "onix"
  | "sandshrew"
  | "grimer"
  | "voltorb"
  | "koffing"
  | "horsea"
  | "tentacool"
  | "ponyta"
  | "shellder"
  | "goldeen"
  | "staryu"
  | "starmie"
  | "pidgeot"
  | "rhyhorn"
  | "growlithe"
  | "exeggcute"
  | "gyarados"
  | "alakazam"
  | "blastoise"
  | "venusaur"
  | "charizard";
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
export type DuelWeather = "rain" | null;
export type DuelMajorStatus =
  | "poison"
  | "paralysis"
  | "burn"
  | "sleep"
  | null;
export type DuelItemId =
  | "potion"
  | "poke-ball"
  | "super-potion"
  | "hyper-potion"
  | "antidote"
  | "parlyz-heal"
  | "awakening"
  | "burn-heal"
  | "great-ball";
const DUEL_EXTRA_ITEM_IDS = [
  "super-potion",
  "hyper-potion",
  "antidote",
  "parlyz-heal",
  "awakening",
  "burn-heal",
  "great-ball",
] as const;
export type DuelExtraItemId = (typeof DUEL_EXTRA_ITEM_IDS)[number];
/** Potion and Poké Ball are always tracked; other items are optional. */
export type DuelInventory = Record<"potion" | "poke-ball", number> &
  Partial<Record<DuelExtraItemId, number>>;
export type DuelMoveId =
  | "tackle"
  | "take-down"
  | "scratch"
  | "growl"
  | "tail-whip"
  | "sand-attack"
  | "gust"
  | "wing-attack"
  | "quick-attack"
  | "fury-attack"
  | "feather-dance"
  | "agility"
  | "scary-face"
  | "teleport"
  | "withdraw"
  | "sleep-powder"
  | "leech-seed"
  | "absorb"
  | "sweet-scent"
  | "growth"
  | "synthesis"
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
  | "rock-blast"
  | "thunder-shock"
  | "thunder-wave"
  | "double-team"
  | "slam"
  | "spark"
  | "shock-wave"
  | "sonic-boom"
  | "screech"
  | "vine-whip"
  | "razor-leaf"
  | "solar-beam"
  | "seed-bomb"
  | "ember"
  | "flame-wheel"
  | "flamethrower"
  | "slash"
  | "metal-claw"
  | "flame-burst"
  | "water-gun"
  | "hydro-pump"
  | "twister"
  | "rain-dance"
  | "bubble"
  | "icicle-spear"
  | "horn-attack"
  | "horn-drill"
  | "low-kick"
  | "focus-energy"
  | "karate-chop"
  | "confusion"
  | "psychic"
  | "future-sight"
  | "calm-mind"
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
  | "special-attack"
  | "special-defense"
  | "accuracy"
  | "evasion"
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
  /** Remaining FireRed Sleep counter (1-5); ignored unless status is Sleep. */
  sleepTurnsRemaining?: number;
  /** Future multiplayer ownership hint for allied battle UI. */
  ownerKind?: "local" | "party-member";
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
  /** Separate trainer-side bag used by rival AI. */
  rivalItems?: Partial<DuelInventory>;
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
  rivalItems?: Partial<DuelInventory>;
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
  /** Primary encounter, retained for backward compatibility and summaries. */
  wildSpecies: WildSpeciesId;
  wildLevel: number;
  /** Optional multi-wild pack. When present, up to ten enemies are deployed. */
  wilds?: readonly {
    species: WildSpeciesId;
    level: number;
  }[];
}

export type DuelItem =
  | { id: DuelItemId; name: string; kind: "heal"; target: "ally"; heal: number }
  | {
      id: DuelItemId;
      name: string;
      kind: "cure";
      target: "ally";
      cures: readonly Exclude<DuelMajorStatus, null>[];
    }
  | { id: DuelItemId; name: string; kind: "capture"; target: "wild-enemy"; ballModifier: number };

export function normalizeDuelMajorStatus(
  value: unknown,
): DuelMajorStatus {
  return value === "poison" ||
    value === "paralysis" ||
    value === "burn" ||
    value === "sleep"
    ? value
    : null;
}

export function normalizeDuelSleepTurns(
  status: DuelMajorStatus,
  value: unknown,
): number {
  if (status !== "sleep") {
    return 0;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      1,
      Math.min(5, Math.trunc(value)),
    );
  }

  return 2;
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
  /** FireRed base accuracy percentage. Omitted values default to 100. */
  accuracy?: number;
  /** Ignores Accuracy/Evasion stages, as with Swift and Shock Wave. */
  alwaysHits?: boolean;
  apCost: number;
  maxPp: number;
  minRange: number;
  maxRange: number;
  /** Tactical multi-target footprint used by the grid battle adaptation. */
  areaPattern?:
    | "burst-1"
    | "line"
    | "cone"
    | "self-radius-1";
  secondaryStatus?: Exclude<DuelMajorStatus, null>;
  secondaryStatChange?: {
    stat: "special-defense";
    delta: -1;
  };
  secondaryEffectChance?: number;
  /** FireRed-style random 2-5 hit sequence. */
  multiHit?: "two-to-five";
  /** Fraction of actual HP damage dealt that returns to the attacker as recoil. */
  recoilDamageFraction?: number;
  effect?:
    | "attack-down"
    | "attack-down-2"
    | "defense-down"
    | "defense-down-2"
    | "defense-up"
    | "special-attack-up"
    | "calm-mind"
    | "accuracy-down"
    | "evasion-up"
    | "evasion-down"
    | "speed-down"
    | "speed-down-2"
    | "speed-up-2"
    | "heal-self"
    | "synthesis"
    | "rain-dance"
    | "solar-beam"
    | "future-sight"
    | "disable"
    | "drain-half"
    | "fixed-damage-20"
    | "ohko"
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
      /** First-turn charge presentation for two-turn moves. */
      charging?: boolean;
      results: Array<{
        targetId: string;
        damage: number;
        fainted: boolean;
        statChanges: Array<{
          stat: DuelStatId;
          delta: number;
        }>;
        statusApplied?: Exclude<DuelMajorStatus, null>;
        missed?: boolean;
        hitCount?: number;
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
      itemId: DuelItemId;
      targetIds: string[];
      success: boolean;
      chance: number;
      xpRatio: number;
      targetFlees: boolean;
    };

export interface DuelUnit {
  id: string;
  side: DuelSide;
  ownerKind: "local" | "party-member";
  species: DuelSpeciesId;
  displayName: string;
  type: DuelType;
  types: DuelType[];
  level: number;
  hp: number;
  maxHp: number;
  status: DuelMajorStatus;
  sleepTurnsRemaining: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  attackStage: number;
  defenseStage: number;
  specialAttackStage: number;
  specialDefenseStage: number;
  accuracyStage: number;
  evasionStage: number;
  speedStage: number;
  ap: number;
  maxAp: number;
  mp: number;
  maxMp: number;
  position: DuelPoint;
  moves: DuelMoveId[];
  movePp: DuelMovePp;
  /** Forced move/target to release on this unit's next usable activation. */
  chargingMove: {
    moveId: DuelMoveId;
    targetId: string;
  } | null;
  /** FireRed Future Sight is attached to the target and stores damage at setup. */
  futureSight: {
    attackerId: string;
    moveId: "future-sight";
    damage: number;
    roundsRemaining: number;
  } | null;
  /** Last move that actually progressed past action cancellation. */
  lastMoveUsed: DuelMoveId | null;
  /** FireRed Disable volatile state; expires by full arena rounds in Tactimon. */
  disabledMove: DuelMoveId | null;
  disableTurnsRemaining: number;
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
  /** Player-owned persistent battle bag. */
  items: DuelInventory;
  /** Opponent-side battle bag; never mutates the player's inventory. */
  rivalItems: DuelInventory;
  round: number;
  weather: DuelWeather;
  weatherTurnsRemaining: number;
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
    sleepTurnsRemaining: number;
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
      kind: "release-charge";
      unitId: string;
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

export interface DuelAiTurnOptions {
  /**
   * Spend items from the active side's own battle bag when tactically useful.
   */
  useItems?: boolean;
  /**
   * Throw a Poké Ball as soon as a wild target is capture-eligible.
   * This is intentionally independent from full Auto Battle.
   */
  autoCapture?: boolean;
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
  pidgeot: {
    name: "Pidgeot",
    type: "flying",
    types: ["normal", "flying"],
    hp: 83,
    attack: 80,
    defense: 75,
    specialAttack: 70,
    specialDefense: 70,
    speed: 91,
    moves: ["feather-dance", "wing-attack", "gust", "quick-attack"],
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
  blastoise: {
    name: "Blastoise",
    type: "water",
    types: ["water"],
    hp: 79,
    attack: 83,
    defense: 100,
    specialAttack: 85,
    specialDefense: 105,
    speed: 78,
    moves: ["water-gun", "rain-dance", "bite", "rapid-spin"],
  },
  gyarados: {
    name: "Gyarados",
    type: "water",
    types: ["water", "flying"],
    hp: 95,
    attack: 125,
    defense: 79,
    specialAttack: 60,
    specialDefense: 100,
    speed: 81,
    moves: ["hydro-pump", "twister", "leer", "rain-dance"],
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
  venusaur: {
    name: "Venusaur",
    type: "grass",
    types: ["grass", "poison"],
    hp: 80,
    attack: 82,
    defense: 83,
    specialAttack: 100,
    specialDefense: 100,
    speed: 80,
    moves: ["razor-leaf", "sweet-scent", "growth", "synthesis"],
  },
  exeggcute: {
    name: "Exeggcute",
    type: "grass",
    types: ["grass", "psychic"],
    hp: 60,
    attack: 40,
    defense: 80,
    specialAttack: 60,
    specialDefense: 45,
    speed: 40,
    moves: ["solar-beam", "sleep-powder", "poison-powder", "stun-spore"],
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
  growlithe: {
    name: "Growlithe",
    type: "fire",
    types: ["fire"],
    hp: 55,
    attack: 70,
    defense: 45,
    specialAttack: 70,
    specialDefense: 50,
    speed: 60,
    moves: ["flame-wheel", "take-down", "leer", "agility"],
  },
  charizard: {
    name: "Charizard",
    type: "fire",
    types: ["fire", "flying"],
    hp: 78,
    attack: 84,
    defense: 78,
    specialAttack: 109,
    specialDefense: 85,
    speed: 100,
    moves: ["flamethrower", "wing-attack", "slash", "scary-face"],
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
  alakazam: {
    name: "Alakazam",
    type: "psychic",
    types: ["psychic"],
    hp: 55,
    attack: 50,
    defense: 45,
    specialAttack: 135,
    specialDefense: 85,
    speed: 120,
    moves: ["psychic", "calm-mind", "future-sight", "disable"],
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
  raichu: {
    name: "Raichu",
    type: "electric",
    types: ["electric"],
    hp: 60,
    attack: 90,
    defense: 55,
    specialAttack: 90,
    specialDefense: 80,
    speed: 100,
    moves: ["quick-attack", "thunder-wave", "double-team", "shock-wave"],
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
  magnemite: {
    name: "Magnemite",
    type: "electric",
    types: ["electric", "steel"],
    hp: 25,
    attack: 35,
    defense: 70,
    specialAttack: 95,
    specialDefense: 55,
    speed: 45,
    moves: ["thunder-shock", "supersonic", "sonic-boom", "thunder-wave"],
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
  tentacool: {
    name: "Tentacool",
    type: "water",
    types: ["water", "poison"],
    hp: 40,
    attack: 40,
    defense: 35,
    specialAttack: 50,
    specialDefense: 100,
    speed: 70,
    moves: ["poison-sting", "supersonic", "wrap"],
  },
  ponyta: {
    name: "Ponyta",
    type: "fire",
    types: ["fire"],
    hp: 50,
    attack: 85,
    defense: 55,
    specialAttack: 65,
    specialDefense: 65,
    speed: 90,
    moves: ["tackle", "growl", "tail-whip", "ember"],
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
  rhyhorn: {
    name: "Rhyhorn",
    type: "ground",
    types: ["ground", "rock"],
    hp: 80,
    attack: 85,
    defense: 95,
    specialAttack: 30,
    specialDefense: 30,
    speed: 25,
    moves: ["take-down", "horn-drill", "rock-blast", "fury-attack"],
  },
};

export const DUEL_ITEMS = {
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
  "great-ball": {
    id: "great-ball",
    name: "Great Ball",
    kind: "capture",
    target: "wild-enemy",
    ballModifier: 1.5,
  },
  "super-potion": {
    id: "super-potion",
    name: "Super Potion",
    kind: "heal",
    target: "ally",
    heal: 50,
  },
  "hyper-potion": {
    id: "hyper-potion",
    name: "Hyper Potion",
    kind: "heal",
    target: "ally",
    heal: 200,
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    kind: "cure",
    target: "ally",
    cures: ["poison"],
  },
  "parlyz-heal": {
    id: "parlyz-heal",
    name: "Parlyz Heal",
    kind: "cure",
    target: "ally",
    cures: ["paralysis"],
  },
  awakening: {
    id: "awakening",
    name: "Awakening",
    kind: "cure",
    target: "ally",
    cures: ["sleep"],
  },
  "burn-heal": {
    id: "burn-heal",
    name: "Burn Heal",
    kind: "cure",
    target: "ally",
    cures: ["burn"],
  },
} satisfies Record<DuelItemId, DuelItem>;

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

  const items: DuelInventory = {
    potion: normalize(input?.potion, fallback.potion),
    "poke-ball": normalize(
      input?.["poke-ball"],
      fallback["poke-ball"],
    ),
  };
  for (const id of DUEL_EXTRA_ITEM_IDS) {
    const amount = normalize(input?.[id], fallback[id] ?? 0);
    if (amount > 0) {
      items[id] = amount;
    }
  }

  return items;
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
  "take-down": {
    id: "take-down",
    name: "Take Down",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description:
      "Investida de 90 power que causa recoil de 1/4 do dano efetivamente causado.",
    power: 90,
    accuracy: 85,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
    recoilDamageFraction: 0.25,
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
      "Reduz a Accuracy do alvo em 1 estágio.",
    power: null,
    accuracy: 100,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
    effect: "accuracy-down",
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
  "wing-attack": {
    id: "wing-attack",
    name: "Wing Attack",
    type: "flying",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "gust",
    description: "Golpe Flying de contato com 60 power.",
    power: 60,
    apCost: 4,
    maxPp: 35,
    minRange: 1,
    maxRange: 1,
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
    accuracy: 85,
    apCost: 3,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
    multiHit: "two-to-five",
  },
  "feather-dance": {
    id: "feather-dance",
    name: "Feather Dance",
    type: "flying",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Dança com plumas e reduz o Attack do alvo em 2 estágios.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
    effect: "attack-down-2",
  },
  agility: {
    id: "agility",
    name: "Agility",
    type: "psychic",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "double-team",
    description:
      "Aumenta a própria Speed em 2 estágios.",
    power: null,
    apCost: 2,
    maxPp: 30,
    minRange: 0,
    maxRange: 0,
    effect: "speed-up-2",
  },
  "scary-face": {
    id: "scary-face",
    name: "Scary Face",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "leer",
    description:
      "Assusta o alvo e reduz sua Speed em 2 estágios.",
    power: null,
    accuracy: 90,
    apCost: 2,
    maxPp: 10,
    minRange: 1,
    maxRange: 3,
    effect: "speed-down-2",
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
      "Pó sonífero com 75% de Accuracy que causa Sleep por 2-5 turnos.",
    power: null,
    accuracy: 75,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "sleep",
    secondaryEffectChance: 100,
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
      "Reduz a Evasion do alvo em 1 estágio.",
    power: null,
    accuracy: 100,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    effect: "evasion-down",
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
      "Aumenta o Special Attack do usuário em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 0,
    maxRange: 0,
    effect: "special-attack-up",
  },
  synthesis: {
    id: "synthesis",
    name: "Synthesis",
    type: "grass",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "recover",
    description:
      "Recupera metade do HP máximo em clima neutro e 1/4 sob chuva.",
    power: null,
    apCost: 3,
    maxPp: 5,
    minRange: 0,
    maxRange: 0,
    effect: "synthesis",
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
    accuracy: 75,
    apCost: 2,
    maxPp: 30,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "paralysis",
    secondaryEffectChance: 100,
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
    accuracy: 75,
    apCost: 2,
    maxPp: 35,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "poison",
    secondaryEffectChance: 100,
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
    accuracy: 80,
    apCost: 4,
    maxPp: 10,
    minRange: 1,
    maxRange: 3,
    effect: "speed-down",
  },
  "rock-blast": {
    id: "rock-blast",
    name: "Rock Blast",
    type: "rock",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "rock-tomb",
    description:
      "Dispara de 2 a 5 rochas usando a distribuição multi-hit do FireRed.",
    power: 25,
    accuracy: 80,
    apCost: 5,
    maxPp: 10,
    minRange: 1,
    maxRange: 4,
    multiHit: "two-to-five",
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
    accuracy: 100,
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
      "Aumenta a Evasion do usuário em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 15,
    minRange: 0,
    maxRange: 0,
    effect: "evasion-up",
  },
  slam: {
    id: "slam",
    name: "Slam",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Golpe físico pesado de contato.",
    power: 80,
    accuracy: 75,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
  },
  spark: {
    id: "spark",
    name: "Spark",
    type: "electric",
    category: "special",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "thunder-shock",
    description:
      "Investida elétrica; a chance secundária de paralisia é modelada.",
    power: 65,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
    secondaryStatus: "paralysis",
    secondaryEffectChance: 30,
  },
  "shock-wave": {
    id: "shock-wave",
    name: "Shock Wave",
    type: "electric",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "thunder-shock",
    description:
      "Onda elétrica de precisão garantida no FireRed.",
    power: 60,
    apCost: 5,
    maxPp: 20,
    alwaysHits: true,
    minRange: 1,
    maxRange: 4,
  },
  "sonic-boom": {
    id: "sonic-boom",
    name: "Sonic Boom",
    type: "normal",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "gust",
    description:
      "Onda sônica que causa exatamente 20 de dano quando o alvo não é imune.",
    power: 1,
    accuracy: 90,
    apCost: 4,
    maxPp: 20,
    minRange: 1,
    maxRange: 4,
    effect: "fixed-damage-20",
  },
  screech: {
    id: "screech",
    name: "Screech",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description:
      "Reduz a Defense do alvo em 2 estágios.",
    power: null,
    apCost: 2,
    maxPp: 40,
    minRange: 1,
    maxRange: 3,
    effect: "defense-down-2",
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
    description: "Lança folhas cortantes em uma linha frontal.",
    power: 55,
    accuracy: 95,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 4,
    areaPattern: "line",
  },
  "solar-beam": {
    id: "solar-beam",
    name: "Solar Beam",
    type: "grass",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "solar-beam",
    description:
      "Absorve luz em uma ativação e dispara na próxima; chuva reduz o dano pela metade.",
    power: 120,
    accuracy: 100,
    apCost: 5,
    maxPp: 10,
    minRange: 1,
    maxRange: 4,
    effect: "solar-beam",
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
  "flame-wheel": {
    id: "flame-wheel",
    name: "Flame Wheel",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "ember",
    description:
      "Gira em chamas e atinge inimigos adjacentes; 10% de Burn.",
    power: 60,
    apCost: 4,
    maxPp: 25,
    minRange: 1,
    maxRange: 1,
    areaPattern: "self-radius-1",
    secondaryStatus: "burn",
    secondaryEffectChance: 10,
  },
  flamethrower: {
    id: "flamethrower",
    name: "Flamethrower",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "flame-burst",
    description:
      "Ataque Fire de 95 power com 10% de chance de Burn.",
    power: 95,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 4,
    secondaryStatus: "burn",
    secondaryEffectChance: 10,
  },
  slash: {
    id: "slash",
    name: "Slash",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "scratch",
    description:
      "Golpe Normal de 70 power; a taxa de crítico elevada ainda não é modelada.",
    power: 70,
    accuracy: 100,
    apCost: 5,
    maxPp: 20,
    minRange: 1,
    maxRange: 1,
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
    description: "Explode no alvo e atinge inimigos nos tiles adjacentes.",
    power: 65,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 4,
    areaPattern: "burst-1",
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
  "hydro-pump": {
    id: "hydro-pump",
    name: "Hydro Pump",
    type: "water",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "water-gun",
    description: "Ataque Water de 120 power e 5 PP.",
    power: 120,
    accuracy: 80,
    apCost: 6,
    maxPp: 5,
    minRange: 1,
    maxRange: 4,
  },
  twister: {
    id: "twister",
    name: "Twister",
    type: "dragon",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "gust",
    description:
      "Avança em cone frontal; flinch ainda não é modelado.",
    power: 40,
    accuracy: 100,
    apCost: 4,
    maxPp: 20,
    minRange: 1,
    maxRange: 4,
    areaPattern: "cone",
  },
  "rain-dance": {
    id: "rain-dance",
    name: "Rain Dance",
    type: "water",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "water-gun",
    description:
      "Invoca chuva por 5 rounds; fortalece Water e enfraquece Fire.",
    power: null,
    apCost: 2,
    maxPp: 5,
    minRange: 0,
    maxRange: 0,
    effect: "rain-dance",
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
    description: "Dispara de 2 a 5 lanças de gelo contra o alvo.",
    power: 10,
    accuracy: 100,
    apCost: 3,
    maxPp: 30,
    minRange: 1,
    maxRange: 4,
    multiHit: "two-to-five",
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
  "horn-drill": {
    id: "horn-drill",
    name: "Horn Drill",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "horn-attack",
    description:
      "Golpe OHKO: falha contra alvos de nível maior e usa a chance canônica do FireRed.",
    power: 1,
    accuracy: 30,
    apCost: 6,
    maxPp: 5,
    minRange: 1,
    maxRange: 1,
    effect: "ohko",
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
  psychic: {
    id: "psychic",
    name: "Psychic",
    type: "psychic",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "confusion",
    description:
      "Ataque Psychic de 90 power com 10% de chance de reduzir Special Defense.",
    power: 90,
    apCost: 5,
    maxPp: 10,
    minRange: 1,
    maxRange: 4,
    secondaryStatChange: {
      stat: "special-defense",
      delta: -1,
    },
    secondaryEffectChance: 10,
  },
  "future-sight": {
    id: "future-sight",
    name: "Future Sight",
    type: "psychic",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "confusion",
    description:
      "Prevê um ataque de 80 power que atinge o alvo dois rounds depois.",
    power: 80,
    accuracy: 90,
    apCost: 5,
    maxPp: 15,
    minRange: 1,
    maxRange: 4,
    effect: "future-sight",
  },
  "calm-mind": {
    id: "calm-mind",
    name: "Calm Mind",
    type: "psychic",
    category: "status",
    targeting: "self",
    motion: "status",
    vfxId: "harden",
    description:
      "Aumenta Special Attack e Special Defense do usuário em 1 estágio.",
    power: null,
    apCost: 2,
    maxPp: 20,
    minRange: 0,
    maxRange: 0,
    effect: "calm-mind",
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
      "Induz Sleep por 2-5 turnos com 60% de Accuracy.",
    power: null,
    accuracy: 60,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    secondaryStatus: "sleep",
    secondaryEffectChance: 100,
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
      "Desabilita por 2-5 rounds o último golpe usado pelo alvo que ainda tenha PP.",
    power: null,
    accuracy: 55,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    effect: "disable",
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
    accuracy: 55,
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
    accuracy: 90,
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
      "Reduz a Accuracy do alvo em 1 estágio.",
    power: null,
    accuracy: 80,
    apCost: 2,
    maxPp: 15,
    minRange: 1,
    maxRange: 3,
    effect: "accuracy-down",
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
      "Reduz a Accuracy do alvo em 1 estágio.",
    power: null,
    accuracy: 100,
    apCost: 2,
    maxPp: 20,
    minRange: 1,
    maxRange: 3,
    effect: "accuracy-down",
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
    alwaysHits: true,
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

function isDuelMoveDisabled(
  unit: Pick<
    DuelUnit,
    "disabledMove" | "disableTurnsRemaining"
  >,
  moveId: DuelMoveId,
): boolean {
  return (
    unit.disableTurnsRemaining > 0 &&
    unit.disabledMove === moveId
  );
}

function canDuelUnitUseMove(
  unit: Pick<
    DuelUnit,
    | "moves"
    | "movePp"
    | "disabledMove"
    | "disableTurnsRemaining"
  >,
  moveId: DuelMoveId,
): boolean {
  return (
    getDuelMovePp(unit, moveId) > 0 &&
    !isDuelMoveDisabled(unit, moveId)
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

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;

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

function openNeighborCount(
  point: DuelPoint,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
): number {
  let open = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = point.x + dx;
      const y = point.y + dy;
      if (
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height &&
        !blockedKeys.has(pointKey({ x, y }))
      ) {
        open += 1;
      }
    }
  }
  return open;
}

function largestOpenRegion(
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
): DuelPoint[] {
  const visited = new Set<string>();
  let largest: DuelPoint[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const point = { x, y };
      const key = pointKey(point);
      if (blockedKeys.has(key) || visited.has(key)) {
        continue;
      }

      const region = connectedOpenCells(
        point,
        width,
        height,
        blockedKeys,
      );
      for (const cell of region) {
        visited.add(pointKey(cell));
      }
      if (region.length > largest.length) {
        largest = region;
      }
    }
  }

  return largest;
}

/**
 * Free cells in the 5x5 window around a point (inner ring weighted double).
 * Approximates how much room a team has to gather and manoeuvre there.
 */
function openAreaScore(
  point: DuelPoint,
  regionKeys: ReadonlySet<string>,
): number {
  let score = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (
        regionKeys.has(
          pointKey({ x: point.x + dx, y: point.y + dy }),
        )
      ) {
        score +=
          Math.abs(dx) <= 1 && Math.abs(dy) <= 1 ? 2 : 1;
      }
    }
  }
  return score;
}

const MAX_OPEN_AREA_SCORE = 34;

function orthogonalOpenCount(
  point: DuelPoint,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
): number {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter(
    (next) =>
      next.x >= 0 &&
      next.y >= 0 &&
      next.x < width &&
      next.y < height &&
      !blockedKeys.has(pointKey(next)),
  ).length;
}

function isArenaBorder(
  point: DuelPoint,
  width: number,
  height: number,
): boolean {
  return (
    point.x === 0 ||
    point.y === 0 ||
    point.x === width - 1 ||
    point.y === height - 1
  );
}

/** Lower is better. Picks randomly among the best few to keep variety. */
function pickBestScored(
  points: readonly DuelPoint[],
  score: (point: DuelPoint) => number,
  random: () => number,
): DuelPoint {
  const ranked = points
    .map((point) => ({ point, score: score(point) }))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.point.y - b.point.y ||
        a.point.x - b.point.x,
    );
  const best = ranked[0].score;
  const near = ranked
    .filter((entry) => entry.score <= best + 1.5)
    .slice(0, 4);
  return { ...randomItem(near, random).point };
}

/**
 * Picks one anchor per team inside the largest navigable region: the player
 * anchor left of centre, the rival anchor right of it, both in open interior
 * ground, separated by a tactical gap (~4-7 tiles) that is crossed in one or
 * two turns instead of several turns of plain walking.
 */
function pickSpawnPositions(
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
  seed: number,
): [DuelPoint, DuelPoint] {
  const blockedKeys = new Set(blocked.map(pointKey));
  const region = largestOpenRegion(width, height, blockedKeys);

  if (region.length < 2) {
    return [
      { x: 0, y: 0 },
      {
        x: Math.max(0, width - 1),
        y: Math.max(0, height - 1),
      },
    ];
  }

  const random = createSeededRandom(seed);
  const regionKeys = new Set(region.map(pointKey));
  const desiredDistance = Math.max(
    4,
    Math.min(7, Math.round(width * 0.42)),
  );
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const playerTargetX = centerX - desiredDistance / 2;
  const rivalTargetX = centerX + desiredDistance / 2;
  const crampedPenalty = (point: DuelPoint) =>
    (MAX_OPEN_AREA_SCORE - openAreaScore(point, regionKeys)) *
      0.5 +
    (isArenaBorder(point, width, height) ? 4 : 0) +
    (orthogonalOpenCount(point, width, height, blockedKeys) <= 1
      ? 6
      : 0);

  const player = pickBestScored(
    region,
    (point) =>
      Math.abs(point.x - playerTargetX) * 1.5 +
      Math.abs(point.y - centerY) * 0.6 +
      (point.x > centerX ? 12 : 0) +
      crampedPenalty(point),
    random,
  );

  const rivalCandidates = region.filter(
    (point) => pointKey(point) !== pointKey(player),
  );
  const rival = pickBestScored(
    rivalCandidates,
    (point) => {
      const distance = manhattanDistance(point, player);
      return (
        Math.abs(distance - desiredDistance) * 2 +
        (distance < 3 ? 12 : 0) +
        Math.abs(point.x - rivalTargetX) * 0.75 +
        Math.abs(point.y - player.y) * 0.5 +
        (point.x <= centerX ? 12 : 0) +
        (point.x <= player.x ? 8 : 0) +
        crampedPenalty(point)
      );
    },
    random,
  );

  return [player, rival];
}

/**
 * Gathers a team around its anchor: compact, on its own half of the arena,
 * away from the opposing anchor and out of dead ends. Cells connected to the
 * anchor are always preferred; disconnected free cells are a last resort so
 * oversized packs still deploy every unit.
 */
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

  const centerX = (width - 1) / 2;
  const sideAware =
    Math.abs(anchor.x - opposingAnchor.x) >= 2;
  const anchorOnRight = anchor.x > opposingAnchor.x;
  const isWrongSide = (point: DuelPoint) =>
    sideAware &&
    (anchorOnRight
      ? point.x <= centerX
      : point.x > centerX);
  const score = (point: DuelPoint) => {
    const enemyDistance = manhattanDistance(
      point,
      opposingAnchor,
    );
    return (
      manhattanDistance(point, anchor) * 2 +
      (isWrongSide(point) ? 14 : 0) +
      (enemyDistance < 3 ? (3 - enemyDistance) * 5 : 0) +
      (isArenaBorder(point, width, height) ? 1.5 : 0) +
      (8 -
        openNeighborCount(
          point,
          width,
          height,
          blockedKeys,
        )) *
        0.4 +
      (orthogonalOpenCount(
        point,
        width,
        height,
        blockedKeys,
      ) <= 1
        ? 4
        : 0)
    );
  };
  const rank = (points: readonly DuelPoint[]) =>
    points
      .filter((point) => !reserved.has(pointKey(point)))
      .map((point) => ({ point, score: score(point) }))
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.point.y - b.point.y ||
          a.point.x - b.point.x,
      )
      .map((entry) => entry.point);

  const connected = connectedOpenCells(
    anchor,
    width,
    height,
    blockedKeys,
  );
  for (const point of rank(connected)) {
    if (positions.length >= count) break;
    add(point);
  }

  if (positions.length < count) {
    const remaining: DuelPoint[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        remaining.push({ x, y });
      }
    }
    for (const point of rank(remaining)) {
      if (positions.length >= count) break;
      add(point);
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

const ACCURACY_STAGE_RATIOS = [
  { dividend: 33, divisor: 100 },
  { dividend: 36, divisor: 100 },
  { dividend: 43, divisor: 100 },
  { dividend: 50, divisor: 100 },
  { dividend: 60, divisor: 100 },
  { dividend: 75, divisor: 100 },
  { dividend: 1, divisor: 1 },
  { dividend: 133, divisor: 100 },
  { dividend: 166, divisor: 100 },
  { dividend: 2, divisor: 1 },
  { dividend: 233, divisor: 100 },
  { dividend: 133, divisor: 50 },
  { dividend: 3, divisor: 1 },
] as const;

function accuracyStageRatio(stage: number): {
  dividend: number;
  divisor: number;
} {
  const bounded = Math.max(
    -MAX_STAGE,
    Math.min(MAX_STAGE, Math.trunc(stage)),
  );
  return ACCURACY_STAGE_RATIOS[bounded + MAX_STAGE];
}

export function getDuelMoveHitChance(
  attacker: Pick<
    DuelUnit,
    "accuracyStage" | "level"
  >,
  defender: Pick<
    DuelUnit,
    "evasionStage" | "level"
  >,
  move: Pick<
    DuelMove,
    "accuracy" | "alwaysHits" | "targeting" | "effect"
  >,
): number {
  if (move.effect === "ohko") {
    if (attacker.level < defender.level) {
      return 0;
    }

    // FireRed uses Random() % 100 + 1 < accuracy + level difference.
    // Converting that strict comparison to a percentage subtracts one.
    const threshold =
      (move.accuracy ?? 30) +
      (attacker.level - defender.level);
    return Math.max(
      0,
      Math.min(100, threshold - 1),
    );
  }

  if (move.targeting === "self" || move.alwaysHits) {
    return 100;
  }

  const baseAccuracy = Math.max(
    0,
    Math.min(100, move.accuracy ?? 100),
  );
  const netStage =
    attacker.accuracyStage - defender.evasionStage;
  const ratio = accuracyStageRatio(netStage);
  const fireRedAccuracy = Math.floor(
    (ratio.dividend * baseAccuracy) /
      ratio.divisor,
  );

  return Math.max(
    0,
    Math.min(100, fireRedAccuracy),
  );
}

export function movementPointsForDuelPokemon(
  species: DuelSpeciesId,
): number {
  const speed = SPECIES[species].speed;

  if (speed < 40) return 2;
  if (speed < 75) return 3;
  if (speed < 105) return 4;
  return 5;
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

export type DuelPokemonStatSheet = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

/** Battle stats shown in menus; same formula `makeUnit` uses in battle. */
export function calculateDuelPokemonStats(
  build: Pick<
    DuelPokemonBuild,
    "species" | "level" | "evs"
  >,
): DuelPokemonStatSheet {
  const base = SPECIES[build.species];
  const level = Math.max(
    1,
    Math.min(100, Math.trunc(build.level)),
  );
  const other = (
    stat:
      | "attack"
      | "defense"
      | "specialAttack"
      | "specialDefense"
      | "speed",
  ) =>
    calculateOtherStat({
      base: base[stat],
      iv: FIXED_IV,
      ev: build.evs?.[stat] ?? 0,
      level,
    });

  return {
    hp: calculateDuelPokemonMaxHp(build),
    attack: other("attack"),
    defense: other("defense"),
    specialAttack: other("specialAttack"),
    specialDefense: other("specialDefense"),
    speed: other("speed"),
  };
}

export function isDuelSpeciesId(
  value: string,
): value is DuelSpeciesId {
  return Object.prototype.hasOwnProperty.call(SPECIES, value);
}

export function duelSpeciesTypes(
  species: DuelSpeciesId,
): readonly DuelType[] {
  return SPECIES[species].types;
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
  const status = normalizeDuelMajorStatus(
    build.status,
  );

  return {
    id: `${side}-${slot}-${build.species}`,
    side,
    ownerKind:
      side === "player"
        ? build.ownerKind ?? "local"
        : "local",
    species: build.species,
    displayName: base.name,
    type: base.type,
    types: [...base.types],
    level,
    hp: currentHp,
    maxHp,
    status,
    sleepTurnsRemaining: normalizeDuelSleepTurns(
      status,
      build.sleepTurnsRemaining,
    ),
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
    specialAttackStage: 0,
    specialDefenseStage: 0,
    accuracyStage: 0,
    evasionStage: 0,
    speedStage: 0,
    ap: 6,
    maxAp: 6,
    mp: movementPointsForDuelPokemon(build.species),
    maxMp: movementPointsForDuelPokemon(build.species),
    position,
    moves: [...build.moves].slice(0, 4),
    movePp: normalizeDuelMovePp(
      [...build.moves].slice(0, 4),
      build.movePp,
    ),
    chargingMove: null,
    futureSight: null,
    lastMoveUsed: null,
    disabledMove: null,
    disableTurnsRemaining: 0,
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

  const state: DuelState = {
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
    rivalItems: normalizeDuelItems(
      options.rivalItems,
      {
        potion: 1,
        "poke-ball": 0,
      },
    ),
    round: 1,
    weather: null,
    weatherTurnsRemaining: 0,
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
    ],
  };
  activateNextTurnUnit(state, 0);
  return state;
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
    ...(options.rivalItems !== undefined
      ? { rivalItems: options.rivalItems }
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
    throw new Error(
      "Wild duel requires at least one player Pokémon.",
    );
  }

  const requestedWilds =
    options.wilds && options.wilds.length > 0
      ? [...options.wilds]
      : [
          {
            species: options.wildSpecies,
            level: options.wildLevel,
          },
        ];
  const wildBuilds = requestedWilds
    .slice(0, 10)
    .map((wild) => ({
      species: wild.species,
      level: Math.max(
        1,
        Math.min(100, Math.trunc(wild.level)),
      ),
      moves: [...SPECIES[wild.species].moves],
    }));

  const positions = pickTeamSpawnPositions(
    width,
    height,
    blocked,
    seed,
    party.length,
    wildBuilds.length,
  );
  if (
    positions.players.length < party.length ||
    positions.rivals.length < wildBuilds.length
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
  const wilds = wildBuilds.map((build, index) =>
    makeUnit(
      build,
      "rival",
      positions.rivals[index],
      index,
    ),
  );
  const units = [...players, ...wilds];
  const turnOrder = createTurnOrder(units);
  const active = units.find(
    (unit) => unit.id === turnOrder[0],
  )!;
  const captureAllowed =
    options.captureAllowed ?? true;

  const state: DuelState = {
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
    rivalItems: {
      potion: 0,
      "poke-ball": 0,
    },
    round: 1,
    weather: null,
    weatherTurnsRemaining: 0,
    turnOrder,
    turnIndex: 0,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    captureResult: null,
    units,
    log: [
      wilds.length === 1
        ? `Um ${wilds[0].displayName} selvagem apareceu!`
        : `${wilds.length} Pokémon selvagens cercaram seu time!`,
      players.length > 1
        ? `${players.length} Pokémon do seu time entram na arena.`
        : `${players[0].displayName} entra na arena.`,
    ],
  };
  activateNextTurnUnit(state, 0);
  return state;
}

export function manhattanDistance(
  a: DuelPoint,
  b: DuelPoint,
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function areaFacing(
  actor: DuelPoint,
  target: DuelPoint,
): DuelPoint {
  const dx = target.x - actor.x;
  const dy = target.y - actor.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx >= 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: dy >= 0 ? 1 : -1 };
}

function pointInMoveArea(
  actor: DuelPoint,
  primaryTarget: DuelPoint,
  point: DuelPoint,
  move: DuelMove,
): boolean {
  if (!move.areaPattern) {
    return (
      point.x === primaryTarget.x &&
      point.y === primaryTarget.y
    );
  }

  if (move.areaPattern === "burst-1") {
    return (
      manhattanDistance(point, primaryTarget) <= 1
    );
  }

  if (move.areaPattern === "self-radius-1") {
    return manhattanDistance(point, actor) <= 1;
  }

  const facing = areaFacing(actor, primaryTarget);
  const relativeX = point.x - actor.x;
  const relativeY = point.y - actor.y;
  const forward =
    relativeX * facing.x + relativeY * facing.y;
  const lateral = Math.abs(
    relativeX * facing.y -
      relativeY * facing.x,
  );

  if (
    forward < 1 ||
    forward > move.maxRange
  ) {
    return false;
  }

  if (move.areaPattern === "line") {
    return lateral === 0;
  }

  if (move.areaPattern === "cone") {
    return lateral <= Math.floor(forward / 2);
  }

  return false;
}

export function getDuelMoveAreaTargetIds(
  state: DuelState,
  actorId: string,
  moveId: DuelMoveId,
  primaryTargetId: string,
): string[] {
  const actor = state.units.find(
    (unit) => unit.id === actorId,
  );
  const primaryTarget = state.units.find(
    (unit) => unit.id === primaryTargetId,
  );
  const move = DUEL_MOVES[moveId];

  if (
    !actor ||
    !primaryTarget ||
    !move ||
    primaryTarget.hp <= 0
  ) {
    return [];
  }

  const affected = state.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.side !== actor.side &&
        (
          unit.id === primaryTarget.id ||
          pointInMoveArea(
            actor.position,
            primaryTarget.position,
            unit.position,
            move,
          )
        ),
    )
    .sort((a, b) => {
      if (a.id === primaryTarget.id) return -1;
      if (b.id === primaryTarget.id) return 1;
      return (
        manhattanDistance(
          a.position,
          primaryTarget.position,
        ) -
          manhattanDistance(
            b.position,
            primaryTarget.position,
          ) ||
        a.id.localeCompare(b.id)
      );
    });

  return affected.map((unit) => unit.id);
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
    rivalItems: { ...state.rivalItems },
    captureResult: state.captureResult ? { ...state.captureResult } : null,
    units: state.units.map((unit) => ({
      ...unit,
      position: { ...unit.position },
      types: [...unit.types],
      moves: [...unit.moves],
      movePp: { ...unit.movePp },
      chargingMove: unit.chargingMove
        ? { ...unit.chargingMove }
        : null,
      futureSight: unit.futureSight
        ? { ...unit.futureSight }
        : null,
      lastMoveUsed: unit.lastMoveUsed,
      disabledMove: unit.disabledMove,
      disableTurnsRemaining: unit.disableTurnsRemaining,
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

function reachableCellsWithCosts(
  state: DuelState,
  unitId: string,
): {
  cells: DuelPoint[];
  costs: Map<string, number>;
} {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId,
  );
  if (!unit || unit.hp <= 0 || unit.mp <= 0) {
    return {
      cells: [],
      costs: new Map(),
    };
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
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;

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

  return {
    cells: result,
    costs: visited,
  };
}

export function getReachableCells(
  state: DuelState,
  unitId: string,
): DuelPoint[] {
  return reachableCellsWithCosts(
    state,
    unitId,
  ).cells;
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
    case "sleep":
      return false;
  }
}

function canMoveApplyMajorStatus(
  target: DuelUnit,
  move: DuelMove,
  typeEffectiveness = calculateTypeEffectiveness(
    move.type,
    target.types,
  ),
): boolean {
  if (
    !move.secondaryStatus ||
    target.status !== null ||
    isMajorStatusImmune(target, move.secondaryStatus)
  ) {
    return false;
  }

  if (move.category !== "status") {
    return typeEffectiveness > 0;
  }

  // FireRed's EFFECT_PARALYZE script runs typecalc before applying
  // primary paralysis. Sleep/Poison status scripts use their own
  // immunity rules instead of generic move-type immunity.
  return (
    move.secondaryStatus !== "paralysis" ||
    typeEffectiveness > 0
  );
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

function moveAccuracySucceeds(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): boolean {
  if (
    move.effect === "ohko" &&
    calculateTypeEffectiveness(
      move.type,
      target.types,
    ) === 0
  ) {
    return true;
  }

  const chance = getDuelMoveHitChance(
    actor,
    target,
    move,
  );
  if (chance >= 100) return true;
  if (chance <= 0) return false;

  let moveSalt = 0;
  for (const char of move.id) {
    moveSalt =
      (Math.imul(moveSalt, 31) + char.charCodeAt(0)) >>>
      0;
  }

  return statusRollSucceeds(
    state,
    actor,
    (target.hp ^ moveSalt) >>> 0,
    chance,
  );
}

function rollMultiHitCount(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): number {
  if (move.multiHit !== "two-to-five") {
    return 1;
  }

  let moveSalt = 0;
  for (const char of move.id) {
    moveSalt =
      (Math.imul(moveSalt, 31) + char.charCodeAt(0)) >>>
      0;
  }

  const random = createSeededRandom(
    (
      state.seed ^
      Math.imul(state.round + 1, 0x9e3779b1) ^
      Math.imul(state.turnIndex + 1, 0x85ebca6b) ^
      Math.imul(actor.ap + 1, 0xc2b2ae35) ^
      target.hp ^
      moveSalt
    ) >>> 0,
  );
  const firstRoll = Math.floor(random() * 4);

  if (firstRoll > 1) {
    return Math.floor(random() * 4) + 2;
  }

  return firstRoll + 2;
}

function expectedHitCount(move: DuelMove): number {
  // FireRed distribution: 2/3 hits = 3/8 each; 4/5 hits = 1/8 each.
  return move.multiHit === "two-to-five" ? 3 : 1;
}

function expectedMoveDamage(
  move: DuelMove,
  singleHitDamage: number,
): number {
  return singleHitDamage * expectedHitCount(move);
}

function expectedMoveTempoFactor(move: DuelMove): number {
  if (move.effect === "solar-beam") return 0.5;
  if (move.effect === "future-sight") return 0.7;
  return 1;
}

function rollSleepTurns(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): number {
  let moveSalt = 0;
  for (const char of move.id) {
    moveSalt =
      (Math.imul(moveSalt, 31) + char.charCodeAt(0)) >>>
      0;
  }

  const random = createSeededRandom(
    (
      state.seed ^
      Math.imul(state.round + 1, 0x9e3779b1) ^
      Math.imul(state.turnIndex + 1, 0x85ebca6b) ^
      Math.imul(actor.ap + 1, 0xc2b2ae35) ^
      Math.imul(target.hp + 1, 0x27d4eb2d) ^
      moveSalt
    ) >>> 0,
  );

  return Math.floor(random() * 4) + 2;
}

function rollDisableTurns(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): number {
  let moveSalt = 0;
  for (const char of move.id) {
    moveSalt =
      (Math.imul(moveSalt, 31) + char.charCodeAt(0)) >>>
      0;
  }

  const random = createSeededRandom(
    (
      state.seed ^
      Math.imul(state.round + 1, 0x7f4a7c15) ^
      Math.imul(state.turnIndex + 1, 0x94d049bb) ^
      Math.imul(actor.ap + 1, 0x369dea0f) ^
      Math.imul(target.hp + 1, 0x27d4eb2d) ^
      moveSalt
    ) >>> 0,
  );

  return Math.floor(random() * 4) + 2;
}

function secondaryEffectSucceeds(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): boolean {
  const chance = Math.max(
    0,
    Math.min(100, Math.trunc(move.secondaryEffectChance ?? 0)),
  );
  if (chance <= 0) {
    return false;
  }

  return statusRollSucceeds(
    state,
    actor,
    target.hp,
    chance,
  );
}

function secondaryStatusSucceeds(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): boolean {
  return (
    Boolean(move.secondaryStatus) &&
    secondaryEffectSucceeds(state, actor, target, move)
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
    case "sleep":
      return `${target.displayName} adormeceu.`;
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

function tickRoundDisable(state: DuelState): void {
  for (const unit of state.units) {
    const disabledMove = unit.disabledMove;
    if (!disabledMove) {
      unit.disableTurnsRemaining = 0;
      continue;
    }

    if (!unit.moves.includes(disabledMove)) {
      unit.disabledMove = null;
      unit.disableTurnsRemaining = 0;
      continue;
    }

    unit.disableTurnsRemaining = Math.max(
      0,
      unit.disableTurnsRemaining - 1,
    );
    if (unit.disableTurnsRemaining > 0) {
      continue;
    }

    unit.disabledMove = null;
    appendLog(
      state,
      `${unit.displayName} pode usar ${DUEL_MOVES[disabledMove].name} novamente.`,
    );
  }
}

function tickRoundFutureSight(state: DuelState): void {
  for (const target of state.units) {
    const pending = target.futureSight;
    if (!pending) continue;

    pending.roundsRemaining -= 1;
    if (pending.roundsRemaining > 0) {
      continue;
    }

    target.futureSight = null;
    if (target.hp <= 0) {
      continue;
    }

    const attacker = state.units.find(
      (unit) => unit.id === pending.attackerId,
    );
    const move = DUEL_MOVES[pending.moveId];

    if (
      !attacker ||
      !moveAccuracySucceeds(
        state,
        attacker,
        target,
        move,
      )
    ) {
      appendLog(
        state,
        `${move.name} não acertou ${target.displayName}.`,
      );
      continue;
    }

    const damage = Math.min(
      target.hp,
      pending.damage,
    );
    target.hp = Math.max(
      0,
      target.hp - pending.damage,
    );
    appendLog(
      state,
      `${target.displayName} foi atingido por ${move.name}: ${damage} de dano.`,
    );

    if (target.hp <= 0) {
      appendLog(
        state,
        `${target.displayName} desmaiou.`,
      );
    }
  }

  const playerAlive = sideHasLivingUnit(
    state,
    "player",
  );
  const rivalAlive = sideHasLivingUnit(
    state,
    "rival",
  );
  if (!playerAlive || !rivalAlive) {
    state.status = "finished";
    state.winner = playerAlive
      ? "player"
      : rivalAlive
        ? "rival"
        : null;
  }
}

function tickRoundWeather(state: DuelState): void {
  if (
    state.weather !== "rain" ||
    state.weatherTurnsRemaining <= 0
  ) {
    return;
  }

  state.weatherTurnsRemaining -= 1;

  if (state.weatherTurnsRemaining <= 0) {
    state.weather = null;
    state.weatherTurnsRemaining = 0;
    appendLog(state, "A chuva parou.");
    return;
  }

  appendLog(
    state,
    `A chuva continua. ${state.weatherTurnsRemaining} rounds restantes.`,
  );
}

function activateNextTurnUnit(
  state: DuelState,
  startIndex: number,
): boolean {
  let nextIndex = Math.max(0, startIndex);

  for (let pass = 0; pass < 6; pass += 1) {
    for (
      ;
      nextIndex < state.turnOrder.length;
      nextIndex += 1
    ) {
      const nextId = state.turnOrder[nextIndex];
      const next = state.units.find(
        (unit) =>
          unit.id === nextId &&
          unit.hp > 0,
      );

      if (!next) continue;

      next.ap = next.maxAp;
      next.mp = next.maxMp;

      if (next.status === "sleep") {
        const remaining = normalizeDuelSleepTurns(
          next.status,
          next.sleepTurnsRemaining,
        );

        if (remaining <= 1) {
          next.status = null;
          next.sleepTurnsRemaining = 0;
          appendLog(
            state,
            `${next.displayName} acordou!`,
          );
        } else {
          next.sleepTurnsRemaining = remaining - 1;
          next.ap = 0;
          next.mp = 0;
          appendLog(
            state,
            `${next.displayName} está dormindo profundamente.`,
          );
          continue;
        }
      }

      state.activeUnitId = next.id;
      state.turnIndex = nextIndex;
      appendLog(
        state,
        `Turno de ${next.displayName}. AP ${next.ap}, MP ${next.mp}.`,
      );
      return true;
    }

    tickRoundDisable(state);
    tickRoundFutureSight(state);
    if (state.status !== "active") {
      return false;
    }

    tickRoundWeather(state);
    state.round += 1;
    state.turnOrder = createTurnOrder(state.units);
    nextIndex = 0;
  }

  return false;
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

  if (
    activateNextTurnUnit(
      state,
      currentIndex + 1,
    )
  ) {
    return;
  }

  if (state.status === "active") {
    state.status = "finished";
    state.winner = current.side;
  }
}

type DuelDamageResult = {
  damage: number;
  sameTypeAttackBonus: boolean;
  typeEffectiveness: number;
};

function calculateFutureSightBaseDamage(
  attacker: DuelUnit,
  defender: DuelUnit,
  move: DuelMove,
): number {
  if (move.power === null) return 0;

  const attack =
    attacker.specialAttack *
    stageMultiplier(attacker.specialAttackStage);
  const defense = Math.max(
    1,
    defender.specialDefense *
      stageMultiplier(defender.specialDefenseStage),
  );

  // FireRed stores CalculateBaseDamage() at setup. Future Sight's later
  // impact skips typecalc, so this intentionally omits STAB/effectiveness.
  return Math.max(
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
}

function calculateDamage(
  state: DuelState,
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

  if (move.effect === "fixed-damage-20") {
    const typeEffectiveness = calculateTypeEffectiveness(
      move.type,
      defender.types,
    );
    return {
      damage: typeEffectiveness === 0 ? 0 : 20,
      sameTypeAttackBonus: false,
      typeEffectiveness,
    };
  }

  if (move.effect === "ohko") {
    const typeEffectiveness = calculateTypeEffectiveness(
      move.type,
      defender.types,
    );
    return {
      damage:
        typeEffectiveness === 0 ? 0 : defender.hp,
      sameTypeAttackBonus: false,
      typeEffectiveness,
    };
  }

  const isSpecial = move.category === "special";
  const attack = isSpecial
    ? attacker.specialAttack *
      stageMultiplier(attacker.specialAttackStage)
    : attacker.attack * stageMultiplier(attacker.attackStage);
  const defense = Math.max(
    1,
    isSpecial
      ? defender.specialDefense *
        stageMultiplier(defender.specialDefenseStage)
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

  if (state.weather === "rain") {
    if (move.type === "water") {
      damage = Math.max(
        1,
        Math.floor((damage * 15) / 10),
      );
    } else if (
      move.type === "fire" ||
      move.effect === "solar-beam"
    ) {
      damage = Math.max(
        1,
        Math.floor(damage / 2),
      );
    }
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

function chargedMoveMissPresentation(
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
): DuelPresentationEvent {
  return {
    kind: "move",
    actorId: actor.id,
    moveId: move.id,
    targetIds: [target.id],
    vfxId: move.vfxId,
    motion: move.motion,
    results: [
      {
        targetId: target.id,
        damage: 0,
        fainted: false,
        statChanges: [],
        missed: true,
      },
    ],
  };
}

function releaseChargedMove(
  state: DuelState,
  actor: DuelUnit,
): DuelActionResult {
  const charging = actor.chargingMove;
  if (!charging) {
    return {
      state,
      accepted: false,
      reason: "not-charging",
    };
  }

  const move = DUEL_MOVES[charging.moveId];
  const target = state.units.find(
    (unit) => unit.id === charging.targetId,
  );
  actor.chargingMove = null;

  if (
    !move ||
    move.effect !== "solar-beam" ||
    !target ||
    target.hp <= 0
  ) {
    actor.ap = 0;
    actor.mp = 0;
    appendLog(
      state,
      `${actor.displayName} perdeu o alvo do golpe carregado.`,
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      reason: "charged-target-unavailable",
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
    actor.ap = 0;
    actor.mp = 0;
    appendLog(
      state,
      `${actor.displayName} liberou ${move.name}, mas ${target.displayName} saiu do alcance.`,
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      presentation: chargedMoveMissPresentation(
        actor,
        target,
        move,
      ),
    };
  }

  if (paralysisBlocksMove(state, actor)) {
    actor.ap = 0;
    actor.mp = 0;
    appendLog(
      state,
      `${actor.displayName} está paralisado e não conseguiu liberar ${move.name}.`,
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      reason: "fully-paralyzed",
    };
  }

  actor.ap = 0;
  actor.mp = 0;

  if (!moveAccuracySucceeds(state, actor, target, move)) {
    appendLog(
      state,
      `${actor.displayName} liberou ${move.name}, mas errou.`,
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      presentation: chargedMoveMissPresentation(
        actor,
        target,
        move,
      ),
    };
  }

  const damageResult = calculateDamage(
    state,
    actor,
    target,
    move,
  );
  const damageDealt = Math.min(
    target.hp,
    damageResult.damage,
  );
  target.hp = Math.max(
    0,
    target.hp - damageResult.damage,
  );
  appendLog(
    state,
    `${actor.displayName} liberou ${move.name}: ${damageDealt} de dano.`,
  );

  if (damageResult.typeEffectiveness === 0) {
    appendLog(
      state,
      `Não afeta ${target.displayName}.`,
    );
  } else if (damageResult.typeEffectiveness > 1) {
    appendLog(state, "É super efetivo!");
  } else if (damageResult.typeEffectiveness < 1) {
    appendLog(state, "Não é muito efetivo.");
  }

  if (target.hp <= 0) {
    appendLog(
      state,
      `${target.displayName} desmaiou.`,
    );
  }

  resolveTurnEnd(state, actor);

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
          damage: damageDealt,
          fainted: target.hp <= 0,
          statChanges: [],
          sameTypeAttackBonus:
            damageResult.sameTypeAttackBonus,
          typeEffectiveness:
            damageResult.typeEffectiveness,
        },
      ],
    },
  };
}

export function getDuelCaptureEligibility(
  state: DuelState,
  targetId: string,
): CaptureEligibility {
  const target = state.units.find((unit) => unit.id === targetId);
  if (!target) return { allowed: false, reason: "target-not-wild" };

  if (
    state.battleKind === "wild" &&
    target.side === "rival" &&
    state.units.filter(
      (unit) =>
        unit.side === "rival" &&
        unit.hp > 0,
    ).length > 1
  ) {
    return {
      allowed: false,
      reason: "multiple-wilds",
    };
  }

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

export const AUTO_CATCH_HP_RATIO = 0.3;

export function isDuelAutoCatchTarget(
  state: DuelState,
  targetId: string,
): boolean {
  const target = state.units.find(
    (unit) => unit.id === targetId,
  );
  if (!target || target.hp <= 0) {
    return false;
  }

  return (
    target.hp / Math.max(1, target.maxHp) <=
      AUTO_CATCH_HP_RATIO &&
    getDuelCaptureEligibility(
      state,
      targetId,
    ).allowed
  );
}

function resolveAreaDamageAction(
  state: DuelState,
  actor: DuelUnit,
  primaryTarget: DuelUnit,
  move: DuelMove,
): DuelActionResult {
  const targetIds = getDuelMoveAreaTargetIds(
    state,
    actor.id,
    move.id,
    primaryTarget.id,
  );
  const results: Extract<
    DuelPresentationEvent,
    { kind: "move" }
  >["results"] = [];

  appendLog(
    state,
    targetIds.length > 1
      ? `${actor.displayName} usou ${move.name} e atingiu uma área.`
      : `${actor.displayName} usou ${move.name}.`,
  );

  for (const targetId of targetIds) {
    const target = state.units.find(
      (unit) => unit.id === targetId,
    );
    if (!target || target.hp <= 0) {
      continue;
    }

    if (
      !moveAccuracySucceeds(
        state,
        actor,
        target,
        move,
      )
    ) {
      appendLog(
        state,
        `${move.name} errou ${target.displayName}.`,
      );
      results.push({
        targetId: target.id,
        damage: 0,
        fainted: false,
        statChanges: [],
        missed: true,
      });
      continue;
    }

    const damageResult = calculateDamage(
      state,
      actor,
      target,
      move,
    );
    const damageDealt = Math.min(
      target.hp,
      damageResult.damage,
    );
    target.hp = Math.max(
      0,
      target.hp - damageResult.damage,
    );

    let statusApplied:
      | Exclude<DuelMajorStatus, null>
      | undefined;
    if (
      target.hp > 0 &&
      move.secondaryStatus &&
      canMoveApplyMajorStatus(
        target,
        move,
        damageResult.typeEffectiveness,
      ) &&
      secondaryStatusSucceeds(
        state,
        actor,
        target,
        move,
      )
    ) {
      target.status = move.secondaryStatus;
      target.sleepTurnsRemaining =
        move.secondaryStatus === "sleep"
          ? rollSleepTurns(
              state,
              actor,
              target,
              move,
            )
          : 0;
      statusApplied = move.secondaryStatus;
      appendLog(
        state,
        statusAppliedMessage(
          target,
          move.secondaryStatus,
        ),
      );
    }

    appendLog(
      state,
      `${target.displayName} recebeu ${damageDealt} de dano.`,
    );

    if (target.hp <= 0) {
      appendLog(
        state,
        `${target.displayName} desmaiou.`,
      );
    }

    results.push({
      targetId: target.id,
      damage: damageDealt,
      fainted: target.hp <= 0,
      statChanges: [],
      ...(statusApplied
        ? { statusApplied }
        : {}),
      sameTypeAttackBonus:
        damageResult.sameTypeAttackBonus,
      typeEffectiveness:
        damageResult.typeEffectiveness,
    });
  }

  if (
    !sideHasLivingUnit(
      state,
      primaryTarget.side,
    )
  ) {
    state.status = "finished";
    state.winner = actor.side;
  }

  return {
    state,
    accepted: true,
    presentation: {
      kind: "move",
      actorId: actor.id,
      moveId: move.id,
      targetIds: results.map(
        (result) => result.targetId,
      ),
      vfxId: move.vfxId,
      motion: move.motion,
      results,
    },
  };
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

  if (
    actor.chargingMove &&
    action.kind !== "release-charge"
  ) {
    return {
      state: input,
      accepted: false,
      reason: "must-release-charge",
    };
  }

  if (action.kind === "release-charge") {
    return releaseChargedMove(state, actor);
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
    const actorItems =
      actor.side === "player"
        ? state.items
        : state.rivalItems;
    if (!item || !target || target.hp <= 0) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if ((actorItems[item.id] ?? 0) <= 0) {
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
          target.status === "sleep"
            ? 2
            : target.status === "poison" ||
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
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      state.status = "finished";
      state.winner = resolution.success ? "player" : null;
      state.captureResult = {
        success: resolution.success,
        species,
        level: target.level,
        xpRatio: resolution.xpRatio,
        chance,
        status: target.status,
        sleepTurnsRemaining:
          target.sleepTurnsRemaining,
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
          itemId: item.id,
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
    if (item.kind === "cure") {
      if (!target.status || !(item.cures as readonly string[]).includes(target.status)) {
        return { state: input, accepted: false, reason: "target-no-status" };
      }
      target.status = null;
      target.sleepTurnsRemaining = 0;
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      appendLog(state, `${target.displayName} foi curado com ${item.name}.`);
      resolveTurnEnd(state, actor);
      return {
        state,
        accepted: true,
        presentation: {
          kind: "item",
          actorId: actor.id,
          itemId: item.id,
          targetIds: [target.id],
          healed: 0,
        },
      };
    }
    if (target.hp >= target.maxHp) {
      return { state: input, accepted: false, reason: "target-full-hp" };
    }
    const healed = Math.min(item.heal, target.maxHp - target.hp);
    target.hp += healed;
    actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
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
    const reachable = reachableCellsWithCosts(
      state,
      actor.id,
    );
    const target = reachable.cells.find(
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
    const cost =
      reachable.costs.get(pointKey(action.to));
    if (cost === undefined || cost <= 0) {
      return {
        state: input,
        accepted: false,
        reason: "cell-not-reachable",
      };
    }

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
      (moveId) => !canDuelUnitUseMove(actor, moveId),
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
    isDuelMoveDisabled(actor, move.id)
  ) {
    return {
      state: input,
      accepted: false,
      reason: "move-disabled",
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
  actor.lastMoveUsed = move.id;

  if (move.effect === "future-sight") {
    if (target.futureSight) {
      appendLog(
        state,
        `${move.name} falhou: já existe um ataque futuro mirando ${target.displayName}.`,
      );
      return {
        state,
        accepted: true,
        reason: "future-sight-already-pending",
      };
    }

    target.futureSight = {
      attackerId: actor.id,
      moveId: "future-sight",
      damage: calculateFutureSightBaseDamage(
        actor,
        target,
        move,
      ),
      roundsRemaining: 3,
    };
    appendLog(
      state,
      `${actor.displayName} previu um ataque futuro contra ${target.displayName}.`,
    );
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
            damage: 0,
            fainted: false,
            statChanges: [],
            sameTypeAttackBonus: false,
            typeEffectiveness: 1,
          },
        ],
      },
    };
  }

  if (move.effect === "solar-beam") {
    actor.chargingMove = {
      moveId: move.id,
      targetId: target.id,
    };
    actor.ap = 0;
    actor.mp = 0;
    appendLog(
      state,
      `${actor.displayName} absorveu luz para ${move.name}!`,
    );
    resolveTurnEnd(state, actor);
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
        charging: true,
        results: [
          {
            targetId: target.id,
            damage: 0,
            fainted: false,
            statChanges: [],
          },
        ],
      },
    };
  }

  if (
    move.areaPattern &&
    move.category !== "status"
  ) {
    return resolveAreaDamageAction(
      state,
      actor,
      target,
      move,
    );
  }

  if (!moveAccuracySucceeds(state, actor, target, move)) {
    appendLog(
      state,
      move.effect === "ohko" &&
        actor.level < target.level
        ? `${move.name} falhou: ${target.displayName} tem nível maior.`
        : `${actor.displayName} usou ${move.name}, mas errou.`,
    );
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
            damage: 0,
            fainted: false,
            statChanges: [],
            missed: true,
          },
        ],
      },
    };
  }

  let damage = 0;
  let damageDealt = 0;
  let hitCount: number | undefined;
  let statusApplied: Exclude<DuelMajorStatus, null> | undefined;
  const statChanges: Array<{
    stat: DuelStatId;
    delta: number;
  }> = [];

  let sameTypeAttackBonus = false;
  let typeEffectiveness = 1;

  if (move.category !== "status") {
    const damageResult = calculateDamage(
      state,
      actor,
      target,
      move,
    );
    damage = damageResult.damage;
    if (
      move.multiHit === "two-to-five" &&
      damage > 0
    ) {
      const rolledHits = rollMultiHitCount(
        state,
        actor,
        target,
        move,
      );
      const hitsBeforeFaint = Math.max(
        1,
        Math.ceil(target.hp / damage),
      );
      hitCount = Math.min(
        rolledHits,
        hitsBeforeFaint,
      );
      damage *= hitCount;
    }
    damageDealt = Math.min(target.hp, damage);
    sameTypeAttackBonus =
      damageResult.sameTypeAttackBonus;
    typeEffectiveness =
      damageResult.typeEffectiveness;
    target.hp = Math.max(0, target.hp - damage);

    appendLog(
      state,
      `${actor.displayName} usou ${move.name}: ${damageDealt} de dano.`,
    );
    if (hitCount !== undefined) {
      appendLog(
        state,
        `${move.name} acertou ${hitCount} vezes.`,
      );
    }

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
      move.secondaryStatus &&
      canMoveApplyMajorStatus(
        target,
        move,
        typeEffectiveness,
      ) &&
      secondaryStatusSucceeds(state, actor, target, move)
    ) {
      target.status = move.secondaryStatus;
      target.sleepTurnsRemaining =
        move.secondaryStatus === "sleep"
          ? rollSleepTurns(
              state,
              actor,
              target,
              move,
            )
          : 0;
      statusApplied = move.secondaryStatus;
      appendLog(
        state,
        statusAppliedMessage(target, move.secondaryStatus),
      );
    }

    if (
      target.hp > 0 &&
      typeEffectiveness > 0 &&
      move.secondaryStatChange?.stat ===
        "special-defense" &&
      secondaryEffectSucceeds(
        state,
        actor,
        target,
        move,
      )
    ) {
      const before = target.specialDefenseStage;
      target.specialDefenseStage = Math.max(
        -MAX_STAGE,
        target.specialDefenseStage +
          move.secondaryStatChange.delta,
      );
      statChanges.push({
        stat: "special-defense",
        delta: target.specialDefenseStage - before,
      });
      appendLog(
        state,
        `${move.name} reduziu a Special Defense de ${target.displayName}.`,
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

    let recoilFainted = false;
    if (
      move.recoilDamageFraction &&
      damageDealt > 0 &&
      actor.hp > 0
    ) {
      const recoil = Math.max(
        1,
        Math.floor(
          damageDealt * move.recoilDamageFraction,
        ),
      );
      actor.hp = Math.max(0, actor.hp - recoil);
      recoilFainted = actor.hp <= 0;
      appendLog(
        state,
        `${move.name} causou ${recoil} de recoil em ${actor.displayName}.`,
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

    if (recoilFainted) {
      appendLog(
        state,
        `${actor.displayName} desmaiou com o recoil de ${move.name}.`,
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
  } else if (move.secondaryStatus) {
    if (
      canMoveApplyMajorStatus(target, move) &&
      secondaryStatusSucceeds(
        state,
        actor,
        target,
        move,
      )
    ) {
      target.status = move.secondaryStatus;
      target.sleepTurnsRemaining =
        move.secondaryStatus === "sleep"
          ? rollSleepTurns(
              state,
              actor,
              target,
              move,
            )
          : 0;
      statusApplied = move.secondaryStatus;
      appendLog(
        state,
        statusAppliedMessage(
          target,
          move.secondaryStatus,
        ),
      );
    } else {
      appendLog(
        state,
        `${move.name} não teve efeito em ${target.displayName}.`,
      );
    }
  } else if (
    move.effect === "attack-down" ||
    move.effect === "attack-down-2"
  ) {
    const before = target.attackStage;
    const stageDrop =
      move.effect === "attack-down-2" ? 2 : 1;
    target.attackStage = Math.max(
      -MAX_STAGE,
      target.attackStage - stageDrop,
    );
    statChanges.push({
      stat: "attack",
      delta: target.attackStage - before,
    });
    appendLog(
      state,
      move.effect === "attack-down-2"
        ? `${move.name} reduziu muito o Attack de ${target.displayName}.`
        : `${move.name} reduziu o Attack de ${target.displayName}.`,
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
  } else if (move.effect === "defense-down-2") {
    const before = target.defenseStage;
    target.defenseStage = Math.max(
      -MAX_STAGE,
      target.defenseStage - 2,
    );
    statChanges.push({
      stat: "defense",
      delta: target.defenseStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu muito a Defense de ${target.displayName}.`,
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
  } else if (move.effect === "special-attack-up") {
    const before = actor.specialAttackStage;
    actor.specialAttackStage = Math.min(
      MAX_STAGE,
      actor.specialAttackStage + 1,
    );
    statChanges.push({
      stat: "special-attack",
      delta: actor.specialAttackStage - before,
    });
    appendLog(
      state,
      `${move.name} aumentou o Special Attack de ${actor.displayName}.`,
    );
  } else if (move.effect === "disable") {
    const lastMove = target.lastMoveUsed;
    const alreadyDisabled =
      target.disabledMove !== null &&
      target.disableTurnsRemaining > 0;

    if (
      alreadyDisabled ||
      !lastMove ||
      !target.moves.includes(lastMove) ||
      getDuelMovePp(target, lastMove) <= 0
    ) {
      appendLog(
        state,
        `${move.name} falhou contra ${target.displayName}.`,
      );
    } else {
      const turns = rollDisableTurns(
        state,
        actor,
        target,
        move,
      );
      target.disabledMove = lastMove;
      target.disableTurnsRemaining = turns;
      appendLog(
        state,
        `${DUEL_MOVES[lastMove].name} de ${target.displayName} foi desabilitado por ${turns} rounds.`,
      );
    }
  } else if (move.effect === "calm-mind") {
    const beforeSpecialAttack =
      actor.specialAttackStage;
    const beforeSpecialDefense =
      actor.specialDefenseStage;
    actor.specialAttackStage = Math.min(
      MAX_STAGE,
      actor.specialAttackStage + 1,
    );
    actor.specialDefenseStage = Math.min(
      MAX_STAGE,
      actor.specialDefenseStage + 1,
    );
    statChanges.push(
      {
        stat: "special-attack",
        delta:
          actor.specialAttackStage -
          beforeSpecialAttack,
      },
      {
        stat: "special-defense",
        delta:
          actor.specialDefenseStage -
          beforeSpecialDefense,
      },
    );
    appendLog(
      state,
      `${move.name} aumentou o Special Attack e a Special Defense de ${actor.displayName}.`,
    );
  } else if (move.effect === "accuracy-down") {
    const before = target.accuracyStage;
    target.accuracyStage = Math.max(
      -MAX_STAGE,
      target.accuracyStage - 1,
    );
    statChanges.push({
      stat: "accuracy",
      delta: target.accuracyStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu a Accuracy de ${target.displayName}.`,
    );
  } else if (move.effect === "evasion-up") {
    const before = actor.evasionStage;
    actor.evasionStage = Math.min(
      MAX_STAGE,
      actor.evasionStage + 1,
    );
    statChanges.push({
      stat: "evasion",
      delta: actor.evasionStage - before,
    });
    appendLog(
      state,
      `${move.name} aumentou a Evasion de ${actor.displayName}.`,
    );
  } else if (move.effect === "evasion-down") {
    const before = target.evasionStage;
    target.evasionStage = Math.max(
      -MAX_STAGE,
      target.evasionStage - 1,
    );
    statChanges.push({
      stat: "evasion",
      delta: target.evasionStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu a Evasion de ${target.displayName}.`,
    );
  } else if (
    move.effect === "speed-down" ||
    move.effect === "speed-down-2"
  ) {
    const before = target.speedStage;
    const stageDrop =
      move.effect === "speed-down-2" ? 2 : 1;
    target.speedStage = Math.max(
      -MAX_STAGE,
      target.speedStage - stageDrop,
    );
    statChanges.push({
      stat: "speed",
      delta: target.speedStage - before,
    });
    appendLog(
      state,
      move.effect === "speed-down-2"
        ? `${move.name} reduziu muito a Speed de ${target.displayName}.`
        : `${move.name} reduziu a Speed de ${target.displayName}.`,
    );
  } else if (move.effect === "speed-up-2") {
    const before = actor.speedStage;
    actor.speedStage = Math.min(
      MAX_STAGE,
      actor.speedStage + 2,
    );
    statChanges.push({
      stat: "speed",
      delta: actor.speedStage - before,
    });
    appendLog(
      state,
      `${move.name} aumentou muito a Speed de ${actor.displayName}.`,
    );
  } else if (move.effect === "rain-dance") {
    if (state.weather === "rain") {
      appendLog(
        state,
        `${move.name} falhou: já está chovendo.`,
      );
    } else {
      state.weather = "rain";
      state.weatherTurnsRemaining = 5;
      appendLog(
        state,
        `${actor.displayName} usou ${move.name}. Começou a chover!`,
      );
    }
  } else if (move.effect === "synthesis") {
    const divisor =
      state.weather === "rain" ? 4 : 2;
    const healed = Math.min(
      Math.max(
        1,
        Math.floor(actor.maxHp / divisor),
      ),
      actor.maxHp - actor.hp,
    );
    actor.hp += healed;
    appendLog(
      state,
      `${actor.displayName} recuperou ${healed} HP com ${move.name}.`,
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
          ...(hitCount !== undefined ? { hitCount } : {}),
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
  const steps = new Map<string, number>([
    [startKey, 0],
  ]);

  const buildPath = (key: string): DuelPoint[] => {
    const reversed: DuelPoint[] = [];
    let cursor: string | null = key;

    while (cursor && cursor !== startKey) {
      const point = points.get(cursor);
      if (!point) break;
      reversed.push(point);
      cursor = previous.get(cursor) ?? null;
    }

    return reversed.reverse();
  };

  const rangeGap = (point: DuelPoint): number => {
    const distance = manhattanDistance(
      point,
      target.position,
    );
    if (distance < move.minRange) {
      return move.minRange - distance;
    }
    if (distance > move.maxRange) {
      return distance - move.maxRange;
    }
    return 0;
  };

  // Iterate with a cursor instead of Array.shift(). In crowded 6v10
  // battles this BFS runs once per candidate move/target, so avoiding repeated
  // array compaction keeps pathfinding linear without changing visit order.
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    const currentKey = pointKey(current);
    const currentSteps = steps.get(currentKey) ?? 0;

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

      previous.set(key, currentKey);
      points.set(key, next);
      steps.set(key, currentSteps + 1);

      if (inMoveRange(next)) {
        return buildPath(key);
      }

      queue.push(next);
    }
  }

  // Living allies can temporarily split a crowded arena. If no complete route
  // exists this turn, keep a strategic plan by walking to the reachable cell
  // that gets strictly closer to the move's legal range. Once no progress is
  // possible the candidate is discarded, preventing pointless side-to-side
  // shuffling against a wall of allies.
  const actorGap = rangeGap(actor.position);
  let fallbackKey: string | null = null;
  let fallbackGap = actorGap;
  let fallbackSteps = Number.POSITIVE_INFINITY;
  let fallbackTargetDistance = Number.POSITIVE_INFINITY;

  for (const [key, point] of points) {
    if (key === startKey) continue;

    const gap = rangeGap(point);
    if (gap >= actorGap) continue;

    const pathSteps =
      steps.get(key) ?? Number.POSITIVE_INFINITY;
    const targetDistance = manhattanDistance(
      point,
      target.position,
    );

    if (
      gap < fallbackGap ||
      (
        gap === fallbackGap &&
        (
          pathSteps < fallbackSteps ||
          (
            pathSteps === fallbackSteps &&
            targetDistance < fallbackTargetDistance
          )
        )
      )
    ) {
      fallbackKey = key;
      fallbackGap = gap;
      fallbackSteps = pathSteps;
      fallbackTargetDistance = targetDistance;
    }
  }

  return fallbackKey
    ? buildPath(fallbackKey)
    : null;
}

function aiThreatScore(unit: DuelUnit): number {
  const physical =
    unit.attack * stageMultiplier(unit.attackStage);
  const special =
    unit.specialAttack *
    stageMultiplier(unit.specialAttackStage);
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

  if (move.secondaryStatus) {
    if (!canMoveApplyMajorStatus(target, move)) {
      return -Infinity;
    }

    return move.secondaryStatus === "sleep"
      ? 92
      : move.secondaryStatus === "burn"
        ? 72
        : move.secondaryStatus === "paralysis"
          ? 66
          : 58;
  }

  if (move.effect === "disable") {
    const lastMove = target.lastMoveUsed;
    if (
      (target.disabledMove !== null &&
        target.disableTurnsRemaining > 0) ||
      !lastMove ||
      !target.moves.includes(lastMove) ||
      getDuelMovePp(target, lastMove) <= 0
    ) {
      return -Infinity;
    }

    const last = DUEL_MOVES[lastMove];
    const offensiveValue =
      last.category === "status"
        ? 0
        : 24 + (last.power ?? 0) * 0.45;
    return 54 + offensiveValue;
  }

  if (
    move.effect === "attack-down" ||
    move.effect === "attack-down-2"
  ) {
    if (target.attackStage <= -4) return -Infinity;
    const physicalBias =
      target.attack *
        stageMultiplier(target.attackStage) >=
      target.specialAttack *
        stageMultiplier(target.specialAttackStage)
        ? 18
        : -8;
    const severity =
      move.effect === "attack-down-2" ? 20 : 0;
    return Math.max(
      0,
      66 +
        target.attackStage * 18 +
        physicalBias +
        severity,
    );
  }

  if (
    move.effect === "defense-down" ||
    move.effect === "defense-down-2"
  ) {
    if (target.defenseStage <= -4) return -Infinity;
    const severity =
      move.effect === "defense-down-2" ? 18 : 0;
    return Math.max(
      0,
      64 + target.defenseStage * 18 + severity,
    );
  }

  if (move.effect === "accuracy-down") {
    if (target.accuracyStage <= -4) {
      return -Infinity;
    }
    return Math.max(
      0,
      56 + target.accuracyStage * 14,
    );
  }

  if (move.effect === "evasion-up") {
    if (actor.evasionStage >= 4) {
      return -Infinity;
    }
    return Math.max(
      0,
      58 - Math.max(0, actor.evasionStage) * 12,
    );
  }

  if (move.effect === "evasion-down") {
    if (target.evasionStage <= -4) {
      return -Infinity;
    }
    return Math.max(
      0,
      48 + target.evasionStage * 12,
    );
  }

  if (
    move.effect === "speed-down" ||
    move.effect === "speed-down-2"
  ) {
    if (target.speedStage <= -4) return -Infinity;
    const speedLead =
      effectiveSpeed(target) > effectiveSpeed(actor)
        ? 20
        : 0;
    const severity =
      move.effect === "speed-down-2" ? 18 : 0;
    return Math.max(
      0,
      48 +
        target.speedStage * 15 +
        speedLead +
        severity,
    );
  }

  if (move.effect === "speed-up-2") {
    if (actor.speedStage >= 4) return -Infinity;
    return Math.max(
      0,
      58 -
        Math.max(0, actor.speedStage) * 14 +
        (actor.speedStage < 0 ? 20 : 0),
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

  if (move.effect === "special-attack-up") {
    if (actor.specialAttackStage >= 4) return -Infinity;
    const specialMoves = actor.moves.filter(
      (moveId) =>
        DUEL_MOVES[moveId]?.category === "special" &&
        getDuelMovePp(actor, moveId) > 0,
    ).length;
    if (specialMoves === 0) return -Infinity;
    return Math.max(
      0,
      58 -
        Math.max(0, actor.specialAttackStage) * 12 +
        specialMoves * 8,
    );
  }

  if (move.effect === "calm-mind") {
    if (
      actor.specialAttackStage >= 4 &&
      actor.specialDefenseStage >= 4
    ) {
      return -Infinity;
    }
    const specialMoves = actor.moves.filter(
      (moveId) =>
        DUEL_MOVES[moveId]?.category === "special" &&
        getDuelMovePp(actor, moveId) > 0,
    ).length;
    const offensiveValue =
      actor.specialAttackStage < 4
        ? 24 + specialMoves * 8
        : 0;
    const defensiveValue =
      actor.specialDefenseStage < 4 ? 30 : 0;
    return (
      38 +
      offensiveValue +
      defensiveValue -
      Math.max(0, actor.specialAttackStage) * 6 -
      Math.max(0, actor.specialDefenseStage) * 5
    );
  }

  if (move.effect === "rain-dance") {
    if (state.weather === "rain") return -Infinity;

    let allyWaterMoves = 0;
    let allyFireMoves = 0;
    let enemyWaterMoves = 0;
    let enemyFireMoves = 0;

    for (const unit of state.units) {
      if (unit.hp <= 0) continue;

      for (const moveId of unit.moves) {
        if (!canDuelUnitUseMove(unit, moveId)) {
          continue;
        }
        const candidate = DUEL_MOVES[moveId];
        if (
          !candidate ||
          candidate.category === "status"
        ) {
          continue;
        }

        const allied = unit.side === actor.side;
        if (candidate.type === "water") {
          if (allied) allyWaterMoves += 1;
          else enemyWaterMoves += 1;
        } else if (candidate.type === "fire") {
          if (allied) allyFireMoves += 1;
          else enemyFireMoves += 1;
        }
      }
    }

    return Math.max(
      0,
      46 +
        allyWaterMoves * 14 +
        enemyFireMoves * 8 -
        allyFireMoves * 12 -
        enemyWaterMoves * 10,
    );
  }

  if (move.effect === "synthesis") {
    const missingRatio =
      (actor.maxHp - actor.hp) /
      Math.max(1, actor.maxHp);
    if (missingRatio <= 0) return -Infinity;
    const weatherFactor =
      state.weather === "rain" ? 0.5 : 1;
    return (
      35 +
      missingRatio * 120 * weatherFactor
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
    !canMoveApplyMajorStatus(target, move)
  ) {
    return 0;
  }

  const statusValue =
    move.secondaryStatus === "sleep"
      ? 92
      : move.secondaryStatus === "burn"
        ? 72
        : move.secondaryStatus === "paralysis"
          ? 66
          : 58;

  return (
    statusValue *
    (move.secondaryEffectChance / 100)
  );
}

function aiSecondaryStatUtility(
  target: DuelUnit,
  move: DuelMove,
): number {
  if (
    move.secondaryStatChange?.stat !==
      "special-defense" ||
    !move.secondaryEffectChance ||
    target.specialDefenseStage <= -MAX_STAGE
  ) {
    return 0;
  }

  return 48 * (move.secondaryEffectChance / 100);
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
      if (!canDuelUnitUseMove(target, moveId)) {
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
        state,
        target,
        ally,
        move,
      );
      const hitChance =
        getDuelMoveHitChance(target, ally, move) /
        100;
      const expectedDamage =
        expectedMoveDamage(
          move,
          result.damage,
        ) * expectedMoveTempoFactor(move);
      bestRatio = Math.max(
        bestRatio,
        (expectedDamage * hitChance) /
          Math.max(1, ally.maxHp),
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
      if (!canDuelUnitUseMove(ally, moveId)) {
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
          state,
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
  const hitChance =
    getDuelMoveHitChance(actor, target, move) / 100;

  if (hitChance <= 0) {
    return { score: -Infinity, damage: 0 };
  }

  if (
    move.effect === "future-sight" &&
    target.futureSight
  ) {
    return { score: -Infinity, damage: 0 };
  }

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
        ? 90
        : 0;
    const distanceToTarget = manhattanDistance(
      actor.position,
      target.position,
    );
    const hasImmediateDamageOption =
      target.side !== actor.side &&
      actor.moves.some((moveId) => {
        if (!canDuelUnitUseMove(actor, moveId)) {
          return false;
        }
        const alternative = DUEL_MOVES[moveId];
        if (
          alternative.category === "status" ||
          actor.ap < alternative.apCost ||
          distanceToTarget < alternative.minRange ||
          distanceToTarget > alternative.maxRange
        ) {
          return false;
        }

        return calculateDamage(
          state,
          actor,
          target,
          alternative,
        ).damage > 0;
      });
    const tempoPenalty =
      hasImmediateDamageOption
        ? 58 +
          Math.max(
            0,
            livingEnemies - livingAllies,
          ) *
            12
        : 0;

    return {
      damage: 0,
      score:
        utility * hitChance +
        positioningScore +
        resourceScore +
        targetThreat -
        Math.max(0, -numbersPressure) -
        nearlyDefeatedPenalty -
        tempoPenalty,
    };
  }

  const result =
    move.effect === "future-sight"
      ? {
          damage: calculateFutureSightBaseDamage(
            actor,
            target,
            move,
          ),
          sameTypeAttackBonus: false,
          typeEffectiveness: 1,
        }
      : calculateDamage(
          state,
          actor,
          target,
          move,
        );
  if (result.damage <= 0) {
    return { score: -Infinity, damage: 0 };
  }

  const expectedDamage = expectedMoveDamage(
    move,
    result.damage,
  );
  const areaTargetCount =
    move.areaPattern
      ? getDuelMoveAreaTargetIds(
          state,
          actor.id,
          move.id,
          target.id,
        ).length
      : 1;
  const areaUtility =
    Math.max(0, areaTargetCount - 1) *
    (expectedDamage * 4 + 36);
  const hpRatio =
    target.hp / Math.max(1, target.maxHp);
  const damageRatio =
    Math.min(
      1.5,
      expectedDamage / Math.max(1, target.maxHp),
    );
  const knockoutScore =
    expectedDamage >= target.hp
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
    aiSecondaryStatusUtility(target, move) +
    aiSecondaryStatUtility(target, move);
  const recoilDamage =
    move.recoilDamageFraction && expectedDamage > 0
      ? Math.max(
          1,
          Math.floor(
            Math.min(expectedDamage, target.hp) *
              move.recoilDamageFraction,
          ),
        )
      : 0;
  const recoilPenalty =
    recoilDamage > 0
      ? recoilDamage * 4 +
        (recoilDamage >= actor.hp ? 160 : 0)
      : 0;
  const riderUtility =
    move.effect === "speed-down" &&
    target.speedStage > -MAX_STAGE
      ? Math.max(
          0,
          22 + target.speedStage * 5,
        )
      : 0;

  const onHitScore =
    expectedDamage * 7 +
    damageRatio * 125 +
    (move.power ?? 0) * 0.35 +
    knockoutScore +
    stabScore +
    matchupScore +
    lowHpFocus +
    coverageBonus +
    secondaryUtility +
    riderUtility +
    areaUtility -
    recoilPenalty;

  const tempoFactor = expectedMoveTempoFactor(move);

  return {
    damage:
      expectedDamage *
      hitChance *
      tempoFactor *
      areaTargetCount,
    score:
      onHitScore * hitChance * tempoFactor +
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
    ignoreAp?: boolean;
  },
): AiCandidate | null {
  const enemies = state.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.side !== actor.side,
  );
  const candidates: AiCandidate[] = [];

  const usableMoveIds = actor.moves.filter(
    (moveId) => canDuelUnitUseMove(actor, moveId),
  );
  const candidateMoveIds: DuelMoveId[] =
    usableMoveIds.length > 0
      ? usableMoveIds
      : actor.moves.length > 0
        ? ["struggle"]
        : [];

  for (const moveId of candidateMoveIds) {
    const move = DUEL_MOVES[moveId];
    if (
      !move ||
      (!options.ignoreAp && actor.ap < move.apCost)
    ) {
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

function aiBestIncomingDamage(
  state: DuelState,
  actor: DuelUnit,
  ally: DuelUnit,
): number {
  let best = 0;

  for (const enemy of state.units) {
    if (
      enemy.hp <= 0 ||
      enemy.side === actor.side
    ) {
      continue;
    }

    for (const moveId of enemy.moves) {
      if (!canDuelUnitUseMove(enemy, moveId)) {
        continue;
      }
      const move = DUEL_MOVES[moveId];
      if (!move || move.category === "status") {
        continue;
      }

      const damage =
        expectedMoveDamage(
          move,
          calculateDamage(
            state,
            enemy,
            ally,
            move,
          ).damage,
        ) * expectedMoveTempoFactor(move);
      const hitChance =
        getDuelMoveHitChance(enemy, ally, move) /
        100;
      best = Math.max(
        best,
        damage * hitChance,
      );
    }
  }

  return best;
}

function chooseAiItemAction(
  state: DuelState,
  actor: DuelUnit,
  options: DuelAiTurnOptions,
): DuelAction | null {
  const actorItems =
    actor.side === "player"
      ? state.items
      : state.rivalItems;

  if (
    actor.side === "player" &&
    options.autoCapture &&
    state.battleKind === "wild" &&
    state.captureAllowed &&
    (actorItems["poke-ball"] ?? 0) > 0
  ) {
    const target = state.units
      .filter(
        (unit) =>
          unit.side !== actor.side &&
          unit.hp > 0 &&
          isDuelAutoCatchTarget(
            state,
            unit.id,
          ),
      )
      .sort(
        (a, b) =>
          a.hp / Math.max(1, a.maxHp) -
          b.hp / Math.max(1, b.maxHp),
      )[0];

    if (target) {
      if (target.status === null) {
        const statusPriority: Partial<
          Record<Exclude<DuelMajorStatus, null>, number>
        > = {
          sleep: 4,
          paralysis: 3,
          poison: 2,
          burn: 1,
        };
        const distance = manhattanDistance(
          actor.position,
          target.position,
        );
        const statusMove = actor.moves
          .map((moveId) => DUEL_MOVES[moveId])
          .filter(
            (move) =>
              move.category === "status" &&
              move.targeting === "single-enemy" &&
              Boolean(move.secondaryStatus) &&
              canDuelUnitUseMove(actor, move.id) &&
              actor.ap >= move.apCost &&
              distance >= move.minRange &&
              distance <= move.maxRange &&
              canMoveApplyMajorStatus(
                target,
                move,
              ),
          )
          .sort(
            (a, b) =>
              (statusPriority[
                b.secondaryStatus!
              ] ?? 0) -
                (statusPriority[
                  a.secondaryStatus!
                ] ?? 0) ||
              (b.accuracy ?? 100) -
                (a.accuracy ?? 100),
          )[0];

        if (statusMove) {
          return {
            kind: "use-move",
            unitId: actor.id,
            moveId: statusMove.id,
            targetId: target.id,
          };
        }
      }

      return {
        kind: "use-item",
        unitId: actor.id,
        itemId: "poke-ball",
        targetId: target.id,
      };
    }
  }

  if (
    !options.useItems ||
    (actorItems.potion ?? 0) <= 0
  ) {
    return null;
  }

  const target = state.units
    .filter(
      (unit) =>
        unit.side === actor.side &&
        unit.hp > 0 &&
        unit.hp < unit.maxHp,
    )
    .map((unit) => {
      const hpRatio =
        unit.hp / Math.max(1, unit.maxHp);
      const incoming = aiBestIncomingDamage(
        state,
        actor,
        unit,
      );
      const threatened = incoming >= unit.hp;
      const missing = unit.maxHp - unit.hp;
      const usefulHeal = Math.min(
        DUEL_ITEMS.potion.heal,
        missing,
      );

      return {
        unit,
        hpRatio,
        threatened,
        score:
          (1 - hpRatio) * 150 +
          (threatened ? 100 : 0) +
          usefulHeal * 2,
      };
    })
    .filter(
      ({ hpRatio, threatened }) =>
        hpRatio <= 0.4 || threatened,
    )
    .sort((a, b) => b.score - a.score)[0]?.unit;

  return target
    ? {
        kind: "use-item",
        unitId: actor.id,
        itemId: "potion",
        targetId: target.id,
      }
    : null;
}

export function resolveSimpleAiTurnDetailed(
  input: DuelState,
  side: DuelSide = "rival",
  options: DuelAiTurnOptions = {},
): DuelAiTurnResult {
  let state = input;
  const steps: DuelActionResult[] = [];
  let actor = getActiveDuelUnit(state);
  let statusUsed = false;
  let damageUsed = false;
  let movementActions = 0;

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

  if (actor.chargingMove) {
    run({
      kind: "release-charge",
      unitId: actor.id,
    });
    return { state, steps };
  }

  // Re-evaluate after every accepted action. This lets the same turn choose
  // attack -> move, move -> attack, attack -> attack, or an emergency item.
  for (
    let decisionIndex = 0;
    decisionIndex < 8;
    decisionIndex += 1
  ) {
    actor = getActiveDuelUnit(state);
    if (
      state.status !== "active" ||
      !actor ||
      actor.side !== side
    ) {
      return { state, steps };
    }

    if (options.autoCapture) {
      const captureAction = chooseAiItemAction(
        state,
        actor,
        {
          autoCapture: true,
          useItems: false,
        },
      );
      if (captureAction) {
        const captureResult = run(captureAction);
        if (captureResult.accepted) {
          return { state, steps };
        }
      }
    }

    const inRange = chooseAiCandidate(
      state,
      actor,
      {
        requireInRange: true,
        statusAlreadyUsed: statusUsed,
        damageAlreadyUsed: damageUsed,
      },
    );
    const strategic = chooseAiCandidate(
      state,
      actor,
      {
        requireInRange: false,
        statusAlreadyUsed: statusUsed,
        damageAlreadyUsed: damageUsed,
      },
    );

    const canMoveForStrategic =
      actor.mp > 0 &&
      strategic !== null &&
      strategic.path.length > 0;
    const immediateKnockout =
      inRange !== null &&
      inRange.move.category !== "status" &&
      inRange.damage >= inRange.target.hp;

    if (
      options.useItems &&
      !immediateKnockout
    ) {
      const itemAction = chooseAiItemAction(
        state,
        actor,
        {
          useItems: true,
          autoCapture: false,
        },
      );
      if (itemAction) {
        const itemResult = run(itemAction);
        if (itemResult.accepted) {
          return { state, steps };
        }
      }
    }

    const shouldMoveBeforeAction =
      canMoveForStrategic &&
      !immediateKnockout &&
      (
        !inRange ||
        strategic.score >
          inRange.score + 28 ||
        (
          inRange.move.category === "status" &&
          strategic.move.category !== "status" &&
          strategic.score > inRange.score
        )
      );

    if (
      shouldMoveBeforeAction &&
      strategic
    ) {
      const destination = aiMovementDestination(
        state,
        actor,
        strategic.path,
      );

      if (destination) {
        const movement = run({
          kind: "move",
          unitId: actor.id,
          to: destination,
        });
        if (movement.accepted) {
          movementActions += 1;
          continue;
        }
      }
    }

    if (inRange && inRange.score > 0) {
      const result = run({
        kind: "use-move",
        unitId: actor.id,
        moveId: inRange.move.id,
        targetId: inRange.target.id,
      });

      if (!result.accepted) {
        break;
      }

      if (inRange.move.category === "status") {
        statusUsed = true;
      } else {
        damageUsed = true;
      }

      continue;
    }

    // AP may already have been spent on an attack. MP is independent, so use
    // remaining movement to set up the next attack instead of wasting it.
    if (
      actor.mp > 0 &&
      movementActions < 2
    ) {
      const futurePlan = chooseAiCandidate(
        state,
        actor,
        {
          requireInRange: false,
          statusAlreadyUsed: statusUsed,
          damageAlreadyUsed: damageUsed,
          ignoreAp: true,
        },
      );

      if (
        futurePlan &&
        futurePlan.path.length > 0
      ) {
        const destination = aiMovementDestination(
          state,
          actor,
          futurePlan.path,
        );
        if (destination) {
          const movement = run({
            kind: "move",
            unitId: actor.id,
            to: destination,
          });
          if (movement.accepted) {
            movementActions += 1;
            continue;
          }
        }
      }
    }

    break;
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
