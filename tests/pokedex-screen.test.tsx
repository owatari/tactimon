// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PokedexScreen } from "../apps/client/components/PokedexScreen";
import { POKEDEX_ENTRIES } from "../apps/client/lib/generated/pokedexEntries";
import {
  POKEDEX_SPECIES,
  pokedexFrontSpriteUrl,
  pokedexHeight,
  pokedexWeight,
  type PokedexEntry,
} from "../apps/client/lib/pokedex";
import { pokedexAreas } from "../apps/client/lib/pokedexAreas";

const require = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");

const entries: PokedexEntry[] = POKEDEX_SPECIES.map((id, index) => ({
  number: index + 1,
  id,
  status: id === "bulbasaur" ? "caught" : id === "ivysaur" ? "seen" : "unseen",
}));

const render = (view: "list" | "entry" | "area", index = 0) =>
  renderToStaticMarkup(
    React.createElement(PokedexScreen, {
      entries,
      index,
      view,
      seen: 2,
      caught: 1,
    }),
  );

describe("FireRed Pokédex data (ROM)", () => {
  it("has an entry, a front sprite and a description for all 151 species", () => {
    for (const id of POKEDEX_SPECIES) {
      const entry = POKEDEX_ENTRIES[id];
      expect(entry, id).toBeDefined();
      expect(entry.category.length, id).toBeGreaterThan(0);
      expect(entry.pages.flat().length, id).toBeGreaterThan(0);
      expect(entry.sprite, id).toBeTruthy();
      expect(pokedexFrontSpriteUrl(id), id).toContain("/front/normal/");
    }
  });

  it("matches the ROM for Bulbasaur and uses FireRed imperial units", () => {
    expect(POKEDEX_ENTRIES.bulbasaur).toMatchObject({
      category: "SEED",
      height: 7,
      weight: 69,
    });
    expect(pokedexHeight(7)).toBe("2'04\"");
    expect(pokedexWeight(69)).toBe("15.2 lbs.");
  });

  it("lists wild areas, collapsing floors, and none for gift Pokémon", () => {
    expect(pokedexAreas("pidgey")).toContain("Route 1");
    expect(pokedexAreas("slowpoke").filter((a) => /Seafoam/i.test(a))).toHaveLength(1);
    expect(pokedexAreas("charmander")).toEqual([]);
  });
});

describe("PokedexScreen", () => {
  it("list: shows seen/own counters, ??? for unknown and the front sprite", () => {
    const html = render("list");
    expect(html).toContain("SEEN");
    expect(html).toContain("BULBASAUR");
    expect(html).toContain("----------");
    expect(html).toContain("0001_bulbasaur.png");
  });

  it("entry: category, height/weight and the ROM description for caught Pokémon", () => {
    const html = render("entry");
    expect(html).toContain("SEED");
    expect(html).toContain("2&#x27;04&quot;");
    expect(html).toContain("plant seed");
  });

  it("entry: seen-only Pokémon hide the description", () => {
    const html = render("entry", 1);
    expect(html).not.toContain("seed slowly");
    expect(html).toContain("not been caught");
  });

  it("area: lists locations or AREA UNKNOWN", () => {
    expect(render("area", 0)).toContain("AREA UNKNOWN");
    const pidgey = POKEDEX_SPECIES.indexOf("pidgey");
    const withPidgey = entries.map((e) =>
      e.id === "pidgey" ? { ...e, status: "caught" as const } : e,
    );
    const html = renderToStaticMarkup(
      React.createElement(PokedexScreen, {
        entries: withPidgey,
        index: pidgey,
        view: "area",
        seen: 3,
        caught: 2,
      }),
    );
    expect(html).toContain("Route 1");
  });
});
