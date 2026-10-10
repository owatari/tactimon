import { MIN_EXP_SHARE_PERCENT } from "@tactimon/battle-engine";

export { MIN_EXP_SHARE_PERCENT };

/** The most one member can hold: everything left once the others keep their 5%. */
export const maxExpShare = (count: number) => 100 - MIN_EXP_SHARE_PERCENT * Math.max(0, count - 1);

/** Splits `total` into `count` whole numbers following `weights` (largest remainder), each at least `min`. */
function apportion(total: number, weights: readonly number[], min: number): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const free = total - min * n;
  const sum = weights.reduce((acc, value) => acc + value, 0);
  const raw = weights.map((weight) => (sum > 0 ? (free * weight) / sum : free / n));
  const base = raw.map((value) => Math.floor(value));
  let left = free - base.reduce((acc, value) => acc + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; left > 0; i = (i + 1) % n) {
    base[order[i].index] += 1;
    left -= 1;
  }
  return base.map((value) => value + min);
}

/** Equal split of 100%: [34, 33, 33] for three Pokémon. */
export function defaultExpShare(count: number): number[] {
  return apportion(100, Array.from({ length: count }, () => 1), 0);
}

/**
 * Makes saved shares fit the party: members that joined take the 5% minimum (from the biggest shares),
 * members that left give their share to the biggest; an invalid value falls back to an equal split.
 */
export function fitExpShare(raw: unknown, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];
  const numbers = Array.isArray(raw) ? raw.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
  if (numbers.length === 0 || (Array.isArray(raw) && numbers.length !== raw.length)) return defaultExpShare(count);
  const resized = numbers.slice(0, count);
  while (resized.length < count) resized.push(MIN_EXP_SHARE_PERCENT);
  const clamped = resized.map((value) => Math.max(MIN_EXP_SHARE_PERCENT, Math.round(value)));
  // The weights above the minimum keep their proportions; the sum is forced to exactly 100.
  const extras = clamped.map((value) => value - MIN_EXP_SHARE_PERCENT);
  if (extras.every((value) => value === 0)) return defaultExpShare(count);
  return apportion(100, extras, MIN_EXP_SHARE_PERCENT);
}

/**
 * The player drags member `index` to `value`%: the others shrink or grow in proportion to what they
 * hold above the minimum, so nobody drops under 5% and the total stays 100.
 */
export function setMemberShare(shares: readonly number[], index: number, value: number): number[] {
  const count = shares.length;
  if (count <= 1 || index < 0 || index >= count) return [...shares];
  const target = Math.max(MIN_EXP_SHARE_PERCENT, Math.min(maxExpShare(count), Math.round(value)));
  const others = shares.map((share, i) => ({ share, i })).filter((entry) => entry.i !== index);
  const extras = others.map((entry) => Math.max(0, entry.share - MIN_EXP_SHARE_PERCENT));
  const shared = apportion(100 - target, extras.some((v) => v > 0) ? extras : others.map(() => 1), MIN_EXP_SHARE_PERCENT);
  const result = [...shares];
  result[index] = target;
  others.forEach((entry, position) => {
    result[entry.i] = shared[position];
  });
  return result;
}

/** Channel the remainder: one member gets everything above the others' 5%. */
export function channelExpShare(count: number, index: number): number[] {
  const result = Array.from({ length: count }, () => MIN_EXP_SHARE_PERCENT);
  if (index >= 0 && index < count) result[index] = maxExpShare(count);
  return count === 1 ? [100] : result;
}

/** Shares of the members that actually fought (their party slots), renormalised to 100 with the 5% floor kept. */
export function sharesForSlots(shares: readonly number[], slots: readonly number[]): number[] {
  const picked = slots.map((slot) => shares[slot] ?? MIN_EXP_SHARE_PERCENT);
  if (picked.length === 0) return [];
  return picked.length === 1 ? [100] : apportion(100, picked.map((v) => v - MIN_EXP_SHARE_PERCENT), MIN_EXP_SHARE_PERCENT);
}

export function swapExpShares(shares: readonly number[], a: number, b: number): number[] {
  const result = [...shares];
  if (a < 0 || b < 0 || a >= result.length || b >= result.length) return result;
  [result[a], result[b]] = [result[b], result[a]];
  return result;
}
