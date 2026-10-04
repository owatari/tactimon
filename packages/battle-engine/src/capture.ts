import type { BattleUnit, EncounterRules } from "./types";

export interface CaptureEligibility {
  allowed: boolean;
  reason?: "encounter-forbids-capture" | "target-not-wild" | "target-is-boss" | "already-attempted" | "hp-too-high" | "target-fainted";
}

export interface FailureXpPoint { hpRatio: number; xpRatio: number; }

export const DEFAULT_FAILURE_XP_CURVE: readonly FailureXpPoint[] = [
  { hpRatio: 0.10, xpRatio: 0.50 },
  { hpRatio: 0.05, xpRatio: 0.75 },
  { hpRatio: 0.01, xpRatio: 0.80 },
  { hpRatio: 0.00, xpRatio: 0.80 }
];

export function getCaptureEligibility(target: BattleUnit, rules: EncounterRules): CaptureEligibility {
  if (rules.capturePolicy !== "allowed") return { allowed: false, reason: "encounter-forbids-capture" };
  if (!target.wild) return { allowed: false, reason: "target-not-wild" };
  if (target.boss) return { allowed: false, reason: "target-is-boss" };
  if (target.captureAttempted) return { allowed: false, reason: "already-attempted" };
  if (target.currentHp <= 0) return { allowed: false, reason: "target-fainted" };
  if (target.currentHp / target.maxHp > rules.captureHpThresholdRatio) return { allowed: false, reason: "hp-too-high" };
  return { allowed: true };
}

export function failedCaptureXpRatio(currentHp: number, maxHp: number, curve: readonly FailureXpPoint[] = DEFAULT_FAILURE_XP_CURVE): number {
  const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
  const ordered = [...curve].sort((a, b) => b.hpRatio - a.hpRatio);
  if (hpRatio >= ordered[0].hpRatio) return ordered[0].xpRatio;
  if (hpRatio <= ordered[ordered.length - 1].hpRatio) return ordered[ordered.length - 1].xpRatio;
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const high = ordered[i];
    const low = ordered[i + 1];
    if (hpRatio <= high.hpRatio && hpRatio >= low.hpRatio) {
      const t = (high.hpRatio - hpRatio) / (high.hpRatio - low.hpRatio || 1);
      return high.xpRatio + (low.xpRatio - high.xpRatio) * t;
    }
  }
  return ordered[ordered.length - 1].xpRatio;
}

export interface CaptureChanceInput {
  catchRate: number;
  ballModifier: number;
  statusModifier: number;
  hpRatio: number;
  thresholdRatio?: number;
}

export function experimentalCaptureChance(input: CaptureChanceInput): number {
  const threshold = input.thresholdRatio ?? 0.50;
  const legalHp = Math.max(0, Math.min(threshold, input.hpRatio));
  const species = Math.max(1, Math.min(255, input.catchRate)) / 255;
  const baseAtThreshold = 0.05 + 0.60 * Math.pow(species, 0.55);
  const preparation = 1 + ((threshold - legalHp) / threshold) * 0.25;
  return Math.max(0.01, Math.min(0.95, baseAtThreshold * preparation * input.ballModifier * input.statusModifier));
}

export interface CaptureResolution { success: boolean; targetFlees: boolean; xpRatio: number; }

export function resolveCaptureRoll(roll01: number, chance01: number, currentHp: number, maxHp: number): CaptureResolution {
  const success = roll01 < chance01;
  return { success, targetFlees: !success, xpRatio: success ? 1 : failedCaptureXpRatio(currentHp, maxHp) };
}
