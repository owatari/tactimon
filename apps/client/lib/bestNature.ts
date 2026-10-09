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
import { TM_COMPAT, TM_MOVES } from "./generated/tmCompat";

/** Why the nature was picked (the Pokédex turns this into a sentence). */
export type BestNatureKind =
  | "physical"
  | "special"
  | "fast-physical"
  | "fast-special"
  | "bulky";

export type BestNature = {
  nature: NatureId;
  up: NatureStat;
  down: NatureStat;
  kind: BestNatureKind;
  /** Offensive stat the Pokémon leans on (null for the bulky kind). */
  offense: "attack" | "specialAttack" | null;
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
export function bestNatureFor(species: DuelSpeciesId): BestNature {
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
    return { nature: natureFor(up, down), up, down, kind: "bulky", offense: null };
  }

  const offenseStat = base[offense];
  if (base.speed >= FAST_SPEED && base.speed >= offenseStat * FAST_RATIO) {
    return {
      nature: natureFor("speed", unused),
      up: "speed",
      down: unused,
      kind: offense === "attack" ? "fast-physical" : "fast-special",
      offense,
    };
  }

  return {
    nature: natureFor(offense, unused),
    up: offense,
    down: unused,
    kind: offense === "attack" ? "physical" : "special",
    offense,
  };
}
