import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  PC_FREE_BOXES,
  PC_PER_BOX,
  appendBoxed,
  boxMembers,
  boxPopulation,
  boxSlotsOf,
  buyNextPcBox,
  moveBoxedToBox,
  pcBoxPrice,
  pcCapacity,
  swapBoxed,
  swapPartyWithBoxed,
  unlockedPcBoxes,
} from "../apps/client/lib/pcBoxes";
import {
  depositCapturedPokemon,
  normalizeStoryState,
  placeCapturedPokemon,
  withdrawBoxedPokemon,
  type CapturedPokemon,
  type StoryState,
} from "../apps/client/lib/story";
import { applyPcAction } from "../apps/client/lib/pcActions";
import { resolvePendingCapture, sendAllPendingToBox } from "../apps/client/lib/captureChoice";

const mon = (species: "rattata" | "pidgey" | "caterpie", level = 5) =>
  createPokemonProgression(species, level) as CapturedPokemon;

function base(extra: Partial<StoryState> = {}): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    playerPokemon: createPokemonProgression("bulbasaur", 8),
    capturedPokemon: [mon("rattata"), mon("pidgey")],
    money: 50_000,
    ...extra,
  });
}

describe("PC boxes", () => {
  it("starts with 5 free boxes and sells the rest at rising prices", () => {
    const story = base();
    expect(unlockedPcBoxes(story)).toBe(PC_FREE_BOXES);
    expect(pcCapacity(story)).toBe(5 * PC_PER_BOX);
    expect(pcBoxPrice(6)).toBe(1000);
    expect(pcBoxPrice(7)).toBeGreaterThan(pcBoxPrice(6));

    const bought = buyNextPcBox(story);
    expect(bought.accepted).toBe(true);
    expect(bought.story.money).toBe(50_000 - 1000);
    expect(unlockedPcBoxes(bought.story)).toBe(6);
  });

  it("refuses to buy without money and stops at 14 boxes", () => {
    expect(buyNextPcBox(base({ money: 10 }))).toMatchObject({ accepted: false, reason: "no-money" });
    let story = base({ money: 1_000_000 });
    for (let i = 0; i < 20; i += 1) story = buyNextPcBox(story).story;
    expect(unlockedPcBoxes(story)).toBe(14);
    expect(buyNextPcBox(story)).toMatchObject({ accepted: false, reason: "all-open" });
  });

  it("migrates an old packed save: 14 boxes of data, boxes holding Pokémon count as open", () => {
    const boxed = Array.from({ length: 65 }, () => mon("rattata"));
    const story = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 8),
      boxedPokemon: boxed,
    });
    expect(story.boxedPokemon).toHaveLength(65);
    const slots = boxSlotsOf(story);
    expect(slots[0]).toBe(0);
    expect(slots[30]).toBe(1);
    expect(slots[64]).toBe(2);
    expect(unlockedPcBoxes(story)).toBe(PC_FREE_BOXES);

    const far = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 8),
      boxedPokemon: Array.from({ length: 200 }, () => mon("pidgey")),
    });
    expect(far.boxedPokemon).toHaveLength(200);
    expect(unlockedPcBoxes(far)).toBe(7); // index 199 sits in box 6 (7th)
  });

  it("keeps the layout through a save round trip", () => {
    let story = base();
    story = appendBoxed(story, mon("caterpie"), 3)!;
    const again = normalizeStoryState(JSON.parse(JSON.stringify(story)));
    expect(boxSlotsOf(again)).toEqual([3]);
  });

  it("deposits into the chosen box and falls back to the first box with room", () => {
    const story = base();
    const deposited = depositCapturedPokemon(story, 0, 2);
    expect(deposited.accepted).toBe(true);
    expect(boxSlotsOf(deposited.story)).toEqual([2]);
    expect(deposited.story.capturedPokemon).toHaveLength(1);

    let full = story;
    for (let i = 0; i < PC_PER_BOX; i += 1) full = appendBoxed(full, mon("rattata"), 0)!;
    expect(boxPopulation(full, 0)).toBe(PC_PER_BOX);
    const spill = depositCapturedPokemon(full, 0, 0);
    expect(boxSlotsOf(spill.story).at(-1)).toBe(1);
  });

  it("relocates to another box, and refuses a full or locked box", () => {
    let story = appendBoxed(base(), mon("caterpie"), 0)!;
    const moved = moveBoxedToBox(story, 0, 3)!;
    expect(boxMembers(moved, 3)).toEqual([0]);
    expect(moveBoxedToBox(story, 0, 9)).toBeNull(); // not bought
    for (let i = 0; i < PC_PER_BOX; i += 1) story = appendBoxed(story, mon("rattata"), 4)!;
    expect(moveBoxedToBox(story, 0, 4)).toBeNull(); // full
  });

  it("swaps two boxed Pokémon and a party member with a boxed one", () => {
    let story = base();
    story = appendBoxed(story, mon("caterpie"), 0)!;
    story = appendBoxed(story, mon("rattata", 9), 2)!;
    const swapped = swapBoxed(story, 0, 1)!;
    expect(swapped.boxedPokemon.map((p) => p.species)).toEqual(["rattata", "caterpie"]);
    expect(boxSlotsOf(swapped)).toEqual([0, 2]);

    const traded = swapPartyWithBoxed(story, 1, 0)!; // pidgey <-> caterpie
    expect(traded.capturedPokemon[1].species).toBe("caterpie");
    expect(traded.boxedPokemon[0].species).toBe("pidgey");
    expect(boxSlotsOf(traded)).toEqual(boxSlotsOf(story));
  });

  it("withdraw removes the slot entry with the Pokémon", () => {
    let story = base({ capturedPokemon: [] });
    story = appendBoxed(story, mon("caterpie"), 1)!;
    story = appendBoxed(story, mon("pidgey"), 3)!;
    const out = withdrawBoxedPokemon(story, 0);
    expect(out.accepted).toBe(true);
    expect(out.story.boxedPokemon.map((p) => p.species)).toEqual(["pidgey"]);
    expect(boxSlotsOf(out.story)).toEqual([3]);
  });

  it("captures overflow into the box once the party is full, and respects unlocked capacity", () => {
    let story = base({ capturedPokemon: [mon("rattata"), mon("rattata"), mon("rattata"), mon("rattata"), mon("rattata")] });
    const placed = placeCapturedPokemon(story, mon("pidgey"));
    expect(placed).toMatchObject({ accepted: true, destination: "storage" });
    expect(placed.story.boxedPokemon).toHaveLength(1);

    for (let i = 0; i < 5 * PC_PER_BOX; i += 1) story = appendBoxed(story, mon("rattata"))!;
    expect(placeCapturedPokemon(story, mon("pidgey"))).toMatchObject({ accepted: false, reason: "storage-full" });
    const opened = buyNextPcBox(story).story;
    expect(placeCapturedPokemon(opened, mon("pidgey")).accepted).toBe(true);

    const pending = { ...story, pendingCaptures: [mon("caterpie")] };
    expect(resolvePendingCapture(pending, { destination: "box" })).toMatchObject({ ok: false, reason: "box-full" });
    expect(sendAllPendingToBox({ ...opened, pendingCaptures: [mon("caterpie")] })).toMatchObject({ moved: 1, remaining: 0 });
  });
});

