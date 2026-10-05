/** Pokémon Centers that register as the player's whiteout/heal point. */
export const HEAL_LOCATIONS = [
  { id: "viridian-city", centerMapId: "viridian-pokemon-center", label: "Viridian Pokémon Center" },
  { id: "pewter-city", centerMapId: "pewter-pokemon-center", label: "Pewter Pokémon Center" },
  { id: "cerulean-city", centerMapId: "cerulean-pokemon-center", label: "Cerulean Pokémon Center" },
  { id: "vermilion-city", centerMapId: "vermilion-pokemon-center", label: "Vermilion Pokémon Center" },
  { id: "route-4", centerMapId: "route-4-pokemon-center", label: "Route 4 Pokémon Center" },
  { id: "lavender-town", centerMapId: "lavender-town-pokemon-center-1f", label: "Lavender Pokémon Center" },
  { id: "celadon-city", centerMapId: "celadon-city-pokemon-center-1f", label: "Celadon Pokémon Center" },
  { id: "fuchsia-city", centerMapId: "fuchsia-city-pokemon-center-1f", label: "Fuchsia Pokémon Center" },
  { id: "cinnabar-island", centerMapId: "cinnabar-island-pokemon-center-1f", label: "Cinnabar Pokémon Center" },
  { id: "saffron-city", centerMapId: "saffron-city-pokemon-center-1f", label: "Saffron Pokémon Center" },
  { id: "route-10", centerMapId: "route-10-pokemon-center-1f", label: "Rock Tunnel Pokémon Center" },
  { id: "indigo-plateau", centerMapId: "indigo-plateau-pokemon-center-1f", label: "Indigo Plateau Pokémon Center" },
] as const;

export type HealLocationEntry = (typeof HEAL_LOCATIONS)[number];
export type HealLocationId = HealLocationEntry["id"];

export function findHealLocationByCenter(
  centerMapId: string,
): HealLocationEntry | null {
  return (
    HEAL_LOCATIONS.find(
      (entry) => entry.centerMapId === centerMapId,
    ) ?? null
  );
}

export function findHealLocation(
  id: string,
): HealLocationEntry | null {
  return HEAL_LOCATIONS.find((entry) => entry.id === id) ?? null;
}

export const POKEMON_CENTER_MAP_IDS: readonly string[] =
  HEAL_LOCATIONS.map((entry) => entry.centerMapId);
