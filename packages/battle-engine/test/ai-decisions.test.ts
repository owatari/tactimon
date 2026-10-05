import { describe, expect, it } from "vitest";
import {
  createStarterDuel,
  createTrainerDuel,
  defaultMovesForSpecies,
  resolveSimpleAiTurnDetailed,
} from "../src/duel";

function adjacentDuel(seed: number, playerHp: number) {
  let state = createStarterDuel("bulbasaur", {
    seed,
    width: 9,
    height: 7,
  });
  const player = state.units.find((u) => u.side === "player")!;
  const rival = state.units.find((u) => u.side === "rival")!;
  state = {
    ...state,
    activeUnitId: rival.id,
    units: state.units.map((unit) =>
      unit.id === player.id
        ? { ...unit, position: { x: 3, y: 3 }, hp: playerHp }
        : unit.id === rival.id
          ? { ...unit, position: { x: 4, y: 3 }, ap: 4 }
          : unit,
    ),
  };
  return { state, player, rival };
}

describe("deliberate AI decisions", () => {
  it("takes an available knockout instead of setting up", () => {
    for (const seed of [1, 7, 42, 999, 2024]) {
      const { state, player } = adjacentDuel(seed, 1);
      const turn = resolveSimpleAiTurnDetailed(state, "rival");
      const target = turn.state.units.find((u) => u.id === player.id)!;
      expect(target.hp, `seed ${seed}`).toBeLessThanOrEqual(0);
    }
  });

  it("is deterministic for the same state", () => {
    const { state } = adjacentDuel(31, 30);
    const a = resolveSimpleAiTurnDetailed(state, "rival");
    const b = resolveSimpleAiTurnDetailed(state, "rival");
    expect(b.steps.map((s) => s.presentation?.kind)).toEqual(
      a.steps.map((s) => s.presentation?.kind),
    );
    expect(b.state.units.map((u) => u.hp)).toEqual(
      a.state.units.map((u) => u.hp),
    );
  });

  it("always acts when it has AP and a target in reach", () => {
    const { state, player } = adjacentDuel(5, 20);
    const turn = resolveSimpleAiTurnDetailed(state, "rival");
    expect(turn.steps.length).toBeGreaterThan(0);
    const after = turn.state.units.find((u) => u.id === player.id)!;
    expect(after.hp).toBeLessThan(20);
  });
});

describe("six-versus-six gym battles", () => {
  it("deploys a full party against a six-Pokémon leader on distinct tiles", () => {
    const mon = (species: "geodude" | "pidgey") => ({
      species,
      level: 12,
      moves: defaultMovesForSpecies(species),
    });
    for (const seed of [3, 11, 77]) {
      const state = createTrainerDuel({
        seed,
        width: 17,
        height: 9,
        players: Array.from({ length: 6 }, () => mon("pidgey")),
        rivals: Array.from({ length: 6 }, () => mon("geodude")),
      });
      const keys = new Set(
        state.units.map((u) => `${u.position.x},${u.position.y}`),
      );
      expect(state.units).toHaveLength(12);
      expect(keys.size).toBe(12);
    }
  });
});