describe("PC window actions", () => {
  it("deposits onto a box, withdraws onto a free party slot and swaps with an occupied one", () => {
    let story = base();
    const deposited = applyPcAction(story, { kind: "party", index: 0 }, { kind: "box", box: 2 });
    expect(deposited).toMatchObject({ accepted: true, message: "deposited" });
    expect(boxSlotsOf(deposited.story)).toEqual([2]);
    story = deposited.story; // party: pidgey only

    const withdrawn = applyPcAction(story, { kind: "box", index: 0 }, { kind: "party-slot", slot: 4 });
    expect(withdrawn).toMatchObject({ accepted: true, message: "withdrawn" });
    expect(withdrawn.story.capturedPokemon.map((p) => p.species)).toEqual(["pidgey", "rattata"]);

    const swapped = applyPcAction(story, { kind: "box", index: 0 }, { kind: "party-slot", slot: 1 });
    expect(swapped).toMatchObject({ accepted: true, message: "swapped" });
    expect(swapped.story.capturedPokemon[0].species).toBe("rattata");
    expect(swapped.story.boxedPokemon[0].species).toBe("pidgey");
  });

  it("keeps the lead out of the box and refuses a withdraw into a full party", () => {
    const full = base({ capturedPokemon: [mon("rattata"), mon("rattata"), mon("rattata"), mon("rattata"), mon("rattata")] });
    const boxed = appendBoxed(full, mon("caterpie"), 0)!;
    expect(applyPcAction(boxed, { kind: "box", index: 0 }, { kind: "party-slot", slot: 0 })).toMatchObject({
      accepted: false,
      message: "lead-locked",
    });
    // a full party has no free slot: dropping on the (occupied) slot swaps, never overflows
    expect(applyPcAction(boxed, { kind: "box", index: 0 }, { kind: "party-slot", slot: 3 }).message).toBe("swapped");
  });

  it("relocates a boxed Pokémon through a tab and swaps two boxed ones", () => {
    let story = appendBoxed(base(), mon("caterpie"), 0)!;
    story = appendBoxed(story, mon("pidgey"), 1)!;
    expect(applyPcAction(story, { kind: "box", index: 0 }, { kind: "box", box: 4 })).toMatchObject({ accepted: true, message: "moved" });
    expect(applyPcAction(story, { kind: "box", index: 0 }, { kind: "box", box: 9 }).accepted).toBe(false);
    const swapped = applyPcAction(story, { kind: "box", index: 0 }, { kind: "box-slot", index: 1 });
    expect(swapped.story.boxedPokemon.map((p) => p.species)).toEqual(["pidgey", "caterpie"]);
  });
});
