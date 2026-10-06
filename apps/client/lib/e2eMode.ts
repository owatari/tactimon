/**
 * E2E turbo mode: dev-only switch used by `tools/e2e/playthrough.e2e.ts`. It never activates in a
 * production build and has no UI: the driver sets `localStorage["tactimon.e2e.v1"] = "1"`.
 */
export const E2E_STORAGE_KEY = "tactimon.e2e.v1";
/** Battle speed multiplier while the e2e turbo mode is on (animation timers are divided by it). */
export const E2E_BATTLE_SPEED = 40;

export function isE2eMode(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  storage: Pick<Storage, "getItem"> | null = safeLocalStorage(),
): boolean {
  if (nodeEnv === "production") return false;
  try {
    return storage?.getItem(E2E_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Hooks the e2e driver can call from the page (`window.__tactimon_e2e`). */
export type E2eHooks = {
  /** Starts the real trainer battle for `trainerId` in the current map (skips the challenge text). */
  fightTrainer(trainerId: string): boolean;
};

declare global {
  interface Window {
    __tactimon_e2e?: E2eHooks;
  }
}
