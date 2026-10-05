import type {
  DuelInventory,
  DuelItemId,
} from "@tactimon/battle-engine";
import { tx } from "./i18n";
import { GENERATED_MARTS } from "./generated/worldServices";
import {
  BAG_ITEM_MAX_QUANTITY,
  itemDescription,
  isBagItemId,
  type BagItems,
  type OverworldItemId,
} from "./items";

export type MartItem = {
  id: OverworldItemId;
  name: string;
  price: number;
  description: string;
};

export const MART_MAX_ITEM_QUANTITY = 999;
export const MART_MAX_PURCHASE_QUANTITY = 99;

const POKE_BALL: MartItem = {
  id: "poke-ball",
  name: "Poké Ball",
  price: 200,
  description: tx("Used to catch wild Pokémon."),
};
const POTION: MartItem = {
  id: "potion",
  name: "Potion",
  price: 300,
  description: tx("Restores 20 HP of a Pokémon in battle."),
};
const SUPER_POTION: MartItem = {
  id: "super-potion",
  name: "Super Potion",
  price: 700,
  description: tx("Restores 50 HP of a Pokémon."),
};
const ANTIDOTE: MartItem = {
  id: "antidote",
  name: "Antidote",
  price: 100,
  description: tx("Cures a poisoned Pokémon."),
};
const PARLYZ_HEAL: MartItem = {
  id: "parlyz-heal",
  name: "Parlyz Heal",
  price: 200,
  description: tx("Heals a Pokémon's paralysis."),
};
const AWAKENING: MartItem = {
  id: "awakening",
  name: "Awakening",
  price: 250,
  description: tx("Wakes up a sleeping Pokémon."),
};
const BURN_HEAL: MartItem = {
  id: "burn-heal",
  name: "Burn Heal",
  price: 250,
  description: tx("Heals a Pokémon's burn."),
};
const ICE_HEAL: MartItem = {
  id: "ice-heal",
  name: "Ice Heal",
  price: 250,
  description: tx("Thaws out a frozen Pokémon."),
};
const ESCAPE_ROPE: MartItem = {
  id: "escape-rope",
  name: "Escape Rope",
  price: 550,
  description: tx("Lets you escape from caves and dungeons."),
};
const REPEL: MartItem = {
  id: "repel",
  name: "Repel",
  price: 350,
  description: tx("Keeps weak wild Pokémon away for a while."),
};

/** FireRed shop stock per Poké Mart (ROM `pokemart` lists, before badge upgrades). */
const HAND_MART_STOCK: Readonly<
  Record<string, readonly MartItem[]>
> = {
  "viridian-mart": [POKE_BALL, POTION, ANTIDOTE, PARLYZ_HEAL],
  "pewter-mart": [
    POKE_BALL,
    POTION,
    ANTIDOTE,
    PARLYZ_HEAL,
    AWAKENING,
    BURN_HEAL,
    ESCAPE_ROPE,
    REPEL,
  ],
  "cerulean-mart": [
    POKE_BALL,
    SUPER_POTION,
    POTION,
    ANTIDOTE,
    PARLYZ_HEAL,
    AWAKENING,
    BURN_HEAL,
    ESCAPE_ROPE,
    REPEL,
  ],
  "vermilion-mart": [
    POKE_BALL,
    SUPER_POTION,
    ANTIDOTE,
    PARLYZ_HEAL,
    AWAKENING,
    ICE_HEAL,
    REPEL,
  ],
};

const GENERATED_MART_STOCK: Record<string, readonly MartItem[]> =
  Object.fromEntries(
    Object.entries(GENERATED_MARTS).map(([martId, mart]) => [
      martId,
      mart.stock.map((entry) => ({
        id: entry.id as OverworldItemId,
        name: entry.name,
        price: entry.price,
        description: itemDescription(entry.id as OverworldItemId),
      })),
    ]),
  );

/** FireRed shop stock per Poké Mart / counter (ROM `pokemart` lists). */
export const MART_STOCK: Readonly<
  Record<string, readonly MartItem[]>
