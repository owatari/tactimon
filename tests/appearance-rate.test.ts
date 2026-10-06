import { describe, expect, it } from "vitest";
import { LAND_ENCOUNTERS, appearanceRateOf, resolveScaledWildEncounter } from "../apps/client/lib/wildEncounters";

describe("appearance rate of wild Pokémon", () => {
  it("sums every slot of a species and divides by the table's weight", () => {
    const slots = LAND_ENCOUNTERS["viridian-forest"].slots;
    expect(appearanceRateOf(slots, "pikachu")).toBeCloseTo(0.05, 5);
    expect(appearanceRateOf(slots, "metapod")).toBeCloseTo(0.05, 5);
    expect(appearanceRateOf(slots, "kakuna")).toBeCloseTo(0.1, 5);
    expect(appearanceRateOf(slots, "caterpie")).toBeCloseTo(0.4, 5);
    expect(appearanceRateOf(slots, "weedle")).toBeCloseTo(0.4, 5);
    expect(appearanceRateOf(slots, "mewtwo")).toBe(0);
    expect(appearanceRateOf([], "x")).toBe(1);
  });

  it("every member of a scaled encounter carries the rate of its area", () => {
    for (let roll = 0; roll < 60; roll += 7) {
      const encounter = resolveScaledWildEncounter("viridian-forest", roll, [8, 8, 8])!;
      for (const member of encounter.members) {
        expect(member.appearanceRate, member.species).toBeGreaterThan(0);
        expect(member.appearanceRate).toBeLessThanOrEqual(1);
        expect(member.appearanceRate).toBeCloseTo(appearanceRateOf(LAND_ENCOUNTERS["viridian-forest"].slots, member.species), 8);
      }
    }
  });
});
