import { describe, expect, it } from "vitest";
import {
  AUTO_SPEEDS,
  advanceGameClock,
  gameNow,
  getGameClock,
  isGameMuted,
  setAutoSpeed,
  setAutoplay,
  splitFrame,
  subscribeGameClock,
  timeScale,
} from "../apps/client/lib/autoplay/gameClock";
import { autoShop } from "../apps/client/lib/autoplay/shop";
import { ownedQuantity } from "../apps/client/lib/market";
import { storySignature } from "../apps/client/lib/autoplay/runtime";
import { normalizeStoryState, type StoryState } from "../apps/client/lib/story";
import { createPokemonProgression } from "../packages/battle-engine/src";

describe("game clock", () => {
  it("offers 1x 2x 4x 8x 16x and mutes + scales only while the Auto Player is on", () => {
    expect([...AUTO_SPEEDS]).toEqual([1, 2, 4, 8, 16]);
    let notified = 0;
    const stop = subscribeGameClock(() => (notified += 1));
    expect(timeScale()).toBe(1);
    expect(isGameMuted()).toBe(false);
    setAutoSpeed(8);
    expect(timeScale()).toBe(1); // speed alone does nothing while the Auto Player is off
    setAutoplay(true);
    expect(timeScale()).toBe(8);
    expect(isGameMuted()).toBe(true);
    setAutoSpeed(16);
    expect(getGameClock()).toEqual({ autoplay: true, speed: 16 });
    expect(timeScale()).toBe(16);
    setAutoplay(false);
    expect(timeScale()).toBe(1);
    expect(isGameMuted()).toBe(false);
    expect(notified).toBe(4);
    stop();
    setAutoSpeed(1);
  });

  it("advances game time and never takes a physics step longer than 50 ms", () => {
    const before = gameNow();
    expect(advanceGameClock(120)).toBe(before + 120);
    expect(splitFrame(0)).toEqual([]);
    expect(splitFrame(16)).toEqual([16]);
    const frame = splitFrame(50 * 16); // one 50 ms frame at 16x
    expect(frame.length).toBe(16);
    expect(frame.every((step) => step <= 50)).toBe(true);
    expect(frame.reduce((a, b) => a + b, 0)).toBeCloseTo(800, 6);
  });
});

describe("auto shop", () => {
  const base = (money: number): StoryState =>
    normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 8),
      money,
      inventory: { potion: 0, "poke-ball": 0 },
    });

  it("stocks balls and potions within 80% of the money", () => {
    const next = autoShop(base(3000));
    expect(ownedQuantity(next, "poke-ball")).toBeGreaterThan(0);
    expect(next.money).toBeGreaterThanOrEqual(600);
    expect(3000 - next.money).toBeLessThanOrEqual(2400);
  });

  it("buys better items only when rich and never beyond the wished amounts", () => {
    const poor = autoShop(base(2000));
    expect(ownedQuantity(poor, "super-potion")).toBe(0);
    const rich = autoShop(base(60000));
    expect(ownedQuantity(rich, "super-potion")).toBeGreaterThan(0);
    expect(ownedQuantity(rich, "poke-ball")).toBe(12);
    expect(autoShop(rich).money).toBe(rich.money); // already stocked
  });
});

describe("story signature", () => {
  it("changes when the story moves on, and only then", () => {
    const story = normalizeStoryState({ starter: "bulbasaur", playerPokemon: createPokemonProgression("bulbasaur", 8) });
    const a = storySignature(story);
    expect(storySignature({ ...story, money: 5 })).toBe(a);
    expect(storySignature({ ...story, badgeIds: ["boulder"] })).not.toBe(a);
  });
});
