import { createPokemonProgression } from "../../packages/battle-engine/src";
import {
  chooseStarter,
  completeStoryPlayerEvent,
  grantStoryBadge,
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  markStoryTrainerDefeated,
  normalizeStoryState,
  type StoryBadgeId,
  type StoryFieldTechniqueId,
  type StoryKeyItemId,
  type StoryState,
} from "../../apps/client/lib/story";

export type SeedSpec = {
  starter?: "squirtle" | "charmander" | "bulbasaur";
  level: number;
  badges?: StoryBadgeId[];
  keys?: StoryKeyItemId[];
  techniques?: StoryFieldTechniqueId[];
  trainers?: string[];
  /** Extra party members (species, level). */
  party?: [string, number][];
  money?: number;
  map: string;
  x?: number;
  y?: number;
};

/** A save in the middle of the game, for testing one stretch of the walkthrough on its own. */
export function seedStory(spec: SeedSpec): StoryState {
  let story: StoryState = { ...chooseStarter(spec.starter ?? "squirtle"), firstBattleComplete: true };
  story = completeStoryPlayerEvent(story, "story", "pokedex-received");
  story = grantStoryKeyItemOnce(story, "town-map").story;
  for (const badge of spec.badges ?? []) story = grantStoryBadge(story, badge);
  for (const key of spec.keys ?? []) story = grantStoryKeyItemOnce(story, key).story;
  for (const technique of spec.techniques ?? []) story = grantStoryFieldTechniqueOnce(story, technique).story;
  for (const trainer of spec.trainers ?? []) story = markStoryTrainerDefeated(story, trainer);
  story = {
    ...story,
    runningShoesReceived: (spec.badges?.length ?? 0) > 0,
    money: spec.money ?? 3000,
    inventory: { ...story.inventory, potion: 8, "poke-ball": 15 },
  } as StoryState;
  const lead = createPokemonProgression(spec.starter ?? "squirtle", spec.level);
  const members = (spec.party ?? []).map(([species, level]) => createPokemonProgression(species as never, level));
  return normalizeStoryState({ ...story, playerPokemon: lead, capturedPokemon: members } as never);
}
