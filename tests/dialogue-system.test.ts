import { describe, expect, it } from "vitest";
import {
  resolveDialogueScript,
  resolveWorldObjectDialogueId,
  runDialogueInteraction,
} from "../apps/client/lib/dialogueSystem";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";
import {
  OVERWORLD_DIALOGUES,
} from "../apps/client/lib/overworldDialogues";

describe("dialogue system", () => {
  it("resolves every placed overworld dialogue through the registry", () => {
    const story = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    for (const actor of OVERWORLD_DIALOGUES) {
      const dialogue = resolveDialogueScript(
        story,
        actor.dialogueId,
      );
      expect(
        dialogue,
        actor.dialogueId,
      ).not.toBeNull();
      expect(dialogue?.pages.length).toBeGreaterThan(0);
    }
  });

  it("supports multi-page dialogue without changing object interaction code", () => {
    const dialogue = resolveDialogueScript(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "route4-boy",
    );

    expect(dialogue?.pages).toHaveLength(2);
    expect(dialogue?.pages[0].speaker).toBe("Garoto");
  });

  it("selects conditional variants from player progression", () => {
    const id = resolveWorldObjectDialogueId(
      "viridian-city",
      20,
      12,
    );
    expect(id).toBe("viridian-npc-20-12");

    const before = resolveDialogueScript(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        firstBattleComplete: false,
      }),
      id!,
    );
    const after = resolveDialogueScript(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        firstBattleComplete: true,
      }),
      id!,
    );

    expect(before?.pages[0].text).toContain("café");
    expect(after?.pages[0].text).toContain("Pewter City");
  });

  it("routes stateful interactions through one executor", () => {
    const playerA = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const pickup = runDialogueInteraction(
      playerA,
      {
        kind: "pickup",
        pickupId: "viridian-city-potion",
        itemId: "potion",
        itemName: "Potion",
      },
    );

    expect(pickup.story.inventory.potion).toBe(2);
    expect(
      pickup.story.collectedItemIds,
    ).toContain("viridian-city-potion");
    expect(playerB.inventory.potion).toBe(1);

    const bill = runDialogueInteraction(
      playerB,
      { kind: "bill" },
    );
    expect(bill.story.billStage).toBe(
      "teleporter-ready",
    );
    expect(playerA.billStage).toBe("unmet");
  });

  it("keeps old NPC lookup behavior compatible", () => {
    expect(
      resolveWorldObjectDialogueId(
        "route-1",
        16,
        22,
      ),
    ).toBeNull();
  });
});


describe("runtime dialogue presentation", () => {
  it("routes dynamic gate/trainer text through the same dialogue contract", () => {
    const story = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const result = runDialogueInteraction(
      story,
      {
        kind: "text",
        id: "gate:test",
        speaker: "Guard",
        text: "Passagem bloqueada.",
      },
    );

    expect(result.story).toBe(story);
    expect(result.presentation).toEqual({
      id: "gate:test",
      pages: [
        {
          id: "main",
          speaker: "Guard",
          text: "Passagem bloqueada.",
        },
      ],
    });
  });
});
