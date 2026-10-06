import { describe, expect, it } from "vitest";
import { calculateDuelPokemonMaxHp, createPokemonProgression } from "../packages/battle-engine/src";
import { ITEM_EFFECTS, isFieldUsableItem, useBagItem } from "../apps/client/lib/itemUse";
import { itemDescription } from "../apps/client/lib/items";
import { chooseStarter, normalizeStoryState } from "../apps/client/lib/story";
import { MART_STOCK } from "../apps/client/lib/mart";

function storyWith(item: string, quantity: number) {
  const story = chooseStarter("squirtle");
  return normalizeStoryState({ ...story, bagItems: { [item]: quantity } } as never);
}

describe("vitamins", () => {
  it("are field-usable and bought in the Celadon Dept. Store", () => {
    for (const id of ["hp-up", "protein", "iron", "calcium", "zinc", "carbos"]) {
      expect(isFieldUsableItem(id), id).toBe(true);
      expect(itemDescription(id as never)).not.toBe("A Kanto item.");
    }
    const stocked = Object.values(MART_STOCK).flat().map((item) => item.id);
    expect(stocked).toContain("protein");
    expect(ITEM_EFFECTS.protein).toEqual({ kind: "vitamin", stat: "attack" });
  });

  it("raise the matching EV by 10, consume one item and raise HP Up's max HP", () => {
    let story = storyWith("hp-up", 12);
    const before = calculateDuelPokemonMaxHp(story.playerPokemon!);
    const result = useBagItem(story, "hp-up", 0);
    expect(result.accepted).toBe(true);
    story = result.story;
    expect(story.playerPokemon!.evs.hp).toBe(10);
    expect(story.bagItems?.["hp-up"]).toBe(11);
    expect(calculateDuelPokemonMaxHp(story.playerPokemon!)).toBeGreaterThanOrEqual(before);
    expect(result.message).toMatch(/HP/);
  });

  it("refuse (and keep the item) once the stat has 100 EVs", () => {
    let story = storyWith("protein", 15);
    for (let i = 0; i < 10; i += 1) story = useBagItem(story, "protein", 0).story;
    expect(story.playerPokemon!.evs.attack).toBe(100);
    const refused = useBagItem(story, "protein", 0);
    expect(refused.accepted).toBe(false);
    expect(refused.story.bagItems?.protein).toBe(5);
  });

  it("work on a party member other than the lead", () => {
    const base = chooseStarter("charmander");
    const story = normalizeStoryState({
      ...base,
      capturedPokemon: [createPokemonProgression("pidgey", 10)],
      bagItems: { carbos: 1 },
    } as never);
    const result = useBagItem(story, "carbos", 1);
    expect(result.accepted).toBe(true);
    expect(result.story.capturedPokemon[0].evs.speed).toBe(10);
  });
});
