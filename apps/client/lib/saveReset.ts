/** Every localStorage key that holds player progress (see storyPersistence/OverworldGame). */
export const SAVE_STORAGE_KEYS: readonly string[] = [
  "tactimon.story.v1",
  "tactimon.story.v1.backup",
  "tactimon.position.v1",
  "tactimon.run-mode.v1",
];

/** `/?reset=1` wipes the save once on load (handy for testing from scratch). */
export function wantsSaveReset(search: string): boolean {
  return new URLSearchParams(search).get("reset") === "1";
}

type StorageLike = Pick<Storage, "removeItem">;

/** Erases the local save so the game starts again from Pallet Town. */
export function clearAllSaves(storage: StorageLike): void {
  for (const key of SAVE_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be blocked; nothing else to do.
    }
  }
}
