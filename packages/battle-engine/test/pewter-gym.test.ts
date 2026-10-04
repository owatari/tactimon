import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createTrainerDuel,
  defaultMovesForSpecies,
} from "../src";

describe("Pewter Gym battle data", () => {
  it("creates Brock's Rock/Ground Pokémon with FireRed moves", () => {
    const state = createTrainerDuel({
      seed: 980,
      players: [
        {
          species: "squirtle",
          level: 12,
          moves: ["tackle", "water-gun"],
        },
      ],
      rivals: [
        {
          species: "geodude",
          level: 12,
          moves: ["tackle", "defense-curl"],
        },
        {
          species: "onix",
          level: 14,
          moves: ["tackle", "bind", "rock-tomb"],
        },
      ],
      trainerName: "Brock",
    });

    const geodude = state.units.find(
      (unit) => unit.species === "geodude",
    )!;
    const onix = state.units.find(
      (unit) => unit.species === "onix",
    )!;

    expect(geodude.types).toEqual(["rock", "ground"]);
    expect(onix.types).toEqual(["rock", "ground"]);
    expect(geodude.moves).toEqual([
      "tackle",
      "defense-curl",
    ]);
    expect(onix.moves).toEqual([
      "tackle",
      "bind",
      "rock-tomb",
    ]);
    expect(defaultMovesForSpecies("geodude")).toEqual([
      "tackle",
      "defense-curl",
    ]);
  });

  it("lets Defense Curl raise the user's Defense", () => {
    let state = createTrainerDuel({
      seed: 981,
      players: [
        {
          species: "geodude",
          level: 12,
          moves: ["defense-curl"],
        },
      ],
      rivals: [
        {
          species: "caterpie",
          level: 5,
          moves: ["tackle"],
        },
      ],
    });
    const geodude = state.units.find(
      (unit) => unit.side === "player",
    )!;
    state = { ...state, activeUnitId: geodude.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: geodude.id,
      moveId: "defense-curl",
      targetId: geodude.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === geodude.id,
      )?.defenseStage,
    ).toBe(1);
  });

  it("lets Rock Tomb deal Rock damage and lower Speed", () => {
    let state = createTrainerDuel({
      seed: 982,
      players: [
        {
          species: "onix",
          level: 14,
          moves: ["rock-tomb"],
        },
      ],
      rivals: [
        {
          species: "pidgey",
          level: 20,
          moves: ["tackle"],
        },
      ],
    });
    const onix = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const pidgey = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    onix.position = { x: 2, y: 2 };
    pidgey.position = { x: 4, y: 2 };
    state = { ...state, activeUnitId: onix.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: onix.id,
      moveId: "rock-tomb",
      targetId: pidgey.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind !== "move") {
      throw new Error("Expected move presentation.");
    }

    expect(result.presentation.results[0].damage).toBeGreaterThan(0);
    expect(result.presentation.results[0].typeEffectiveness).toBe(2);
    expect(result.presentation.results[0].statChanges).toEqual([
      { stat: "speed", delta: -1 },
    ]);
  });
});
