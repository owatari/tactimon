import { useSyncExternalStore } from "react";
import { CATALOG } from "./catalog";

/**
 * Tactimon i18n. English is the source language: every user-facing string is
 * written in English and wrapped in `t("English text", { params })`. The
 * catalogs (`catalog/*.ts`) map that English text to pt/es/fr/zh. A missing
 * translation falls back to English, and `tests/i18n.test.ts` fails when a
 * `t("...")` literal has no entry in all four languages, so new content has to
 * ship translated.
 */

export const LOCALES = ["en", "pt", "es", "fr", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export type TranslatedLocale = Exclude<Locale, "en">;
export const TRANSLATED_LOCALES: readonly TranslatedLocale[] = [
  "pt",
  "es",
  "fr",
  "zh",
];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  zh: "中文",
};

/** A catalog entry: the English source text is the key. */
export type CatalogEntry = Record<TranslatedLocale, string>;
export type Catalog = Readonly<Record<string, CatalogEntry>>;

export const LOCALE_STORAGE_KEY = "tactimon.lang.v1";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value)
  );
}

/** Maps browser language tags (`pt-BR`, `zh-CN`, …) to a supported locale. */
export function detectLocale(
  languages: readonly string[] | undefined,
): Locale {
  for (const tag of languages ?? []) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

let current: Locale = "en";
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function setLocale(locale: Locale, persist = true): void {
  if (locale === current) return;
  current = locale;
  if (persist) {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage can be blocked; the choice just won't survive a reload.
    }
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang =
      locale === "zh" ? "zh-Hans" : locale;
  }
  notify();
}

/** Picks the saved language, else the browser's. Call once on the client. */
export function initLocale(): Locale {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    saved = null;
  }
  const next = isLocale(saved)
    ? saved
    : detectLocale(
        typeof navigator !== "undefined"
          ? navigator.languages?.length
            ? navigator.languages
            : [navigator.language]
          : [],
      );
  setLocale(next, false);
  return next;
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the calling component when the language changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "en");
}

export type TParams = Record<string, string | number>;

export function interpolate(text: string, params?: TParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Translates an English source string into the active language. */
export function t(source: string, params?: TParams): string {
  return translate(source, current, params);
}

export function translate(
  source: string,
  locale: Locale,
  params?: TParams,
): string {
  const entry = locale === "en" ? undefined : CATALOG[source];
  return interpolate(entry?.[locale as TranslatedLocale] || source, params);
}

/** Placeholder names (`{name}`) used by a string, for catalog consistency checks. */
export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
