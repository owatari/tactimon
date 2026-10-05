import { describe, expect, it } from "vitest";
import { DUEL_MOVES } from "../packages/battle-engine/src";
import {
  localizeKnownNames,
  localizedMoveName,
  localizedSpeciesName,
} from "../apps/client/lib/i18n/names";
import {
  MOVE_NAMES,
  SPECIES_NAMES,
} from "../apps/client/lib/i18n/namesData";
import species from "../packages/game-data/data/kanto-species.json";

describe("localized names", () => {
  it("covers all 151 Kanto species and every move in the engine", () => {
    expect(Object.keys(species).filter((id) => !(id in SPECIES_NAMES))).toEqual([]);
    expect(
      Object.keys(DUEL_MOVES).filter(
        (id) => id !== "struggle" && !(id in MOVE_NAMES),
      ),
    ).toEqual([]);
  });

  it("returns the right name per language", () => {
    expect(localizedSpeciesName("bulbasaur", "en")).toBe("Bulbasaur");
    expect(localizedSpeciesName("bulbasaur", "es")).toBe("Bulbasaur");
    expect(localizedSpeciesName("bulbasaur", "fr")).toBe("Bulbizarre");
    expect(localizedSpeciesName("bulbasaur", "zh")).toBe("妙蛙种子");
    expect(localizedMoveName("tackle", "en")).toBe("Tackle");
    expect(localizedMoveName("tackle", "pt")).toBe("Investida");
    expect(localizedMoveName("tackle", "es")).toBe("Placaje");
    expect(localizedMoveName("tackle", "fr")).toBe("Charge");
    expect(localizedMoveName("tackle", "zh")).toBe("撞击");
  });

  it("localizes names inside composed log lines", () => {
    expect(
      localizeKnownNames("Bulbasaur used Tackle on Pidgey.", "fr"),
    ).toBe("Bulbizarre used Charge on Roucool.");
    expect(localizeKnownNames("Thunder Shock hit Pikachu", "zh")).toContain(
      "电击",
    );
    expect(localizeKnownNames("Bulbasaur used Tackle", "en")).toBe(
      "Bulbasaur used Tackle",
    );
  });
});

describe("battle log localization", () => {
  it("translates the template and swaps the names", async () => {
    const { setLocale } = await import("../apps/client/lib/i18n");
    const { localizeLogEntry } = await import("../apps/client/lib/i18n/names");
    const entry = {
      template: "{target} fainted.",
      params: { target: "Bulbasaur" },
    };
    setLocale("fr", false);
    expect(localizeLogEntry(entry, "x")).toContain("Bulbizarre");
    setLocale("zh", false);
    expect(localizeLogEntry(entry, "x")).toContain("妙蛙种子");
    setLocale("en", false);
    expect(localizeLogEntry(entry, "x")).toBe("Bulbasaur fainted.");
  });
});
