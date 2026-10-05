import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  DAY_CARE_BASE_FEE,
  applyDayCareStep,
  dayCareFee,
  dayCareStatus,
  depositAtDayCare,
  withdrawFromDayCare,
} from "../apps/client/lib/dayCare";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import { advanceStoryStep } from "../apps/client/lib/storySteps";
import {
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

function withParty(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    money: 5000,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    capturedPokemon: [
      { ...createPokemonProgression("pidgey", 5), species: "pidgey" },
      { ...createPokemonProgression("rattata", 5), species: "rattata" },
    ],
  } as never);
}

describe("Day Care", () => {
  it("charges ₽100 plus ₽100 per level gained", () => {
    expect(dayCareFee(0)).toBe(DAY_CARE_BASE_FEE);
    expect(dayCareFee(3)).toBe(400);
  });

  it("takes a party Pokémon (not the lead) and gives it steps as experience", () => {
    const deposit = depositAtDayCare(withParty(), 0);
    expect(deposit.ok).toBe(true);
    if (!deposit.ok) return;
    expect(deposit.story.capturedPokemon).toHaveLength(1);
    expect(deposit.story.dayCare?.startLevel).toBe(5);

    let story = deposit.story;
    for (let step = 0; step < 400; step += 1) {
      story = advanceStoryStep(story, "route-5");
    }
    expect(story.dayCare?.steps).toBe(400);

    const status = dayCareStatus(story)!;
    expect(status.level).toBeGreaterThan(5);
    expect(status.fee).toBe(dayCareFee(status.levelsGained));
  });

  it("only one Pokémon fits and invalid slots are refused", () => {
    const first = depositAtDayCare(withParty(), 0);
    if (!first.ok) throw new Error("expected deposit");
    expect(depositAtDayCare(first.story, 0)).toEqual({
      ok: false,
      reason: "occupied",
    });
    expect(depositAtDayCare(withParty(), 9)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("withdraws for the fee and returns the grown Pokémon to the party", () => {
    const first = depositAtDayCare(withParty(), 0);
    if (!first.ok) throw new Error("expected deposit");
    let story = first.story;
    for (let step = 0; step < 300; step += 1) story = applyDayCareStep(story);

    const status = dayCareStatus(story)!;
    const back = withdrawFromDayCare(story);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.story.dayCare).toBeNull();
    expect(back.story.money).toBe(5000 - status.fee);
    expect(back.story.capturedPokemon.at(-1)?.level).toBe(status.level);

    expect(withdrawFromDayCare({ ...story, money: 0 })).toMatchObject({
      ok: false,
      reason: "money",
    });
    expect(withdrawFromDayCare(back.story)).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("offers one choice per party member through the NPC", () => {
    const offer = runDialogueInteraction(withParty(), {
      kind: "script",
      id: "daycare-gentleman",
    });
    const choices = offer.presentation.pages[0].choices!;
    expect(choices).toHaveLength(3); // 2 Pokémon + decline

    const deposited = runDialogueInteraction(withParty(), choices[1].request);
    expect(deposited.story.dayCare?.pokemon.species).toBe("rattata");

    const status = runDialogueInteraction(deposited.story, {
      kind: "script",
      id: "daycare-gentleman",
    });
    expect(status.presentation.pages[0].choices?.[0].id).toBe("withdraw");
  });

  it("old saves load without a Day Care Pokémon", () => {
    expect(normalizeStoryState({}).dayCare).toBeNull();
  });
});
