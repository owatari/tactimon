import { describe, expect, it } from "vitest";
import { OPENING_TILES, applyOpeningMovement, createTrainerDuel, manhattanDistance } from "../src";
import { measureBalanced, type FirstMoverReport } from "./support/firstMover";

/**
 * First-mover advantage (task 040). Mirror fights: both sides field the SAME team with the same AI, so any
 * gap between the side that acts first and the one that acts second comes from turn order and distance.
 *   FM_SEEDS=300 FM_TILES=0,1,2 pnpm --filter @tactimon/battle-engine exec vitest run test/first-mover.test.ts
 * prints the comparison used to choose OPENING_TILES (results in the task 040 decisions).
 */
const SIZES = (process.env.FM_SIZES ?? "2,3,4,6").split(",").map(Number);
const SEEDS = Number(process.env.FM_SEEDS ?? 60);
const VARIANTS = process.env.FM_TILES ? process.env.FM_TILES.split(",").map(Number) : null;

const line = (name: string, r: FirstMoverReport) =>
  console.log(`${name.padEnd(24)} first ${r.firstRate.toFixed(1)}%  gap ${r.gap >= 0 ? "+" : ""}${r.gap.toFixed(1)}  n=${r.fights - r.draws - r.stalled} stalled=${r.stalled} rounds=${r.avgRounds.toFixed(1)}`);

describe("opening movement", () => {
  const players = Array.from({ length: 3 }, () => ({ species: "rattata", level: 10, moves: ["tackle"] }));
  const fresh = (openingTiles: number, seed = 5) =>
    createTrainerDuel({ seed, width: 13, height: 9, players, rivals: players, openingTiles } as never);
  const gap = (state: ReturnType<typeof fresh>) => {
    const p = state.units.filter((u) => u.side === "player");
    const r = state.units.filter((u) => u.side === "rival");
    return Math.min(...p.flatMap((a) => r.map((b) => manhattanDistance(a.position, b.position))));
  };

  it("closes the distance between the sides, one tile per step, on unique free cells", () => {
    const spawn = fresh(0);
    for (const tiles of [1, 2]) {
      const moved = applyOpeningMovement(spawn, tiles);
      expect(gap(moved)).toBe(Math.max(1, gap(spawn) - 2 * tiles));
      const keys = moved.units.map((u) => `${u.position.x},${u.position.y}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(applyOpeningMovement(spawn, 0)).toBe(spawn);
  });

  it("is deterministic, leaves AP and turn order alone and does not mutate its input", () => {
    const spawn = fresh(0);
    const before = JSON.stringify(spawn);
    const a = applyOpeningMovement(spawn, 2);
    expect(JSON.stringify(spawn)).toBe(before);
    expect(applyOpeningMovement(spawn, 2)).toEqual(a);
    expect(a.turnOrder).toEqual(spawn.turnOrder);
    expect(a.activeUnitId).toBe(spawn.activeUnitId);
    expect(a.units.map((u) => u.ap)).toEqual(spawn.units.map((u) => u.ap));
  });

  it("is on by default in every new fight", () => {
    expect(OPENING_TILES).toBeGreaterThan(0);
    expect(gap(fresh(OPENING_TILES))).toBe(Math.max(1, gap(fresh(0)) - 2 * OPENING_TILES));
    const defaults = createTrainerDuel({ seed: 5, width: 13, height: 9, players, rivals: players } as never);
    expect(defaults.units.map((u) => u.position)).toEqual(fresh(OPENING_TILES).units.map((u) => u.position));
  });
});

describe("first-mover advantage (mirror fights)", () => {
  it("keeps the gap between the first and second mover small and never stalls", () => {
    if (VARIANTS) {
      for (const tiles of VARIANTS) line(`opening ${tiles} tiles`, measureBalanced(SIZES, SEEDS, { openingTiles: tiles }));
    }
    const report = measureBalanced(SIZES, SEEDS);
    line(`default (${OPENING_TILES} tile)`, report);
    expect(report.stalled).toBe(0);
    // Before the opening phase the first mover won ~41% (gap -9); the goal is within about 5 points.
    expect(Math.abs(report.gap)).toBeLessThanOrEqual(8);
  }, 1_800_000);
});
