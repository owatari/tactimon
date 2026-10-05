/** Player-world event ids (namespace `story`) used by the Kanto questlines. */
export const SAFFRON_GUARDS_OPEN_EVENT = "saffron-guards-open";
export const FUJI_RESCUED_EVENT = "fuji-rescued";

/** Choice id for the Pokémon Mansion statue switch: unset/"a" or "b". */
export const MANSION_SWITCH_CHOICE = "mansion-switch";

/** Rocket Hideout elevator: the doors are shut tiles; the script moves the player. */
export const ROCKET_ELEVATOR_FLOORS = [
  { id: "b1f", label: "B1F", mapId: "rocket-hideout-b-1f", x: 24, y: 26 },
  { id: "b2f", label: "B2F", mapId: "rocket-hideout-b-2f", x: 28, y: 17 },
  { id: "b4f", label: "B4F", mapId: "rocket-hideout-b-4f", x: 20, y: 24 },
] as const;

export function silphDoorEventId(doorId: string): string {
  return `silph-door:${doorId}`;
}

/** Recorded when a one-off wild battle (Snorlax, ghost, birds) is won/caught. */
export function staticEncounterEventId(staticId: string): string {
  return `static:${staticId}`;
}
