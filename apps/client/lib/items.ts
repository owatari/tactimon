import type { DuelItemId } from "@tactimon/battle-engine";
import { tx } from "./i18n";
import { GENERATED_BAG_ITEMS } from "./generated/worldItems";

/**
 * Overworld items that the battle engine cannot use yet. They live in the
 * story bag (`StoryState.bagItems`) so finds are persisted per player.
 * TMs and held items are intentionally absent: they belong to the future
 * dungeon/raid systems.
 */
const HAND_BAG_ITEM_CATALOG = {
  "master-ball": { name: "Master Ball", firered: 1 },
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

export const BAG_ITEM_CATALOG = {
  ...GENERATED_BAG_ITEMS,
  ...HAND_BAG_ITEM_CATALOG,
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

const ENGINE_ITEM_ICON: Record<"potion" | "poke-ball", string> = {
  potion: "013_potion.png",
  "poke-ball": "004_poke_ball.png",
};

export function itemIconUrl(id: OverworldItemId): string {
  const file = isBagItemId(id)
    ? `${String(BAG_ITEM_CATALOG[id].firered).padStart(3, "0")}_${(id === "parlyz-heal" ? "paralyze-heal" : id).replace(/-/g, "_")}.png`
    : ENGINE_ITEM_ICON[id as "potion" | "poke-ball"];

  return `/game-assets/firered/ui/items/${file}`;
}

const ITEM_DESCRIPTIONS: Partial<Record<OverworldItemId, string>> = {
  potion: tx("Restores 20 HP of a Pokémon."),
  "poke-ball": tx("Used to catch wild Pokémon."),
  "great-ball": tx("A better ball than the Poké Ball for catching Pokémon."),
  "ultra-ball": tx("A high-performance ball: catches better than the Great Ball."),
  "master-ball": tx("The best ball: it never fails to catch a Pokémon."),
  antidote: tx("Cures a poisoned Pokémon."),
  "burn-heal": tx("Heals a Pokémon's burn."),
  "ice-heal": tx("Thaws out a frozen Pokémon."),
  awakening: tx("Wakes up a sleeping Pokémon."),
  "parlyz-heal": tx("Heals a Pokémon's paralysis."),
  "hyper-potion": tx("Restores 200 HP of a Pokémon."),
  "super-potion": tx("Restores 50 HP of a Pokémon."),
  revive: tx("Revives a fainted Pokémon with half its HP."),
  ether: tx("Restores 10 PP of one move."),
  "max-ether": tx("Fully restores the PP of one move."),
  elixir: tx("Restores 10 PP of all moves."),
  "lava-cookie": tx("A Lavaridge cookie. Heals any status condition."),
  "rare-candy": tx("Raises a Pokémon's level by one."),
  "hp-up": tx("Raises the base HP of one Pokémon."),
  protein: tx("Raises the base Attack stat of one Pokémon."),
  iron: tx("Raises the base Defense stat of one Pokémon."),
  calcium: tx("Raises the base Sp. Atk stat of one Pokémon."),
  zinc: tx("Raises the base Sp. Def stat of one Pokémon."),
  carbos: tx("Raises the base Speed stat of one Pokémon."),
  "x-attack": tx("Raises Attack during a battle."),
  "escape-rope": tx("Lets you escape from caves and dungeons."),
  repel: tx("Keeps weak wild Pokémon away for a while."),
  "moon-stone": tx("A mysterious stone. Evolves certain Pokémon."),
  "tiny-mushroom": tx("A small mushroom. Sells for a good price."),
  "big-mushroom": tx("A big mushroom. Sells for a great price."),
  stardust: tx("Stardust. Sells for a good price."),
  "star-piece": tx("A star fragment. Sells for a great price."),
};

export function itemDescription(id: OverworldItemId): string {
  return ITEM_DESCRIPTIONS[id] ?? tx("A Kanto item.");
}

export function itemDisplayName(id: OverworldItemId): string {
  return isBagItemId(id)
    ? BAG_ITEM_CATALOG[id].name
    : id === "potion"
      ? "Potion"
      : "Poké Ball";
}
