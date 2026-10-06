import type { WildSpeciesId } from "@tactimon/battle-engine";
import {
  WATER_ENCOUNTERS as GENERATED_WATER_ENCOUNTERS,
  type WaterSlot,
} from "./generated/worldWaterEncounters";
import { applyWaterOverrides } from "./encounterOverrides";
import type { StoryKeyItemId, StoryState } from "./story";
import { hasStoryKeyItem } from "./story";
import {
  appearanceRateOf,
  equivalentWildPartyStrength,
  resolveAreaLevelRange,
  resolveWildPackSize,
  type ScaledWildEncounter,
  type WildEncounter,
} from "./wildEncounters";

export const WATER_ENCOUNTERS = applyWaterOverrides(GENERATED_WATER_ENCOUNTERS);

export type RodId = "old-rod" | "good-rod" | "super-rod";

export const RODS: readonly {
  id: RodId;
  label: string;
  table: "old" | "good" | "super";
  /** Chance (0–99) that something bites. */
  biteChance: number;
}[] = [
  { id: "super-rod", label: "Super Rod", table: "super", biteChance: 85 },
  { id: "good-rod", label: "Good Rod", table: "good", biteChance: 70 },
  { id: "old-rod", label: "Old Rod", table: "old", biteChance: 55 },
];

/** The best rod the player owns (FireRed lets you register one; we use the best). */
export function bestOwnedRod(story: StoryState): RodId | null {
  return (
    RODS.find((rod) =>
      hasStoryKeyItem(story, rod.id as StoryKeyItemId),
    )?.id ?? null
  );
}

function pickSlot(
  slots: readonly WaterSlot[],
  roll: number,
): WaterSlot {
  const total = slots.reduce((sum, slot) => sum + slot.weight, 0);
  let cursor = Math.abs(Math.trunc(roll)) % total;
  for (const slot of slots) {
    if (cursor < slot.weight) return slot;
    cursor -= slot.weight;
  }
  return slots[slots.length - 1];
}

const toWild = (slot: WaterSlot, slots: readonly WaterSlot[]): WildEncounter => ({
  species: slot.species as WildSpeciesId,
  level: slot.level,
  appearanceRate: appearanceRateOf(slots, slot.species),
});

export function hasFishingTable(mapId: string): boolean {
  return Boolean(WATER_ENCOUNTERS[mapId]?.fishing);
}

export function hasSurfTable(mapId: string): boolean {
  return Boolean(WATER_ENCOUNTERS[mapId]?.surf);
}

export type FishingResult =
  | { outcome: "no-fish" }
  | { outcome: "nibble" }
  | { outcome: "bite"; encounter: WildEncounter };

/**
 * Casts the rod: `roll` decides bite/no-bite (0–99) and `slotRoll` the species.
 * Pure so it can be tested deterministically.
 */
export function resolveFishing(
  mapId: string,
  rodId: RodId,
  roll: number,
  slotRoll: number,
): FishingResult {
  const table = WATER_ENCOUNTERS[mapId]?.fishing;
  if (!table) return { outcome: "no-fish" };

  const rod = RODS.find((entry) => entry.id === rodId);
  if (!rod) return { outcome: "no-fish" };

  if (Math.abs(Math.trunc(roll)) % 100 >= rod.biteChance) {
    return { outcome: "nibble" };
  }

  return {
    outcome: "bite",
    encounter: toWild(pickSlot(table[rod.table], slotRoll), table[rod.table]),
  };
}

export function surfEncounterRate(mapId: string): number | null {
  return WATER_ENCOUNTERS[mapId]?.surf?.encounterRate ?? null;
}

/** Wild pack met while surfing, scaled to the party like land encounters. */
export function resolveScaledSurfEncounter(
  mapId: string,
  roll: number,
  partyLevels: readonly number[],
): ScaledWildEncounter | null {
  const table = WATER_ENCOUNTERS[mapId]?.surf;
  if (!table) return null;

  const totalWeight = table.slots.reduce(
    (sum, slot) => sum + slot.weight,
    0,
  );
  const areaLevel =
    table.slots.reduce(
      (sum, slot) => sum + slot.level * slot.weight,
      0,
    ) / totalWeight;

  const size = Math.min(
    4,
    resolveWildPackSize(
      resolveAreaLevelRange(table.slots) ?? areaLevel,
      partyLevels,
      roll,
    ),
  );
  const members: WildEncounter[] = [];
  for (let index = 0; index < size; index += 1) {
    members.push(
      toWild(pickSlot(table.slots, roll + index * 37 + size * 11), table.slots),
    );
  }

  return {
    areaLevel,
    equivalentPartyStrength: equivalentWildPartyStrength(
      areaLevel,
      partyLevels,
    ),
    members,
  };
}
