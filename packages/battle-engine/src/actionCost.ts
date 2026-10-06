/**
 * Action-point economy.
 *
 * - Every Pokémon starts with 6 AP and gains +1 for every 25 points of its Speed stat.
 * - Walking costs 1 AP per tile.
 * - Moves cost about 10% of their effective power; status moves cost about 3 AP. Multi-hit moves,
 *   moves turned into area attacks and moves with several effects are priced in (see below).
 */

export const BASE_ACTION_POINTS = 6;
export const SPEED_PER_ACTION_POINT = 25;
/**
 * AP cost of every battle item (task 030). The cheapest items (Potion, the status cures and the
 * regular balls) cost 4; costs grow with strength and usefulness up to Full Restore / Max Revive
 * (7). The average over the whole list is about 4.75 AP.
 */
export const ITEM_AP_COSTS = {
  potion: 4,
  "super-potion": 4,
  "hyper-potion": 5,
  "max-potion": 6,
  "full-restore": 7,
  antidote: 4,
  "parlyz-heal": 4,
  awakening: 4,
  "burn-heal": 4,
  "full-heal": 5,
  revive: 5,
  "max-revive": 7,
  "poke-ball": 4,
  "great-ball": 4,
  "ultra-ball": 4,
  "master-ball": 5,
} as const;

export type PricedItemId = keyof typeof ITEM_AP_COSTS;

/** AP needed to use `itemId` in battle (unknown items cost the baseline 4). */
export function itemApCost(itemId: string): number {
  return (ITEM_AP_COSTS as Record<string, number>)[itemId] ?? 4;
}

/** Throwing a regular Poké Ball (kept for callers that do not know the ball). */
export const POKE_BALL_AP_COST = ITEM_AP_COSTS["poke-ball"];
/**
 * Fine tuning (task 029): up to this much raw cost (60 power) a move costs exactly 10% of its power;
 * above it every extra point of raw cost counts half, so 100-150 power moves stay usable for the
 * 7-9 AP most Pokémon have instead of being locked behind 10 AP.
 */
export const COST_KNEE = 6;
export const COST_ABOVE_KNEE_FACTOR = 0.5;
/** No single action may ask for more than this (an expensive move still has to be usable). */
export const MAX_DAMAGE_MOVE_AP = 10;
export const MAX_STATUS_MOVE_AP = 6;
export const STATUS_MOVE_BASE_AP = 3;
export const DAMAGE_AP_PER_POWER = 0.1;

/** AP pool of a Pokémon: 6, plus one per 25 Speed. */
export function maxActionPointsForSpeed(speed: number): number {
  const value = Number.isFinite(speed) ? Math.max(0, Math.trunc(speed)) : 0;
  return BASE_ACTION_POINTS + Math.floor(value / SPEED_PER_ACTION_POINT);
}

export type MoveCostInput = {
  category: "physical" | "special" | "status";
  power: number | null;
  areaPattern?: string;
  /** Hits per use: "two-to-five" averages 3, "two" is exactly 2. */
  multiHit?: string;
  effect?: string;
  secondaryStatus?: string;
  secondaryStatChange?: unknown;
  /** Reserved for moves that reach every ally / every foe. */
  targeting?: string;
};

/** Hits a multi-hit move lands on average. */
export function averageHits(multiHit: string | undefined): number {
  if (multiHit === "two-to-five") return 3;
  if (multiHit === "two") return 2;
  return 1;
}

/** Footprint multiplier: the more tiles a move can cover, the more it costs. */
export function areaCostFactor(areaPattern: string | undefined): number {
  switch (areaPattern) {
    case "line":
    case "cone":
      return 1.3;
    case "burst-1":
    case "self-radius-1":
      return 1.5;
    case "large-area":
      return 2;
    default:
      return 1;
  }
}

/** Damage-equivalent power for moves whose `power` is a placeholder. */
const EFFECTIVE_POWER_BY_EFFECT: Record<string, number> = {
  "fixed-damage-20": 30,
  "fixed-damage-40": 50,
  "level-damage": 50,
  ohko: 100,
  "future-sight": 80,
  "solar-beam": 120,
};

/** Number of separate things a status move does (each beyond the first adds AP). */
function statusEffectCount(move: MoveCostInput): number {
  let count = 0;
  if (move.effect) count += move.effect === "calm-mind" ? 2 : 1;
  if (move.secondaryStatus) count += 1;
  if (move.secondaryStatChange) count += 1;
  return Math.max(1, count);
}

/** AP cost of using a move once. Deterministic and always within 1..MAX_*_AP. */
export function apCostForMove(move: MoveCostInput): number {
  if (move.category === "status" || move.power === null) {
    let cost = STATUS_MOVE_BASE_AP + (statusEffectCount(move) - 1);
    // Strong stat swings (two stages) are worth an extra point.
    if (move.effect && /-2$|^speed-up-2$/.test(move.effect)) cost += 1;
    // Hitting more than one tile with a status, or buffing every ally, costs more.
    const area = areaCostFactor(move.areaPattern);
    if (area > 1) cost += area >= 2 ? 2 : 1;
    if (move.targeting === "all-allies") cost += 2;
    return Math.max(1, Math.min(MAX_STATUS_MOVE_AP, Math.round(cost)));
  }

  const power = EFFECTIVE_POWER_BY_EFFECT[move.effect ?? ""] ?? move.power;
  const raw =
    power *
    averageHits(move.multiHit) *
    areaCostFactor(move.areaPattern) *
    DAMAGE_AP_PER_POWER;
  const tuned =
    raw > COST_KNEE
      ? COST_KNEE + (raw - COST_KNEE) * COST_ABOVE_KNEE_FACTOR
      : raw;
  return Math.max(1, Math.min(MAX_DAMAGE_MOVE_AP, Math.round(tuned)));
}
