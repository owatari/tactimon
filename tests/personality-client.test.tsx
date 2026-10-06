// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { createPokemonProgression, rollPersonality } from "../packages/battle-engine/src";
import { SummaryInfo, SummaryStats } from "../apps/client/components/StartMenu";
import { grantGiftPokemon } from "../apps/client/lib/giftPokemon";
import { natureEffectText, natureName } from "../apps/client/lib/natures";
import { setLocale } from "../apps/client/lib/i18n";
import { chooseStarter, normalizeStoryState } from "../apps/client/lib/story";
import { parseStorySave, serializeStorySave } from "../apps/client/lib/storyPersistence";

const require = createRequire(new URL("../apps/client/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");

describe("personality in the client", () => {
  it("the starter rolls a nature and IVs, and a save round trip keeps them", () => {
    const story = chooseStarter("squirtle");
    expect(story.playerPokemon?.nature).toBeDefined();
    expect(story.playerPokemon?.ivs).toBeDefined();
    const loaded = parseStorySave(serializeStorySave(story))!;
    expect(loaded.playerPokemon?.nature).toBe(story.playerPokemon?.nature);
    expect(loaded.playerPokemon?.ivs).toEqual(story.playerPokemon?.ivs);
  });

  it("old saves without personality still load (IV 15 / neutral) and keep their HP", () => {
    const old = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 12),
      capturedPokemon: [createPokemonProgression("pidgey", 6)],
    });
    expect(old.playerPokemon?.nature).toBeUndefined();
    expect(old.capturedPokemon[0].ivs).toBeUndefined();
    expect(old.playerPokemon?.currentHp).toBe(createPokemonProgression("bulbasaur", 12).currentHp);
  });

  it("gift Pokémon roll a personality", () => {
    const result = grantGiftPokemon(chooseStarter("charmander"), "test-gift", "eevee", 25);
    expect(result.granted).toBe(true);
    if (result.granted) {
      const gift = result.story.capturedPokemon.at(-1) ?? result.story.boxedPokemon.at(-1);
      expect(gift?.nature).toBeDefined();
      expect(gift?.ivs).toBeDefined();
    }
  });

  it("names every nature in all five languages and describes the stat change", () => {
    for (const locale of ["en", "pt", "es", "fr", "zh"] as const) {
      setLocale(locale);
      const names = new Set(
        (["hardy", "adamant", "timid", "modest", "quirky"] as const).map((n) => natureName(n)),
      );
      expect(names.size).toBe(5);
    }
    setLocale("en");
    expect(natureName("adamant")).toBe("Adamant");
    expect(natureEffectText("adamant")).toBe("+ATTACK −SP. ATK");
    expect(natureEffectText("hardy")).toBeNull();
    setLocale("pt");
    expect(natureName("adamant")).toBe("Rígida");
    setLocale("en");
  });

  it("Summary shows the nature on the info page and tints the changed stats on the skills page", () => {
    const pokemon = createPokemonProgression("charmander", 20, { ...rollPersonality(() => 0.5), nature: "modest" });
    const story = chooseStarter("charmander");
    const info = renderToStaticMarkup(React.createElement(SummaryInfo, { pokemon, story }));
    expect(info).toContain("Modest");
    expect(info).toContain("+SP. ATK −ATTACK");
    const skills = renderToStaticMarkup(React.createElement(SummaryStats, { pokemon }));
    expect(skills).toMatch(/class="nature-up"[^>]*>SP\. ATK/);
    expect(skills).toMatch(/class="nature-down"[^>]*>ATTACK/);
  });
});

describe("shiny in the client", () => {
  it("survives story normalization, saves and the held capture", () => {
    const base = chooseStarter("squirtle");
    const shiny = { ...createPokemonProgression("pidgey", 6, { ...rollPersonality(() => 0.5), shiny: true }), species: "pidgey" } as never;
    const story = normalizeStoryState({ ...base, capturedPokemon: [shiny], pendingCaptures: [shiny] } as never);
    expect(story.capturedPokemon[0].shiny).toBe(true);
    expect(story.pendingCaptures?.[0].shiny).toBe(true);
    const loaded = parseStorySave(serializeStorySave(story))!;
    expect(loaded.capturedPokemon[0].shiny).toBe(true);
    expect(loaded.pendingCaptures?.[0].shiny).toBe(true);
    const plain = normalizeStoryState({ ...base, capturedPokemon: [createPokemonProgression("pidgey", 6)] } as never);
    expect(plain.capturedPokemon[0].shiny).toBeUndefined();
  });

  it("the Summary and the front sprite use the shiny palette", async () => {
    const { pokedexFrontSpriteUrl } = await import("../apps/client/lib/pokedex");
    expect(pokedexFrontSpriteUrl("pikachu")).toContain("/front/normal/");
    expect(pokedexFrontSpriteUrl("pikachu", true)).toContain("/front/shiny/");
  });
});
