import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  grantWildBattleProgress,
} from "../packages/battle-engine/src";
import { applyPartyProgressionRewards } from "../apps/client/lib/partyProgress";
import { normalizeStoryState } from "../apps/client/lib/story";

function story() {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    capturedPokemon: [
      { ...createPokemonProgression("pidgey", 17), species: "pidgey" },
    ],
  } as never);
}

describe("evolution persistence", () => {
  it("keeps the evolved species so the evolution plays only once", () => {
    let current = story();
    const reward = grantWildBattleProgress(
      { ...current.capturedPokemon[0], experience: 10_000 },
      { species: "pidgey", level: 20 },
    );
    expect(reward.evolutions.map((e) => e.to)).toEqual(["pidgeotto"]);

    current = applyPartyProgressionRewards(current, [reward], [1]);
    expect(current.capturedPokemon[0].species).toBe("pidgeotto");

    const second = grantWildBattleProgress(current.capturedPokemon[0], {
      species: "pidgey",
      level: 20,
    });
    expect(second.evolutions).toEqual([]);
  });

  it("keeps evolved and generated species when a save is loaded", () => {
    const loaded = normalizeStoryState({
      ...story(),
      capturedPokemon: [
        { ...createPokemonProgression("pidgey", 20), species: "pidgeotto" },
        { ...createPokemonProgression("eevee", 5), species: "eevee" },
        { ...createPokemonProgression("pidgey", 5), species: "not-a-mon" },
      ],
    } as never);
    expect(loaded.capturedPokemon.map((p) => p.species)).toEqual([
      "pidgeotto",
      "eevee",
    ]);
  });
});
