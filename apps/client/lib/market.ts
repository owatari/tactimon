import type { DuelItemId } from "@tactimon/battle-engine";
import {
  BAG_ITEM_MAX_QUANTITY,
  isBagItemId,
  type BagItems,
  type OverworldItemId,
} from "./items";
import { MART_STOCK, buyMartItem, type MartItem } from "./mart";
import type { StoryState } from "./story";

/** Balls that earn a bonus Premier Ball: one extra for every N bought (Master Balls do not count). */
export const PREMIER_BONUS_STEP = {
  "poke-ball": 20,
  "great-ball": 15,
  "ultra-ball": 10,
} as const;
export type PremierBonusBall = keyof typeof PREMIER_BONUS_STEP;
export type BallPurchaseCounters = Partial<Record<PremierBonusBall, number>>;

export const isPremierBonusBall = (id: string): id is PremierBonusBall =>
  Object.prototype.hasOwnProperty.call(PREMIER_BONUS_STEP, id);

/** Not sold, but it has a value so it can be sold back (FireRed: ₽200 like a Poké Ball). */
const SELL_ONLY_PRICES: Partial<Record<OverworldItemId, number>> = { "premier-ball": 200 };

/**
 * Everything the Poké Mart sells, from the first town on (no per-city stock any more): the union of
 * every mart's list, in the order they first appear, at the ROM price.
 */
export const MARKET_STOCK: readonly MartItem[] = (() => {
  const seen = new Map<string, MartItem>();
  for (const stock of Object.values(MART_STOCK)) {
    for (const item of stock) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }
  return [...seen.values()];
})();

export function marketBuyPrice(id: OverworldItemId): number | null {
  return MARKET_STOCK.find((item) => item.id === id)?.price ?? null;
}

/** Half of the buy price, as in FireRed; key items and anything without a price cannot be sold. */
export function marketSellPrice(id: OverworldItemId): number | null {
  const base = marketBuyPrice(id) ?? SELL_ONLY_PRICES[id] ?? null;
  return base === null ? null : Math.floor(base / 2);
}

export function ownedQuantity(story: Pick<StoryState, "inventory" | "bagItems">, id: OverworldItemId): number {
  return isBagItemId(id)
    ? (story.bagItems?.[id] ?? 0)
    : (story.inventory[id as DuelItemId] ?? 0);
}

export type MarketFailure =
  | "unknown-item"
  | "invalid-quantity"
  | "insufficient-funds"
  | "inventory-full"
  | "not-owned"
  | "not-sellable";

export type MarketResult = {
  accepted: boolean;
  story: StoryState;
  reason?: MarketFailure;
  /** Money spent (buy) or earned (sell). */
  amount: number;
  quantity: number;
  /** Premier Balls granted by this purchase. */
  bonusPremier: number;
};

const refuse = (story: StoryState, reason: MarketFailure): MarketResult => ({
  accepted: false,
  story,
  reason,
  amount: 0,
  quantity: 0,
  bonusPremier: 0,
});

/** Buys `quantity` of an item. Every 20 Poké / 15 Great / 10 Ultra Balls bought adds a Premier Ball. */
export function buyFromMarket(story: StoryState, itemId: OverworldItemId, quantity: number): MarketResult {
  const bought = buyMartItem(
    story.money,
    story.inventory,
    itemId,
    quantity,
    story.bagItems ?? {},
    MARKET_STOCK,
  );
  if (!bought.accepted) return refuse(story, bought.reason ?? "unknown-item");

  let bagItems: BagItems = bought.bagItems;
  let bonusPremier = 0;
  let counters: BallPurchaseCounters = story.ballPurchases ?? {};
  if (isPremierBonusBall(itemId)) {
    const step = PREMIER_BONUS_STEP[itemId];
    const total = (counters[itemId] ?? 0) + bought.purchased;
    bonusPremier = Math.floor(total / step);
    counters = { ...counters, [itemId]: total % step };
    if (bonusPremier > 0) {
      const have = bagItems["premier-ball"] ?? 0;
      const next = Math.min(BAG_ITEM_MAX_QUANTITY, have + bonusPremier);
      bonusPremier = next - have;
      bagItems = { ...bagItems, "premier-ball": next };
    }
  }

  return {
    accepted: true,
    amount: bought.spent,
    quantity: bought.purchased,
    bonusPremier,
    story: {
      ...story,
      money: bought.money,
      inventory: bought.inventory,
      bagItems,
      ballPurchases: counters,
    },
  };
}

/** Sells `quantity` of an item you own at its sell price. */
export function sellToMarket(story: StoryState, itemId: OverworldItemId, quantity: number): MarketResult {
  const price = marketSellPrice(itemId);
  if (price === null) return refuse(story, "not-sellable");
  if (!Number.isSafeInteger(quantity) || quantity < 1) return refuse(story, "invalid-quantity");
  const owned = ownedQuantity(story, itemId);
  if (owned < quantity) return refuse(story, "not-owned");

  const amount = price * quantity;
  const left = owned - quantity;
  const next: StoryState = isBagItemId(itemId)
    ? { ...story, bagItems: { ...(story.bagItems ?? {}), [itemId]: left } }
    : { ...story, inventory: { ...story.inventory, [itemId]: left } };
  if (isBagItemId(itemId) && left === 0) {
    const bag = { ...(next.bagItems ?? {}) };
    delete bag[itemId];
    next.bagItems = bag;
  }
  return {
    accepted: true,
    amount,
    quantity,
    bonusPremier: 0,
    story: { ...next, money: story.money + amount },
  };
}
