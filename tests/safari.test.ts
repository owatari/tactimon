import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  SAFARI_BALLS,
  SAFARI_FEE,
  SAFARI_STEPS,
  applySafariStep,
  endSafari,
  isSafariMap,
  safariOutOfBalls,
  startSafari,
} from "../apps/client/lib/safari";
import { resolveBlockedPlayerTileGate } from "../apps/client/lib/playerWorldGates";
import { advanceStoryStep } from "../apps/client/lib/storySteps";
import {
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

function started(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    money: 2000,
    inventory: { potion: 1, "poke-ball": 7 },
  });
}

describe("Safari Zone", () => {
  it("charges the fee and swaps in 30 Safari Balls", () => {
    const result = startSafari(started());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.money).toBe(2000 - SAFARI_FEE);
    expect(result.story.inventory["poke-ball"]).toBe(SAFARI_BALLS);
    expect(result.story.safari).toEqual({
      steps: SAFARI_STEPS,
      balls: SAFARI_BALLS,
      savedBalls: 7,
    });
  });

  it("refuses without money or while a game is running", () => {
    const poor = { ...started(), money: 100 };
    expect(startSafari(poor)).toEqual({ ok: false, reason: "money" });

    const first = startSafari(started());
    if (!first.ok) throw new Error("expected start");
    expect(startSafari(first.story)).toEqual({ ok: false, reason: "active" });
  });

  it("counts steps only inside the zone and ends at zero", () => {
    const first = startSafari(started());
    if (!first.ok) throw new Error("expected start");

    const outside = applySafariStep(first.story, "fuchsia-city");
    expect(outside.story.safari?.steps).toBe(SAFARI_STEPS);

    const inside = advanceStoryStep(first.story, "safari-zone-center");
    expect(inside.safari?.steps).toBe(SAFARI_STEPS - 1);

    const last = applySafariStep(
      { ...first.story, safari: { steps: 1, balls: 30, savedBalls: 7 } },
      "safari-zone-east",
    );
    expect(last.ended).toBe("steps");
  });

  it("ends when the balls run out and restores the regular balls", () => {
    const first = startSafari(started());
    if (!first.ok) throw new Error("expected start");
    const spent = {
      ...first.story,
      inventory: { ...first.story.inventory, "poke-ball": 0 },
    };
    expect(safariOutOfBalls(spent)).toBe(true);

    const finished = endSafari(spent);
    expect(finished.safari).toBeNull();
    expect(finished.inventory["poke-ball"]).toBe(7);
    expect(safariOutOfBalls(finished)).toBe(false);
  });

  it("gates the Safari door until a game starts", () => {
    const story = started();
    const gate = () =>
      resolveBlockedPlayerTileGate(
        story,
        "fuchsia-city-safari-zone-entrance",
        4,
        1,
      );
    expect(gate()?.blockedRequest).toMatchObject({ id: "safari-entrance" });

    const offer = runDialogueInteraction(story, {
      kind: "script",
      id: "safari-entrance",
    });
    const pay = offer.presentation.pages[0].choices?.[0].request;
    expect(pay).toBeDefined();

    const paid = runDialogueInteraction(story, pay!);
    expect(paid.story.safari).not.toBeNull();
    expect(
      resolveBlockedPlayerTileGate(
        paid.story,
        "fuchsia-city-safari-zone-entrance",
        4,
        1,
      ),
    ).toBeNull();
  });

  it("recognises safari maps and keeps old saves loading", () => {
    expect(isSafariMap("safari-zone-north")).toBe(true);
    expect(isSafariMap("fuchsia-city")).toBe(false);
    expect(normalizeStoryState({}).safari).toBeNull();
    expect(normalizeStoryState({ safari: { steps: 9999, balls: 99 } } as never).safari)
      .toMatchObject({ steps: 500, balls: 30 });
  });
});
