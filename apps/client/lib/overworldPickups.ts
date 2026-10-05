import { GENERATED_PICKUPS } from "./generated/worldPickups";
import type {
  OverworldItemId,
} from "./items";
import {
  hasStoryCollectedItem,
  type StoryState,
} from "./story";

export type OverworldPickupDefinition = {
  id: string;
  mapId: string;
  itemId: OverworldItemId;
  itemName: string;
  x: number;
  y: number;
  /** FireRed hidden item: no sprite, found by interacting with the tile. */
  hidden?: boolean;
};

/**
 * Item balls and hidden items from the FireRed map events (TMs and held
 * items excluded: they are reserved for the future dungeon/raid systems).
 */
const HAND_OVERWORLD_PICKUPS:
  readonly OverworldPickupDefinition[] = [
    {
      id: "viridian-city-potion",
      mapId: "viridian-city",
      itemId: "potion",
      itemName: "Potion",
      x: 17,
      y: 5,
    },
    {
      id: "viridian-forest-antidote",
      mapId: "viridian-forest",
      itemId: "antidote",
      itemName: "Antidote",
      x: 40,
      y: 21,
    },
    {
      id: "viridian-forest-potion-center",
      mapId: "viridian-forest",
      itemId: "potion",
      itemName: "Potion",
      x: 21,
      y: 34,
    },
    {
      id: "viridian-forest-poke-ball",
      mapId: "viridian-forest",
      itemId: "poke-ball",
      itemName: "Poké Ball",
      x: 5,
      y: 41,
    },
    {
      id: "viridian-forest-potion-south",
      mapId: "viridian-forest",
      itemId: "potion",
      itemName: "Potion",
      x: 49,
      y: 60,
    },
    {
      id: "viridian-forest-hidden-potion",
      mapId: "viridian-forest",
      itemId: "potion",
      itemName: "Potion",
      x: 3,
      y: 22,
      hidden: true,
    },
    {
      id: "viridian-forest-hidden-antidote",
      mapId: "viridian-forest",
      itemId: "antidote",
      itemName: "Antidote",
      x: 28,
      y: 57,
      hidden: true,
    },
    {
      id: "route-2-ether",
      mapId: "route-2",
      itemId: "ether",
      itemName: "Ether",
      x: 17,
      y: 54,
    },
    {
      id: "route-2-parlyz-heal",
      mapId: "route-2",
      itemId: "parlyz-heal",
      itemName: "Parlyz Heal",
      x: 17,
      y: 64,
    },
    {
      id: "pewter-city-hidden-poke-ball",
      mapId: "pewter-city",
      itemId: "poke-ball",
      itemName: "Poké Ball",
      x: 6,
      y: 3,
      hidden: true,
    },
    {
      id: "mt-moon-1f-moon-stone",
      mapId: "mt-moon-1f",
      itemId: "moon-stone",
      itemName: "Moon Stone",
      x: 3,
      y: 2,
    },
    {
      id: "mt-moon-1f-escape-rope",
      mapId: "mt-moon-1f",
      itemId: "escape-rope",
      itemName: "Escape Rope",
      x: 44,
      y: 21,
    },
    {
      id: "mt-moon-1f-parlyz-heal",
      mapId: "mt-moon-1f",
      itemId: "parlyz-heal",
      itemName: "Parlyz Heal",
      x: 2,
      y: 22,
    },
    {
      id: "mt-moon-1f-potion",
      mapId: "mt-moon-1f",
      itemId: "potion",
      itemName: "Potion",
      x: 26,
      y: 32,
    },
    {
      id: "mt-moon-1f-rare-candy",
      mapId: "mt-moon-1f",
      itemId: "rare-candy",
      itemName: "Rare Candy",
      x: 42,
      y: 35,
    },
    {
      id: "mt-moon-b1f-hidden-tiny-mushroom",
      mapId: "mt-moon-b1f",
      itemId: "tiny-mushroom",
      itemName: "TinyMushroom",
      x: 26,
      y: 2,
      hidden: true,
    },
    {
      id: "mt-moon-b1f-hidden-tiny-mushroom-46-2",
      mapId: "mt-moon-b1f",
      itemId: "tiny-mushroom",
      itemName: "TinyMushroom",
      x: 46,
      y: 2,
      hidden: true,
    },
    {
      id: "mt-moon-b1f-hidden-big-mushroom",
      mapId: "mt-moon-b1f",
      itemId: "big-mushroom",
      itemName: "Big Mushroom",
      x: 6,
      y: 12,
      hidden: true,
    },
    {
      id: "mt-moon-b1f-hidden-big-mushroom-25-34",
      mapId: "mt-moon-b1f",
      itemId: "big-mushroom",
      itemName: "Big Mushroom",
      x: 25,
      y: 34,
      hidden: true,
    },
    {
      id: "mt-moon-b1f-hidden-tiny-mushroom-39-34",
      mapId: "mt-moon-b1f",
      itemId: "tiny-mushroom",
      itemName: "TinyMushroom",
      x: 39,
      y: 34,
      hidden: true,
    },
    {
      id: "mt-moon-b1f-hidden-big-mushroom-24-35",
      mapId: "mt-moon-b1f",
      itemId: "big-mushroom",
      itemName: "Big Mushroom",
      x: 24,
      y: 35,
      hidden: true,
    },
    {
      id: "mt-moon-b2f-revive",
      mapId: "mt-moon-b2f",
      itemId: "revive",
      itemName: "Revive",
      x: 24,
      y: 6,
    },
    {
      id: "mt-moon-b2f-antidote",
      mapId: "mt-moon-b2f",
      itemId: "antidote",
      itemName: "Antidote",
      x: 3,
      y: 11,
    },
    {
      id: "mt-moon-b2f-star-piece",
      mapId: "mt-moon-b2f",
      itemId: "star-piece",
      itemName: "Star Piece",
      x: 30,
      y: 26,
    },
    {
      id: "mt-moon-b2f-hidden-ether",
      mapId: "mt-moon-b2f",
      itemId: "ether",
      itemName: "Ether",
      x: 39,
      y: 11,
      hidden: true,
    },
    {
      id: "mt-moon-b2f-hidden-moon-stone",
      mapId: "mt-moon-b2f",
      itemId: "moon-stone",
      itemName: "Moon Stone",
      x: 20,
      y: 16,
      hidden: true,
    },
    {
      id: "route-4-hidden-great-ball",
      mapId: "route-4",
      itemId: "great-ball",
      itemName: "Great Ball",
      x: 43,
      y: 2,
      hidden: true,
    },
    {
      id: "cerulean-city-hidden-rare-candy",
      mapId: "cerulean-city",
      itemId: "rare-candy",
      itemName: "Rare Candy",
      x: 18,
      y: 7,
      hidden: true,
    },
    {
      id: "route-25-hidden-elixir",
      mapId: "route-25",
      itemId: "elixir",
      itemName: "Elixir",
      x: 14,
      y: 2,
      hidden: true,
    },
    {
      id: "route-25-hidden-ether",
      mapId: "route-25",
      itemId: "ether",
      itemName: "Ether",
      x: 58,
      y: 6,
      hidden: true,
    },
    {
      id: "route-6-hidden-rare-candy",
      mapId: "route-6",
      itemId: "rare-candy",
      itemName: "Rare Candy",
      x: 19,
      y: 5,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-antidote",
      mapId: "underground-path-tunnel",
      itemId: "antidote",
      itemName: "Antidote",
      x: 5,
      y: 6,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-parlyz-heal",
      mapId: "underground-path-tunnel",
      itemId: "parlyz-heal",
      itemName: "Parlyz Heal",
      x: 3,
      y: 15,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-awakening",
      mapId: "underground-path-tunnel",
      itemId: "awakening",
      itemName: "Awakening",
      x: 1,
      y: 24,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-potion",
      mapId: "underground-path-tunnel",
      itemId: "potion",
      itemName: "Potion",
      x: 5,
      y: 30,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-ether",
      mapId: "underground-path-tunnel",
      itemId: "ether",
      itemName: "Ether",
      x: 3,
      y: 39,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-ice-heal",
      mapId: "underground-path-tunnel",
      itemId: "ice-heal",
      itemName: "Ice Heal",
      x: 6,
      y: 53,
      hidden: true,
    },
    {
      id: "underground-path-tunnel-hidden-burn-heal",
      mapId: "underground-path-tunnel",
      itemId: "burn-heal",
      itemName: "Burn Heal",
      x: 2,
      y: 57,
      hidden: true,
    },
    {
      id: "vermilion-city-hidden-max-ether",
      mapId: "vermilion-city",
      itemId: "max-ether",
      itemName: "Max Ether",
      x: 14,
      y: 11,
      hidden: true,
    },
    {
      id: "ss-anne-exterior-hidden-lava-cookie",
      mapId: "ss-anne-exterior",
      itemId: "lava-cookie",
      itemName: "Lava Cookie",
      x: 58,
      y: 28,
      hidden: true,
    },
    {
      id: "ss-anne-kitchen-great-ball",
      mapId: "ss-anne-kitchen",
      itemId: "great-ball",
      itemName: "Great Ball",
      x: 1,
      y: 10,
    },
    {
      id: "ss-anne-b1f-corridor-hidden-hyper-potion",
      mapId: "ss-anne-b1f-corridor",
      itemId: "hyper-potion",
      itemName: "Hyper Potion",
      x: 21,
      y: 5,
      hidden: true,
    },
    {
      id: "ss-anne-2f-room-2-stardust",
      mapId: "ss-anne-2f-room-2",
      itemId: "stardust",
      itemName: "Stardust",
      x: 3,
      y: 3,
    },
    {
      id: "ss-anne-2f-room-4-x-attack",
      mapId: "ss-anne-2f-room-4",
      itemId: "x-attack",
      itemName: "X Attack",
      x: 2,
      y: 4,
    },
    {
      id: "ss-anne-b1f-room-3-ether",
      mapId: "ss-anne-b1f-room-3",
      itemId: "ether",
      itemName: "Ether",
      x: 1,
      y: 5,
    },
    {
      id: "ss-anne-b1f-room-5-super-potion",
      mapId: "ss-anne-b1f-room-5",
      itemId: "super-potion",
      itemName: "Super Potion",
      x: 2,
      y: 2,
    },
  ];

export const OVERWORLD_PICKUPS: readonly OverworldPickupDefinition[] = [
  ...HAND_OVERWORLD_PICKUPS,
  ...GENERATED_PICKUPS,
];

export function resolveOverworldPickups(
  mapId: string,
  collectedItemIds: readonly string[],
): OverworldPickupDefinition[] {
  const collected = new Set(collectedItemIds);

  return OVERWORLD_PICKUPS.filter(
    (pickup) =>
      pickup.mapId === mapId &&
      !collected.has(pickup.id),
  );
}


/**
 * Projects immutable pickup definitions through one player's private world
 * progression. Runtime code should use this instead of passing shared arrays.
 */
export function resolvePlayerOverworldPickups(
  mapId: string,
  story: StoryState,
): OverworldPickupDefinition[] {
  return OVERWORLD_PICKUPS.filter(
    (pickup) =>
      pickup.mapId === mapId &&
      !hasStoryCollectedItem(story, pickup.id),
  );
}
