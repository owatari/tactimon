import type { DuelItemId } from "@tactimon/battle-engine";

/**
 * Overworld items that the battle engine cannot use yet. They live in the
 * story bag (`StoryState.bagItems`) so finds are persisted per player.
 * TMs and held items are intentionally absent: they belong to the future
 * dungeon/raid systems.
 */
export const BAG_ITEM_CATALOG = {
  "great-ball": { name: "Great Ball", firered: 3 },
  antidote: { name: "Antidote", firered: 14 },
  "burn-heal": { name: "Burn Heal", firered: 15 },
  "ice-heal": { name: "Ice Heal", firered: 16 },
  awakening: { name: "Awakening", firered: 17 },
  "parlyz-heal": { name: "Parlyz Heal", firered: 18 },
  "hyper-potion": { name: "Hyper Potion", firered: 21 },
  "super-potion": { name: "Super Potion", firered: 22 },
  revive: { name: "Revive", firered: 24 },
  ether: { name: "Ether", firered: 34 },
  "max-ether": { name: "Max Ether", firered: 35 },
  elixir: { name: "Elixir", firered: 36 },
  "lava-cookie": { name: "Lava Cookie", firered: 38 },
  "rare-candy": { name: "Rare Candy", firered: 68 },
  "x-attack": { name: "X Attack", firered: 75 },
  "escape-rope": { name: "Escape Rope", firered: 85 },
  "moon-stone": { name: "Moon Stone", firered: 94 },
  "tiny-mushroom": { name: "TinyMushroom", firered: 103 },
  "big-mushroom": { name: "Big Mushroom", firered: 104 },
  stardust: { name: "Stardust", firered: 108 },
  "star-piece": { name: "Star Piece", firered: 109 },
} as const;

export type BagItemId = keyof typeof BAG_ITEM_CATALOG;
export type BagItems = Partial<Record<BagItemId, number>>;
export type OverworldItemId = DuelItemId | BagItemId;

export const BAG_ITEM_MAX_QUANTITY = 999;

export function isBagItemId(value: unknown): value is BagItemId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(BAG_ITEM_CATALOG, value)
  );
}

export function normalizeBagItems(value: unknown): BagItems {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized: BagItems = {};
  for (const [id, quantity] of Object.entries(value)) {
    if (
      isBagItemId(id) &&
      typeof quantity === "number" &&
      Number.isFinite(quantity) &&
      quantity > 0
    ) {
      normalized[id] = Math.min(
        BAG_ITEM_MAX_QUANTITY,
        Math.trunc(quantity),
      );
    }
  }

  return normalized;
}
