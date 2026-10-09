import { describe, expect, it } from "vitest";
import type { DuelSpeciesId } from "../packages/battle-engine/src";
import { natureEffect } from "../packages/battle-engine/src";
import { bestNatureFor, heuristicBestNature } from "../apps/client/lib/bestNature";
import { SMOGON_NATURES } from "../apps/client/lib/generated/smogonNatures";
import { POKEDEX_SPECIES } from "../apps/client/lib/pokedex";

const best = (species: string) => bestNatureFor(species as DuelSpeciesId);

describe("bestNatureFor (Smogon Gen 3 sets first)", () => {
  it("uses the competitive database for species that have sets", () => {
    expect(best("alakazam")).toMatchObject({ nature: "timid", source: "smogon", tier: "ou" });
    expect(best("alakazam").alternatives).toContain("modest");
    expect(best("machamp").source).toBe("smogon");
    expect(best("gyarados").nature).toBe("adamant");
    expect(best("snorlax").nature).toBe("adamant");
    expect(best("starmie").source).toBe("smogon");
    expect(Object.keys(SMOGON_NATURES).length).toBeGreaterThan(100);
  });

  it("takes an unevolved Pokémon's nature from its evolution", () => {
    const kadabra = best("kadabra");
    expect(kadabra).toMatchObject({ source: "evolution", from: "alakazam" });
    expect(kadabra.nature).toBe(best("alakazam").nature);
    expect(best("magikarp")).toMatchObject({ source: "evolution", from: "gyarados", nature: best("gyarados").nature });
    expect(best("bulbasaur").from).toBe("ivysaur");
  });

  it("falls back to the stat heuristic only when nothing else exists", () => {
    const fallbacks = POKEDEX_SPECIES.filter((species) => best(species).source === "heuristic");
    expect(fallbacks.length).toBeLessThan(6);
    for (const species of fallbacks) expect(best(species)).toEqual(heuristicBestNature(species as DuelSpeciesId));
  });

  it("always returns a valid nature whose +/- matches its effect, deterministically, for all 151", () => {
    for (const species of POKEDEX_SPECIES) {
      const result = best(species);
      expect(natureEffect(result.nature)).toEqual({ up: result.up, down: result.down });
      expect(best(species)).toEqual(result);
    }
  });
});

describe("heuristicBestNature (fallback)", () => {
  it("gives slow attackers Adamant / Modest and fast ones +Speed", () => {
    for (const species of ["machamp", "golem", "rhydon"]) expect(heuristicBestNature(species as DuelSpeciesId).nature).toBe("adamant");
    for (const species of ["gengar", "exeggutor"]) expect(heuristicBestNature(species as DuelSpeciesId).nature).toBe("modest");
    expect(heuristicBestNature("alakazam" as DuelSpeciesId).nature).toBe("timid");
    expect(heuristicBestNature("dugtrio" as DuelSpeciesId).nature).toBe("jolly");
  });

  it("boosts bulk for species with no real offense", () => {
    const chansey = heuristicBestNature("chansey" as DuelSpeciesId);
    expect(chansey.kind).toBe("bulky");
    expect(["defense", "specialDefense"]).toContain(chansey.up);
  });
});
