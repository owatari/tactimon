import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateDuelPokemonMaxHp,
  duelSpeciesTypes,
  isDuelSpeciesId,
} from "../packages/battle-engine/src";

const species = JSON.parse(
  readFileSync(
    new URL("../packages/game-data/data/kanto-species.json", import.meta.url),
    "utf-8",
  ),
);
const moves = JSON.parse(
  readFileSync(
    new URL("../packages/game-data/data/kanto-moves.json", import.meta.url),
    "utf-8",
  ),
);

describe("ROM-extracted Kanto data", () => {
  it("covers all 151 species with learnsets", () => {
    expect(Object.keys(species)).toHaveLength(151);
    expect(species.pikachu.dex).toBe(25);
    expect(species.charmander.evolutions[0]).toMatchObject({ method: "level", param: 16, to: "charmeleon" });
    for (const entry of Object.values<any>(species)) {
      expect(entry.learnset.length, entry.id).toBeGreaterThan(0);
      for (const learned of entry.learnset) {
        expect(moves, `${entry.id}:${learned.move}`).toHaveProperty(learned.move);
      }
    }
  });

  it("matches the engine for species it already implements", () => {
    const implemented = Object.keys(species).filter(isDuelSpeciesId);
    expect(implemented.length).toBeGreaterThan(40);
    for (const id of implemented) {
      const hp = calculateDuelPokemonMaxHp({ species: id as never, level: 100 });
      expect((hp - 125) / 2, `${id} base HP`).toBe(species[id].hp);
      expect([...duelSpeciesTypes(id as never)].sort(), `${id} types`).toEqual(
        [...species[id].types].sort(),
      );
    }
  });
});
