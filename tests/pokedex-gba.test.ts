import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEX_MENU,
  initialDexState,
  isCategoryUnlocked,
  lookUpCategoryBySpecies,
  orderedList,
  stepDex,
  type DexContext,
  type DexState,
} from "../apps/client/lib/gba/dex";
import { buildDexScreen, dexHeightText, dexWeightText, type DexEnv } from "../apps/client/lib/gba/dexRender";
import { SCREEN_H, SCREEN_W, encodeGbaText } from "../apps/client/lib/gba/engine";
import { moveList, selectedIndex } from "../apps/client/lib/gba/listMenu";
import { POKEDEX_ENTRIES } from "../apps/client/lib/generated/pokedexEntries";
import { POKEDEX_CATEGORIES, POKEDEX_ORDERS } from "../apps/client/lib/generated/pokedexOrders";
import { POKEDEX_SPECIES } from "../apps/client/lib/pokedex";

const UI = new URL("../local-assets/extracted/firered/assets/gba-ui/", import.meta.url);
const hasAssets = existsSync(new URL("index.json", UI));
const load = async (p: string) => new Uint8Array(readFileSync(new URL(p, UI)));

const seen = new Set([1, 4, 5, 16, 25, 133]);
const caught = new Set([4, 25]);
const ctx: DexContext = {
  flags: POKEDEX_SPECIES.map((_, i) => ({ seen: seen.has(i + 1), caught: caught.has(i + 1) })),
};
const env: DexEnv = {
  load,
  speciesName: (d) => POKEDEX_SPECIES[d - 1].toUpperCase(),
  speciesTypes: () => [0],
  frontSpriteUrl: () => null,
};

function run(state: DexState, keys: Parameters<typeof stepDex>[1][]): DexState {
  let s = state;
  for (const k of keys) s = stepDex(s, k, ctx).state;
  return s;
}

describe("FireRed Pokédex data from the ROM", () => {
  it("matches the ROM for Bulbasaur / Charmander and keeps size-comparison parameters", () => {
    expect(POKEDEX_ENTRIES.bulbasaur).toMatchObject({ category: "SEED", height: 7, weight: 69, monScale: 356, monOffset: 16 });
    expect(POKEDEX_ENTRIES.charmander.pages.flat().join(" ")).toContain("flame burns");
  });

  it("formats height and weight like DexScreen_PrintMonHeight/Weight", () => {
    expect(dexHeightText(7).trim()).toBe("2’04”");
    expect(dexHeightText(17).trim()).toBe("5’07”");
    expect(dexWeightText(69).trim()).toBe("15.2");
    expect(dexWeightText(4600)).toBe("1014.1"); // Snorlax-sized values keep four integer digits
  });

  it("orders contain every Kanto species exactly once; habitat pages cover all 151", () => {
    for (const order of Object.values(POKEDEX_ORDERS)) expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 151 }, (_, i) => i + 1));
    const all = new Set(POKEDEX_CATEGORIES.flatMap((c) => c.pages.flat()));
    expect(all.size).toBe(151);
  });
});

describe("GBA text encoding", () => {
  it("encodes letters, digits, keypad icons and the No glyph", () => {
    expect(encodeGbaText("A")).toEqual([0xbb]);
    expect(encodeGbaText("a1!")).toEqual([0xd5, 0xa2, 0xab]);
    expect(encodeGbaText("{NO}")).toEqual([0x108]);
    expect(encodeGbaText("{A_BUTTON}")).toEqual([-1]);
  });
});

describe("ListMenu cursor logic (list_menu.c)", () => {
  const cfg = { maxShowed: 9, totalItems: 151 };
  it("scrolls once the cursor passes the middle row", () => {
    let s = { cursorPos: 0, itemsAbove: 0 };
    for (let i = 0; i < 5; i += 1) s = moveList(s, cfg, 1, true);
    expect(s).toEqual({ cursorPos: 0, itemsAbove: 5 });
    s = moveList(s, cfg, 1, true);
    expect(s).toEqual({ cursorPos: 1, itemsAbove: 5 });
    expect(selectedIndex(s)).toBe(6);
  });
  it("skips headers in the table of contents", () => {
    const top = initialDexState();
    expect(DEX_MENU[selectedIndex(top.list)].label).toBe("NUMERICAL MODE");
    const down = run(top, ["down"]);
    if (down.screen !== "top") throw new Error("expected top");
    expect(DEX_MENU[selectedIndex(down.list)].label).toBe("Grassland POKéMON");
  });
});

