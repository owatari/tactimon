import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  WATER_ENCOUNTERS,
  bestOwnedRod,
  hasFishingTable,
  resolveFishing,
  resolveScaledSurfEncounter,
  surfEncounterRate,
} from "../apps/client/lib/waterEncounters";
import {
  grantStoryKeyItemOnce,
  normalizeStoryState,
} from "../apps/client/lib/story";

const story = () =>
  normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 15),
  });

describe("fishing", () => {
  it("picks the best rod the player owns", () => {
    expect(bestOwnedRod(story())).toBeNull();
    const old = grantStoryKeyItemOnce(story(), "old-rod").story;
    expect(bestOwnedRod(old)).toBe("old-rod");
    const both = grantStoryKeyItemOnce(old, "super-rod").story;
    expect(bestOwnedRod(both)).toBe("super-rod");
  });

  it("only offers fishing where the ROM has a table", () => {
    expect(hasFishingTable("vermilion-city")).toBe(true);
    expect(hasFishingTable("pewter-city")).toBe(false);
    expect(resolveFishing("pewter-city", "old-rod", 0, 0)).toEqual({
      outcome: "no-fish",
    });
  });

  it("nibble above the bite chance, a fish below it", () => {
    expect(resolveFishing("vermilion-city", "old-rod", 99, 0).outcome).toBe(
      "nibble",
    );
    const bite = resolveFishing("vermilion-city", "old-rod", 0, 0);
    expect(bite.outcome).toBe("bite");
    if (bite.outcome === "bite") {
      expect(bite.encounter.species).toBe("magikarp");
    }
  });

  it("better rods reach better slots", () => {
    const table = WATER_ENCOUNTERS["vermilion-city"].fishing!;
    const superSpecies = new Set(table.super.map((slot) => slot.species));
    const found = new Set<string>();
    for (let slotRoll = 0; slotRoll < 100; slotRoll += 1) {
      const result = resolveFishing("vermilion-city", "super-rod", 0, slotRoll);
      if (result.outcome === "bite") found.add(result.encounter.species);
    }
    expect(found.size).toBeGreaterThan(0);
    for (const species of found) expect(superSpecies.has(species)).toBe(true);
  });
});

describe("surf encounters", () => {
  it("scale a small pack to the party", () => {
    expect(surfEncounterRate("route-6")).not.toBeNull();
    const encounter = resolveScaledSurfEncounter("route-6", 12345, [15, 15]);
    expect(encounter).not.toBeNull();
    expect(encounter!.members.length).toBeGreaterThan(0);
    expect(encounter!.members.length).toBeLessThanOrEqual(4);
    expect(resolveScaledSurfEncounter("pewter-city", 1, [10])).toBeNull();
  });
});

describe("version-neutral wild sources", () => {
  it("Staryu bites on the Super Rod at Pallet, Vermilion and Cinnabar", async () => {
    for (const map of ["pallet-town", "vermilion-city", "cinnabar-island"]) {
      const sup = WATER_ENCOUNTERS[map].fishing!.super;
      expect(sup.some((s) => s.species === "staryu")).toBe(true);
      expect(sup.reduce((n, s) => n + s.weight, 0)).toBe(100);
    }
  });

  it("Slowpoke lives in every Seafoam cave floor without changing table totals", async () => {
    const { LAND_ENCOUNTERS } = await import("../apps/client/lib/wildEncounters");
    for (const map of [
      "seafoam-islands-1f",
      "seafoam-islands-b-1f",
      "seafoam-islands-b-2f",
      "seafoam-islands-b-3f",
      "seafoam-islands-b-4f",
    ]) {
      const t = LAND_ENCOUNTERS[map];
      expect(t.slots.some((s) => s.species === "slowpoke")).toBe(true);
      expect(t.slots.reduce((n, s) => n + s.weight, 0)).toBe(100);
    }
  });
});
