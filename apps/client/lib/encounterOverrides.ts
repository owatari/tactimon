// Hand-maintained wild-table additions layered over the ROM-generated tables.
// Tactimon has no version exclusivity, so FireRed-missing (LeafGreen/Sevii)
// species are swapped into existing slots; slot weights stay untouched so each
// table keeps its original 100% total. Sources: Bulbapedia / Veekun FRLG tables.
import type { LandEncounterTable } from "./wildEncounters";
import type { WaterEncounterEntry, WaterSlot } from "./generated/worldWaterEncounters";

type SlotSwap = { slot: number; species: string; level: number };
type FishingTier = "old" | "good" | "super";

export const LAND_SLOT_SWAPS: Readonly<Record<string, readonly SlotSwap[]>> = {
  // Slowpoke: Seafoam Islands cave floors (10% slots, Lv 29-32).
  "seafoam-islands-1f": [{ slot: 2, species: "slowpoke", level: 31 }],
  "seafoam-islands-b-1f": [{ slot: 4, species: "slowpoke", level: 29 }],
  "seafoam-islands-b-2f": [{ slot: 4, species: "slowpoke", level: 30 }],
  "seafoam-islands-b-3f": [{ slot: 2, species: "slowpoke", level: 30 }],
  "seafoam-islands-b-4f": [{ slot: 2, species: "slowpoke", level: 32 }],
};

export const FISHING_SLOT_SWAPS: Readonly<
  Record<string, Partial<Record<FishingTier, readonly SlotSwap[]>>>
> = {
  // Staryu: the LeafGreen counterpart of FireRed's 40% Super Rod Horsea slot.
  "pallet-town": { super: [{ slot: 0, species: "staryu", level: 20 }] },
  "vermilion-city": { super: [{ slot: 0, species: "staryu", level: 20 }] },
  "cinnabar-island": { super: [{ slot: 0, species: "staryu", level: 20 }] },
};

function swapSlots<T extends { species: string; level: number }>(
  slots: readonly T[],
  swaps: readonly SlotSwap[] | undefined,
): readonly T[] {
  if (!swaps) return slots;
  const next = [...slots];
  for (const { slot, species, level } of swaps) {
    if (next[slot]) next[slot] = { ...next[slot], species, level };
  }
  return next;
}

export function applyLandOverrides(
  base: Readonly<Record<string, LandEncounterTable>>,
): Readonly<Record<string, LandEncounterTable>> {
  const out: Record<string, LandEncounterTable> = { ...base };
  for (const [map, swaps] of Object.entries(LAND_SLOT_SWAPS)) {
    const table = out[map];
    if (table) out[map] = { ...table, slots: swapSlots(table.slots, swaps) };
  }
  return out;
}

export function applyWaterOverrides(
  base: Readonly<Record<string, WaterEncounterEntry>>,
): Readonly<Record<string, WaterEncounterEntry>> {
  const out: Record<string, WaterEncounterEntry> = { ...base };
  for (const [map, tiers] of Object.entries(FISHING_SLOT_SWAPS)) {
    const entry = out[map];
    if (!entry?.fishing) continue;
    const fishing = { ...entry.fishing };
    for (const tier of Object.keys(tiers) as FishingTier[]) {
      fishing[tier] = swapSlots<WaterSlot>(fishing[tier], tiers[tier]);
    }
    out[map] = { ...entry, fishing };
  }
  return out;
}
