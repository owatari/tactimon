import { DUEL_MOVES, speciesDisplayName } from "@tactimon/battle-engine";
import { getLocale, t, type Locale, type TParams } from "./index";
import { MOVE_NAMES, SPECIES_NAMES } from "./namesData";

/** Localized species name (pt/es keep the English name, fr/zh have their own). */
export function localizedSpeciesName(
  species: string,
  locale: Locale = getLocale(),
): string {
  const english = speciesDisplayName(species as never);
  const entry = SPECIES_NAMES[species];
  if (!entry) return english;
  if (locale === "fr") return entry[0];
  if (locale === "zh") return entry[1];
  return english;
}

const MOVE_LOCALE_INDEX: Partial<Record<Locale, number>> = {
  pt: 0,
  es: 1,
  fr: 2,
  zh: 3,
};

export function localizedMoveName(
  moveId: string,
  locale: Locale = getLocale(),
): string {
  const english = DUEL_MOVES[moveId as keyof typeof DUEL_MOVES]?.name ?? moveId;
  const index = MOVE_LOCALE_INDEX[locale];
  const entry = MOVE_NAMES[moveId];
  return entry && index !== undefined ? entry[index] : english;
}

type NameSwap = { from: string; to: string };
const swapCache = new Map<Locale, NameSwap[]>();

function swapsFor(locale: Locale): NameSwap[] {
  let swaps = swapCache.get(locale);
  if (!swaps) {
    swaps = [];
    for (const id of Object.keys(SPECIES_NAMES)) {
      const from = speciesDisplayName(id as never);
      const to = localizedSpeciesName(id, locale);
      if (from !== to) swaps.push({ from, to });
    }
    for (const id of Object.keys(MOVE_NAMES)) {
      const from = DUEL_MOVES[id as keyof typeof DUEL_MOVES]?.name;
      const to = localizedMoveName(id, locale);
      if (from && from !== to) swaps.push({ from, to });
    }
    // Longest first so "Thunder Shock" wins over "Thunder".
    swaps.sort((a, b) => b.from.length - a.from.length);
    swapCache.set(locale, swaps);
  }
  return swaps;
}

/** A structured engine log line, localized (template + params, names swapped). */
export function localizeLogEntry(
  entry: { template: string; params: Record<string, string | number> } | undefined,
  fallback: string,
): string {
  if (!entry) return localizeKnownNames(fallback);
  return localizeKnownNames(t(entry.template, entry.params as TParams));
}

/**
 * Replaces the English Pokémon and move names inside an already composed
 * sentence (battle log lines) with their localized versions.
 */
export function localizeKnownNames(
  text: string,
  locale: Locale = getLocale(),
): string {
  if (locale === "en") return text;
  let out = text;
  for (const { from, to } of swapsFor(locale)) {
    if (out.includes(from)) {
      out = out.replace(
        new RegExp(`(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu"),
        to,
      );
    }
  }
  return out;
}
