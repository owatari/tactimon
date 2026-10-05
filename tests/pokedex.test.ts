import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  POKEDEX_SPECIES,
  getPokedex,
  markPokedexSeen,
  normalizePokedex,
} from "../apps/client/lib/pokedex";
import { buildTrainerCard } from "../apps/client/lib/gameMenu";
import {
  normalizeStoryState,
  type CapturedPokemon,
} from "../apps/client/lib/story";

describe("Pokédex", () => {
  it("lists the 151 Kanto species in national order", () => {
    expect(POKEDEX_SPECIES).toHaveLength(151);
    expect(POKEDEX_SPECIES[0]).toBe("bulbasaur");
    expect(POKEDEX_SPECIES[24]).toBe("pikachu");
    expect(POKEDEX_SPECIES[150]).toBe("mew");
  });

  it("counts owned Pokémon as caught and seen", () => {
    const story = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 5),
      capturedPokemon: [
        createPokemonProgression("rattata", 3),
      ] as CapturedPokemon[],
    });
    const dex = getPokedex(story);
    expect(dex.caughtCount).toBe(2);
    expect(dex.entries[18].status).toBe("caught");
    expect(dex.entries[24].status).toBe("unseen");
  });

  it("records seen species once and ignores unknown ids", () => {
    const base = normalizeStoryState({ starter: "bulbasaur" });
    const seen = markPokedexSeen(base, ["pidgey", "pidgey", "missingno"]);
    expect(seen.pokedex?.seen).toEqual(["pidgey"]);
    expect(markPokedexSeen(seen, ["pidgey"])).toBe(seen);
    expect(getPokedex(seen).entries[15].status).toBe("seen");
    // the starter counts as owned, so seen = starter + pidgey
    expect(buildTrainerCard(seen).pokedexSeen).toBe(2);
  });

  it("migrates saves without a Pokédex", () => {
    expect(normalizeStoryState({ starter: "bulbasaur" }).pokedex).toEqual({
      seen: [],
      caught: [],
    });
    expect(normalizePokedex({ seen: ["pikachu", 3, "x"] }).seen).toEqual(["pikachu"]);
  });
});
