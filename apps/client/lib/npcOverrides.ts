import { fanClubSeated } from "./eventNpcs";
import type { StoryState } from "./story";

/**
 * Map NPCs that stand somewhere other than their ROM tile for gameplay reasons. `local_id` is the
 * ROM object id. The override applies while `when` holds at the moment the map loads.
 */
type NpcPositionOverride = {
  mapId: string;
  localId: number;
  x: number;
  y: number;
  when: (story: StoryState) => boolean;
};

/** Badges that open the Viridian Gym (the six that come before Giovanni's). */
const VIRIDIAN_GYM_BADGES = ["cascade", "thunder", "rainbow", "soul", "marsh", "volcano"];

export const NPC_POSITION_OVERRIDES: readonly NpcPositionOverride[] = [
  {
    // The man outside the Viridian Gym stands right in front of its door (36, 10) while it is closed.
    mapId: "viridian-city",
    localId: 3,
    x: 36,
    y: 11,
    when: (story) => !VIRIDIAN_GYM_BADGES.every((badge) => story.badgeIds.includes(badge as never)),
  },
  {
    // Mt. Moon B2F (ROM script 0x160756): after you take the Helix Fossil the scientist walks to the
    // Dome Fossil (14, 7) and stays on the tile below it...
    mapId: "mt-moon-b2f",
    localId: 3,
    x: 14,
    y: 8,
    when: (story) => story.mtMoonFossil === "helix",
  },
  {
    // ...and when you take the Dome Fossil he takes the Helix Fossil (13, 7) (script 0x1607ba).
    mapId: "mt-moon-b2f",
    localId: 3,
    x: 13,
    y: 8,
    when: (story) => story.mtMoonFossil === "dome",
  },
  // Saffron Fan Club (ROM `setobjectxyperm`, script 0x16f207-0x16f25b): after the chairman's talk
  // the members take their seats around the room.
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 1,
    x: 5,
    y: 2,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 2,
    x: 3,
    y: 4,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 3,
    x: 7,
    y: 4,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 4,
    x: 2,
    y: 2,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 5,
    x: 10,
    y: 3,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 6,
    x: 4,
    y: 6,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 7,
    x: 7,
    y: 5,
    when: fanClubSeated,
  },
  {
    mapId: "saffron-city-pokemon-trainer-fan-club",
    localId: 8,
    x: 9,
    y: 6,
    when: fanClubSeated,
  },
];

export function resolveNpcPositionOverride(
  mapId: string,
  localId: number,
  story: StoryState,
): { x: number; y: number } | null {
  const hit = NPC_POSITION_OVERRIDES.find(
    (override) => override.mapId === mapId && override.localId === localId && override.when(story),
  );
  return hit ? { x: hit.x, y: hit.y } : null;
}
