import { describe, expect, it } from "vitest";
import { trainerBag, trainerBagTier } from "../apps/client/lib/trainers";

const party = (level: number) => [{ species: "rattata", level, moves: ["tackle"] }] as never;

describe("opponent bags", () => {
  it("tiers opponents from their ids", () => {
    expect(trainerBagTier({ id: "league-champion-blue-squirtle" })).toBe("champion");
    expect(trainerBagTier({ id: "pokemon-league-loreleis-room-lorelei" })).toBe("elite-four");
    expect(trainerBagTier({ id: "pokemon-league-lances-room-lance" })).toBe("elite-four");
    expect(trainerBagTier({ id: "pewter-gym-brock", badgeId: "boulder" })).toBe("gym-leader");
    expect(trainerBagTier({ id: "route22-early-rival" })).toBe("rival");
    expect(trainerBagTier({ id: "route3-bug-catcher" })).toBe("trainer");
  });

  it("gives stronger bags to stronger opponents and little to ordinary trainers", () => {
    const total = (bag: Record<string, number | undefined>) => Object.values(bag).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    const champion = trainerBag({ id: "league-champion-blue-squirtle" }, party(60));
    expect(champion["full-restore"]).toBe(2);
    expect(champion["max-revive"]).toBe(1);
    expect(trainerBag({ id: "pokemon-league-lances-room-lance" }, party(58))["full-restore"]).toBe(1);
    expect(trainerBag({ id: "x", badgeId: "boulder" } as never, party(14)).potion).toBe(2);
    expect(trainerBag({ id: "x", badgeId: "marsh" } as never, party(45))["hyper-potion"]).toBe(2);
    expect(trainerBag({ id: "route3-youngster" }, party(6)).potion).toBe(0);
    expect(total(champion)).toBeGreaterThan(total(trainerBag({ id: "x", badgeId: "boulder" } as never, party(14))));
  });
});
