import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createWildDuel,
  getActiveDuelUnit,
  getReachableCells,
  type DuelState,
} from "../src";

function duelWithFaintedRival(): DuelState {
  const state = createWildDuel({
    seed: 77,
    width: 9,
    height: 5,
    blocked: [],
    players: [
      { species: "charmander", level: 8, moves: ["scratch", "growl"] },
      { species: "pidgey", level: 8, moves: ["tackle", "growl"] },
    ],
    wilds: [
      { species: "rattata", level: 3 },
      { species: "pidgey", level: 3 },
    ],
    wildSpecies: "rattata",
    wildLevel: 3,
  });
  const fainted = state.units.find((unit) => unit.side === "rival")!;
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === fainted.id ? { ...unit, hp: 0 } : unit,
    ),
  };
}

describe("fainted units leave the battlefield immediately", () => {
  it("do not block movement on their tile", () => {
    const state = duelWithFaintedRival();
    const fainted = state.units.find(
      (unit) => unit.side === "rival" && unit.hp <= 0,
    )!;
    const mover = state.units.find((unit) => unit.side === "player")!;
    // Put the fainted unit right next to the mover so the tile is in range.
    const adjacent = { x: mover.position.x + 1, y: mover.position.y };
    const placed: DuelState = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === fainted.id
          ? { ...unit, position: adjacent }
          : unit.id !== mover.id &&
              unit.position.x === adjacent.x &&
              unit.position.y === adjacent.y
            ? { ...unit, position: { x: 0, y: 0 } }
            : unit,
      ),
      activeUnitId: mover.id,
    };

    const reachable = getReachableCells(placed, mover.id);
    expect(
      reachable.some(
        (cell) => cell.x === adjacent.x && cell.y === adjacent.y,
      ),
    ).toBe(true);
  });

  it("never receive a turn", () => {
    let state = duelWithFaintedRival();
    const faintedId = state.units.find((unit) => unit.hp <= 0)!.id;

    for (let turn = 0; turn < 12 && state.status !== "finished"; turn += 1) {
      const active = getActiveDuelUnit(state);
      expect(active?.id).not.toBe(faintedId);
      expect(active?.hp ?? 1).toBeGreaterThan(0);
      const result = applyDuelAction(state, {
        kind: "end-turn",
        unitId: active!.id,
      });
      expect(result.accepted).toBe(true);
      state = result.state;
    }
  });
});
