import type {
  DuelItemId,
} from "@tactimon/battle-engine";
import {
  hasStoryCollectedItem,
  type StoryState,
} from "./story";

export type OverworldPickupDefinition = {
  id: string;
  mapId: string;
  itemId: DuelItemId;
  itemName: string;
  x: number;
  y: number;
};

export const OVERWORLD_PICKUPS:
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
      id: "viridian-forest-poke-ball",
      mapId: "viridian-forest",
      itemId: "poke-ball",
      itemName: "Poké Ball",
      x: 5,
      y: 41,
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
      id: "viridian-forest-potion-south",
      mapId: "viridian-forest",
      itemId: "potion",
      itemName: "Potion",
      x: 49,
      y: 60,
    },
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
