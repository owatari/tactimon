import {
  GENERATED_CATCH_RATE,
  GENERATED_MOVES,
  GENERATED_SPECIES,
  type GeneratedMoveId,
  type GeneratedSpeciesId,
} from "./generated/kanto";
import { ROM_CATCH_RATE } from "./generated/evYield";
import { appearanceTier, catchRateTier, rarityBonus } from "./rarity";
import {
  apCostForMove,
  itemApCost,
  maxActionPointsForSpeed,
} from "./actionCost";
import {
  DEFAULT_IV,
  SHINY_ODDS,
  naturePercent,
  rollPersonality,
  rollShiny,
  type IvSpread,
  type NatureId,
} from "./personality";
import {
  calculateHpStat,
  calculateOtherStat,
} from "./stats";
import {
  fireRedCaptureChance,
  getCaptureEligibility,
  resolveCaptureRoll,
  type CaptureEligibility,
} from "./capture";

export type StarterSpeciesId =
  | "bulbasaur"
  | "charmander"
  | "squirtle";

export type HandWildSpeciesId =
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
export type WildSpeciesId =
  | HandWildSpeciesId
  | GeneratedSpeciesId;
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
  | "great-ball"
  | "ultra-ball"
  | "master-ball"
  | "premier-ball"
  | "max-potion"
  | "full-restore"
  | "full-heal"
  | "revive"
  | "max-revive";
const DUEL_EXTRA_ITEM_IDS = [
  "super-potion",
  "hyper-potion",
  "antidote",
  "parlyz-heal",
  "awakening",
  "burn-heal",
  "great-ball",
  "ultra-ball",
  "master-ball",
  "premier-ball",
  "max-potion",
  "full-restore",
  "full-heal",
  "revive",
  "max-revive",
] as const;
export type DuelExtraItemId = (typeof DUEL_EXTRA_ITEM_IDS)[number];
/** Potion and Poké Ball are always tracked; other items are optional. */
export type DuelInventory = Record<"potion" | "poke-ball", number> &
  Partial<Record<DuelExtraItemId, number>>;
export type HandDuelMoveId =
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
export type DuelMoveId = HandDuelMoveId | GeneratedMoveId;

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
  /** Individual values (0-31). Omitted → every IV is 15 (old saves, trainer parties). */
  ivs?: IvSpread;
  /** Omitted → neutral nature. */
  nature?: NatureId;
  /** Player-given name shown instead of the species name. */
  nickname?: string;
  shiny?: boolean;
  /** Share (0-1) of the area's encounters this species makes up; drives Auto Catch priority. */
  appearanceRate?: number;
  /** Persistent HP carried between battles. Omit to start at full HP. */
  currentHp?: number;
  /** Persistent major status carried between battles. */
  status?: DuelMajorStatus;
  /** Remaining FireRed Sleep counter (1-5); ignored unless status is Sleep. */
  sleepTurnsRemaining?: number;
  /** Future multiplayer ownership hint for allied battle UI. */
  ownerKind?: "local" | "party-member";
}

/**
 * Free steps every Pokémon takes toward its nearest foe before round 1. Measured on mirror fights
 * (same team both sides): without it the side that acts first wins ~41% of the time because it has to
 * walk into the other side; with 1 step the gap is -4 points (2 steps overshoot to +5 and make Auto
 * Catch kill ~10% of what it could catch instead of ~4%). See task 040 decisions (archive).
 */
export const OPENING_TILES = 1;

export interface TrainerDuelOptions {
  /** Opening walk in tiles (default OPENING_TILES; 0 keeps the old spawn distance). */
  openingTiles?: number;
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
  openingTiles?: number;
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
  /** Opening walk in tiles (default OPENING_TILES; 0 keeps the old spawn distance). */
  openingTiles?: number;
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
    ivs?: IvSpread;
    nature?: NatureId;
    shiny?: boolean;
    appearanceRate?: number;
  }[];
  /** 1-in-N shiny chance per wild (default 8192); mainly for tests. */
  shinyOdds?: number;
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
  | { id: DuelItemId; name: string; kind: "capture"; target: "wild-enemy"; ballModifier: number }
  /** Full HP and every status condition. */
  | { id: DuelItemId; name: string; kind: "full-restore"; target: "ally" }
  /** Brings a fainted ally back with `restore` of its max HP (it acts again on its next turn). */
  | { id: DuelItemId; name: string; kind: "revive"; target: "fainted-ally"; restore: number };

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
  multiHit?: "two-to-five" | "two";
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
    /** Dragon Rage. */
    | "fixed-damage-40"
    /** Seismic Toss / Night Shade: damage equals the user's level. */
    | "level-damage"
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
  ivs?: IvSpread;
  nature?: NatureId;
  nickname?: string;
  shiny?: boolean;
  appearanceRate?: number;
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
  /** Caught by a Poké Ball: removed from the field but not defeated (no knock-out rewards). */
  captured?: boolean;
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
  /** Every Pokémon caught so far (the battle goes on until no wild Pokémon is left). */
  captures: DuelCaptureRecord[];
  units: DuelUnit[];
  log: string[];
  logData: DuelLogEntry[];
}

export interface DuelCaptureRecord {
  species: WildSpeciesId;
  level: number;
  chance: number;
  status: DuelMajorStatus;
  sleepTurnsRemaining: number;
  ivs?: IvSpread;
  nature?: NatureId;
  shiny?: boolean;
  nickname?: string;
}

export type DuelLogEntry = {
  template: string;
  params: Record<string, string | number>;
};

type LogLine = readonly [
  template: string,
  params: Record<string, string | number>,
];

function L(
  template: string,
  params: Record<string, string | number> = {},
): LogLine {
  return [template, params];
}

function buildLog(lines: (LogLine | null)[]): {
  log: string[];
  logData: DuelLogEntry[];
} {
  const logData = lines
    .filter((line): line is LogLine => line !== null)
    .map(([template, params]) => ({ template, params }));
  return {
    log: logData.map((entry) =>
      interpolateLog(entry.template, entry.params),
    ),
    logData,
  };
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
  /**
   * Plan the whole team's turn at once (who hits whom, with which move), instead of each Pokémon
   * choosing alone. On by default; `false` keeps the old one-at-a-time choice (used to measure it).
   */
  teamPlanning?: boolean;
}

const LEVEL = 5;
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

const HAND_SPECIES_TABLE: Record<
  Exclude<DuelSpeciesId, GeneratedSpeciesId>,
  SpeciesData
