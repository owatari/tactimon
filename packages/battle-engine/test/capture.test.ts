import { describe, expect, it } from "vitest";
import { CAPTURE_EXP_BONUS, fireRedCaptureChance, getCaptureEligibility, resolveCaptureRoll } from "../src/capture";
import type { BattleUnit, EncounterRules } from "../src/types";

const rules: EncounterRules = { capturePolicy: "allowed", captureHpThresholdRatio: 1 };
const wild = (currentHp: number): BattleUnit => ({ id: "wild-1", ownerId: null, wild: true, boss: false, currentHp, maxHp: 100, speed: 50, position: { x: 0, y: 0 }, captureAttempted: false });

describe("capture eligibility", () => {
  it("allows any living wild target at any HP and after earlier attempts", () => {
    expect(getCaptureEligibility(wild(100), rules).allowed).toBe(true);
    expect(getCaptureEligibility(wild(51), rules).allowed).toBe(true);
    const tried = wild(30);
    tried.captureAttempted = true;
    expect(getCaptureEligibility(tried, rules).allowed).toBe(true);
  });
  it("rejects bosses, fainted and non-wild targets and forbidden encounters", () => {
    const boss = wild(5);
    boss.boss = true;
    expect(getCaptureEligibility(boss, rules).reason).toBe("target-is-boss");
    expect(getCaptureEligibility(wild(0), rules).reason).toBe("target-fainted");
    const owned = wild(5);
    owned.wild = false;
    expect(getCaptureEligibility(owned, rules).reason).toBe("target-not-wild");
    expect(getCaptureEligibility(wild(5), { ...rules, capturePolicy: "forbidden" }).reason).toBe("encounter-forbids-capture");
  });
});

describe("Generation III catch odds", () => {
  const base = { catchRate: 45, ballModifier: 1, statusModifier: 1, maxHp: 100 };
  it("a lower HP catches better, and status, a better ball and an easier species help", () => {
    const full = fireRedCaptureChance({ ...base, hp: 100 });
    const half = fireRedCaptureChance({ ...base, hp: 50 });
    const low = fireRedCaptureChance({ ...base, hp: 5 });
    expect(low).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(full);
    expect(fireRedCaptureChance({ ...base, hp: 50, statusModifier: 2 })).toBeGreaterThan(half);
    expect(fireRedCaptureChance({ ...base, hp: 50, ballModifier: 2 })).toBeGreaterThan(half);
    expect(fireRedCaptureChance({ ...base, hp: 50, catchRate: 255, statusModifier: 2 })).toBe(1);
  });
  it("a Master Ball never fails and a roll below the chance succeeds", () => {
    expect(fireRedCaptureChance({ ...base, hp: 100, ballModifier: 255 })).toBe(1);
    expect(resolveCaptureRoll(0.2, 0.5)).toEqual({ success: true });
    expect(resolveCaptureRoll(0.9, 0.5)).toEqual({ success: false });
  });
  it("capturing is worth the knock-out EXP plus 20%", () => {
    expect(CAPTURE_EXP_BONUS).toBe(1.2);
  });
});
