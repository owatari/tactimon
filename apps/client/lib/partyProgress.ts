import type { ProgressionReward } from "@tactimon/battle-engine";
import type { StoryState } from "./story";

export function applyPartyProgressionRewards(
  current: StoryState,
  rewards: readonly ProgressionReward[],
  partyIndices: readonly number[],
): StoryState {
  let playerPokemon = current.playerPokemon;
  const capturedPokemon = [...current.capturedPokemon];

  rewards.forEach((reward, rewardIndex) => {
    const partyIndex = partyIndices[rewardIndex];
    if (partyIndex === undefined) {
      return;
    }

    if (partyIndex === 0) {
      playerPokemon = reward.progression;
      return;
    }

    const capturedIndex = partyIndex - 1;
    const existing = capturedPokemon[capturedIndex];
    if (!existing) {
      return;
    }

    capturedPokemon[capturedIndex] = {
      ...reward.progression,
      // Keep the evolved species (the old line pinned the pre-evolution one,
      // which re-triggered the evolution screen after every battle).
      species: reward.progression.species as typeof existing.species,
    };
  });

  return {
    ...current,
    playerPokemon,
    capturedPokemon: capturedPokemon.slice(0, 5),
  };
}
