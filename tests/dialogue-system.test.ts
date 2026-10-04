import { describe, expect, it } from "vitest";
import {
  resolveDialogueScript,
  resolveWorldObjectDialogueId,
  resolveWorldObjectDialogueRequest,
  runDialogueInteraction,
} from "../apps/client/lib/dialogueSystem";
import {
  DEFAULT_STORY_STATE,
  getStoryPlayerChoice,
  hasStoryPlayerEvent,
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
        kind: "script",
        id: "pickup",
        context: {
          pickupId: "viridian-city-potion",
          itemId: "potion",
          itemName: "Potion",
        },
      },
    );

    expect(pickup.story.inventory.potion).toBe(2);
    expect(
      pickup.story.collectedItemIds,
    ).toContain("viridian-city-potion");
    expect(playerB.inventory.potion).toBe(1);

    const bill = runDialogueInteraction(
      playerB,
      {
        kind: "script",
        id: "bill",
      },
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


describe("generic player-scoped dialogue actions", () => {
  it("completes events only for the owning player", () => {
    const playerA = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const completed = runDialogueInteraction(
      playerA,
      {
        kind: "complete-event",
        namespace: "story",
        eventId: "future-quest-step",
        text: "A etapa foi concluída.",
      },
    );

    expect(
      hasStoryPlayerEvent(
        completed.story,
        "story",
        "future-quest-step",
      ),
    ).toBe(true);
    expect(
      hasStoryPlayerEvent(
        playerB,
        "story",
        "future-quest-step",
      ),
    ).toBe(false);
  });

  it("stores dialogue branches only for the owning player", () => {
    const playerA = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    const chosen = runDialogueInteraction(
      playerA,
      {
        kind: "set-choice",
        choiceId: "future-npc-answer",
        value: "yes",
        text: "Entendido.",
      },
    );

    expect(
      getStoryPlayerChoice(
        chosen.story,
        "future-npc-answer",
      ),
    ).toBe("yes");
    expect(
      getStoryPlayerChoice(
        playerB,
        "future-npc-answer",
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


describe("registered stateful dialogue scripts", () => {
  it("executes existing progression through script context", () => {
    const story = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const pickup = runDialogueInteraction(
      story,
      {
        kind: "script",
        id: "pickup",
        context: {
          pickupId: "viridian-city-potion",
          itemId: "potion",
          itemName: "Potion",
        },
      },
    );

    expect(pickup.story.inventory.potion).toBe(2);
    expect(
      hasStoryPlayerEvent(
        pickup.story,
        "pickup",
        "viridian-city-potion",
      ),
    ).toBe(true);
  });

  it("rejects invalid script context without mutating player state", () => {
    const story = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const result = runDialogueInteraction(
      story,
      {
        kind: "script",
        id: "pickup",
        context: {},
      },
    );

    expect(result.story).toBe(story);
    expect(
      result.presentation.pages[0].text,
    ).toContain("contexto inválido");
  });
});


describe("complete world NPC dialogue coverage", () => {
  it("registers the raw NPCs already shipped in Pallet, Route 1 and Oak Lab", () => {
    const expected = [
      ["pallet-town", 3, 10, "pallet-woman"],
      ["pallet-town", 13, 17, "pallet-fat-man"],
      ["route-1", 6, 28, "route1-mart-clerk"],
      ["route-1", 19, 16, "route1-boy"],
      ["oak-lab", 3, 11, "oak-lab-aide-1"],
      ["oak-lab", 11, 10, "oak-lab-aide-2"],
      ["oak-lab", 2, 10, "oak-lab-aide-3"],
      [
        "viridian-city",
        8,
        26,
        "viridian-dream-eater-tutor",
      ],
    ] as const;

    for (const [mapId, x, y, dialogueId] of expected) {
      expect(
        resolveWorldObjectDialogueId(
          mapId,
          x,
          y,
        ),
      ).toBe(dialogueId);

      const presentation = runDialogueInteraction(
        normalizeStoryState(DEFAULT_STORY_STATE),
        resolveWorldObjectDialogueRequest(
          mapId,
          x,
          y,
          "NPC",
        ),
      ).presentation;

      expect(presentation.pages.length).toBeGreaterThan(0);
      expect(
        presentation.pages.some((page) =>
          /não importado|ainda não tem/i.test(
            page.text,
          ),
        ),
      ).toBe(false);
    }
  });

  it("gives every future raw world NPC an in-world fallback dialogue", () => {
    const request = resolveWorldObjectDialogueRequest(
      "future-route",
      42,
      17,
      "Youngster",
    );

    expect(request.kind).toBe("text");

    const result = runDialogueInteraction(
      normalizeStoryState(DEFAULT_STORY_STATE),
      request,
    );

    expect(result.presentation.pages).toEqual([
      expect.objectContaining({
        speaker: "Youngster",
      }),
    ]);
    expect(
      result.presentation.pages[0].text.length,
    ).toBeGreaterThan(20);
    expect(
      result.presentation.pages[0].text,
    ).not.toMatch(/não importado|contexto inválido/i);
  });

  it("keeps unknown future script ids inside the game world instead of showing developer placeholders", () => {
    const result = runDialogueInteraction(
      normalizeStoryState(DEFAULT_STORY_STATE),
      {
        kind: "script",
        id: "future-npc-script",
      },
    );

    expect(
      result.presentation.pages[0].text,
    ).not.toMatch(/não importado|registro central|contexto inválido/i);
  });
});
