import type { StarterSpeciesId } from "@tactimon/battle-engine";

export const STARTER_ORDER: readonly StarterSpeciesId[] = [
  "bulbasaur",
  "charmander",
  "squirtle",
];

export type StarterChoiceState = {
  /** Ball under the cursor. */
  index: number;
  /** "pick" = choosing a ball; "confirm" = "So, you want X?" YES/NO. */
  stage: "pick" | "confirm";
  /** 0 = YES, 1 = NO. */
  answer: 0 | 1;
};

export type StarterChoiceKey = "left" | "right" | "up" | "down" | "confirm" | "back";

export type StarterChoiceResult = {
  state: StarterChoiceState;
  /** Set when the player confirmed YES. */
  chosen?: StarterSpeciesId;
  /** Set when the player backed out of the whole screen. */
  close?: boolean;
};

export const INITIAL_STARTER_CHOICE: StarterChoiceState = {
  index: 0,
  stage: "pick",
  answer: 0,
};

/** Pure FireRed-style input handling for the Oak's-table starter screen. */
export function stepStarterChoice(
  state: StarterChoiceState,
  key: StarterChoiceKey,
): StarterChoiceResult {
  const count = STARTER_ORDER.length;
  if (state.stage === "pick") {
    if (key === "left")
      return { state: { ...state, index: (state.index + count - 1) % count } };
    if (key === "right")
      return { state: { ...state, index: (state.index + 1) % count } };
    if (key === "confirm")
      return { state: { ...state, stage: "confirm", answer: 0 } };
    if (key === "back") return { state, close: true };
    return { state };
  }
  if (key === "up") return { state: { ...state, answer: 0 } };
  if (key === "down") return { state: { ...state, answer: 1 } };
  if (key === "back") return { state: { ...state, stage: "pick" } };
  if (key === "confirm") {
    return state.answer === 0
      ? { state, chosen: STARTER_ORDER[state.index] }
      : { state: { ...state, stage: "pick" } };
  }
  return { state };
}
