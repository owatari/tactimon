import {
  DUEL_MOVES,
  NATURE_IDS,
  POKEMON_LEARNSETS,
  duelSpeciesBaseStats,
  duelSpeciesTypes,
  natureEffect,
  type DuelMoveId,
  type DuelSpeciesId,
  type NatureId,
  type NatureStat,
} from "@tactimon/battle-engine";
import { SMOGON_NATURES } from "./generated/smogonNatures";
import { TM_COMPAT, TM_MOVES } from "./generated/tmCompat";
import { isNatureId } from "@tactimon/battle-engine";
import { speciesEvolvesTo } from "./pokedexData";

/** Why the nature was picked (the Pokédex turns this into a sentence). */
export type BestNatureKind =
  | "database"
  | "physical"
  | "special"
  | "fast-physical"
  | "fast-special"
  | "bulky";

export type BestNature = {
  nature: NatureId;
  up: NatureStat | null;
  down: NatureStat | null;
  kind: BestNatureKind;
  /** Offensive stat the Pokémon leans on (null for the bulky kind and database picks). */
  offense: "attack" | "specialAttack" | null;
  /** Where the answer comes from: Smogon's own sets, its evolution's sets, or the stat heuristic. */
  source: "smogon" | "evolution" | "heuristic";
  /** Other natures the same sets use (e.g. Modest next to Timid). */
  alternatives: NatureId[];
  /** Smogon tier and set name when the answer comes from the database. */
  tier?: string;
  set?: string;
  /** The evolution whose sets were used (source "evolution"). */
  from?: string;
};

/** A species this fast (and nearly as strong as its offense) wants +Speed instead of more power. */
const FAST_SPEED = 100;
const FAST_RATIO = 0.85;
/** Below this, neither attack stat is worth boosting. */
const WEAK_OFFENSE = 55;

function natureFor(up: NatureStat, down: NatureStat): NatureId {
  const found = NATURE_IDS.find((id) => {
    const effect = natureEffect(id);
    return effect.up === up && effect.down === down;
  });
  if (!found) throw new Error(`no nature for +${up} -${down}`);
  return found;
}

/** The damaging moves a species can learn: level-up moves and the TMs/HMs it is compatible with. */
function learnableMoves(species: DuelSpeciesId): DuelMoveId[] {
  const ids = new Set<DuelMoveId>(POKEMON_LEARNSETS[species]?.map((entry) => entry.moveId) ?? []);
  const compat = TM_COMPAT[species];
  for (const number of compat?.tm ?? []) {
    const id = TM_MOVES[number - 1] as DuelMoveId | undefined;
    if (id && DUEL_MOVES[id]) ids.add(id);
  }
  return [...ids].filter((id) => DUEL_MOVES[id] && DUEL_MOVES[id].category !== "status");
}

/** Sum of the three best attacks of a category (STAB counts 1.5×): how much the movepool backs that stat. */
function movePoolPower(species: DuelSpeciesId, category: "physical" | "special"): number {
  const types = duelSpeciesTypes(species);
  const powers = learnableMoves(species)
    .map((id) => DUEL_MOVES[id])
    .filter((move) => move.category === category && (move.power ?? 0) > 0)
    .map((move) => (move.power ?? 0) * (types.includes(move.type) ? 1.5 : 1))
    .sort((a, b) => b - a);
  return powers.slice(0, 3).reduce((sum, power) => sum + power, 0);
}

/**
 * The nature that helps a species most, explained by its base stats and movepool:
 * - the offensive stat (Attack or Sp. Atk) that its stats AND its attacks favour is the one it relies on;
 * - that stat gets the +10%, and the unused offensive stat pays the −10% (Adamant, Modest...);
 * - a species that is very fast and almost as strong as its offense takes +Speed instead (Jolly, Timid);
 * - a species with no real offense (Chansey, Magikarp) boosts its better bulk stat and drops its worse attack.
 * Deterministic and pure: the same species always gets the same nature.
 */
export function heuristicBestNature(species: DuelSpeciesId): BestNature {
  const base = duelSpeciesBaseStats(species);
  const physicalPower = movePoolPower(species, "physical");
  const specialPower = movePoolPower(species, "special");
  const total = physicalPower + specialPower + 1;
  const physicalScore = base.attack * (1 + physicalPower / total);
  const specialScore = base.specialAttack * (1 + specialPower / total);
  const offense: "attack" | "specialAttack" = physicalScore >= specialScore ? "attack" : "specialAttack";
  const unused: NatureStat = offense === "attack" ? "specialAttack" : "attack";
  const strongest = Math.max(base.attack, base.specialAttack);

  if (strongest < WEAK_OFFENSE) {
    const up: NatureStat = base.defense >= base.specialDefense ? "defense" : "specialDefense";
    const down: NatureStat = base.attack <= base.specialAttack ? "attack" : "specialAttack";
    return { nature: natureFor(up, down), up, down, kind: "bulky", offense: null, source: "heuristic", alternatives: [] };
  }

  const offenseStat = base[offense];
  if (base.speed >= FAST_SPEED && base.speed >= offenseStat * FAST_RATIO) {
    return {
      nature: natureFor("speed", unused),
      up: "speed",
      down: unused,
      kind: offense === "attack" ? "fast-physical" : "fast-special",
      offense,
      source: "heuristic",
      alternatives: [],
    };
  }

  return {
    nature: natureFor(offense, unused),
    up: offense,
    down: unused,
    kind: offense === "attack" ? "physical" : "special",
    offense,
    source: "heuristic",
    alternatives: [],
  };
}

function fromDatabase(species: string): BestNature | null {
  const entry = SMOGON_NATURES[species];
  if (!entry || !isNatureId(entry.nature)) return null;
  const effect = natureEffect(entry.nature);
  return {
    nature: entry.nature,
    up: effect.up,
    down: effect.down,
    kind: "database",
    offense: null,
    source: "smogon",
    alternatives: entry.alternatives.filter((id): id is NatureId => isNatureId(id)),
    tier: entry.tier,
    set: entry.set,
  };
}

/**
 * The best nature for a species, in order of trust:
 * 1. Smogon's Gen 3 competitive sets for that species (the most voted nature of its highest tier);
 * 2. the sets of what it evolves into (an unevolved Pokémon grows into that role);
 * 3. the stat-and-movepool heuristic above, for the few species without any set (e.g. Chansey).
 */
export function bestNatureFor(species: DuelSpeciesId): BestNature {
  const direct = fromDatabase(species);
  if (direct) return direct;
  const seen = new Set<string>([species]);
  let frontier: string[] = [species];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const step of speciesEvolvesTo(current)) {
        if (seen.has(step.species)) continue;
        seen.add(step.species);
        const inherited = fromDatabase(step.species);
        if (inherited) return { ...inherited, source: "evolution", from: step.species };
        next.push(step.species);
      }
    }
    frontier = next;
  }
  return heuristicBestNature(species);
}
