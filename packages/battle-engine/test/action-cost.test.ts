import { describe, expect, it } from "vitest";
import {
  DUEL_MOVES,
  MAX_DAMAGE_MOVE_AP,
  MAX_STATUS_MOVE_AP,
  apCostForMove,
  maxActionPointsForSpeed,
} from "../src";

describe("AP pool", () => {
  it("is 6 plus one per 25 Speed", () => {
    expect(maxActionPointsForSpeed(0)).toBe(6);
    expect(maxActionPointsForSpeed(24)).toBe(6);
    expect(maxActionPointsForSpeed(25)).toBe(7);
    expect(maxActionPointsForSpeed(49)).toBe(7);
    expect(maxActionPointsForSpeed(50)).toBe(8);
    expect(maxActionPointsForSpeed(130)).toBe(11);
    expect(maxActionPointsForSpeed(Number.NaN)).toBe(6);
  });
});

describe("move AP costs", () => {
  const damage = (power: number, extra: object = {}) => apCostForMove({ category: "physical", power, ...extra });
  const status = (extra: object = {}) => apCostForMove({ category: "status", power: null, ...extra });

  it("damage moves cost about 10% of their power, at least 1", () => {
    expect(damage(40)).toBe(4);
    expect(damage(90)).toBe(9);
    expect(damage(10)).toBe(1);
    expect(damage(5)).toBe(1);
  });

  it("multi-hit moves are priced by their average hits", () => {
    expect(damage(15, { multiHit: "two-to-five" })).toBe(5);
    expect(damage(25, { multiHit: "two" })).toBe(5);
    expect(damage(15, { multiHit: "two-to-five" })).toBeGreaterThan(damage(15));
  });

  it("area attacks cost more than the same move on one target", () => {
    for (const area of ["line", "cone", "burst-1", "self-radius-1"]) {
      expect(damage(60, { areaPattern: area }), area).toBeGreaterThan(damage(60));
    }
    expect(damage(60, { areaPattern: "large-area" })).toBeGreaterThan(damage(60, { areaPattern: "burst-1" }));
  });

  it("never exceeds the ceiling, even for 150-power moves", () => {
    expect(damage(150)).toBe(MAX_DAMAGE_MOVE_AP);
    expect(damage(150, { areaPattern: "large-area" })).toBe(MAX_DAMAGE_MOVE_AP);
    expect(apCostForMove({ category: "physical", power: 1, effect: "ohko" })).toBe(10);
  });

  it("status moves average 3 AP and grow with extra effects, area and allies", () => {
    expect(status({ effect: "defense-down" })).toBe(3);
    expect(status({ effect: "attack-down-2" })).toBe(4);
    expect(status({ effect: "calm-mind" })).toBe(4);
    expect(status({ effect: "defense-down", secondaryStatus: "poison" })).toBe(4);
    expect(status({ effect: "defense-down", areaPattern: "burst-1" })).toBe(4);
    expect(status({ effect: "defense-up", areaPattern: "large-area" })).toBe(5);
    expect(status({ effect: "defense-up", targeting: "all-allies" })).toBe(5);
    expect(status({ effect: "calm-mind", areaPattern: "large-area", targeting: "all-allies" })).toBeLessThanOrEqual(MAX_STATUS_MOVE_AP);
  });

  it("every Kanto move gets a cost in range, with the intended averages", () => {
    const moves = Object.values(DUEL_MOVES);
    expect(moves.length).toBeGreaterThan(150);
    for (const move of moves) {
      expect(move.apCost, move.id).toBeGreaterThanOrEqual(1);
      expect(move.apCost, move.id).toBeLessThanOrEqual(move.category === "status" ? MAX_STATUS_MOVE_AP : MAX_DAMAGE_MOVE_AP);
    }
    const plain = moves.filter((m) => m.category !== "status" && m.power && !m.multiHit && !m.areaPattern && !m.effect);
    const ratio = plain.reduce((sum, m) => sum + m.apCost / (m.power as number), 0) / plain.length;
    expect(ratio).toBeGreaterThan(0.08);
    expect(ratio).toBeLessThan(0.14);
    const statusMoves = moves.filter((m) => m.category === "status");
    const avg = statusMoves.reduce((s, m) => s + m.apCost, 0) / statusMoves.length;
    expect(avg).toBeGreaterThan(2.7);
    expect(avg).toBeLessThan(3.6);
  });

  it("real moves follow the formula", () => {
    expect(DUEL_MOVES.tackle.apCost).toBe(Math.round((DUEL_MOVES.tackle.power as number) * 0.1));
  });
});
