import { t, tx } from "./i18n";
import { canStoryUseFly } from "./fieldTechniques";
import {
  completeStoryPlayerEvent,
  hasStoryPlayerEvent,
  type StoryState,
} from "./story";

/**
 * Town Map: every Kanto town the player has walked into, and the Fly
 * destinations. Spawns are the tile in front of each town's Pokémon Center.
 */

export type TownMapEntry = {
  id: string;
  label: string;
  mapId: string;
  spawn: { x: number; y: number };
};

export const TOWN_MAP_ENTRIES: readonly TownMapEntry[] = [
  { id: "pallet", label: tx("Pallet Town"), mapId: "pallet-town", spawn: { x: 6, y: 8 } },
  { id: "viridian", label: tx("Viridian City"), mapId: "viridian-city", spawn: { x: 26, y: 27 } },
  { id: "pewter", label: tx("Pewter City"), mapId: "pewter-city", spawn: { x: 17, y: 26 } },
  { id: "cerulean", label: tx("Cerulean City"), mapId: "cerulean-city", spawn: { x: 22, y: 20 } },
  { id: "vermilion", label: tx("Vermilion City"), mapId: "vermilion-city", spawn: { x: 15, y: 7 } },
  { id: "lavender", label: tx("Lavender Town"), mapId: "lavender-town", spawn: { x: 6, y: 6 } },
  { id: "celadon", label: tx("Celadon City"), mapId: "celadon-city", spawn: { x: 48, y: 12 } },
  { id: "saffron", label: tx("Saffron City"), mapId: "saffron-city", spawn: { x: 24, y: 39 } },
  { id: "fuchsia", label: tx("Fuchsia City"), mapId: "fuchsia-city", spawn: { x: 25, y: 32 } },
  { id: "cinnabar", label: tx("Cinnabar Island"), mapId: "cinnabar-island", spawn: { x: 14, y: 12 } },
  { id: "indigo", label: tx("Indigo Plateau"), mapId: "indigo-plateau-exterior", spawn: { x: 11, y: 7 } },
];

const TOWN_MAP_IDS: ReadonlySet<string> = new Set(
  TOWN_MAP_ENTRIES.map((entry) => entry.mapId),
);

export function townVisitedEventId(mapId: string): string {
  return `visited:${mapId}`;
}

export function isTownMapLocation(mapId: string): boolean {
  return TOWN_MAP_IDS.has(mapId);
}

export function hasVisitedTown(
  story: StoryState,
  mapId: string,
): boolean {
  return hasStoryPlayerEvent(story, "story", townVisitedEventId(mapId));
}

/** Records the visit (idempotent); other maps leave the story untouched. */
export function registerTownVisit(
  story: StoryState,
  mapId: string,
): StoryState {
  if (!isTownMapLocation(mapId) || hasVisitedTown(story, mapId)) {
    return story;
  }
  return completeStoryPlayerEvent(
    story,
    "story",
    townVisitedEventId(mapId),
  );
}

export type TownMapRow = TownMapEntry & { visited: boolean };

export function townMapRows(story: StoryState): TownMapRow[] {
  return TOWN_MAP_ENTRIES.map((entry) => ({
    ...entry,
    // Pallet Town is home; Kanto starts there.
    visited: entry.id === "pallet" || hasVisitedTown(story, entry.mapId),
  }));
}

export type FlyCheck =
  | { ok: true; entry: TownMapEntry }
  | {
      ok: false;
      reason: "no-fly" | "not-visited" | "unknown";
      message: string;
    };

export function checkFlyDestination(
  story: StoryState,
  entryId: string,
): FlyCheck {
  const row = townMapRows(story).find((entry) => entry.id === entryId);
  if (!row) {
    return { ok: false, reason: "unknown", message: t("Unknown destination.") };
  }
  if (!canStoryUseFly(story)) {
    return {
      ok: false,
      reason: "no-fly",
      message: t(
        "You need the HM Fly, the Thunder Badge and a Pokémon that can use Fly.",
      ),
    };
  }
  if (!row.visited) {
    return {
      ok: false,
      reason: "not-visited",
      message: t("You haven't visited {place} yet.", { place: t(row.label) }),
    };
  }
  return { ok: true, entry: row };
}
