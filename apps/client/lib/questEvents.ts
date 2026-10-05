/** Player-world event ids (namespace `story`) used by the Kanto questlines. */
export const SAFFRON_GUARDS_OPEN_EVENT = "saffron-guards-open";
export const FUJI_RESCUED_EVENT = "fuji-rescued";

export function silphDoorEventId(doorId: string): string {
  return `silph-door:${doorId}`;
}

/** Recorded when a one-off wild battle (Snorlax, ghost, birds) is won/caught. */
export function staticEncounterEventId(staticId: string): string {
  return `static:${staticId}`;
}
