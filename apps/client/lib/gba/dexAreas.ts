import { DEX_AREA_MARKERS, MAPSEC_TO_DEX_AREAS, MAP_MAPSEC } from "../generated/pokedexAreas";
import { LAND_ENCOUNTERS } from "../wildEncounters";
import { WATER_ENCOUNTERS } from "../waterEncounters";
import { STATIC_WORLD_ENCOUNTERS } from "../staticEncounters";

let cache: Map<string, string[]> | null = null;

function build(): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  const add = (species: string, mapId: string) => {
    const sec = MAP_MAPSEC[mapId];
    if (sec === undefined) return;
    for (const area of MAPSEC_TO_DEX_AREAS[sec] ?? []) {
      if (!(area in DEX_AREA_MARKERS)) continue;
      if (!out.has(species)) out.set(species, new Set());
      out.get(species)!.add(area);
    }
  };
  for (const [mapId, table] of Object.entries(LAND_ENCOUNTERS)) for (const s of table.slots) add(s.species, mapId);
  for (const [mapId, entry] of Object.entries(WATER_ENCOUNTERS))
    for (const s of [
      ...(entry.surf?.slots ?? []),
      ...(entry.fishing?.old ?? []),
      ...(entry.fishing?.good ?? []),
      ...(entry.fishing?.super ?? []),
    ])
      add(s.species, mapId);
  for (const s of STATIC_WORLD_ENCOUNTERS) add(s.species, s.mapId);
  return new Map([...out].map(([k, v]) => [k, [...v]]));
}

/** Dex areas (e.g. "DEX_AREA_ROUTE_1") where a species can be found in the wild (FireRed GetSpeciesPokedexAreaMarkers). */
export function speciesDexAreas(speciesId: string): string[] {
  cache ??= build();
  return cache.get(speciesId) ?? [];
}

export type AreaMarker = { kind: number; x: number; y: number };

export function areaMarkers(areas: readonly string[]): AreaMarker[] {
  return areas.map((a) => DEX_AREA_MARKERS[a]).filter(Boolean).map(([kind, x, y]) => ({ kind, x, y }));
}
