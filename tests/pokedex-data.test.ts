import { describe, expect, it } from "vitest";
import {
  speciesEvolvesFrom,
  speciesEvolvesTo,
  speciesLearnset,
  speciesLocations,
  speciesMachines,
  speciesStaticSources,
} from "../apps/client/lib/pokedexData";
import { POKEDEX_SPECIES } from "../apps/client/lib/pokedex";

describe("Pokédex data", () => {
  it("turns the encounter tables around: where a species appears", () => {
    const pidgey = speciesLocations("pidgey");
    const route1 = pidgey.find((entry) => entry.mapId === "route-1");
    expect(route1).toMatchObject({ method: "grass", minLevel: 2, maxLevel: 5 });
    expect(route1!.percent).toBeGreaterThan(30);
    expect(route1!.percent).toBeLessThanOrEqual(100);
    expect(pidgey[0].percent).toBeGreaterThanOrEqual(pidgey.at(-1)!.percent);

    expect(speciesLocations("magikarp").some((entry) => entry.method.endsWith("rod"))).toBe(true);
    expect(speciesLocations("tentacool").some((entry) => entry.method === "surf")).toBe(true);
    expect(speciesLocations("zubat").some((entry) => entry.method === "cave")).toBe(true);
  });

  it("lists gifts, prizes and fossils that are not in the tables", () => {
    expect(speciesStaticSources("eevee").length).toBe(1);
    expect(speciesStaticSources("omanyte")[0]).toContain("Fossil");
    expect(speciesStaticSources("pidgey")).toEqual([]);
  });

  it("every Kanto species is found somewhere: the wild, a gift, an evolution or a raid", () => {
    const lost = POKEDEX_SPECIES.filter(
      (species) =>
        speciesLocations(species).length === 0 &&
        speciesStaticSources(species).length === 0 &&
        speciesEvolvesFrom(species) === null,
    );
    expect(lost).toEqual([]);
  });

  it("knows the evolution line both ways, by level and by stone", () => {
    expect(speciesEvolvesTo("charmander")).toEqual([{ species: "charmeleon", how: { level: 16 } }]);
    expect(speciesEvolvesFrom("charmeleon")).toBe("charmander");
    expect(speciesEvolvesTo("pikachu").some((step) => "stone" in step.how)).toBe(true);
    expect(speciesEvolvesFrom("charmander")).toBeNull();
  });

  it("returns the level-up moves in order and the TMs / HMs from the ROM", () => {
    const learnset = speciesLearnset("bulbasaur");
    expect(learnset[0].level).toBeLessThanOrEqual(learnset.at(-1)!.level);
    expect(learnset.some((entry) => entry.moveId === "vine-whip")).toBe(true);

    const alakazam = speciesMachines("alakazam");
    expect(alakazam.find((m) => m.kind === "TM" && m.number === 29)?.moveId).toBe("psychic");
    expect(speciesMachines("gyarados").some((m) => m.kind === "HM" && m.moveId === "surf")).toBe(true);
    expect(speciesMachines("caterpie")).toEqual([]);
  });
});
