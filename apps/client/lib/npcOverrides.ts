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
