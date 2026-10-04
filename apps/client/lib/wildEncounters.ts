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
  terrain?: "grass" | "cave";
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

const ROUTE_22_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "rattata", level: 3 },
  { weight: 20, species: "mankey", level: 3 },
  { weight: 10, species: "rattata", level: 4 },
  { weight: 10, species: "mankey", level: 4 },
  { weight: 10, species: "rattata", level: 2 },
  { weight: 10, species: "mankey", level: 2 },
  { weight: 5, species: "spearow", level: 3 },
  { weight: 5, species: "spearow", level: 5 },
  { weight: 4, species: "rattata", level: 5 },
  { weight: 4, species: "mankey", level: 5 },
  { weight: 1, species: "rattata", level: 5 },
  { weight: 1, species: "mankey", level: 5 },
];

const ROUTE_3_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "spearow", level: 6 },
  { weight: 20, species: "pidgey", level: 6 },
  { weight: 10, species: "spearow", level: 7 },
  { weight: 10, species: "mankey", level: 7 },
  { weight: 10, species: "nidoran-m", level: 6 },
  { weight: 10, species: "pidgey", level: 7 },
  { weight: 5, species: "spearow", level: 8 },
  { weight: 5, species: "jigglypuff", level: 3 },
  { weight: 4, species: "nidoran-m", level: 7 },
  { weight: 4, species: "jigglypuff", level: 5 },
  { weight: 1, species: "nidoran-f", level: 6 },
  { weight: 1, species: "jigglypuff", level: 7 },
];

const ROUTE_4_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "spearow", level: 10 },
  { weight: 20, species: "rattata", level: 10 },
  { weight: 10, species: "ekans", level: 6 },
  { weight: 10, species: "ekans", level: 10 },
  { weight: 10, species: "spearow", level: 8 },
  { weight: 10, species: "rattata", level: 8 },
  { weight: 5, species: "spearow", level: 12 },
  { weight: 5, species: "rattata", level: 12 },
  { weight: 4, species: "mankey", level: 10 },
  { weight: 4, species: "ekans", level: 8 },
  { weight: 1, species: "mankey", level: 12 },
  { weight: 1, species: "ekans", level: 12 },
];

const ROUTE_24_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "weedle", level: 7 },
  { weight: 20, species: "caterpie", level: 7 },
  { weight: 10, species: "pidgey", level: 11 },
  { weight: 10, species: "oddish", level: 12 },
  { weight: 10, species: "oddish", level: 13 },
  { weight: 10, species: "abra", level: 10 },
  { weight: 5, species: "pidgey", level: 13 },
  { weight: 5, species: "oddish", level: 14 },
  { weight: 4, species: "kakuna", level: 8 },
  { weight: 4, species: "abra", level: 8 },
  { weight: 1, species: "metapod", level: 8 },
  { weight: 1, species: "abra", level: 12 },
];

const MT_MOON_1F_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "zubat", level: 7 },
  { weight: 20, species: "zubat", level: 8 },
  { weight: 10, species: "geodude", level: 7 },
  { weight: 10, species: "zubat", level: 9 },
  { weight: 10, species: "zubat", level: 10 },
  { weight: 10, species: "geodude", level: 8 },
  { weight: 5, species: "geodude", level: 9 },
  { weight: 5, species: "paras", level: 8 },
  { weight: 4, species: "zubat", level: 7 },
  { weight: 4, species: "zubat", level: 7 },
  { weight: 1, species: "zubat", level: 7 },
  { weight: 1, species: "clefairy", level: 8 },
];

const MT_MOON_B1F_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "paras", level: 7 },
  { weight: 20, species: "paras", level: 8 },
  { weight: 10, species: "paras", level: 5 },
  { weight: 10, species: "paras", level: 6 },
  { weight: 10, species: "paras", level: 9 },
  { weight: 10, species: "paras", level: 10 },
  { weight: 5, species: "paras", level: 7 },
  { weight: 5, species: "paras", level: 8 },
  { weight: 4, species: "paras", level: 5 },
  { weight: 4, species: "paras", level: 6 },
  { weight: 1, species: "paras", level: 9 },
  { weight: 1, species: "paras", level: 10 },
];

const MT_MOON_B2F_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "zubat", level: 8 },
  { weight: 20, species: "geodude", level: 9 },
  { weight: 10, species: "zubat", level: 9 },
  { weight: 10, species: "zubat", level: 10 },
  { weight: 10, species: "geodude", level: 10 },
  { weight: 10, species: "paras", level: 10 },
  { weight: 5, species: "paras", level: 12 },
  { weight: 5, species: "clefairy", level: 10 },
  { weight: 4, species: "zubat", level: 11 },
  { weight: 4, species: "zubat", level: 11 },
  { weight: 1, species: "zubat", level: 11 },
  { weight: 1, species: "clefairy", level: 12 },
];

const VIRIDIAN_FOREST_SLOTS: readonly LandEncounterSlot[] = [
  { weight: 20, species: "caterpie", level: 4 },
  { weight: 20, species: "weedle", level: 4 },
  { weight: 10, species: "caterpie", level: 5 },
  { weight: 10, species: "weedle", level: 5 },
  { weight: 10, species: "caterpie", level: 3 },
  { weight: 10, species: "weedle", level: 3 },
  { weight: 5, species: "metapod", level: 5 },
  { weight: 5, species: "kakuna", level: 5 },
  { weight: 4, species: "kakuna", level: 4 },
  { weight: 4, species: "pikachu", level: 3 },
  { weight: 1, species: "kakuna", level: 6 },
  { weight: 1, species: "pikachu", level: 5 },
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
  "route-22": {
    encounterRate: 21,
    slots: ROUTE_22_SLOTS,
  },
  "route-3": {
    encounterRate: 21,
    slots: ROUTE_3_SLOTS,
  },
  "route-4": {
    encounterRate: 21,
    slots: ROUTE_4_SLOTS,
  },
  "route-24": {
    encounterRate: 21,
    slots: ROUTE_24_SLOTS,
  },
  "mt-moon-1f": {
    encounterRate: 7,
    terrain: "cave",
    slots: MT_MOON_1F_SLOTS,
  },
  "mt-moon-b1f": {
    encounterRate: 5,
    terrain: "cave",
    slots: MT_MOON_B1F_SLOTS,
  },
  "mt-moon-b2f": {
    encounterRate: 7,
    terrain: "cave",
    slots: MT_MOON_B2F_SLOTS,
  },
  "viridian-forest": {
    encounterRate: 14,
    slots: VIRIDIAN_FOREST_SLOTS,
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
