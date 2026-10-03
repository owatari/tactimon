import {
  rivalStarterFor,
  starterDisplayName,
  type StarterSpeciesId,
} from "@tactimon/battle-engine";

export type StoryState = {
  starter: StarterSpeciesId | null;
  rivalStarter: StarterSpeciesId | null;
  firstBattleComplete: boolean;
};

export const DEFAULT_STORY_STATE: StoryState = {
  starter: null,
  rivalStarter: null,
  firstBattleComplete: false,
};

export const STARTER_META: Record<
  StarterSpeciesId,
  {
    name: string;
    type: "grass" | "fire" | "water";
    description: string;
  }
> = {
  bulbasaur: {
    name: "Bulbasaur",
    type: "grass",
    description: "Equilibrado, resistente e ótimo para controle.",
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    description: "Mais rápido e ofensivo desde o começo.",
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    description: "Defensivo, estável e difícil de derrubar.",
  },
};

export function chooseStarter(
  starter: StarterSpeciesId,
): StoryState {
  return {
    starter,
    rivalStarter: rivalStarterFor(starter),
    firstBattleComplete: false,
  };
}

export function storyStarterSummary(
  story: StoryState,
): string | null {
  if (!story.starter || !story.rivalStarter) {
    return null;
  }

  return (
    `Você escolheu ${starterDisplayName(story.starter)}. ` +
    `Blue escolheu ${starterDisplayName(story.rivalStarter)}.`
  );
}
