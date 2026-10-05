/** Player-world event ids (namespace `story`) used by the Kanto questlines. */
export const SAFFRON_GUARDS_OPEN_EVENT = "saffron-guards-open";
export const FUJI_RESCUED_EVENT = "fuji-rescued";

/** Choice id for the Pokémon Mansion statue switch: unset/"a" or "b". */
export const MANSION_SWITCH_CHOICE = "mansion-switch";

export function silphDoorEventId(doorId: string): string {
  return `silph-door:${doorId}`;
}

/** Recorded when a one-off wild battle (Snorlax, ghost, birds) is won/caught. */
export function staticEncounterEventId(staticId: string): string {
  return `static:${staticId}`;
}
