import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  calculateTypeEffectiveness,
  createWildDuel,
  resolveSimpleAiTurnDetailed,
} from "../packages/battle-engine/src";

describe("FireRed type effectiveness", () => {
  it("matches core Gen III type-chart interactions", () => {
    expect(
      calculateTypeEffectiveness("electric", [
        "normal",
        "flying",
      ]),
    ).toBe(2);
    expect(
      calculateTypeEffectiveness("grass", [
        "bug",
        "poison",
      ]),
    ).toBe(0.25);
    expect(
      calculateTypeEffectiveness("ground", ["flying"]),
    ).toBe(0);
    expect(
      calculateTypeEffectiveness("ghost", ["normal"]),
    ).toBe(0);
    expect(
      calculateTypeEffectiveness("fighting", ["steel"]),
    ).toBe(2);
    expect(
      calculateTypeEffectiveness("dark", ["steel"]),
    ).toBe(0.5);
  });

  it("applies STAB and super effectiveness to real battle damage", () => {
    let state = createWildDuel({
      seed: 960,
      player: {
        species: "pikachu",
        level: 5,
        moves: ["thunder-shock"],
      },
      wildSpecies: "pidgey",
      wildLevel: 5,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    player.position = { x: 1, y: 2 };
    wild.position = { x: 3, y: 2 };
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "thunder-shock",
      targetId: wild.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind === "move") {
      const resolved = result.presentation.results[0];
      expect(resolved.sameTypeAttackBonus).toBe(true);
      expect(resolved.typeEffectiveness).toBe(2);
      expect(resolved.damage).toBeGreaterThan(0);
    } else {
      throw new Error("Expected move presentation.");
    }
  });

  it("compounds both defender types in Viridian Forest matchups", () => {
    let state = createWildDuel({
      seed: 961,
      player: {
        species: "bulbasaur",
        level: 7,
        moves: ["vine-whip"],
      },
      wildSpecies: "weedle",
      wildLevel: 5,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    player.position = { x: 2, y: 2 };
    wild.position = { x: 3, y: 2 };
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "vine-whip",
      targetId: wild.id,
    });

    if (result.presentation?.kind === "move") {
      const resolved = result.presentation.results[0];
      expect(resolved.sameTypeAttackBonus).toBe(true);
      expect(resolved.typeEffectiveness).toBe(0.25);
      expect(resolved.damage).toBeGreaterThan(0);
    } else {
      throw new Error("Expected move presentation.");
    }
  });

  it("makes AI prefer the strongest usable typed attack", () => {
    let state = createWildDuel({
      seed: 962,
      player: {
        species: "charmander",
        level: 7,
        moves: ["poison-sting", "ember"],
      },
      wildSpecies: "caterpie",
      wildLevel: 5,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    player.position = { x: 2, y: 2 };
    wild.position = { x: 4, y: 2 };
    state = { ...state, activeUnitId: player.id };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "player",
    );
    const usedMove = turn.steps.find(
      (step) => step.presentation?.kind === "move",
    );

    expect(
      usedMove?.presentation?.kind === "move"
        ? usedMove.presentation.moveId
        : null,
    ).toBe("ember");
  });

  it("keeps immunities at zero instead of forcing minimum damage", () => {
    expect(
      calculateTypeEffectiveness("electric", ["ground"]),
    ).toBe(0);
    expect(
      calculateTypeEffectiveness("poison", ["steel"]),
    ).toBe(0);
    expect(
      calculateTypeEffectiveness("normal", ["ghost"]),
    ).toBe(0);
  });
});
