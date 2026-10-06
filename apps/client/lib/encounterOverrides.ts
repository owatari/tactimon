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

  // LeafGreen twins of FireRed-only lines: every second slot of the FR species
  // becomes its LG counterpart (Ekans->Sandshrew, Oddish->Bellsprout, ...).
  "route-7": [
    { slot: 5, species: "bellsprout", level: 22 },
    { slot: 7, species: "vulpix", level: 20 },
  ],
  "route-8": [
    { slot: 6, species: "vulpix", level: 17 },
    { slot: 7, species: "sandshrew", level: 19 },
    { slot: 10, species: "sandshrew", level: 17 },
    { slot: 11, species: "vulpix", level: 18 },
  ],
  "route-9": [
    { slot: 3, species: "sandshrew", level: 15 },
    { slot: 11, species: "sandshrew", level: 17 },
  ],
  "route-10": [
    { slot: 3, species: "sandshrew", level: 15 },
    { slot: 11, species: "sandshrew", level: 17 },
  ],
  "route-11": [
    { slot: 2, species: "sandshrew", level: 12 },
    { slot: 8, species: "sandshrew", level: 12 },
  ],
  "route-12": [
    { slot: 2, species: "bellsprout", level: 22 },
    { slot: 9, species: "weepinbell", level: 28 },
  ],
  "route-13": [
    { slot: 2, species: "bellsprout", level: 22 },
    { slot: 9, species: "weepinbell", level: 28 },
  ],
  "route-15": [
    { slot: 2, species: "bellsprout", level: 22 },
    { slot: 9, species: "weepinbell", level: 28 },
  ],
  "route-23": [
    { slot: 5, species: "sandshrew", level: 34 },
    { slot: 7, species: "sandslash", level: 44 },
  ],
  "victory-road-1f": [{ slot: 6, species: "sandslash", level: 44 }],
  "victory-road-3f": [{ slot: 6, species: "sandslash", level: 44 }],
  // Pinsir: LeafGreen's Scyther counterpart in the Safari Zone.
  "safari-zone-center": [{ slot: 8, species: "pinsir", level: 23 }],
  "safari-zone-east": [{ slot: 9, species: "pinsir", level: 28 }],
  // Pokemon Mansion fire theme: Ponyta/Rapidash (Sevii-only in FRLG) and Magmar.
  "pokemon-mansion-1f": [
    { slot: 8, species: "ponyta", level: 32 },
    { slot: 10, species: "rapidash", level: 36 },
  ],
  "pokemon-mansion-2f": [{ slot: 8, species: "ponyta", level: 32 }],
  "pokemon-mansion-3f": [{ slot: 8, species: "magmar", level: 34 }],
  "pokemon-mansion-b-1f": [
    { slot: 8, species: "magmar", level: 34 },
    { slot: 10, species: "rapidash", level: 36 },
  ],
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
