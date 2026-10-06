import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  fireRedExperienceAtLevel,
  grantWildBattlesProgressToParty,
} from "../packages/battle-engine/src";
import { applyPartyProgressionRewards } from "../apps/client/lib/partyProgress";
import { chooseStarter, normalizeStoryState } from "../apps/client/lib/story";

/** A Pokémon one XP short of `level`, so a single win levels it up. */
function almost(species: string, level: number) {
  const pokemon = createPokemonProgression(species as never, level - 1);
  return { ...pokemon, experience: fireRedExperienceAtLevel(pokemon.species, level) - 1 };
}

describe("level-up moves reach the saved party", () => {
  it("the leader and the captured members learn the new moves of their level", () => {
    const base = chooseStarter("charmander");
    const story = normalizeStoryState({
      ...base,
      playerPokemon: almost("charmander", 7),
      capturedPokemon: [almost("pidgey", 9), almost("rattata", 7)],
    } as never);
    const party = [story.playerPokemon!, ...story.capturedPokemon];
    const rewards = grantWildBattlesProgressToParty(party, [{ species: "rattata", level: 20 }]);
    const next = applyPartyProgressionRewards(story, rewards, [0, 1, 2]);
    expect(next.playerPokemon!.level).toBeGreaterThanOrEqual(7);
    expect(next.playerPokemon!.activeMoves).toContain("ember");
    expect(next.capturedPokemon[0].activeMoves).toContain("gust");
    expect(next.capturedPokemon[1].activeMoves).toContain("quick-attack");
  });

  it("with four moves already, the new move is queued for the player to decide", () => {
    const base = chooseStarter("charmander");
    const full = { ...almost("charmander", 13), activeMoves: ["scratch", "growl", "ember", "leer"] as never };
    const rewards = grantWildBattlesProgressToParty([full], [{ species: "rattata", level: 14 }]);
    expect(rewards[0].newLevel).toBeGreaterThanOrEqual(13);
    expect(rewards[0].pendingMoves).toContain("metal-claw");
    const story = normalizeStoryState({ ...base, playerPokemon: full } as never);
    const next = applyPartyProgressionRewards(story, rewards, [0]);
    expect(next.playerPokemon!.activeMoves).toHaveLength(4);
  });
});
