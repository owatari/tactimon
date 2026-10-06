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
