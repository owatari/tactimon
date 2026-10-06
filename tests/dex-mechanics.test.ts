import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { buildTrainerCard, formatHofDebut } from "../apps/client/lib/gameMenu";
import { MOVE_DESCRIPTIONS } from "../apps/client/lib/generated/moveDescriptions";
import { POKEDEX_SPECIES, getPokedex, hasAllKantoMons, syncPokedexCaught } from "../apps/client/lib/pokedex";
import { chooseStarter, normalizeStoryState } from "../apps/client/lib/story";

describe("Pokédex caught flags are permanent", () => {
  it("registers owned species once and keeps them after the Pokémon leaves", () => {
    const base = normalizeStoryState({
      starter: "charmander",
      playerPokemon: createPokemonProgression("charmander", 10),
      capturedPokemon: [createPokemonProgression("pidgey", 4)],
    });
    const first = syncPokedexCaught(base);
    expect(first.newlyCaught.sort()).toEqual(["charmander", "pidgey"]);
    // Trade the Pidgey away: it stays caught/seen.
    const traded = { ...first.story, capturedPokemon: [] };
    expect(syncPokedexCaught(traded).newlyCaught).toEqual([]);
    const dex = getPokedex(traded);
    expect(dex.entries[15].status).toBe("caught");
    expect(dex.caughtCount).toBe(2);
  });

  it("HasAllKantoMons ignores Mew, as in FireRed", () => {
    const caught = POKEDEX_SPECIES.slice(0, 150);
    const story = normalizeStoryState({ pokedex: { seen: caught, caught } });
    expect(hasAllKantoMons(story)).toBe(true);
    expect(hasAllKantoMons(normalizeStoryState({ pokedex: { seen: [], caught: caught.slice(1) } }))).toBe(false);
  });
});

describe("Trainer Card", () => {
  it("shows name, ID No., stars and Hall of Fame debut", () => {
    const fresh = chooseStarter("bulbasaur");
    expect(fresh.trainerName).toBe("RED");
    expect(fresh.trainerId).toBeGreaterThanOrEqual(0);
    const card0 = buildTrainerCard({ ...fresh, trainerId: 42 });
    expect(card0.idNo).toBe("00042");
    expect(card0.stars).toBe(0);
    const champion = {
      ...fresh,
      defeatedTrainerIds: ["league-champion-blue-squirtle"],
      hofDebutSeconds: 3725,
      pokemonTrades: 2,
    };
    const card = buildTrainerCard(champion);
    expect(card.stars).toBe(1);
    expect(card.hofDebut).toBe(formatHofDebut(3725));
    expect(card.hofDebut?.trim()).toBe("1:02:05");
    expect(card.pokemonTrades).toBe(2);
  });

  it("old saves without the new fields normalize to FireRed defaults", () => {
    const old = normalizeStoryState({ starter: "squirtle" });
    expect(old.trainerName).toBe("RED");
    expect(old.pokemonTrades).toBe(0);
    expect(old.hofDebutSeconds).toBeUndefined();
  });
});

describe("Summary move info", () => {
  it("has the ROM description for the starters' moves", () => {
    for (const key of ["tackle", "scratch", "growl", "ember", "vinewhip"]) {
      expect(MOVE_DESCRIPTIONS[key], key).toBeTruthy();
    }
    expect(MOVE_DESCRIPTIONS.pound).toContain("physical attack");
  });
});
