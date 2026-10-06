import { describe, expect, it } from "vitest";
import { createPokemonProgression, createWildDuel, getActiveDuelUnit, resolveSimpleAiTurnDetailed } from "../src";

describe("one unit per tile", () => {
  it("never puts two living units on the same tile during auto battles", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const players = ["charmander", "rattata", "pidgey"].map((s) => {
        const p = createPokemonProgression(s as never, 6);
        return { species: p.species, level: 6, moves: p.activeMoves, movePp: { ...p.movePp }, currentHp: p.currentHp } as never;
      });
      let state = createWildDuel({
        seed, width: 12, height: 9, blocked: [], players, captureAllowed: true, items: {},
        wildSpecies: "rattata", wildLevel: 4,
        wilds: [{ species: "rattata", level: 4 }, { species: "pidgey", level: 4 }, { species: "caterpie", level: 4 }, { species: "rattata", level: 3 }],
      } as never);
      for (let i = 0; i < 400 && state.status === "active"; i += 1) {
        const actor = getActiveDuelUnit(state);
        if (!actor) break;
        const turn = resolveSimpleAiTurnDetailed(state, actor.side, { useItems: true });
        if (turn.steps.length === 0) break;
        state = turn.state;
        const cells = state.units.filter((u) => u.hp > 0).map((u) => `${u.position.x},${u.position.y}`);
        expect(new Set(cells).size, `seed ${seed} step ${i}`).toBe(cells.length);
      }
    }
  });
});
