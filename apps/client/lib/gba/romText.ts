import { t } from "../i18n";

/** Characters the FireRed Western font can draw (Latin letters, digits, punctuation, accents, symbols). */
const DRAWABLE = /^[\x20-\x7e¡-ÿŒœ‘’“”…·♂♀▶↑↓×{}]*$/;

/** Characters missing from the ROM font that have a close unaccented stand-in. */
const FALLBACK: Record<string, string> = { ã: "a", õ: "o", Ã: "A", Õ: "O", ú: "ú" };

/**
 * Translates a ROM-screen label for the current language. The ROM font has no CJK glyphs (and no ã/õ),
 * so Chinese keeps the English ROM text and Portuguese tildes are flattened.
 */
export function romLabel(english: string): string {
  const out = t(english).replace(/[ãõÃÕ]/g, (c) => FALLBACK[c] ?? c);
  return DRAWABLE.test(out) ? out : english;
}

/** Uppercases a (localized) name for the ROM font, falling back to `fallback` when it cannot be drawn. */
export function romName(localized: string, fallback: string): string {
  const out = localized.toUpperCase().replace(/[ãõÃÕ]/g, (c) => FALLBACK[c] ?? c);
  return DRAWABLE.test(out) ? out : fallback.toUpperCase();
}
