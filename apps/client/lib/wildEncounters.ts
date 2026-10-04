import type {
  WildSpeciesId,
} from "@tactimon/battle-engine";

export type WildEncounter = {
  species: WildSpeciesId;
  level: number;
};

export type LandEncounterSlot =
  WildEncounter & {
    weight: number;
  };

export type LandEncounterTable = {
  encounterRate: number;
  slots: readonly LandEncounterSlot[];
};

const ROUTE_1_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "pidgey", level: 3 },
  { weight: 20, species: "rattata", level: 3 },
  { weight: 10, species: "pidgey", level: 3 },
  { weight: 10, species: "rattata", level: 3 },
  { weight: 10, species: "pidgey", level: 2 },
  { weight: 10, species: "rattata", level: 2 },
  { weight: 5, species: "pidgey", level: 3 },
  { weight: 5, species: "rattata", level: 3 },
  { weight: 4, species: "pidgey", level: 4 },
  { weight: 4, species: "rattata", level: 4 },
  { weight: 1, species: "pidgey", level: 5 },
  { weight: 1, species: "rattata", level: 4 },
];

const ROUTE_2_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "rattata", level: 3 },
  { weight: 20, species: "pidgey", level: 3 },
  { weight: 10, species: "rattata", level: 4 },
  { weight: 10, species: "pidgey", level: 4 },
  { weight: 10, species: "rattata", level: 2 },
  { weight: 10, species: "pidgey", level: 2 },
  { weight: 5, species: "rattata", level: 5 },
  { weight: 5, species: "pidgey", level: 5 },
  { weight: 4, species: "caterpie", level: 4 },
  { weight: 4, species: "weedle", level: 4 },
  { weight: 1, species: "caterpie", level: 5 },
  { weight: 1, species: "weedle", level: 5 },
];

export const LAND_ENCOUNTERS: Readonly<
  Record<string, LandEncounterTable>
> = {
  "route-1": {
    encounterRate: 21,
    slots: ROUTE_1_SLOTS,
  },
  "route-2": {
    encounterRate: 21,
    slots: ROUTE_2_SLOTS,
  },
};

export function resolveLandEncounter(
  mapId: string,
  roll: number,
): WildEncounter | null {
  const table = LAND_ENCOUNTERS[mapId];
  if (!table) return null;

  let cursor = Math.abs(Math.trunc(roll)) % 100;

  for (const slot of table.slots) {
    if (cursor < slot.weight) {
      return {
        species: slot.species,
        level: slot.level,
      };
    }
    cursor -= slot.weight;
  }

  const fallback =
    table.slots[table.slots.length - 1];

  return fallback
    ? {
        species: fallback.species,
        level: fallback.level,
      }
    : null;
}
