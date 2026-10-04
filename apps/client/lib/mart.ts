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

export type MartPurchaseResult = {
  accepted: boolean;
  money: number;
  inventory: DuelInventory;
  spent: number;
  purchased: number;
  reason?: "insufficient-funds" | "inventory-full";
};

export function buyMartItem(
  money: number,
  inventory: DuelInventory,
  itemId: DuelItemId,
  quantity = 1,
): MartPurchaseResult {
  const item = VIRIDIAN_MART_ITEMS.find(
    (candidate) => candidate.id === itemId,
  );
  const requested = Math.max(
    1,
    Math.min(99, Math.trunc(quantity)),
  );

  if (!item) {
    return {
      accepted: false,
      money,
      inventory: { ...inventory },
      spent: 0,
      purchased: 0,
      reason: "inventory-full",
    };
  }

  const current = inventory[itemId] ?? 0;

  if (current + requested > 999) {
    return {
      accepted: false,
      money,
      inventory: { ...inventory },
      spent: 0,
      purchased: 0,
      reason: "inventory-full",
    };
  }

  const spent = requested * item.price;
  const balance = Math.max(0, Math.trunc(money));

  if (balance < spent) {
    return {
      accepted: false,
      money: balance,
      inventory: { ...inventory },
      spent: 0,
      purchased: 0,
      reason: "insufficient-funds",
    };
  }

  return {
    accepted: true,
    money: balance - spent,
    inventory: {
      ...inventory,
      [itemId]: current + requested,
    },
    spent,
    purchased: requested,
  };
}
