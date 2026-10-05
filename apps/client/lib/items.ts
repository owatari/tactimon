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
  repel: { name: "Repel", firered: 86 },
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

const ENGINE_ITEM_ICON: Record<DuelItemId, string> = {
  potion: "013_potion.png",
  "poke-ball": "004_poke_ball.png",
};

export function itemIconUrl(id: OverworldItemId): string {
  const file = isBagItemId(id)
    ? `${String(BAG_ITEM_CATALOG[id].firered).padStart(3, "0")}_${(id === "parlyz-heal" ? "paralyze-heal" : id).replace(/-/g, "_")}.png`
    : ENGINE_ITEM_ICON[id];

  return `/game-assets/firered/ui/items/${file}`;
}

const ITEM_DESCRIPTIONS: Record<OverworldItemId, string> = {
  potion: "Restaura 20 HP de um Pokémon.",
  "poke-ball": "Usada para capturar Pokémon selvagens.",
  "great-ball": "Bola melhor que a Poké Ball para capturar Pokémon.",
  antidote: "Cura um Pokémon envenenado.",
  "burn-heal": "Cura a queimadura de um Pokémon.",
  "ice-heal": "Descongela um Pokémon.",
  awakening: "Acorda um Pokémon dormindo.",
  "parlyz-heal": "Cura a paralisia de um Pokémon.",
  "hyper-potion": "Restaura 200 HP de um Pokémon.",
  "super-potion": "Restaura 50 HP de um Pokémon.",
  revive: "Revive um Pokémon desmaiado com metade do HP.",
  ether: "Restaura 10 PP de um golpe.",
  "max-ether": "Restaura todo o PP de um golpe.",
  elixir: "Restaura 10 PP de todos os golpes.",
  "lava-cookie": "Biscoito de Lavaridge. Cura qualquer problema de status.",
  "rare-candy": "Faz um Pokémon subir um nível.",
  "x-attack": "Aumenta o Ataque durante uma batalha.",
  "escape-rope": "Permite fugir de cavernas e dungeons.",
  repel: "Afasta Pokémon selvagens fracos por um tempo.",
  "moon-stone": "Pedra misteriosa. Evolui certos Pokémon.",
  "tiny-mushroom": "Cogumelo pequeno. Vende por um bom preço.",
  "big-mushroom": "Cogumelo grande. Vende por um ótimo preço.",
  stardust: "Pó de estrela. Vende por um bom preço.",
  "star-piece": "Fragmento de estrela. Vende por um ótimo preço.",
};

export function itemDescription(id: OverworldItemId): string {
  return ITEM_DESCRIPTIONS[id];
}

export function itemDisplayName(id: OverworldItemId): string {
  return isBagItemId(id)
    ? BAG_ITEM_CATALOG[id].name
    : id === "potion"
      ? "Potion"
      : "Poké Ball";
}
