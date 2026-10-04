import type {
  DuelInventory,
  DuelItemId,
} from "@tactimon/battle-engine";

export type MartItem = {
  id: DuelItemId;
  name: string;
  price: number;
  description: string;
};

export const MART_MAX_ITEM_QUANTITY = 999;
export const MART_MAX_PURCHASE_QUANTITY = 99;

export const VIRIDIAN_MART_ITEMS: readonly MartItem[] = [
  {
    id: "poke-ball",
    name: "Poké Ball",
    price: 200,
    description: "Usada para capturar Pokémon selvagens.",
  },
  {
    id: "potion",
    name: "Potion",
    price: 300,
    description: "Restaura 20 HP de um Pokémon em batalha.",
  },
];

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
  itemId: DuelItemId,
): number | null {
  return (
    VIRIDIAN_MART_ITEMS.find(
      (candidate) => candidate.id === itemId,
    )?.price ?? null
  );
}

export function validateMartPurchase(
  money: number,
  inventory: DuelInventory,
  itemId: DuelItemId,
  quantity: number,
): MartPurchaseValidation {
  const item = VIRIDIAN_MART_ITEMS.find(
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

  const current = normalizedNonNegativeInteger(
    inventory[itemId] ?? 0,
  );

  if (current + quantity > MART_MAX_ITEM_QUANTITY) {
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
  itemId: DuelItemId,
  quantity = 1,
): MartPurchaseResult {
  const balance = normalizedNonNegativeInteger(money);
  const validation = validateMartPurchase(
    balance,
    inventory,
    itemId,
    quantity,
  );

  if (!validation.accepted) {
    return {
      accepted: false,
      money: balance,
      inventory: { ...inventory },
      spent: 0,
      purchased: 0,
      reason: validation.reason,
    };
  }

  const current = normalizedNonNegativeInteger(
    inventory[itemId] ?? 0,
  );

  return {
    accepted: true,
    money: balance - validation.totalPrice,
    inventory: {
      ...inventory,
      [itemId]: current + validation.quantity,
    },
    spent: validation.totalPrice,
    purchased: validation.quantity,
  };
}
