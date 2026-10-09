import { MAX_PARTY_COMPANIONS } from "./captureChoice";
import { moveBoxedToBox, swapBoxed, swapPartyWithBoxed } from "./pcBoxes";
import {
  depositCapturedPokemon,
  withdrawBoxedPokemon,
  type StoryState,
} from "./story";

/** What the player picks up: a party member (0-based index into `capturedPokemon`) or a boxed Pokémon. */
export type PcSource = { kind: "party"; index: number } | { kind: "box"; index: number };

/**
 * Where it is dropped: a party slot (0 = the lead, 1–5 = `capturedPokemon[slot - 1]`), a boxed
 * Pokémon, or a box itself (its tab or an empty cell).
 */
export type PcTarget =
  | { kind: "party-slot"; slot: number }
  | { kind: "box-slot"; index: number }
  | { kind: "box"; box: number };

export type PcActionMessage =
  | "deposited"
  | "withdrawn"
  | "swapped"
  | "moved"
  | "lead-locked"
  | "party-full"
  | "box-full"
  | "nothing";

export type PcActionResult = { accepted: boolean; story: StoryState; message: PcActionMessage };

const fail = (story: StoryState, message: PcActionMessage): PcActionResult => ({
  accepted: false,
  story,
  message,
});

/** One drag and drop (or select-then-place) in the PC window, as a pure story transition. */
export function applyPcAction(story: StoryState, source: PcSource, target: PcTarget): PcActionResult {
  if (source.kind === "party") {
    if (target.kind === "box-slot") {
      const next = swapPartyWithBoxed(story, source.index, target.index);
      return next ? { accepted: true, story: next, message: "swapped" } : fail(story, "nothing");
    }
    if (target.kind === "box") {
      const result = depositCapturedPokemon(story, source.index, target.box);
      return result.accepted ? { accepted: true, story: result.story, message: "deposited" } : fail(story, "box-full");
    }
    return fail(story, "nothing"); // party slot onto party slot is the Pokémon window's job
  }

  if (target.kind === "party-slot") {
    if (target.slot === 0) return fail(story, "lead-locked");
    const occupant = story.capturedPokemon[target.slot - 1];
    if (occupant) {
      const next = swapPartyWithBoxed(story, target.slot - 1, source.index);
      return next ? { accepted: true, story: next, message: "swapped" } : fail(story, "nothing");
    }
    if (story.capturedPokemon.length >= MAX_PARTY_COMPANIONS) return fail(story, "party-full");
    const result = withdrawBoxedPokemon(story, source.index);
    return result.accepted ? { accepted: true, story: result.story, message: "withdrawn" } : fail(story, "party-full");
  }
  if (target.kind === "box-slot") {
    const next = swapBoxed(story, source.index, target.index);
    return next ? { accepted: true, story: next, message: "swapped" } : fail(story, "nothing");
  }
  const next = moveBoxedToBox(story, source.index, target.box);
  return next ? { accepted: true, story: next, message: "moved" } : fail(story, "box-full");
}
