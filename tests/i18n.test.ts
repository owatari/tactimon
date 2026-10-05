import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOCALES,
  TRANSLATED_LOCALES,
  detectLocale,
  interpolate,
  placeholdersOf,
  translate,
} from "../apps/client/lib/i18n";
import { CATALOG } from "../apps/client/lib/i18n/catalog";

const ROOT = new URL("../apps/client/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === "generated" || name === "catalog" || name === "i18n") return [];
    return statSync(full).isDirectory()
      ? sourceFiles(full)
      : /\.(ts|tsx)$/.test(name)
        ? [full]
        : [];
  });
}

/** Every `t("literal")` call in client code. */
function usedKeys(): Map<string, string> {
  const used = new Map<string, string>();
  const call = /(?<![\w.])(?:t|tx)\(\s*"((?:[^"\\n]|\.)*)"/g;
  for (const dir of ["lib", "components", "app"]) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const text = readFileSync(file, "utf-8");
      for (const match of text.matchAll(call)) {
        used.set(JSON.parse(`"${match[1]}"`), file);
      }
    }
  }
  return used;
}

describe("i18n catalog", () => {
  it("has all four translations for every entry, with the same placeholders", () => {
    for (const [source, entry] of Object.entries(CATALOG)) {
      for (const locale of TRANSLATED_LOCALES) {
        expect(entry[locale]?.trim(), `${locale}: ${source}`).toBeTruthy();
        expect(placeholdersOf(entry[locale]), `${locale}: ${source}`).toEqual(
          placeholdersOf(source),
        );
      }
    }
  });

  it("covers every t(\"…\") literal used in the client code", () => {
    const missing = [...usedKeys()].filter(([source]) => !(source in CATALOG));
    expect(
      missing.map(([source, file]) => `${source}  (${file})`),
    ).toEqual([]);
  });
});

describe("translate", () => {
  it("falls back to English and interpolates params", () => {
    expect(translate("ERASE SAVE", "en")).toBe("ERASE SAVE");
    expect(translate("ERASE SAVE", "fr")).toBe("EFFACER SAUVEGARDE");
    expect(translate("Not in the catalog", "zh")).toBe("Not in the catalog");
    expect(interpolate("Hi {name}!", { name: "Red" })).toBe("Hi Red!");
    expect(LOCALES).toEqual(["en", "pt", "es", "fr", "zh"]);
  });

  it("detects the browser language", () => {
    expect(detectLocale(["pt-BR", "en"])).toBe("pt");
    expect(detectLocale(["zh-CN"])).toBe("zh");
    expect(detectLocale(["de-DE", "fr-CA"])).toBe("fr");
    expect(detectLocale(["de"])).toBe("en");
    expect(detectLocale(undefined)).toBe("en");
  });
});
