import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createStarterDuel,
  getActiveDuelUnit,
  getReachableCells,
  resolveSimpleAiTurn,
  rivalStarterFor,
} from "../src/duel";

describe("starter duel", () => {
  it("selects the classic counter starter", () => {
    expect(rivalStarterFor("bulbasaur")).toBe("charmander");
    expect(rivalStarterFor("charmander")).toBe("squirtle");
    expect(rivalStarterFor("squirtle")).toBe("bulbasaur");
  });

  it("uses four-direction movement and MP", () => {
    const state = createStarterDuel("bulbasaur");
    const player = state.units.find((unit) => unit.side === "player")!;
    const reachable = getReachableCells(state, player.id);

    expect(reachable.some((cell) => cell.x === 2 && cell.y === 2)).toBe(true);
    expect(reachable.some((cell) => cell.x === 4 && cell.y === 2)).toBe(false);
  });

  it("rejects melee attacks outside range", () => {
    let state = createStarterDuel("charmander");
    const player = state.units.find((unit) => unit.side === "player")!;
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "scratch",
      targetId: state.units.find((unit) => unit.side === "rival")!.id,
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("target-out-of-range");
  });

  it("lets the rival AI move, act, and hand back the turn", () => {
    let state = createStarterDuel("bulbasaur");
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = { ...state, activeUnitId: rival.id };

    state = resolveSimpleAiTurn(state);

    if (state.status === "active") {
      expect(getActiveDuelUnit(state)?.side).toBe("player");
    }
  });
});
