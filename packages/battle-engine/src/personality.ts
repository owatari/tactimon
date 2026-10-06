/** Pokémon personality: FireRed natures (±10% on one stat) and per-stat IVs (0-31). */

export type IvStat = "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
export type IvSpread = Record<IvStat, number>;
export type NatureStat = Exclude<IvStat, "hp">;

export const IV_STATS: readonly IvStat[] = ["hp", "attack", "defense", "specialAttack", "specialDefense", "speed"];
export const MAX_IV = 31;
/** IV used by Pokémon without a stored personality (old saves, trainer parties, test builds). */
export const DEFAULT_IV = 15;

/** National order of FireRed natures: index = personality % 25 (Hardy … Quirky). */
export const NATURE_IDS = [
  "hardy", "lonely", "brave", "adamant", "naughty",
  "bold", "docile", "relaxed", "impish", "lax",
  "timid", "hasty", "serious", "jolly", "naive",
  "modest", "mild", "quiet", "bashful", "rash",
  "calm", "gentle", "sassy", "careful", "quirky",
] as const;
export type NatureId = (typeof NATURE_IDS)[number];

const NATURE_STATS: readonly NatureStat[] = ["attack", "defense", "speed", "specialAttack", "specialDefense"];

export interface NatureEffect {
  up: NatureStat | null;
  down: NatureStat | null;
}

/** +stat is `floor(index / 5)`, -stat is `index % 5`; equal pairs are the five neutral natures. */
export function natureEffect(nature: NatureId): NatureEffect {
  const index = NATURE_IDS.indexOf(nature);
  const up = NATURE_STATS[Math.floor(index / 5)];
  const down = NATURE_STATS[index % 5];
  return up === down ? { up: null, down: null } : { up, down };
}

export function isNatureId(value: unknown): value is NatureId {
  return typeof value === "string" && (NATURE_IDS as readonly string[]).includes(value);
}

/** 110 / 100 / 90 (percent) applied to a non-HP stat. */
export function naturePercent(nature: NatureId | undefined, stat: NatureStat): number {
  if (!nature) return 100;
  const effect = natureEffect(nature);
  if (effect.up === stat) return 110;
  if (effect.down === stat) return 90;
  return 100;
}

export function normalizeIvs(input: Partial<Record<IvStat, unknown>> | undefined | null): IvSpread | undefined {
  if (!input || typeof input !== "object") return undefined;
  const result = {} as IvSpread;
  for (const stat of IV_STATS) {
    const value = input[stat];
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    result[stat] = Math.max(0, Math.min(MAX_IV, Math.trunc(value)));
  }
  return result;
}

export interface Personality {
  nature: NatureId;
  ivs: IvSpread;
  /** Alternate colouring; only wild Pokémon roll it (never starters, gifts, trades or trainers). */
  shiny?: boolean;
}

/** One in 8192 wild Pokémon is shiny (Gen III odds). */
export const SHINY_ODDS = 8192;

export function rollShiny(random: () => number = Math.random, odds: number = SHINY_ODDS): boolean {
  const n = Math.max(1, Math.trunc(odds));
  return Math.min(n - 1, Math.floor(random() * n)) === 0;
}

/** Rolls a nature (uniform over 25) and six IVs (uniform 0-31) from any `[0,1)` random source. */
export function rollPersonality(random: () => number = Math.random): Personality {
  const unit = (max: number) => Math.min(max - 1, Math.floor(random() * max));
  const nature = NATURE_IDS[unit(NATURE_IDS.length)];
  const ivs = {} as IvSpread;
  for (const stat of IV_STATS) ivs[stat] = unit(MAX_IV + 1);
  return { nature, ivs };
}
