/**
 * Rarity for the Auto Catch AI (tasks 030/031).
 *
 * What matters is how rarely a Pokémon APPEARS in the area where it is met: in Viridian Forest
 * Pikachu (5%) is the rarest, then Metapod and Kakuna, then Weedle and Caterpie. The area's share
 * of encounters (`appearanceRate`) sets the base tier; without it (static battles, tests) the
 * species' catch rate stands in. A curated list then lifts species that are valuable no matter
 * where they appear (legendaries, Pikachu, Eevee, Dratini, fossils, starters, Snorlax…).
 */

/** Share of the encounters of an area at or below which a species counts as rare / uncommon. */
export const RARE_APPEARANCE = 0.05;
export const UNCOMMON_APPEARANCE = 0.15;

/** Tier lift for valuable species: legendary / mythic +2, everything else listed +1. */
const LEGENDARY = ["articuno", "zapdos", "moltres", "mewtwo", "mew"];
const VALUABLE = [
  "pikachu", "raichu", "eevee", "vaporeon", "jolteon", "flareon",
  "dratini", "dragonair", "dragonite", "snorlax", "lapras", "ditto", "porygon",
  "aerodactyl", "omanyte", "omastar", "kabuto", "kabutops",
  "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon", "charizard",
  "squirtle", "wartortle", "blastoise",
  "hitmonlee", "hitmonchan", "kangaskhan", "tauros", "scyther", "pinsir", "chansey",
  "farfetchd", "mr-mime", "jynx", "magmar", "electabuzz",
];

const RARITY_BONUS: Readonly<Record<string, number>> = Object.fromEntries([
  ...LEGENDARY.map((id) => [id, 2] as const),
  ...VALUABLE.map((id) => [id, 1] as const),
]);

export function rarityBonus(species: string): number {
  return RARITY_BONUS[species] ?? 0;
}

/** Base tier from the area's appearance rate (0 common, 1 uncommon, 2 rare). */
export function appearanceTier(appearanceRate: number): 0 | 1 | 2 {
  if (appearanceRate <= RARE_APPEARANCE) return 2;
  if (appearanceRate <= UNCOMMON_APPEARANCE) return 1;
  return 0;
}

/** Base tier from the catch rate when no area data exists (<= 45 rare, <= 120 uncommon). */
export function catchRateTier(catchRate: number): 0 | 1 | 2 {
  if (catchRate <= 45) return 2;
  if (catchRate <= 120) return 1;
  return 0;
}
