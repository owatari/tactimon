export const OPTIONS_STORAGE_KEY = "tactimon.options.v1";

export type GameOptions = {
  /** 0–100, in steps of 10. */
  musicVolume: number;
  musicMuted: boolean;
  /** Initial battle speed; the battle HUD can still toggle it. */
  battleSpeed: 1 | 2;
};

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  musicVolume: 70,
  musicMuted: false,
  battleSpeed: 1,
};

export function normalizeGameOptions(
  value: unknown,
): GameOptions {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<GameOptions>)
      : {};
  const volume =
    typeof candidate.musicVolume === "number" &&
    Number.isFinite(candidate.musicVolume)
      ? Math.round(
          Math.max(0, Math.min(100, candidate.musicVolume)) /
            10,
        ) * 10
      : DEFAULT_GAME_OPTIONS.musicVolume;

  return {
    musicVolume: volume,
    musicMuted: candidate.musicMuted === true,
    battleSpeed: candidate.battleSpeed === 2 ? 2 : 1,
  };
}

export function effectiveMusicVolume(
  options: GameOptions,
): number {
  return options.musicMuted ? 0 : options.musicVolume / 100;
}

export function loadGameOptions(): GameOptions {
  try {
    const raw = window.localStorage.getItem(
      OPTIONS_STORAGE_KEY,
    );
    return normalizeGameOptions(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_GAME_OPTIONS };
  }
}

export function saveGameOptions(options: GameOptions): void {
  try {
    window.localStorage.setItem(
      OPTIONS_STORAGE_KEY,
      JSON.stringify(options),
    );
  } catch {
    // Storage can be unavailable (private mode); options stay in memory.
  }
}
