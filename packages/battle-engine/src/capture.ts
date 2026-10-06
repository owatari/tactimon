import type { BattleUnit, EncounterRules } from "./types";

export interface CaptureEligibility {
  allowed: boolean;
  reason?: "encounter-forbids-capture" | "target-not-wild" | "target-is-boss" | "target-fainted";
}

/**
 * Any living wild Pokémon can be targeted by a Poké Ball at any HP (the HP only changes the odds),
 * as many times as the player can pay the AP and the balls for.
 */
export function getCaptureEligibility(target: BattleUnit, rules: EncounterRules): CaptureEligibility {
  if (rules.capturePolicy !== "allowed") return { allowed: false, reason: "encounter-forbids-capture" };
  if (!target.wild) return { allowed: false, reason: "target-not-wild" };
  if (target.boss) return { allowed: false, reason: "target-is-boss" };
  if (target.currentHp <= 0) return { allowed: false, reason: "target-fainted" };
  return { allowed: true };
}

export interface CaptureChanceInput {
  /** Species catch rate (3-255). */
  catchRate: number;
  /** Poké Ball 1, Great Ball 1.5, Ultra Ball 2; 255 or more never fails (Master Ball). */
  ballModifier: number;
  /** Sleep 2, poison / paralysis / burn 1.5, otherwise 1. */
  statusModifier: number;
  hp: number;
  maxHp: number;
}

/**
 * Generation III catch odds: a = (3·maxHP − 2·HP) · rate · ball / (3·maxHP) · status;
 * a ≥ 255 always catches, otherwise four shake checks of b = 1048560 / ⁴√(16711680 / a) / 65536.
 */
export function fireRedCaptureChance(input: CaptureChanceInput): number {
  if (input.ballModifier >= 255) return 1;
  const maxHp = Math.max(1, input.maxHp);
  const hp = Math.max(1, Math.min(maxHp, input.hp));
  const rate = Math.max(1, Math.min(255, input.catchRate));
  const a = Math.floor(
    (Math.floor(((3 * maxHp - 2 * hp) * rate * input.ballModifier) / (3 * maxHp)) *
      Math.max(1, input.statusModifier) *
      10) /
      10,
  );
  if (a >= 255) return 1;
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
  return Math.pow(Math.min(65535, b) / 65536, 4);
}

export interface CaptureResolution {
  success: boolean;
}

export function resolveCaptureRoll(roll01: number, chance01: number): CaptureResolution {
  return { success: roll01 < chance01 };
}

/** Capturing is worth more than defeating: the party earns the knock-out EXP plus 20%. */
export const CAPTURE_EXP_BONUS = 1.2;
