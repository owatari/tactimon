import { describe, expect, it } from "vitest";
import { failedCaptureXpRatio, getCaptureEligibility, resolveCaptureRoll } from "../src/capture";
import type { BattleUnit, EncounterRules } from "../src/types";

const rules: EncounterRules = { capturePolicy: "allowed", captureHpThresholdRatio: 0.50 };
const wild = (currentHp: number): BattleUnit => ({ id:"wild-1", ownerId:null, wild:true, boss:false, currentHp, maxHp:100, speed:50, position:{x:0,y:0}, captureAttempted:false });

describe("capture eligibility", () => {
  it("rejects targets above 50% HP", () => expect(getCaptureEligibility(wild(51), rules).allowed).toBe(false));
  it("allows a wild target at 50% HP", () => expect(getCaptureEligibility(wild(50), rules).allowed).toBe(true));
  it("rejects bosses", () => { const target = wild(5); target.boss = true; expect(getCaptureEligibility(target, rules).reason).toBe("target-is-boss"); });
});

describe("failed capture XP", () => {
  it("matches initial tuning points", () => {
    expect(failedCaptureXpRatio(10,100)).toBeCloseTo(0.50);
    expect(failedCaptureXpRatio(5,100)).toBeCloseTo(0.75);
    expect(failedCaptureXpRatio(1,100)).toBeCloseTo(0.80);
  });
  it("makes target flee on failure", () => expect(resolveCaptureRoll(0.9,0.5,5,100)).toEqual({success:false,targetFlees:true,xpRatio:0.75}));
});
