import { describe, expect, it } from "vitest";
import type { DuelSpeciesId } from "../packages/battle-engine/src";
import { natureEffect } from "../packages/battle-engine/src";
import { bestNatureFor } from "../apps/client/lib/bestNature";
import { POKEDEX_SPECIES } from "../apps/client/lib/pokedex";

const best = (species: string) => bestNatureFor(species as DuelSpeciesId);

describe("bestNatureFor", () => {
  it("gives slow physical attackers Adamant and slow special attackers Modest", () => {
    for (const species of ["machamp", "golem", "rhydon", "gyarados", "dragonite", "snorlax"]) {
      expect(best(species).nature, species).toBe("adamant");
    }
    for (const species of ["gengar", "exeggutor", "vaporeon", "slowbro"]) {
      expect(best(species).nature, species).toBe("modest");
    }
  });

  it("gives very fast species +Speed: Jolly for physical, Timid for special", () => {
    for (const species of ["alakazam", "jolteon", "starmie"]) {
      expect(best(species).nature, species).toBe("timid");
    }
    for (const species of ["dugtrio", "scyther"]) {
      expect(best(species).nature, species).toBe("jolly");
    }
  });

  it("boosts bulk for species with no real offense and explains the pick", () => {
    const chansey = best("chansey");
    expect(chansey.kind).toBe("bulky");
    expect(chansey.offense).toBeNull();
    expect(["defense", "specialDefense"]).toContain(chansey.up);

    const machamp = best("machamp");
    expect(machamp).toMatchObject({ up: "attack", down: "specialAttack", kind: "physical", offense: "attack" });
  });

  it("always returns a non-neutral nature that matches its +/- stats, deterministically, for all 151", () => {
    for (const species of POKEDEX_SPECIES) {
      const result = best(species);
      expect(natureEffect(result.nature)).toEqual({ up: result.up, down: result.down });
      expect(result.up).not.toBe(result.down);
      expect(best(species)).toEqual(result);
    }
  });
});
