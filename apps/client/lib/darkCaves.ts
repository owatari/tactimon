/** Caves that need Flash (FireRed: only the Rock Tunnel is pitch black). */
export const DARK_MAP_IDS: ReadonlySet<string> = new Set([
  "rock-tunnel-1f",
  "rock-tunnel-b-1f",
]);

export function isDarkMap(mapId: string): boolean {
  return DARK_MAP_IDS.has(mapId);
}