describe("Pokédex navigation", () => {
  it("numerical mode: A opens the page of a seen Pokémon, Start cries, A opens the area page, B walks back", () => {
    let s: DexState = run(initialDexState(), ["a"]); // numerical list
    expect(s.screen).toBe("order");
    const toCharmander = stepDex(run(s, ["down", "down", "down"]), "a", ctx);
    expect(toCharmander.state.screen).toBe("page");
    expect(toCharmander.cry).toBe(4);
    const cry = stepDex(toCharmander.state, "start", ctx);
    expect(cry.cry).toBe(4);
    s = stepDex(toCharmander.state, "a", ctx).state;
    expect(s.screen).toBe("area");
    expect(stepDex(s, "b", ctx).state.screen).toBe("page");
    expect(stepDex(s, "a", ctx).state.screen).toBe("order");
  });

  it("unseen entries cannot be opened", () => {
    const list = run(initialDexState(), ["a"]);
    const res = stepDex(run(list, ["down"]), "a", ctx); // No.002 is unseen
    expect(res.state.screen).toBe("order");
  });

  it("Up/Down on a page jumps to the neighbouring seen Pokémon", () => {
    const page = stepDex(run(initialDexState(), ["a", "down", "down", "down"]), "a", ctx).state;
    const next = stepDex(page, "down", ctx).state;
    expect(next.screen === "page" && next.species).toBe(5);
  });

  it("habitat categories unlock when a species on their pages was seen", () => {
    expect(isCategoryUnlocked(0, ctx)).toBe(true); // Grassland has Rattata/Pidgey pages
    const cat = lookUpCategoryBySpecies(25, ctx);
    expect(cat).not.toBeNull();
  });

  it("A to Z mode opens the species' habitat page first (LookUpCategoryBySpecies)", () => {
    const atoz = DEX_MENU.findIndex((e) => e.kind === "order" && e.order === "atoz");
    let s: DexState = initialDexState();
    for (let i = 0; i < 40 && !(s.screen === "top" && s.list.cursorPos + s.list.itemsAbove === atoz); i += 1) s = run(s, ["down"]);
    s = stepDex(s, "a", ctx).state;
    expect(s.screen).toBe("order");
    const list = orderedList("atoz", ctx);
    expect(list.length).toBe(seen.size);
    const opened = stepDex(s, "a", ctx).state;
    expect(opened.screen).toBe("category");
  });

  it("flipping past the first habitat page leaves the menu", () => {
    let s: DexState = initialDexState();
    for (let i = 0; i < 2; i += 1) s = run(s, ["down"]); // Grassland (index 3)
    const cat = stepDex(s, "a", ctx).state;
    expect(cat.screen).toBe("category");
    expect(stepDex(cat, "l", ctx).state.screen).toBe("top");
  });
});

describe.skipIf(!hasAssets)("rendered from ROM assets", () => {
  it("draws the table of contents with the ROM font, palette and header bar", async () => {
    const screen = await buildDexScreen(initialDexState(), ctx, env);
    const px = screen.render();
    expect(px.length).toBe(SCREEN_W * SCREEN_H * 4);
    const rgba = new Uint32Array(px.buffer);
    // Header bar (palette bank 15, fill 15) is a flat tan; the page background is a pale pattern.
    const bar = rgba[3 * SCREEN_W + 2];
    expect(rgba[8 * SCREEN_W + 100]).toBe(bar); // inside the 16px high bar, away from text
    expect(rgba[80 * SCREEN_W + 235]).not.toBe(bar);
    // Text pixels exist in the list window (selection arrow area).
    let lit = 0;
    for (let x = 12; x < 20; x += 1) for (let y = 30; y < 44; y += 1) if (rgba[y * SCREEN_W + x] !== rgba[80 * SCREEN_W + 235]) lit += 1;
    expect(lit).toBeGreaterThan(5);
  });

  it("draws the numerical list, a Pokémon page and the area page without throwing", async () => {
    let s: DexState = run(initialDexState(), ["a", "down", "down", "down"]);
    await buildDexScreen(s, ctx, env);
    s = stepDex(s, "a", ctx).state;
    await buildDexScreen(s, ctx, env);
    s = stepDex(s, "a", ctx).state;
    expect(s.screen).toBe("area");
    await buildDexScreen(s, ctx, env);
  });

  it("exports 151 ROM cries as WAV files", () => {
    for (let n = 1; n <= 151; n += 1) {
      const wav = readFileSync(new URL(`cries/${String(n).padStart(3, "0")}.wav`, UI));
      expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(wav.length).toBeGreaterThan(1000);
    }
  });
});