> = { ...GENERATED_MART_STOCK, ...HAND_MART_STOCK };

export const VIRIDIAN_MART_ITEMS: readonly MartItem[] =
  MART_STOCK["viridian-mart"];

export function martStockFor(
  martId: string,
): readonly MartItem[] {
  return MART_STOCK[martId] ?? VIRIDIAN_MART_ITEMS;
}

export type MartPurchaseFailureReason =
  | "unknown-item"
  | "invalid-quantity"
  | "insufficient-funds"
  | "inventory-full";

export type MartPurchaseValidation =
  | {
      accepted: true;
      item: MartItem;
      quantity: number;
      totalPrice: number;
    }
  | {
      accepted: false;
      reason: MartPurchaseFailureReason;
    };

export type MartPurchaseResult = {
  accepted: boolean;
  money: number;
  inventory: DuelInventory;
  bagItems: BagItems;
  spent: number;
  purchased: number;
  reason?: MartPurchaseFailureReason;
};

function normalizedNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

export function martItemPrice(
  itemId: OverworldItemId,
  stock: readonly MartItem[] = VIRIDIAN_MART_ITEMS,
): number | null {
  return (
    stock.find(
      (candidate) => candidate.id === itemId,
    )?.price ?? null
  );
}

export function validateMartPurchase(
  money: number,
  inventory: DuelInventory,
  itemId: OverworldItemId,
  quantity: number,
  bagItems: BagItems = {},
  stock: readonly MartItem[] = VIRIDIAN_MART_ITEMS,
): MartPurchaseValidation {
  const item = stock.find(
    (candidate) => candidate.id === itemId,
  );

  if (!item) {
    return {
      accepted: false,
      reason: "unknown-item",
    };
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > MART_MAX_PURCHASE_QUANTITY
  ) {
    return {
      accepted: false,
      reason: "invalid-quantity",
    };
  }

  const bagItemId = isBagItemId(itemId) ? itemId : null;
  const current = normalizedNonNegativeInteger(
    bagItemId
      ? (bagItems[bagItemId] ?? 0)
      : (inventory[itemId as DuelItemId] ?? 0),
  );

  if (
    current + quantity >
    (bagItemId
      ? BAG_ITEM_MAX_QUANTITY
      : MART_MAX_ITEM_QUANTITY)
  ) {
    return {
      accepted: false,
      reason: "inventory-full",
    };
  }

  const totalPrice = quantity * item.price;
  const balance = normalizedNonNegativeInteger(money);

  if (balance < totalPrice) {
    return {
      accepted: false,
      reason: "insufficient-funds",
    };
  }

  return {
    accepted: true,
    item,
    quantity,
    totalPrice,
  };
}

export function buyMartItem(
  money: number,
  inventory: DuelInventory,
  itemId: OverworldItemId,
  quantity = 1,
  bagItems: BagItems = {},
  stock: readonly MartItem[] = VIRIDIAN_MART_ITEMS,
): MartPurchaseResult {
  const balance = normalizedNonNegativeInteger(money);
  const validation = validateMartPurchase(
    balance,
    inventory,
    itemId,
    quantity,
    bagItems,
    stock,
  );

  if (!validation.accepted) {
    return {
      accepted: false,
      money: balance,
      inventory: { ...inventory },
      bagItems: { ...bagItems },
      spent: 0,
      purchased: 0,
      reason: validation.reason,
    };
  }

  const base = {
    accepted: true,
    money: balance - validation.totalPrice,
    spent: validation.totalPrice,
    purchased: validation.quantity,
  };

  if (isBagItemId(itemId)) {
    return {
      ...base,
      inventory: { ...inventory },
      bagItems: {
        ...bagItems,
        [itemId]:
          normalizedNonNegativeInteger(
            bagItems[itemId] ?? 0,
          ) + validation.quantity,
      },
    };
  }

  return {
    ...base,
    inventory: {
      ...inventory,
      [itemId]:
        normalizedNonNegativeInteger(
          inventory[itemId as DuelItemId] ?? 0,
        ) + validation.quantity,
    },
    bagItems: { ...bagItems },
  };
}
