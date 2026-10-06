import { LAND_ENCOUNTERS } from "./wildEncounters";
import { WATER_ENCOUNTERS } from "./waterEncounters";
import { STATIC_WORLD_ENCOUNTERS } from "./staticEncounters";
import { WORLD_MAPS } from "./maps";

/** Strips floor suffixes so e.g. every Seafoam Islands floor lists once. */
function baseAreaLabel(label: string): string {
  return label
    .replace(/\s+(?:B\s*)?\d+F$/i, "")
    .replace(/\s+(?:Roof|Basement.*)$/i, "")
    .trim();
}

let cache: Map<string, string[]> | null = null;

function build(): Map<string, string[]> {
  const found = new Map<string, Set<string>>();
  const add = (species: string, mapId: string) => {
    const label = WORLD_MAPS[mapId]?.label;
    if (!label) return;
    if (!found.has(species)) found.set(species, new Set());
    found.get(species)!.add(baseAreaLabel(label));
  };
  for (const [mapId, table] of Object.entries(LAND_ENCOUNTERS))
    for (const slot of table.slots) add(slot.species, mapId);
  for (const [mapId, entry] of Object.entries(WATER_ENCOUNTERS))
    for (const slot of [
      ...(entry.surf?.slots ?? []),
      ...(entry.fishing?.old ?? []),
      ...(entry.fishing?.good ?? []),
      ...(entry.fishing?.super ?? []),
    ])
      add(slot.species, mapId);
  for (const s of STATIC_WORLD_ENCOUNTERS) add(s.species, s.mapId);
  return new Map([...found].map(([k, v]) => [k, [...v].sort()]));
}

/** Map labels (English, run through `t()` by the caller) where a species can be found in the wild. */
export function pokedexAreas(species: string): string[] {
  cache ??= build();
  return cache.get(species) ?? [];
}
