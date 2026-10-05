import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  COIN_PACK_PRICE,
  COIN_PACK_SIZE,
  COIN_PRIZES,
  MAX_SLOT_BET,
  SLOT_SYMBOLS,
  buyCoins,
  buyPrize,
  playSlots,
  slotPayout,
  spinSlots,
} from "../apps/client/lib/gameCorner";
import { resolveBlockedPlayerTileGate } from "../apps/client/lib/playerWorldGates";
import { resolveScriptedWorldObjects } from "../apps/client/lib/scriptedWorldObjects";
import {
  MAX_GAME_CORNER_COINS,
  completeStoryPlayerEvent,
  grantStoryKeyItemOnce,
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

function player(extra: Partial<StoryState> = {}): StoryState {
  const base = normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    money: 5000,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    ...extra,
  });
  return grantStoryKeyItemOnce(base, "coin-case").story;
}

describe("slot machines", () => {
  it("return less than they take (RTP between 70% and 100%)", () => {
    let paid = 0;
    let combos = 0;
    for (const a of SLOT_SYMBOLS) {
      for (const b of SLOT_SYMBOLS) {
        for (const c of SLOT_SYMBOLS) {
          paid += slotPayout([a, b, c], MAX_SLOT_BET);
          combos += 1;
        }
      }
    }
    const rtp = paid / (combos * MAX_SLOT_BET);
    expect(combos).toBe(216);
    expect(rtp).toBeGreaterThan(0.7);
    expect(rtp).toBeLessThan(1);
  });

  it("pays the jackpot for three red sevens, scaled by bet", () => {
    expect(slotPayout(["seven-red", "seven-red", "seven-red"], 3)).toBe(150);
    expect(slotPayout(["seven-red", "seven-red", "seven-red"], 1)).toBe(50);
    expect(slotPayout(["bar", "pikachu", "ball"], 3)).toBe(0);
    expect(spinSlots([0, 0, 0], 3).reels).toEqual([
      "seven-red",
      "seven-red",
      "seven-red",
    ]);
  });

  it("spends the bet and adds winnings, never beyond the cap", () => {
    const story = player({ coins: 10 } as never);
    const lost = playSlots(story, [0, 2, 4], 3);
    expect(lost.ok && lost.story.coins).toBe(7);

    const won = playSlots(story, [0, 0, 0], 3);
    expect(won.ok && won.story.coins).toBe(10 - 3 + 150);

    const rich = player({ coins: MAX_GAME_CORNER_COINS } as never);
    const capped = playSlots(rich, [0, 0, 0], 3);
    expect(capped.ok && capped.story.coins).toBe(MAX_GAME_CORNER_COINS);
  });

  it("need the Coin Case and at least one coin", () => {
    const noCase = normalizeStoryState({ coins: 20 } as never);
    expect(playSlots(noCase, [0, 0, 0])).toEqual({
      ok: false,
      reason: "no-case",
    });
    expect(playSlots(player(), [0, 0, 0])).toEqual({
      ok: false,
      reason: "no-coins",
    });
  });

  it("exist as talkable objects in the Game Corner", () => {
    const machines = resolveScriptedWorldObjects("celadon-city-game-corner");
    expect(machines.filter((object) => object.label === "Slot Machine").length)
      .toBeGreaterThan(10);
  });
});

describe("coin counter and prizes", () => {
  it("sells 50 coins for ₽1000 to players with a Coin Case", () => {
    const bought = buyCoins(player());
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.story.coins).toBe(COIN_PACK_SIZE);
    expect(bought.story.money).toBe(5000 - COIN_PACK_PRICE);

    expect(buyCoins(normalizeStoryState({ money: 5000 }))).toEqual({
      ok: false,
      reason: "no-case",
    });
    expect(buyCoins({ ...player(), money: 10 })).toEqual({
      ok: false,
      reason: "money",
    });
  });

  it("trades coins for Pokémon, once each", () => {
    const abra = COIN_PRIZES.find((prize) => prize.id === "abra")!;
    const story = player({ coins: abra.cost + 20 } as never);
    const result = buyPrize(story, "abra");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.coins).toBe(20);
    expect(result.story.capturedPokemon.at(-1)?.species).toBe("abra");

    expect(buyPrize({ ...result.story, coins: 9999 }, "abra")).toEqual({
      ok: false,
      reason: "already-received",
    });
    expect(buyPrize(player({ coins: 5 } as never), "porygon")).toEqual({
      ok: false,
      reason: "coins",
    });
  });

  it("runs through the NPC scripts with choices", () => {
    const offer = runDialogueInteraction(player(), {
      kind: "script",
      id: "game-corner-clerk",
    });
    const buy = offer.presentation.pages[0].choices![0].request;
    const bought = runDialogueInteraction(player(), buy);
    expect(bought.story.coins).toBe(COIN_PACK_SIZE);

    const slot = runDialogueInteraction(bought.story, {
      kind: "script",
      id: "slot-machine",
    });
    const bet = slot.presentation.pages[0].choices![0].request;
    const spun = runDialogueInteraction(bought.story, bet);
    expect(spun.story.coins).not.toBe(COIN_PACK_SIZE);
  });

  it("keeps the Rocket Hideout stairs shut until the guard is beaten", () => {
    const story = player();
    expect(
      resolveBlockedPlayerTileGate(story, "celadon-city-game-corner", 15, 2),
    ).not.toBeNull();
    expect(
      resolveBlockedPlayerTileGate(
        completeStoryPlayerEvent(
          story,
          "trainer",
          "celadon-city-game-corner-grunt",
        ),
        "celadon-city-game-corner",
        15,
        2,
      ),
    ).toBeNull();
  });
});
