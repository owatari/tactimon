import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  grantTrainerBattleProgressToParty,
  grantWildBattlesProgressToParty,
  splitExperience,
} from "../packages/battle-engine/src";
import {
  channelExpShare,
  defaultExpShare,
  fitExpShare,
  maxExpShare,
  setMemberShare,
  sharesForSlots,
  swapExpShares,
} from "../apps/client/lib/expShare";
import { reorderStoryParty } from "../apps/client/lib/gameMenu";
import { normalizeStoryState, type CapturedPokemon } from "../apps/client/lib/story";

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

describe("splitExperience", () => {
  it("always adds up to the pool and follows the weights", () => {
    for (const total of [0, 1, 7, 100, 999, 12345]) {
      for (const shares of [[50, 50], [70, 20, 10], [5, 5, 90], [34, 33, 33], [100], [5, 5, 5, 5, 5, 75]]) {
        const parts = splitExperience(total, shares);
        expect(sum(parts), `${total} ${shares}`).toBe(total);
        expect(parts.length).toBe(shares.length);
      }
    }
    expect(splitExperience(100, [70, 20, 10])).toEqual([70, 20, 10]);
  });

  it("falls back to an equal split without valid weights", () => {
    expect(splitExperience(10, undefined, 3)).toEqual([4, 3, 3]);
    expect(splitExperience(10, [1, Number.NaN], 2)).toEqual([5, 5]);
  });
});

describe("EXP share controls", () => {
  it("starts equal and always sums to 100", () => {
    expect(defaultExpShare(1)).toEqual([100]);
    expect(defaultExpShare(3)).toEqual([34, 33, 33]);
    for (let n = 1; n <= 6; n += 1) expect(sum(defaultExpShare(n))).toBe(100);
  });

  it("never lets a member drop under 5% and keeps the total at 100 while sliding", () => {
    for (const count of [2, 3, 4, 6]) {
      let shares = defaultExpShare(count);
      for (const value of [0, 5, 20, 50, 80, 100, 33, 1]) {
        for (let index = 0; index < count; index += 1) {
          shares = setMemberShare(shares, index, value);
          expect(sum(shares), `${count} ${index} ${value}`).toBe(100);
          expect(Math.min(...shares)).toBeGreaterThanOrEqual(5);
          expect(shares[index]).toBeLessThanOrEqual(maxExpShare(count));
        }
      }
    }
    expect(setMemberShare([50, 50], 0, 100)).toEqual([95, 5]);
  });

  it("channels the rest into one Pokémon", () => {
    expect(channelExpShare(3, 1)).toEqual([5, 90, 5]);
    expect(channelExpShare(6, 0)).toEqual([75, 5, 5, 5, 5, 5]);
    expect(channelExpShare(1, 0)).toEqual([100]);
  });

  it("fits saved shares to the party (old saves, new members, left members)", () => {
    expect(fitExpShare(undefined, 4)).toEqual(defaultExpShare(4));
    expect(fitExpShare("junk", 2)).toEqual([50, 50]);
    expect(fitExpShare([60, 40], 3).every((v) => v >= 5)).toBe(true);
    expect(sum(fitExpShare([60, 40], 3))).toBe(100);
    expect(fitExpShare([60, 40], 3)[0]).toBeGreaterThan(fitExpShare([60, 40], 3)[1]);
    expect(sum(fitExpShare([30, 30, 40], 2))).toBe(100);
    expect(fitExpShare([1, 2, 3], 3).every((v) => v >= 5)).toBe(true);
    expect(fitExpShare([100], 1)).toEqual([100]);
  });

  it("uses only the members that fought, renormalised", () => {
    const result = sharesForSlots([50, 30, 20], [0, 2]);
    expect(sum(result)).toBe(100);
    expect(result[0]).toBeGreaterThan(result[1]);
    expect(sharesForSlots([50, 50], [1])).toEqual([100]);
  });

  it("travels with the Pokémon when the party is reordered", () => {
    const captured = ["rattata", "pidgey", "caterpie"].map((s) => createPokemonProgression(s as never, 5)) as CapturedPokemon[];
    const story = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 8),
      capturedPokemon: captured,
      expShare: [40, 30, 20, 10],
    });
    expect(story.expShare).toEqual([40, 30, 20, 10]);
    const swapped = reorderStoryParty(story, 1, 3);
    expect(swapped.story.expShare).toEqual([40, 10, 20, 30]);
    expect(swapExpShares([1, 2, 3], 0, 2)).toEqual([3, 2, 1]);
  });
});

describe("battle EXP follows the shares", () => {
  const party = ["bulbasaur", "charmander", "squirtle"].map((s) => createPokemonProgression(s as never, 10));
  const gains = (rewards: ReturnType<typeof grantWildBattlesProgressToParty>) => rewards.map((r) => r.xpGained);

  it("wild fights split the pool by percentage and keep the same total as an equal split", () => {
    const enemies = [{ species: "rattata", level: 12 }] as never;
    const equal = gains(grantWildBattlesProgressToParty(party, enemies));
    const custom = gains(grantWildBattlesProgressToParty(party, enemies, 1, [70, 20, 10]));
    expect(custom[0]).toBeGreaterThan(custom[1]);
    expect(custom[1]).toBeGreaterThan(custom[2]);
    expect(sum(custom)).toBeGreaterThanOrEqual(sum(equal));
    expect(sum(custom) - sum(equal)).toBeLessThan(party.length);
    const channeled = gains(grantWildBattlesProgressToParty(party, enemies, 1, channelExpShare(3, 2)));
    expect(channeled[2]).toBeGreaterThan(channeled[0] * 10);
  });

  it("trainer fights split reward x members by percentage", () => {
    const enemies = [{ species: "pidgey", level: 12 }] as never;
    const equal = gains(grantTrainerBattleProgressToParty(party, enemies));
    expect(new Set(equal).size).toBe(1);
    const custom = gains(grantTrainerBattleProgressToParty(party, enemies, [60, 30, 10]));
    expect(sum(custom)).toBe(sum(equal));
    expect(custom[0]).toBeGreaterThan(custom[2]);
  });

  it("EV yield is not split", () => {
    const enemies = [{ species: "rattata", level: 12 }] as never;
    const a = grantWildBattlesProgressToParty(party, enemies);
    const b = grantWildBattlesProgressToParty(party, enemies, 1, [90, 5, 5]);
    expect(b.map((r) => r.evGained)).toEqual(a.map((r) => r.evGained));
  });
});
