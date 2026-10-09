import type { CapturedPokemon, StoryState } from "./story";

export const PC_BOX_COUNT = 14;
export const PC_PER_BOX = 30;
/** Boxes every trainer starts with; the rest are bought one by one at the PC. */
export const PC_FREE_BOXES = 5;

/** Price of the next box: 1st paid box ₽1,000, then +₽1,000 each (box 14 costs ₽9,000). */
export function pcBoxPrice(boxNumber: number): number {
  return Math.max(0, boxNumber - PC_FREE_BOXES) * 1000;
}

type BoxView = Pick<StoryState, "boxedPokemon" | "boxSlots">;
type BoxCountView = Pick<StoryState, "boxedPokemon" | "boxSlots" | "pcBoxes">;

const clampBox = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < PC_BOX_COUNT
    ? value
    : null;

/**
 * The box of every boxed Pokémon (parallel to `boxedPokemon`). Saves from before paid boxes have no
 * `boxSlots`: they were packed in order, so entry `i` lived in box `floor(i / 30)`.
 */
export function boxSlotsOf(story: BoxView): number[] {
  return story.boxedPokemon.map(
    (_, index) =>
      clampBox(story.boxSlots?.[index]) ?? Math.min(PC_BOX_COUNT - 1, Math.floor(index / PC_PER_BOX)),
  );
}

/** Boxes that are open: the paid count, and never fewer than the ones already holding Pokémon. */
export function unlockedPcBoxes(story: BoxCountView): number {
  const paid = Math.max(PC_FREE_BOXES, Math.min(PC_BOX_COUNT, Math.trunc(story.pcBoxes ?? PC_FREE_BOXES)));
  const slots = boxSlotsOf(story);
  return Math.min(PC_BOX_COUNT, Math.max(paid, slots.length ? Math.max(...slots) + 1 : 0));
}

export function pcCapacity(story: BoxCountView): number {
  return unlockedPcBoxes(story) * PC_PER_BOX;
}

export function boxPopulation(story: BoxView, box: number): number {
  return boxSlotsOf(story).filter((slot) => slot === box).length;
}

/** Indices (into `boxedPokemon`) of the Pokémon in a box, in order. */
export function boxMembers(story: BoxView, box: number): number[] {
  return boxSlotsOf(story).flatMap((slot, index) => (slot === box ? [index] : []));
}

export function firstBoxWithRoom(story: StoryState, preferred?: number): number | null {
  const open = unlockedPcBoxes(story);
  const order = [
    ...(preferred !== undefined && preferred >= 0 && preferred < open ? [preferred] : []),
    ...Array.from({ length: open }, (_, index) => index),
  ];
  return order.find((box) => boxPopulation(story, box) < PC_PER_BOX) ?? null;
}

export function pcHasRoom(story: StoryState): boolean {
  return firstBoxWithRoom(story) !== null;
}

/** Adds a Pokémon to a box (the preferred one if it has room, else the first with room). */
export function appendBoxed(
  story: StoryState,
  pokemon: CapturedPokemon,
  preferredBox?: number,
): StoryState | null {
  const box = firstBoxWithRoom(story, preferredBox);
  if (box === null) return null;
  return {
    ...story,
    boxedPokemon: [...story.boxedPokemon, pokemon],
    boxSlots: [...boxSlotsOf(story), box],
  };
}

export function removeBoxed(
  story: StoryState,
  index: number,
): { story: StoryState; pokemon: CapturedPokemon } | null {
  const pokemon = story.boxedPokemon[index];
  if (!pokemon) return null;
  return {
    pokemon,
    story: {
      ...story,
      boxedPokemon: story.boxedPokemon.filter((_, i) => i !== index),
      boxSlots: boxSlotsOf(story).filter((_, i) => i !== index),
    },
  };
}

/** Relocates a boxed Pokémon to another (open, not full) box. */
export function moveBoxedToBox(story: StoryState, index: number, box: number): StoryState | null {
  const slots = boxSlotsOf(story);
  if (!story.boxedPokemon[index] || box < 0 || box >= unlockedPcBoxes(story)) return null;
  if (slots[index] === box) return null;
  if (boxPopulation(story, box) >= PC_PER_BOX) return null;
  return { ...story, boxSlots: slots.map((slot, i) => (i === index ? box : slot)) };
}

/** Swaps two boxed Pokémon: each takes the other's box and place in the order. */
export function swapBoxed(story: StoryState, a: number, b: number): StoryState | null {
  if (a === b || !story.boxedPokemon[a] || !story.boxedPokemon[b]) return null;
  const pokemon = [...story.boxedPokemon];
  [pokemon[a], pokemon[b]] = [pokemon[b], pokemon[a]];
  return { ...story, boxedPokemon: pokemon, boxSlots: boxSlotsOf(story) };
}

/** A party member (slot 2–6) trades places with a boxed Pokémon: it takes the box slot of the one coming out. */
export function swapPartyWithBoxed(
  story: StoryState,
  capturedIndex: number,
  boxedIndex: number,
): StoryState | null {
  const inParty = story.capturedPokemon[capturedIndex];
  const inBox = story.boxedPokemon[boxedIndex];
  if (!inParty || !inBox) return null;
  const capturedPokemon = [...story.capturedPokemon];
  const boxedPokemon = [...story.boxedPokemon];
  capturedPokemon[capturedIndex] = inBox;
  boxedPokemon[boxedIndex] = inParty;
  return { ...story, capturedPokemon, boxedPokemon, boxSlots: boxSlotsOf(story) };
}

export type BuyBoxResult = {
  accepted: boolean;
  story: StoryState;
  reason?: "all-open" | "no-money";
  price: number;
};

/** Opens the next box for its price. */
export function buyNextPcBox(story: StoryState): BuyBoxResult {
  const open = unlockedPcBoxes(story);
  if (open >= PC_BOX_COUNT) return { accepted: false, story, reason: "all-open", price: 0 };
  const price = pcBoxPrice(open + 1);
  if (story.money < price) return { accepted: false, story, reason: "no-money", price };
  return {
    accepted: true,
    price,
    story: { ...story, money: story.money - price, pcBoxes: open + 1 },
  };
}
