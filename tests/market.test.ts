import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  MARKET_STOCK,
  buyFromMarket,
  marketBuyPrice,
  marketSellPrice,
  ownedQuantity,
  sellToMarket,
} from "../apps/client/lib/market";
import { MART_STOCK } from "../apps/client/lib/mart";
import { normalizeStoryState, type StoryState } from "../apps/client/lib/story";
import { serializeStorySave, parseStorySave } from "../apps/client/lib/storyPersistence";

function base(money = 900_000): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    playerPokemon: createPokemonProgression("bulbasaur", 8),
    money,
    inventory: { potion: 0, "poke-ball": 0 },
  });
}

describe("market stock and prices", () => {
  it("sells everything every mart sells, from the start, at the ROM price", () => {
    const everyId = new Set(Object.values(MART_STOCK).flatMap((stock) => stock.map((item) => item.id)));
    expect(new Set(MARKET_STOCK.map((item) => item.id))).toEqual(everyId);
    expect(MARKET_STOCK.length).toBeGreaterThan(8);
    expect(marketBuyPrice("poke-ball")).toBe(200);
    expect(marketBuyPrice("ultra-ball")).not.toBeNull();
    expect(marketBuyPrice("master-ball")).toBeNull();
  });

  it("sells for half the buy price; unpriced items cannot be sold; the Premier Ball is sell-only", () => {
    expect(marketSellPrice("poke-ball")).toBe(100);
    expect(marketSellPrice("potion")).toBe(150);
    expect(marketSellPrice("premier-ball")).toBe(100);
    expect(marketBuyPrice("premier-ball")).toBeNull();
    expect(marketSellPrice("master-ball")).toBeNull();
  });
});

describe("buying", () => {
  it("charges the price, adds the item and rejects a purchase without money", () => {
    const bought = buyFromMarket(base(), "potion", 3);
    expect(bought).toMatchObject({ accepted: true, amount: 900, quantity: 3 });
    expect(bought.story.inventory.potion).toBe(3);
    expect(bought.story.money).toBe(900_000 - 900);
    expect(buyFromMarket(base(100), "potion", 1)).toMatchObject({ accepted: false, reason: "insufficient-funds" });
    expect(buyFromMarket(base(), "master-ball", 1)).toMatchObject({ accepted: false, reason: "unknown-item" });
    expect(buyFromMarket(base(), "potion", 0)).toMatchObject({ accepted: false, reason: "invalid-quantity" });
  });

  it("gives +1 Premier Ball per 20 Poké Balls, 15 Great Balls and 10 Ultra Balls", () => {
    let story = base();
    let result = buyFromMarket(story, "poke-ball", 20);
    expect(result.bonusPremier).toBe(1);
    expect(ownedQuantity(result.story, "premier-ball")).toBe(1);

    result = buyFromMarket(base(), "great-ball", 15);
    expect(result.bonusPremier).toBe(1);
    result = buyFromMarket(base(), "ultra-ball", 10);
    expect(result.bonusPremier).toBe(1);

    story = base();
    result = buyFromMarket(story, "poke-ball", 45);
    expect(result.bonusPremier).toBe(2);
    expect(ownedQuantity(result.story, "premier-ball")).toBe(2);
  });

  it("accumulates the remainder across purchases and across balls independently", () => {
    let story = base();
    story = buyFromMarket(story, "poke-ball", 15).story;
    expect(ownedQuantity(story, "premier-ball")).toBe(0);
    story = buyFromMarket(story, "great-ball", 14).story; // different counter
    expect(ownedQuantity(story, "premier-ball")).toBe(0);
    const next = buyFromMarket(story, "poke-ball", 5);
    expect(next.bonusPremier).toBe(1);
    story = next.story;
    expect(story.ballPurchases).toMatchObject({ "poke-ball": 0, "great-ball": 14 });
    story = buyFromMarket(story, "great-ball", 1).story;
    expect(ownedQuantity(story, "premier-ball")).toBe(2);
  });

  it("does not count other items or Premier Balls toward the bonus", () => {
    const result = buyFromMarket(base(), "super-potion", 50);
    expect(result.bonusPremier).toBe(0);
    expect(ownedQuantity(result.story, "premier-ball")).toBe(0);
  });

  it("keeps the counters through a save round trip", () => {
    const story = buyFromMarket(base(), "poke-ball", 7).story;
    const loaded = parseStorySave(serializeStorySave(story));
    expect(loaded.ballPurchases?.["poke-ball"]).toBe(7);
    expect(normalizeStoryState({ ...loaded, ballPurchases: { "poke-ball": 999, junk: 4 } }).ballPurchases).toEqual({
      "poke-ball": 19,
    });
  });
});

describe("selling", () => {
  it("pays half price, removes the items and refuses what you do not have", () => {
    const owned = buyFromMarket(base(0 + 10_000), "potion", 4).story;
    const sold = sellToMarket(owned, "potion", 3);
    expect(sold).toMatchObject({ accepted: true, amount: 450, quantity: 3 });
    expect(sold.story.inventory.potion).toBe(1);
    expect(sold.story.money).toBe(owned.money + 450);
    expect(sellToMarket(owned, "potion", 5)).toMatchObject({ accepted: false, reason: "not-owned" });
    expect(sellToMarket(owned, "potion", 0)).toMatchObject({ accepted: false, reason: "invalid-quantity" });
  });

  it("sells bag items and the bonus Premier Ball, dropping emptied stacks", () => {
    let story = buyFromMarket(base(), "antidote", 2).story;
    const sold = sellToMarket(story, "antidote", 2);
    expect(sold.accepted).toBe(true);
    expect(sold.story.bagItems?.antidote).toBeUndefined();

    story = buyFromMarket(base(), "poke-ball", 20).story;
    const premier = sellToMarket(story, "premier-ball", 1);
    expect(premier).toMatchObject({ accepted: true, amount: 100 });
  });

  it("refuses items with no sell price", () => {
    const story = { ...base(), bagItems: { "master-ball": 1 } } as StoryState;
    expect(sellToMarket(story, "master-ball", 1)).toMatchObject({ accepted: false, reason: "not-sellable" });
  });
});