> = {
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

const SPECIES: Record<DuelSpeciesId, SpeciesData> = {
  ...HAND_SPECIES_TABLE,
  ...(GENERATED_SPECIES as unknown as Record<
    GeneratedSpeciesId,
    SpeciesData
  >),
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
  /** Bonus ball of the Poké Mart: catches like a Poké Ball. */
  "premier-ball": {
    id: "premier-ball",
    name: "Premier Ball",
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
  "ultra-ball": {
    id: "ultra-ball",
    name: "Ultra Ball",
    kind: "capture",
    target: "wild-enemy",
    ballModifier: 2,
  },
  /** A modifier of 255 or more never fails (see experimentalCaptureChance). */
  "master-ball": {
    id: "master-ball",
    name: "Master Ball",
    kind: "capture",
    target: "wild-enemy",
    ballModifier: 255,
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
  "max-potion": {
    id: "max-potion",
    name: "Max Potion",
    kind: "heal",
    target: "ally",
    heal: 9999,
  },
  "full-restore": {
    id: "full-restore",
    name: "Full Restore",
    kind: "full-restore",
    target: "ally",
  },
  "full-heal": {
    id: "full-heal",
    name: "Full Heal",
    kind: "cure",
    target: "ally",
    cures: ["poison", "paralysis", "burn", "sleep"],
  },
  revive: {
    id: "revive",
    name: "Revive",
    kind: "revive",
    target: "fainted-ally",
    restore: 0.5,
  },
  "max-revive": {
    id: "max-revive",
    name: "Max Revive",
    kind: "revive",
    target: "fainted-ally",
    restore: 1,
  },
} satisfies Record<DuelItemId, DuelItem>;

const HAND_WILD_CATCH_RATE: Record<HandWildSpeciesId, number> = {
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

const WILD_CATCH_RATE: Record<WildSpeciesId, number> = {
  // The ROM table covers all 151 species (the older tables missed 37, which made them uncatchable).
  ...(ROM_CATCH_RATE as Record<WildSpeciesId, number>),
  ...HAND_WILD_CATCH_RATE,
  ...GENERATED_CATCH_RATE,
};

/** Catch rate of a species (3-255); unknown ids fall back to a middling 45. */
export function catchRateFor(species: string): number {
  const rate = (WILD_CATCH_RATE as Record<string, number>)[species];
  return typeof rate === "number" && Number.isFinite(rate) ? rate : 45;
}

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

const HAND_DUEL_MOVES: Record<HandDuelMoveId, DuelMove> = {
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

const RAW_DUEL_MOVES: Record<DuelMoveId, DuelMove> = {
  ...HAND_DUEL_MOVES,
  ...(GENERATED_MOVES as unknown as Record<
    GeneratedMoveId,
    DuelMove
  >),
};

/** Every move's AP cost comes from one formula (power, hits, footprint, effects): see actionCost.ts. */
export const DUEL_MOVES: Record<DuelMoveId, DuelMove> =
  Object.fromEntries(
    Object.entries(RAW_DUEL_MOVES).map(([id, move]) => [
      id,
      { ...move, apCost: apCostForMove(move) },
    ]),
  ) as Record<DuelMoveId, DuelMove>;

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

export function calculateDuelPokemonMaxHp(
  build: Pick<
    DuelPokemonBuild,
    "species" | "level" | "evs" | "ivs"
  >,
): number {
  const base = SPECIES[build.species];
  const level = Math.max(
    1,
    Math.min(100, Math.trunc(build.level)),
  );

  return calculateHpStat({
    base: base.hp,
    iv: build.ivs?.hp ?? DEFAULT_IV,
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
    "species" | "level" | "evs" | "ivs" | "nature"
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
      iv: build.ivs?.[stat] ?? DEFAULT_IV,
      ev: build.evs?.[stat] ?? 0,
      level,
      nature: naturePercent(build.nature, stat) / 100,
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

export type DuelBaseStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

/** Base stats of a species (what the Pokédex bars show). */
export function duelSpeciesBaseStats(species: DuelSpeciesId): DuelBaseStats {
  const base = SPECIES[species];
  return {
    hp: base.hp,
    attack: base.attack,
    defense: base.defense,
    specialAttack: base.specialAttack,
    specialDefense: base.specialDefense,
    speed: base.speed,
  };
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

  const speedStat = calculateOtherStat({
    base: base.speed,
    iv: build.ivs?.speed ?? DEFAULT_IV,
    ev: evs.speed,
    level,
    nature: naturePercent(build.nature, "speed") / 100,
  });
  // 6 AP, +1 per 25 Speed: walking (1 AP per tile), moves and Poké Balls all spend from this pool.
  const cheapestMoveAp = build.moves.reduce((lowest, moveId) => {
    const cost = DUEL_MOVES[moveId]?.apCost;
    return cost === undefined ? lowest : Math.min(lowest, cost);
  }, Number.POSITIVE_INFINITY);
  // A slow Pokémon can always afford at least its cheapest move.
  const actionPoints = Math.max(
    maxActionPointsForSpeed(speedStat),
    Number.isFinite(cheapestMoveAp) ? cheapestMoveAp : 0,
  );
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
    ...(build.ivs ? { ivs: { ...build.ivs } } : {}),
    ...(build.nature ? { nature: build.nature } : {}),
    ...(build.nickname ? { nickname: build.nickname } : {}),
    ...(build.shiny ? { shiny: true } : {}),
    ...(typeof build.appearanceRate === "number" ? { appearanceRate: build.appearanceRate } : {}),
    attack: calculateOtherStat({
      base: base.attack,
      iv: build.ivs?.attack ?? DEFAULT_IV,
      ev: evs.attack,
      level,
      nature: naturePercent(build.nature, "attack") / 100,
    }),
    defense: calculateOtherStat({
      base: base.defense,
      iv: build.ivs?.defense ?? DEFAULT_IV,
      ev: evs.defense,
      level,
      nature: naturePercent(build.nature, "defense") / 100,
    }),
    specialAttack: calculateOtherStat({
      base: base.specialAttack,
      iv: build.ivs?.specialAttack ?? DEFAULT_IV,
      ev: evs.specialAttack,
      level,
      nature: naturePercent(build.nature, "specialAttack") / 100,
    }),
    specialDefense: calculateOtherStat({
      base: base.specialDefense,
      iv: build.ivs?.specialDefense ?? DEFAULT_IV,
      ev: evs.specialDefense,
      level,
      nature: naturePercent(build.nature, "specialDefense") / 100,
    }),
    speed: speedStat,
    attackStage: 0,
    defenseStage: 0,
    specialAttackStage: 0,
    specialDefenseStage: 0,
    accuracyStage: 0,
    evasionStage: 0,
    speedStage: 0,
    ap: actionPoints,
    maxAp: actionPoints,
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
    captures: [],
    units,
    ...buildLog([
      L("{trainer} challenges you!", { trainer: trainerName }),
      players.length > 1
        ? L("{n} Pokémon from your team enter the arena.", { n: players.length })
        : L("{actor} enters the arena.", { actor: players[0].displayName }),
      rivals.length > 1
        ? L("{trainer} sends out {n} Pokémon.", { trainer: trainerName, n: rivals.length })
        : L("{actor} enters from the rival side.", { actor: rivals[0].displayName }),
    ]),
  };
  activateNextTurnUnit(state, 0);
  return applyOpeningMovement(state, options.openingTiles ?? OPENING_TILES);
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
    ...(options.openingTiles !== undefined
      ? { openingTiles: options.openingTiles }
      : {}),
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
    .map((wild, index) => {
      // Every wild rolls its own nature and IVs, seeded so a replayed encounter is identical.
      const random = createSeededRandom(
        Math.imul(seed + 1, 0x9e3779b1) ^
          Math.imul(index + 1, 0x85ebca6b),
      );
      // xorshift outputs of nearby seeds correlate: skip the first draws.
      for (let warmUp = 0; warmUp < 6; warmUp += 1) random();
      const rolled = rollPersonality(random);
      const shiny = wild.shiny ?? rollShiny(random, options.shinyOdds ?? SHINY_ODDS);

      return {
        species: wild.species,
        level: Math.max(
          1,
          Math.min(100, Math.trunc(wild.level)),
        ),
        moves: [...SPECIES[wild.species].moves],
        ivs: wild.ivs ?? rolled.ivs,
        nature: wild.nature ?? rolled.nature,
        ...(shiny ? { shiny: true } : {}),
        ...(typeof wild.appearanceRate === "number" ? { appearanceRate: wild.appearanceRate } : {}),
      };
    });

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
    captures: [],
    units,
    ...buildLog([
      wilds.length === 1
        ? L("A wild {target} appeared!", { target: wilds[0].displayName })
        : L("{n} wild Pokémon surrounded your team!", { n: wilds.length }),
      players.length > 1
        ? L("{n} Pokémon from your team enter the arena.", { n: players.length })
        : L("{actor} enters the arena.", { actor: players[0].displayName }),

    ]),
  };
  activateNextTurnUnit(state, 0);
  return applyOpeningMovement(state, options.openingTiles ?? OPENING_TILES);
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
    captures: state.captures.map((record) => ({ ...record })),
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
    logData: state.logData.map((entry) => ({
      template: entry.template,
      params: { ...entry.params },
    })),
  };
}

function interpolateLog(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

function appendLog(
  state: DuelState,
  template: string | LogLine,
  params: Record<string, string | number> = {},
): void {
  const [tpl, prm] =
    typeof template === "string" ? [template, params] : template;
  state.log = [...state.log, interpolateLog(tpl, prm)].slice(-12);
  state.logData = [
    ...state.logData,
    { template: tpl, params: { ...prm } },
  ].slice(-12);
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
  if (!unit || unit.hp <= 0 || unit.ap <= 0) {
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
        cost > unit.ap ||
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

/** Nearest free cell (up to 4 tiles away) where a revived Pokémon can stand; its own last cell first. */
function findReviveTile(state: DuelState, target: DuelUnit): DuelPoint | null {
  const blocked = new Set(state.blocked.map(pointKey));
  const occupied = new Set(
    state.units
      .filter((unit) => unit.hp > 0 && unit.id !== target.id)
      .map((unit) => pointKey(unit.position)),
  );
  let best: { point: DuelPoint; distance: number } | null = null;
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const key = pointKey({ x, y });
      if (blocked.has(key) || occupied.has(key)) continue;
      const distance = manhattanDistance(target.position, { x, y });
      if (distance > 4) continue;
      if (!best || distance < best.distance) best = { point: { x, y }, distance };
    }
  }
  return best?.point ?? null;
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
  if (move.multiHit === "two") {
    return 2;
  }

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
  if (move.multiHit === "two") return 2;
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
): LogLine {
  switch (status) {
    case "poison":
      return L("{target} was poisoned.", { target: target.displayName });
    case "paralysis":
      return L("{target} was paralyzed.", { target: target.displayName });
    case "burn":
      return L("{target} was burned.", { target: target.displayName });
    case "sleep":
      return L("{target} fell asleep.", { target: target.displayName });
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
    "{status} dealt {damage} damage to {target}.", { status: statusName, damage, target: current.displayName },
  );

  if (current.hp <= 0) {
    appendLog(
      state,
      "{target} fainted from {status}.", { target: current.displayName, status: statusName },
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
      "{actor} can use {move} again.", { actor: unit.displayName, move: DUEL_MOVES[disabledMove].name },
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
        "{move} didn't hit {target}.", { move: move.name, target: target.displayName },
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
      "{target} was hit by {move}: {damage} damage.", { target: target.displayName, move: move.name, damage },
    );

    if (target.hp <= 0) {
      appendLog(
        state,
        "{target} fainted.", { target: target.displayName },
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
    appendLog(state, "The rain stopped.");
    return;
  }

  appendLog(
    state,
    "It keeps raining. {n} rounds left.", { n: state.weatherTurnsRemaining },
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
            "{actor} woke up!", { actor: next.displayName },
          );
        } else {
          next.sleepTurnsRemaining = remaining - 1;
          next.ap = 0;
          appendLog(
            state,
            "{actor} is fast asleep.", { actor: next.displayName },
          );
          continue;
        }
      }

      state.activeUnitId = next.id;
      state.turnIndex = nextIndex;
      appendLog(
        state,
        "{actor}'s turn. AP {ap}.", { actor: next.displayName, ap: next.ap },
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

  if (
    move.effect === "fixed-damage-20" ||
    move.effect === "fixed-damage-40" ||
    move.effect === "level-damage"
  ) {
    const typeEffectiveness = calculateTypeEffectiveness(
      move.type,
      defender.types,
    );
    const fixedDamage =
      move.effect === "fixed-damage-40"
        ? 40
        : move.effect === "level-damage"
          ? attacker.level
          : 20;
    return {
      damage: typeEffectiveness === 0 ? 0 : fixedDamage,
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
    appendLog(
      state,
      "{actor} lost the target of the charged attack.", { actor: actor.displayName },
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
    appendLog(
      state,
      "{actor} released {move}, but {target} moved out of range.", { actor: actor.displayName, move: move.name, target: target.displayName },
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
    appendLog(
      state,
      "{actor} is paralyzed and couldn't release {move}.", { actor: actor.displayName, move: move.name },
    );
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      reason: "fully-paralyzed",
    };
  }

  actor.ap = 0;

  if (!moveAccuracySucceeds(state, actor, target, move)) {
    appendLog(
      state,
      "{actor} released {move}, but missed.", { actor: actor.displayName, move: move.name },
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
    "{actor} released {move}: {damage} damage.", { actor: actor.displayName, move: move.name, damage: damageDealt },
  );

  if (damageResult.typeEffectiveness === 0) {
    appendLog(
      state,
      "It doesn't affect {target}.", { target: target.displayName },
    );
  } else if (damageResult.typeEffectiveness > 1) {
    appendLog(state, "It's super effective!");
  } else if (damageResult.typeEffectiveness < 1) {
    appendLog(state, "It's not very effective.");
  }

  if (target.hp <= 0) {
    appendLog(
      state,
      "{target} fainted.", { target: target.displayName },
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
      captureHpThresholdRatio: 1,
    },
  );
}

/**
 * Odds (0-1) that `ballId` catches `targetId` right now (current HP and status), the very number a
 * throw rolls against; null when the target cannot be caught at all.
 */
export function captureChanceFor(
  state: DuelState,
  targetId: string,
  ballId: DuelItemId,
): number | null {
  const item = DUEL_ITEMS[ballId];
  const target = state.units.find((unit) => unit.id === targetId);
  if (!item || item.kind !== "capture" || !target) return null;
  if (!getDuelCaptureEligibility(state, targetId).allowed) return null;
  return fireRedCaptureChance({
    catchRate: catchRateFor(target.species),
    ballModifier: item.ballModifier,
    statusModifier:
      target.status === "sleep"
        ? 2
        : target.status === "poison" ||
            target.status === "paralysis" ||
            target.status === "burn"
          ? 1.5
          : 1,
    hp: target.hp,
    maxHp: target.maxHp,
  });
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
      ? L("{actor} used {move} and hit an area.", { actor: actor.displayName, move: move.name })
      : L("{actor} used {move}.", { actor: actor.displayName, move: move.name }),
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
        "{move} missed {target}.", { move: move.name, target: target.displayName },
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
      "{target} took {damage} damage.", { target: target.displayName, damage: damageDealt },
    );

    if (target.hp <= 0) {
      appendLog(
        state,
        "{target} fainted.", { target: target.displayName },
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
        "You can't flee from a trainer battle.",
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
    appendLog(state, "{actor} escaped from the battle.", { actor: actor.displayName });
    return { state, accepted: true };
  }

  if (action.kind === "use-item") {
    const item = DUEL_ITEMS[action.itemId];
    const target = state.units.find((unit) => unit.id === action.targetId);
    const actorItems =
      actor.side === "player"
        ? state.items
        : state.rivalItems;
    if (!item || !target || (item.kind !== "revive" && target.hp <= 0)) {
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
          reason: eligibility.reason ?? "capture-not-allowed",
        };
      }
      const ballCost = itemApCost(item.id);
      if (actor.ap < ballCost) {
        return { state: input, accepted: false, reason: "not-enough-ap" };
      }
      const species = target.species as WildSpeciesId;
      const chance = captureChanceFor(state, target.id, item.id) ?? 0;
      const random = createSeededRandom(
        (state.seed ^
          Math.imul(state.round, 0x9e3779b9) ^
          Math.imul(target.hp + 1, 0x85ebca6b) ^
          Math.imul(actor.ap + 1, 0xc2b2ae35) ^
          (state.captures.length * 0x27d4eb2f)) >>> 0,
      );
      random();
      const resolution = resolveCaptureRoll(random(), chance);
      target.captureAttempted = true;
      actor.ap -= ballCost;
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      if (resolution.success) {
        state.captures.push({
          species,
          level: target.level,
          chance,
          status: target.status,
          sleepTurnsRemaining: target.sleepTurnsRemaining,
          ...(target.ivs ? { ivs: { ...target.ivs } } : {}),
          ...(target.nature ? { nature: target.nature } : {}),
          ...(target.shiny === true ? { shiny: true } : {}),
        });
        target.hp = 0;
        target.captured = true;
        appendLog(
          state,
          L("{target} was caught!", { target: target.displayName }),
        );
        // The fight continues until no wild Pokémon is left standing.
        if (!sideHasLivingUnit(state, "rival")) {
          state.status = "finished";
          state.winner = "player";
        }
      } else {
        appendLog(
          state,
          L("{target} broke free from the Poké Ball!", { target: target.displayName }),
        );
      }
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
        },
      };
    }

    if (target.side !== actor.side) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    const itemCost = itemApCost(item.id);
    if (actor.ap < itemCost) {
      return { state: input, accepted: false, reason: "not-enough-ap" };
    }
    const itemResult = (healed: number): DuelActionResult => ({
      state,
      accepted: true,
      presentation: {
        kind: "item",
        actorId: actor.id,
        itemId: item.id,
        targetIds: [target.id],
        healed,
      },
    });

    if (item.kind === "revive") {
      if (target.hp > 0 || target.captured) {
        return { state: input, accepted: false, reason: "target-not-fainted" };
      }
      const spot = findReviveTile(state, target);
      if (!spot) {
        return { state: input, accepted: false, reason: "no-room-to-revive" };
      }
      const restored = Math.max(1, Math.ceil(target.maxHp * item.restore));
      target.hp = restored;
      target.status = null;
      target.sleepTurnsRemaining = 0;
      target.position = spot;
      // It rejoins the turn order and acts with a fresh AP pool on its own turn.
      target.ap = 0;
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      actor.ap -= itemCost;
      appendLog(state, "{target} was revived with {item}!", { target: target.displayName, item: item.name });
      return itemResult(restored);
    }
    if (item.kind === "full-restore") {
      if (target.hp >= target.maxHp && !target.status) {
        return { state: input, accepted: false, reason: "target-full-hp" };
      }
      const healed = target.maxHp - target.hp;
      target.hp = target.maxHp;
      target.status = null;
      target.sleepTurnsRemaining = 0;
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      actor.ap -= itemCost;
      appendLog(state, "{target} was fully restored with {item}.", { target: target.displayName, item: item.name });
      return itemResult(healed);
    }
    if (item.kind === "cure") {
      if (!target.status || !(item.cures as readonly string[]).includes(target.status)) {
        return { state: input, accepted: false, reason: "target-no-status" };
      }
      target.status = null;
      target.sleepTurnsRemaining = 0;
      actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
      actor.ap -= itemCost;
      appendLog(state, "{target} was healed with {item}.", { target: target.displayName, item: item.name });
      return itemResult(0);
    }
    if (item.kind !== "heal") {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if (target.hp >= target.maxHp) {
      return { state: input, accepted: false, reason: "target-full-hp" };
    }
    const healed = Math.min(item.heal, target.maxHp - target.hp);
    target.hp += healed;
    actorItems[item.id] = (actorItems[item.id] ?? 0) - 1;
    actor.ap -= itemCost;
    appendLog(state, "{target} recovered {n} HP with {item}.", { target: target.displayName, n: healed, item: item.name });
    return itemResult(healed);
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
    actor.ap -= cost;

    appendLog(
      state,
      "{actor} moved {n} tile(s).", { actor: actor.displayName, n: cost },
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
      "{actor} is paralyzed and couldn't attack.", { actor: actor.displayName },
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
        "{move} failed: a future attack is already targeting {target}.", { move: move.name, target: target.displayName },
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
      "{actor} foresaw an attack against {target}.", { actor: actor.displayName, target: target.displayName },
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
    appendLog(
      state,
      "{actor} absorbed light for {move}!", { actor: actor.displayName, move: move.name },
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
        ? L("{move} failed: {target} has a higher level.", { move: move.name, target: target.displayName })
        : L("{actor} used {move}, but missed.", { actor: actor.displayName, move: move.name }),
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
      move.multiHit !== undefined &&
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
      "{actor} used {move}: {damage} damage.", { actor: actor.displayName, move: move.name, damage: damageDealt },
    );
    if (hitCount !== undefined) {
      appendLog(
        state,
        "{move} hit {n} times.", { move: move.name, n: hitCount },
      );
    }

    if (typeEffectiveness === 0) {
      appendLog(
        state,
        "It doesn't affect {target}.", { target: target.displayName },
      );
    } else if (typeEffectiveness > 1) {
      appendLog(state, "It's super effective!");
    } else if (typeEffectiveness < 1) {
      appendLog(state, "It's not very effective.");
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
        "{move} lowered {target}'s Special Defense.", { move: move.name, target: target.displayName },
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
        "{move} lowered {target}'s Speed.", { move: move.name, target: target.displayName },
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
        "{actor} drained {n} HP with {move}.", { actor: actor.displayName, n: healed, move: move.name },
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
        "{move} dealt {n} recoil damage to {actor}.", { move: move.name, n: recoil, actor: actor.displayName },
      );
    }

    if (target.hp <= 0) {
      appendLog(
        state,
        "{target} fainted.", { target: target.displayName },
      );

      if (!sideHasLivingUnit(state, target.side)) {
        state.status = "finished";
        state.winner = actor.side;
      }
    }

    if (recoilFainted) {
      appendLog(
        state,
        "{actor} fainted from the recoil of {move}.", { actor: actor.displayName, move: move.name },
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
        "Struggle dealt {n} recoil damage to {actor}.", { n: recoil, actor: actor.displayName },
      );

      if (actor.hp <= 0) {
        appendLog(
          state,
          "{actor} fainted from the recoil of Struggle.", { actor: actor.displayName },
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
        "{move} had no effect on {target}.", { move: move.name, target: target.displayName },
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
        ? L("{move} harshly lowered {target}'s Attack.", { move: move.name, target: target.displayName })
        : L("{move} lowered {target}'s Attack.", { move: move.name, target: target.displayName }),
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
      "{move} lowered {target}'s Defense.", { move: move.name, target: target.displayName },
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
      "{move} harshly lowered {target}'s Defense.", { move: move.name, target: target.displayName },
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
      "{move} raised {target}'s Defense.", { move: move.name, target: target.displayName },
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
      "{move} raised {actor}'s Special Attack.", { move: move.name, actor: actor.displayName },
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
        "{move} failed against {target}.", { move: move.name, target: target.displayName },
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
        "{target}'s {move} was disabled for {n} rounds.", { move: DUEL_MOVES[lastMove].name, target: target.displayName, n: turns },
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
      "{move} raised {actor}'s Special Attack and Special Defense.", { move: move.name, actor: actor.displayName },
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
      "{move} lowered {target}'s Accuracy.", { move: move.name, target: target.displayName },
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
      "{move} raised {actor}'s Evasion.", { move: move.name, actor: actor.displayName },
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
      "{move} lowered {target}'s Evasion.", { move: move.name, target: target.displayName },
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
        ? L("{move} harshly lowered {target}'s Speed.", { move: move.name, target: target.displayName })
        : L("{move} lowered {target}'s Speed.", { move: move.name, target: target.displayName }),
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
      "{move} sharply raised {actor}'s Speed.", { move: move.name, actor: actor.displayName },
    );
  } else if (move.effect === "rain-dance") {
    if (state.weather === "rain") {
      appendLog(
        state,
        "{move} failed: it's already raining.", { move: move.name },
      );
    } else {
      state.weather = "rain";
      state.weatherTurnsRemaining = 5;
      appendLog(
        state,
        "{actor} used {move}. It started to rain!", { actor: actor.displayName, move: move.name },
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
      "{actor} recovered {n} HP with {move}.", { actor: actor.displayName, n: healed, move: move.name },
    );
  } else if (move.effect === "heal-self") {
    const healed = Math.min(
      Math.max(1, Math.floor(actor.maxHp / 2)),
      actor.maxHp - actor.hp,
    );
    actor.hp += healed;
    appendLog(
      state,
      "{actor} recovered {n} HP with {move}.", { actor: actor.displayName, n: healed, move: move.name },
    );
  } else if (move.effect === "teleport") {
    if (state.battleKind === "wild") {
      state.status = "finished";
      state.escaped = true;
      state.escapedBy = actor.side;
      state.winner = null;
      appendLog(
        state,
        "{actor} used {move} and fled from the battle.", { actor: actor.displayName, move: move.name },
      );
    } else {
      appendLog(
        state,
        "{actor} tried to use {move}, but can't flee from a Trainer battle.", { actor: actor.displayName, move: move.name },
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

/**
 * Expected damage the actor could take next round standing at `destination`,
 * from enemies able to reach it (their MP + move range). `ignoreId` removes a
 * target that this very action would knock out.
 */
function aiRetaliationRisk(
  state: DuelState,
  actor: DuelUnit,
  destination: DuelPoint,
  ignoreId?: string,
): number {
  let worst = 0;

  for (const enemy of state.units) {
    if (
      enemy.hp <= 0 ||
      enemy.side === actor.side ||
      enemy.id === ignoreId
    ) {
      continue;
    }

    const distance = manhattanDistance(
      destination,
      enemy.position,
    );

    for (const moveId of enemy.moves) {
      if (!canDuelUnitUseMove(enemy, moveId)) {
        continue;
      }
      const move = DUEL_MOVES[moveId];
      if (
        !move ||
        move.category === "status" ||
        distance > Math.max(0, enemy.maxAp - move.apCost) + move.maxRange
      ) {
        continue;
      }

      const damage =
        expectedMoveDamage(
          move,
          calculateDamage(state, enemy, actor, move)
            .damage,
        ) *
        expectedMoveTempoFactor(move) *
        (getDuelMoveHitChance(enemy, actor, move) / 100);
      worst = Math.max(worst, damage);
    }
  }

  return worst;
}

/** One member's job in the team plan. */
export interface TeamAssignment {
  unitId: string;
  targetId: string;
  moveId: DuelMoveId;
  /** Expected damage of the planned move (hit chance and tempo included). */
  expected: number;
  /** The plan counts this hit as the one that knocks the target out. */
  kills: boolean;
  typeEffectiveness: number;
}

export interface TeamPlan {
  assignments: TeamAssignment[];
  byUnit: ReadonlyMap<string, TeamAssignment>;
}

type TeamMatchup = {
  moveId: DuelMoveId;
  expected: number;
  typeEffectiveness: number;
  reach: number;
  /** What the matchup is worth: super effective hits count more, resisted ones less. */
  worth: number;
};

function aiTeamMatchup(
  state: DuelState,
  ally: DuelUnit,
  enemy: DuelUnit,
): TeamMatchup | null {
  let best: TeamMatchup | null = null;
  const distance = manhattanDistance(ally.position, enemy.position);

  for (const moveId of ally.moves) {
    if (!canDuelUnitUseMove(ally, moveId)) continue;
    const move = DUEL_MOVES[moveId];
    if (!move || move.category === "status") continue;
    const hit = getDuelMoveHitChance(ally, enemy, move) / 100;
    if (hit <= 0) continue;
    const result = calculateDamage(state, ally, enemy, move);
    if (result.damage <= 0) continue;
    const expected =
      expectedMoveDamage(move, result.damage) * hit * expectedMoveTempoFactor(move);
    const multiplier =
      result.typeEffectiveness >= 2 ? 1.5 : result.typeEffectiveness < 1 ? 0.6 : 1;
    // The AP pool pays for walking and hitting together: can it land this hit next to the foe this turn?
    const walkBudget = Math.max(0, Math.max(ally.ap, ally.maxAp) - move.apCost);
    const reach = distance <= walkBudget + move.maxRange ? 1 : 0.4;
    const worth = expected * multiplier * reach;
    if (!best || worth > best.worth) {
      best = { moveId, expected, typeEffectiveness: result.typeEffectiveness, reach, worth };
    }
  }

  return best;
}

/**
 * Plays the side as one trainer: every living member gets a target and a move so that the team
 * (1) lands super effective hits, (2) does not waste two attackers on a foe one of them already
 * defeats, (3) focuses what it can actually knock out, and (4) answers the biggest threats. A
 * greedy pick of the best remaining (member, foe) pair, crediting no more damage than the foe has
 * left, which is what moves the second attacker to the next foe.
 */
export function planTeamTurn(state: DuelState, side: DuelSide): TeamPlan {
  const allies = state.units
    .filter((unit) => unit.hp > 0 && unit.side === side && !unit.captured)
    .sort((a, b) => a.id.localeCompare(b.id));
  const enemies = state.units
    .filter((unit) => unit.hp > 0 && unit.side !== side)
    .sort((a, b) => a.id.localeCompare(b.id));
  const matchups = new Map<string, TeamMatchup | null>();
  for (const ally of allies) {
    for (const enemy of enemies) {
      matchups.set(`${ally.id}>${enemy.id}`, aiTeamMatchup(state, ally, enemy));
    }
  }

  const remaining = new Map(enemies.map((enemy) => [enemy.id, enemy.hp]));
  const assignments: TeamAssignment[] = [];
  const pending = new Set(allies.map((unit) => unit.id));

  while (pending.size > 0) {
    let best: { allyId: string; enemy: DuelUnit; matchup: TeamMatchup; gain: number; kills: boolean } | null = null;
    for (const allyId of [...pending]) {
      for (const enemy of enemies) {
        const matchup = matchups.get(`${allyId}>${enemy.id}`);
        if (!matchup) continue;
        const left = remaining.get(enemy.id) ?? 0;
        const kills = left > 0 && matchup.expected >= left;
        // Damage beyond what the foe has left is wasted, so it earns nothing.
        const credit = Math.min(matchup.expected, Math.max(left, 0));
        const ratio = credit / Math.max(1, enemy.maxHp);
        const gain =
          credit * (matchup.worth / Math.max(1, matchup.expected)) +
          (kills ? 160 : 0) +
          aiThreatScore(enemy) * 0.1 * ratio +
          (matchup.typeEffectiveness >= 2 && credit > 0 ? 20 : 0) +
          (left <= 0 ? matchup.worth * 0.05 : 0);
        if (
          !best ||
          gain > best.gain + 1e-9 ||
          (Math.abs(gain - best.gain) <= 1e-9 &&
            (allyId < best.allyId || (allyId === best.allyId && enemy.id < best.enemy.id)))
        ) {
          best = { allyId, enemy, matchup, gain, kills };
        }
      }
    }
    if (!best) break;
    pending.delete(best.allyId);
    remaining.set(best.enemy.id, Math.max(0, (remaining.get(best.enemy.id) ?? 0) - best.matchup.expected));
    assignments.push({
      unitId: best.allyId,
      targetId: best.enemy.id,
      moveId: best.matchup.moveId,
      expected: best.matchup.expected,
      kills: best.kills,
      typeEffectiveness: best.matchup.typeEffectiveness,
    });
  }

  return { assignments, byUnit: new Map(assignments.map((entry) => [entry.unitId, entry])) };
}

const TEAM_PLAN_CACHE = new WeakMap<DuelState, Map<DuelSide, TeamPlan>>();

/** The plan of a state is the same for every Pokémon deciding in it: compute it once. */
function cachedTeamPlan(state: DuelState, side: DuelSide): TeamPlan {
  let bySide = TEAM_PLAN_CACHE.get(state);
  if (!bySide) {
    bySide = new Map();
    TEAM_PLAN_CACHE.set(state, bySide);
  }
  let plan = bySide.get(side);
  if (!plan) {
    plan = planTeamTurn(state, side);
    bySide.set(side, plan);
  }
  return plan;
}

function scoreAiCandidate(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
  path: DuelPoint[],
  teamPlan?: TeamPlan | null,
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
  // Walking and attacking share one AP pool: what does not fit this turn is a future-turn cost.
  const futureTurnPenalty =
    Math.max(0, pathCost + move.apCost - actor.ap) * 8;
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

  // The team plan: hit the foe this Pokémon was picked for (a finishing blow is always welcome).
  const assignment = teamPlan?.byUnit.get(actor.id);
  const teamBonus = !assignment
    ? 0
    : assignment.targetId === target.id
      ? 22 +
        (assignment.kills ? 12 : 0) +
        (result.typeEffectiveness > 1 ? 6 : 0)
      : 0;

  const onHitScore =
    teamBonus +
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
  // Think before acting: a finishing blow removes its target from the
  // retaliation, otherwise weigh what the survivors can do to us where we end.
  const destination =
    path.length > 0 ? path[path.length - 1] : actor.position;
  const retaliation = aiRetaliationRisk(
    state,
    actor,
    destination,
    expectedDamage >= target.hp ? target.id : undefined,
  );
  const survivalPenalty =
    retaliation >= actor.hp
      ? 55 + Math.min(1, retaliation / Math.max(1, actor.maxHp)) * 25
      : (retaliation / Math.max(1, actor.maxHp)) * 30;

  return {
    damage:
      expectedDamage *
      hitChance *
      tempoFactor *
      areaTargetCount,
    score:
      onHitScore * hitChance * tempoFactor -
      survivalPenalty +
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
    teamPlanning?: boolean;
  },
): AiCandidate | null {
  const teamPlan =
    options.teamPlanning === false
      ? null
      : cachedTeamPlan(state, actor.side);
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
        teamPlan,
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

  if (candidates.length === 0 && !options.statusAlreadyUsed) {
    // Out of PP for every damaging move but with a status move left (Struggle only unlocks when ALL
    // PP is gone): burn it, however useless, so two such Pokémon cannot idle a battle forever.
    const burn = actor.moves
      .filter((moveId) => canDuelUnitUseMove(actor, moveId))
      .map((moveId) => DUEL_MOVES[moveId])
      .find(
        (move) =>
          move &&
          move.category === "status" &&
          move.targeting === "self" &&
          actor.ap >= move.apCost,
      );
    const hasDamagingPp = actor.moves.some(
      (moveId) =>
        DUEL_MOVES[moveId]?.category !== "status" && canDuelUnitUseMove(actor, moveId),
    );
    if (burn && !hasDamagingPp) {
      return { move: burn, target: actor, path: [], score: 1, damage: 0 };
    }
  }

  candidates.sort(compareAiCandidates);
  return candidates[0] ?? null;
}

/**
 * Opening phase: before the first round every living Pokémon walks up to `tiles` steps toward the
 * nearest foe for free (no AP, no attacks). The side that happens to act first no longer pays the
 * walk alone; Speed still decides who strikes first once everyone is in position.
 */
export function applyOpeningMovement(input: DuelState, tiles: number): DuelState {
  if (tiles <= 0 || input.status !== "active") return input;
  const state = cloneState(input);
  const reach = DUEL_MOVES.tackle;
  // Interleave the sides (player, rival, player, ...) and walk one tile at a time, so neither side
  // gets the better squares just because it is processed first.
  const bySide = (side: DuelSide) =>
    state.units
      .filter((unit) => unit.side === side && unit.hp > 0)
      .map((unit) => unit.id)
      .sort((a, b) => a.localeCompare(b));
  const player = bySide("player");
  const rival = bySide("rival");
  const order: string[] = [];
  for (let index = 0; index < Math.max(player.length, rival.length); index += 1) {
    if (player[index]) order.push(player[index]);
    if (rival[index]) order.push(rival[index]);
  }
  for (let step = 0; step < tiles; step += 1) {
    for (const id of order) {
      const unit = state.units.find((candidate) => candidate.id === id);
      if (!unit) continue;
      const target = state.units
        .filter((candidate) => candidate.hp > 0 && candidate.side !== unit.side)
        .sort(
          (a, b) =>
            manhattanDistance(unit.position, a.position) - manhattanDistance(unit.position, b.position) ||
            a.id.localeCompare(b.id),
        )[0];
      if (!target) continue;
      const path = shortestAiPathToRange(state, unit, target, reach);
      if (path && path.length > 0) unit.position = { ...path[0] };
    }
  }
  return state;
}

function aiMovementDestination(
  state: DuelState,
  actor: DuelUnit,
  path: readonly DuelPoint[],
  reserveAp = 0,
): DuelPoint | null {
  if (actor.ap <= 0 || path.length === 0) {
    return null;
  }

  const reachable = new Set(
    getReachableCells(state, actor.id).map(pointKey),
  );
  // Keep enough AP for the attack when the approach fits this turn; otherwise spend it all closing in.
  const budget =
    path.length + reserveAp <= actor.ap
      ? path.length
      : actor.ap;
  const maxIndex = Math.min(path.length, budget) - 1;

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


// ---------------------------------------------------------------------------------------------
// Auto Catch AI (task 029): capture everything. Weaken without killing, inflict status, then throw
// the ball; only an imminent knock-out of the acting Pokémon switches back to the normal (killing) AI.
// ---------------------------------------------------------------------------------------------

type AutoCatchPlan =
  | { kind: "action"; action: DuelAction }
  | { kind: "walk"; destination: DuelPoint }
  /** Survival: let the regular AI act (it prefers knock-outs). */
  | { kind: "fallback" }
  /** Nothing sensible left this turn. */
  | { kind: "idle" };

/** Throw as soon as the odds are at least this good. */
export const AUTO_CATCH_THROW_NOW = 0.5;
/** Below this the ball is only thrown when nothing else can improve the odds. */
const AUTO_CATCH_HOPELESS = 0.12;
/** A move must raise the capture chance by at least this much to be worth its AP. */
const AUTO_CATCH_MIN_GAIN = 0.03;
/** A damaging move is "safe" only when even a high roll leaves the target alive. */
const AUTO_CATCH_KILL_MARGIN = 1.2;

function availableBalls(state: DuelState): Array<{ id: DuelItemId; modifier: number }> {
  return (Object.keys(DUEL_ITEMS) as DuelItemId[])
    .filter((id) => DUEL_ITEMS[id].kind === "capture" && (state.items[id] ?? 0) > 0)
    .map((id) => ({
      id,
      modifier: (DUEL_ITEMS[id] as { ballModifier: number }).ballModifier,
    }))
    .sort((a, b) => a.modifier - b.modifier);
}

function captureStatusModifier(status: DuelMajorStatus): number {
  return status === "sleep"
    ? 2
    : status === "poison" || status === "paralysis" || status === "burn"
      ? 1.5
      : 1;
}

function captureChanceAt(
  target: DuelUnit,
  ballModifier: number,
  hp: number,
  status: DuelMajorStatus,
): number {
  return fireRedCaptureChance({
    catchRate: catchRateFor(target.species),
    ballModifier,
    statusModifier: captureStatusModifier(status),
    hp,
    maxHp: target.maxHp,
  });
}

/** Rarity tiers for Auto Catch: shiny 4, then 3 (rarest) down to 0 (common). */
export type AutoCatchTier = 0 | 1 | 2 | 3 | 4;

/**
 * Base tier from how rarely the species appears in the area (its catch rate when the area is
 * unknown), lifted by the curated list of valuable species, capped at 3; a shiny is always on top.
 */
export function autoCatchTier(
  unit: Pick<DuelUnit, "species" | "shiny"> & { appearanceRate?: number },
): AutoCatchTier {
  if (unit.shiny === true) return 4;
  const base =
    typeof unit.appearanceRate === "number"
      ? appearanceTier(unit.appearanceRate)
      : catchRateTier(catchRateFor(unit.species));
  return Math.min(3, base + rarityBonus(unit.species)) as AutoCatchTier;
}

/**
 * Sort key of a wild Pokémon for Auto Catch (higher = caught first): tier, then the rarer
 * appearance (or the lower catch rate), then the valuable ones. Ties fall back to the odds of the
 * moment, not here.
 */
export function autoCatchPriority(
  unit: Pick<DuelUnit, "species" | "shiny"> & { appearanceRate?: number },
): number {
  const rarity =
    typeof unit.appearanceRate === "number"
      ? Math.round((1 - Math.min(1, Math.max(0, unit.appearanceRate))) * 200)
      : Math.round((255 - catchRateFor(unit.species)) * 0.7);
  return autoCatchTier(unit) * 1000 + rarityBonus(unit.species) * 250 + rarity;
}

/**
 * Cheapest ball that is already good enough, else the best regular ball; the Master Ball only for
 * hopeless cases. Rare and shiny targets always get the best regular ball, and a shiny falls back
 * to the Master Ball as soon as the odds are worse than a coin flip.
 */
function bestBallFor(
  target: DuelUnit,
  balls: ReturnType<typeof availableBalls>,
  hp = target.hp,
  status: DuelMajorStatus = target.status,
): { id: DuelItemId; chance: number } | null {
  if (balls.length === 0) return null;
  const tier = autoCatchTier(target);
  const regular = balls.filter((ball) => ball.modifier < 255);
  const scored = regular.map((ball) => ({
    id: ball.id,
    chance: captureChanceAt(target, ball.modifier, hp, status),
  }));
  const enough = tier >= 3 ? undefined : scored.find((entry) => entry.chance >= 0.6);
  const best = enough ?? [...scored].sort((a, b) => b.chance - a.chance)[0];
  const master = balls.find((ball) => ball.modifier >= 255);
  const masterBelow = tier === 4 ? 0.5 : tier >= 2 ? 0.35 : 0.25;
  if (master && (!best || best.chance < masterBelow)) {
    return { id: master.id, chance: 1 };
  }
  return best ?? null;
}

/**
 * Damage the actor is realistically exposed to before it acts again: what its most dangerous foe
 * could do, plus half of the runner-up (a big pack never focuses one Pokémon with every member).
 */
function aiExpectedIncomingDamage(state: DuelState, actor: DuelUnit): number {
  const threats: number[] = [];
  for (const enemy of state.units) {
    if (enemy.hp <= 0 || enemy.side === actor.side) continue;
    const distance = manhattanDistance(actor.position, enemy.position);
    let worst = 0;
    for (const moveId of enemy.moves) {
      if (!canDuelUnitUseMove(enemy, moveId)) continue;
      const move = DUEL_MOVES[moveId];
      if (!move || move.category === "status") continue;
      if (distance > Math.max(0, enemy.maxAp - move.apCost) + move.maxRange) continue;
      const damage =
        expectedMoveDamage(move, calculateDamage(state, enemy, actor, move).damage) *
        (getDuelMoveHitChance(enemy, actor, move) / 100);
      worst = Math.max(worst, damage);
    }
    threats.push(worst);
  }
  const [worst = 0, second = 0] = threats.sort((a, b) => b - a);
  // The strongest foe counts fully, the runner-up only partly (it may well pick another target).
  return worst + second * 0.5;
}

type AutoCatchOption = {
  move: DuelMove;
  target: DuelUnit;
  newChance: number;
  gain: number;
};

/** What a move would do to the odds of catching `target`; null when it would not help or could kill. */
function evaluateCatchMove(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
  move: DuelMove,
  balls: ReturnType<typeof availableBalls>,
  currentChance: number,
): AutoCatchOption | null {
  if (
    move.targeting !== "single-enemy" ||
    move.areaPattern ||
    move.effect === "ohko" ||
    move.effect === "future-sight" ||
    move.effect === "solar-beam" ||
    move.effect === "teleport"
  ) {
    return null;
  }
  const accuracy = getDuelMoveHitChance(actor, target, move) / 100;
  if (accuracy <= 0) return null;

  let hp = target.hp;
  let status: DuelMajorStatus = target.status;
  if (move.category === "status") {
    if (!move.secondaryStatus || !canMoveApplyMajorStatus(target, move)) return null;
    status = move.secondaryStatus;
  } else {
    if (move.power === null) return null;
    const single = calculateDamage(state, actor, target, move).damage;
    const maxHits = move.multiHit === "two-to-five" ? 5 : move.multiHit === "two" ? 2 : 1;
    if (single * maxHits * AUTO_CATCH_KILL_MARGIN >= target.hp) return null;
    hp = Math.max(1, Math.round(target.hp - expectedMoveDamage(move, single)));
  }
  const best = bestBallFor(target, balls, hp, status);
  if (!best) return null;
  const newChance = best.chance;
  return { move, target, newChance, gain: (newChance - currentChance) * accuracy };
}

type RankedWild = {
  target: DuelUnit;
  best: { id: DuelItemId; chance: number };
};

/** One pass of the Auto Catch plan against a group of wild Pokémon of the same rarity tier. */
function planAgainstGroup(
  state: DuelState,
  actor: DuelUnit,
  group: RankedWild[],
  balls: ReturnType<typeof availableBalls>,
  tier: AutoCatchTier,
  throwCost: number,
): AutoCatchPlan | null {
  const primary = group[0];
  const canThrow = actor.ap >= throwCost;
  const hopeless = tier >= 3 ? 0.03 : AUTO_CATCH_HOPELESS;
  const throwAt = (entry: RankedWild): AutoCatchPlan => ({
    kind: "action",
    action: {
      kind: "use-item",
      unitId: actor.id,
      itemId: entry.best.id,
      targetId: entry.target.id,
    },
  });

  // 1. The odds are good: throw.
  if (canThrow && primary.best.chance >= AUTO_CATCH_THROW_NOW) {
    return throwAt(primary);
  }

  // 2. A status or a non-lethal hit that is in range right now.
  const usableMoves = actor.moves.filter((moveId) => canDuelUnitUseMove(actor, moveId));
  const inRange: AutoCatchOption[] = [];
  for (const entry of group) {
    for (const moveId of usableMoves) {
      const move = DUEL_MOVES[moveId];
      if (!move || actor.ap < move.apCost) continue;
      const distance = manhattanDistance(actor.position, entry.target.position);
      if (distance < move.minRange || distance > move.maxRange) continue;
      const option = evaluateCatchMove(state, actor, entry.target, move, balls, entry.best.chance);
      if (option && option.gain >= AUTO_CATCH_MIN_GAIN) inRange.push(option);
    }
  }
  inRange.sort((a, b) => b.newChance - a.newChance || b.gain - a.gain || a.move.apCost - b.move.apCost);
  if (inRange.length > 0) {
    const pick = inRange[0];
    return {
      kind: "action",
      action: {
        kind: "use-move",
        unitId: actor.id,
        moveId: pick.move.id,
        targetId: pick.target.id,
      },
    };
  }

  // 3. Nothing to improve from here: throw if the odds are not hopeless.
  if (canThrow && primary.best.chance >= hopeless) {
    return throwAt(primary);
  }

  // 4. Walk toward a target that a useful move could reach.
  let bestWalk: { destination: DuelPoint; score: number } | null = null;
  for (const entry of group) {
    for (const moveId of usableMoves) {
      const move = DUEL_MOVES[moveId];
      if (!move) continue;
      const option = evaluateCatchMove(state, actor, entry.target, move, balls, entry.best.chance);
      if (!option || option.gain < AUTO_CATCH_MIN_GAIN) continue;
      const path = shortestAiPathToRange(state, actor, entry.target, move);
      if (!path || path.length === 0) continue;
      const destination = aiMovementDestination(state, actor, path, move.apCost);
      if (!destination) continue;
      const score = option.newChance - path.length * 0.01;
      if (!bestWalk || score > bestWalk.score) bestWalk = { destination, score };
    }
  }
  if (bestWalk) return { kind: "walk", destination: bestWalk.destination };

  // 5. Last resort: even a poor throw beats doing nothing.
  if (canThrow) return throwAt(primary);
  return null;
}

/**
 * Auto Catch turn plan. Wild Pokémon are worked in rarity order (shiny first, then rare, uncommon,
 * common); the whole party concentrates on the top group, and only an actor that has nothing useful
 * to do there moves on to the next one. The Pokémon's own life comes second: with a shiny on the
 * field it never falls back to the killing AI, with a rare one it tolerates 1.5x its HP in risk.
 */
function planAutoCatch(state: DuelState, actor: DuelUnit): AutoCatchPlan | null {
  if (
    actor.side !== "player" ||
    state.battleKind !== "wild" ||
    !state.captureAllowed
  ) {
    return null;
  }
  const balls = availableBalls(state);
  const wilds = state.units.filter(
    (unit) => unit.side === "rival" && unit.hp > 0 && !unit.captured,
  );
  if (balls.length === 0 || wilds.length === 0) return null;

  const topTier = Math.max(...wilds.map((unit) => autoCatchTier(unit))) as AutoCatchTier;
  // Knock-out danger: the more valuable the best target, the more the Pokémon is willing to risk.
  const tolerance = topTier === 4 ? Number.POSITIVE_INFINITY : topTier === 3 ? 1.5 : 1;
  if (aiExpectedIncomingDamage(state, actor) >= actor.hp * tolerance) {
    return { kind: "fallback" };
  }

  const ranked: RankedWild[] = wilds
    .map((target) => ({ target, best: bestBallFor(target, balls) }))
    .filter((entry): entry is RankedWild => entry.best !== null);
  if (ranked.length === 0) return null;

  const throwCost = Math.min(...balls.map((ball) => itemApCost(ball.id)));
  const tiers = [4, 3, 2, 1, 0] as const;
  for (const tier of tiers) {
    const group = ranked
      .filter((entry) => autoCatchTier(entry.target) === tier)
      .sort(
        (a, b) =>
          autoCatchPriority(b.target) - autoCatchPriority(a.target) ||
          b.best.chance - a.best.chance ||
          a.target.hp - b.target.hp,
      );
    if (group.length === 0) continue;
    const plan = planAgainstGroup(state, actor, group, balls, tier, throwCost);
    if (plan) return plan;
  }
  return { kind: "idle" };
}

const AI_HEAL_ITEMS = ["potion", "super-potion", "hyper-potion", "max-potion"] as const;
const AI_STATUS_CURES: Readonly<Record<string, readonly DuelItemId[]>> = {
  poison: ["antidote", "full-heal"],
  paralysis: ["parlyz-heal", "full-heal"],
  burn: ["burn-heal", "full-heal"],
  sleep: ["awakening", "full-heal"],
};

/**
 * The AI's whole bag: Revive / Max Revive for a fainted teammate, the Potion that fits the missing
 * HP (small ones first, Max Potion and Full Restore kept for the big wounds), the matching status
 * cure (or Full Heal / Full Restore), always weighed against the AP it costs and the threat the
 * wounded Pokémon is under. Returns the single best use, or null when nothing is worth the AP.
 */
function chooseAiItemAction(
  state: DuelState,
  actor: DuelUnit,
  options: DuelAiTurnOptions,
): DuelAction | null {
  const bag = actor.side === "player" ? state.items : state.rivalItems;
  if (!options.useItems) return null;
  const has = (id: DuelItemId) => (bag[id] ?? 0) > 0 && actor.ap >= itemApCost(id);
  type Option = { itemId: DuelItemId; targetId: string; score: number };
  const found: Option[] = [];
  const allies = state.units.filter((unit) => unit.side === actor.side);
  const foesAlive = state.units.some((unit) => unit.side !== actor.side && unit.hp > 0);

  // Bring a fainted teammate back: a whole extra body for the rest of the fight.
  if (foesAlive) {
    const fainted = allies
      .filter((unit) => unit.hp <= 0 && !unit.captured)
      .sort((a, b) => b.maxHp - a.maxHp)[0];
    if (fainted) {
      const itemId: DuelItemId | null = has("revive") ? "revive" : has("max-revive") ? "max-revive" : null;
      if (itemId) {
        found.push({ itemId, targetId: fainted.id, score: 90 + fainted.level });
      }
    }
  }

  for (const unit of allies) {
    if (unit.hp <= 0) continue;
    const missing = unit.maxHp - unit.hp;
    const hpRatio = unit.hp / Math.max(1, unit.maxHp);
    const threatened = aiBestIncomingDamage(state, actor, unit) >= unit.hp;
    const status = unit.status ?? null;
    const urgency = (1 - hpRatio) * 150 + (threatened ? 100 : 0);

    if (missing > 0 && (hpRatio <= 0.45 || threatened)) {
      // The smallest Potion that covers the wound; the biggest one when none does.
      const fitting = AI_HEAL_ITEMS.filter((id) => has(id)).sort(
        (a, b) => DUEL_ITEMS[a].heal - DUEL_ITEMS[b].heal,
      );
      const covers = fitting.find((id) => DUEL_ITEMS[id].heal >= missing);
      const pick = covers ?? fitting[fitting.length - 1];
      // Max Potion is wasted on a scratch: only when most of the HP is gone.
      const wasteful = pick === "max-potion" && hpRatio > 0.35 && !threatened;
      if (pick && !wasteful) {
        const healed = Math.min(DUEL_ITEMS[pick].heal, missing);
        found.push({ itemId: pick, targetId: unit.id, score: urgency + healed * 1.5 - itemApCost(pick) * 4 });
      }
      if (status && has("full-restore") && hpRatio <= 0.5) {
        found.push({ itemId: "full-restore", targetId: unit.id, score: urgency + 40 + missing - itemApCost("full-restore") * 4 });
      }
    }

    if (status) {
      const cure = (AI_STATUS_CURES[status] ?? []).find((id) => has(id));
      // Sleep and paralysis lose whole turns; poison and burn matter once the HP is going down.
      const worth =
        status === "sleep" ? 120 : status === "paralysis" ? 80 : hpRatio < 0.6 ? 60 : 0;
      if (cure && worth > 0) {
        found.push({ itemId: cure, targetId: unit.id, score: worth + (threatened ? 20 : 0) - itemApCost(cure) * 4 });
      }
    }
  }

  const best = found.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0
    ? { kind: "use-item", unitId: actor.id, itemId: best.itemId, targetId: best.targetId }
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
      const plan = planAutoCatch(state, actor);
      if (plan?.kind === "action") {
        if (run(plan.action).accepted) continue;
        break;
      }
      if (plan?.kind === "walk") {
        const walked = run({
          kind: "move",
          unitId: actor.id,
          to: plan.destination,
        });
        if (walked.accepted && movementActions < 3) {
          movementActions += 1;
          continue;
        }
        break;
      }
      if (plan?.kind === "idle") break;
      // "fallback" and a missing plan: the regular AI decides below.
    }

    const inRange = chooseAiCandidate(
      state,
      actor,
      {
        requireInRange: true,
        statusAlreadyUsed: statusUsed,
        damageAlreadyUsed: damageUsed,
        teamPlanning: options.teamPlanning,
      },
    );
    const strategic = chooseAiCandidate(
      state,
      actor,
      {
        requireInRange: false,
        statusAlreadyUsed: statusUsed,
        damageAlreadyUsed: damageUsed,
        teamPlanning: options.teamPlanning,
      },
    );

    const canMoveForStrategic =
      actor.ap > 0 &&
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

    // AP may already have been spent on an attack: use what is left to set up the next one
    // instead of wasting it.
    if (
      actor.ap > 0 &&
      movementActions < 2
    ) {
      const futurePlan = chooseAiCandidate(
        state,
        actor,
        {
          requireInRange: false,
          statusAlreadyUsed: statusUsed,
          damageAlreadyUsed: damageUsed,
          teamPlanning: options.teamPlanning,
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
