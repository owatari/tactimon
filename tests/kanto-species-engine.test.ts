import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DUEL_MOVES,
  POKEMON_LEARNSETS,
  calculateDuelPokemonStats,
  createPokemonProgression,
  createWildDuel,
  isDuelSpeciesId,
  speciesDisplayName,
} from "../packages/battle-engine/src";

const species = JSON.parse(
  readFileSync(
    new URL("../packages/game-data/data/kanto-species.json", import.meta.url),
    "utf-8",
  ),
);

describe("all 151 Kanto species in the engine", () => {
  it("implements every species with legal moves", () => {
    for (const id of Object.keys(species)) {
      expect(isDuelSpeciesId(id), id).toBe(true);
      const progression = createPokemonProgression(id as never, 20);
      expect(progression.activeMoves.length, id).toBeGreaterThan(0);
      for (const move of progression.activeMoves) {
        expect(DUEL_MOVES, `${id}:${move}`).toHaveProperty(move);
      }
      for (const entry of POKEMON_LEARNSETS[id as never]) {
        expect(DUEL_MOVES, `${id}:${entry.moveId}`).toHaveProperty(entry.moveId);
      }
      expect(calculateDuelPokemonStats(progression).hp, id).toBeGreaterThan(10);
      expect(speciesDisplayName(id as never).length).toBeGreaterThan(2);
    }
  });

  it("starts a wild battle against a newly added species", () => {
    const state = createWildDuel({
      seed: 3,
      player: { species: "bulbasaur", level: 10, moves: ["tackle", "growl"] },
      wildSpecies: "gengar" as never,
      wildLevel: 25,
    });
    expect(state.units.some((unit) => unit.species === "gengar")).toBe(true);
  });
});
