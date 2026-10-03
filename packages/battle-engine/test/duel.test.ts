import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createStarterDuel,
  createWildDuel,
  getActiveDuelUnit,
  getReachableCells,
  manhattanDistance,
  resolveSimpleAiTurn,
  resolveSimpleAiTurnDetailed,
  rivalStarterFor,
} from "../src/duel";

describe("starter duel", () => {
  it("selects the classic counter starter", () => {
    expect(rivalStarterFor("bulbasaur")).toBe("charmander");
    expect(rivalStarterFor("charmander")).toBe("squirtle");
    expect(rivalStarterFor("squirtle")).toBe("bulbasaur");
  });

  it("uses the same random placement for the same seed", () => {
    const first = createStarterDuel("bulbasaur", {
      seed: 12345,
      width: 9,
      height: 7,
    });
    const second = createStarterDuel("bulbasaur", {
      seed: 12345,
      width: 9,
      height: 7,
    });

    expect(first.units.map((unit) => unit.position)).toEqual(
      second.units.map((unit) => unit.position),
    );
  });

  it("never spawns units on blocked cells", () => {
    const blocked = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const state = createStarterDuel("squirtle", {
      seed: 55,
      width: 7,
      height: 5,
      blocked,
    });

    for (const unit of state.units) {
      expect(
        blocked.some(
          (cell) =>
            cell.x === unit.position.x &&
            cell.y === unit.position.y,
        ),
      ).toBe(false);
    }
  });

  it("creates Route 1-style wild battles with persistent player progression", () => {
    const state = createWildDuel({
      seed: 2026,
      width: 9,
      height: 7,
      blocked: [{ x: 0, y: 0 }],
      player: {
        species: "squirtle",
        level: 7,
        moves: ["tackle", "tail-whip", "water-gun"],
        evs: {
          hp: 6,
          attack: 0,
          defense: 6,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
        },
      },
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const player = state.units.find((unit) => unit.side === "player")!;
    const wild = state.units.find((unit) => unit.side === "rival")!;

    expect(state.battleKind).toBe("wild");
    expect(player.level).toBe(7);
    expect(player.moves).toContain("water-gun");
    expect(wild.species).toBe("pidgey");
    expect(wild.level).toBe(3);
  });

  it("allows fleeing from a wild battle", () => {
    let state = createWildDuel({
      seed: 80,
      player: {
        species: "bulbasaur",
        level: 5,
        moves: ["tackle", "growl"],
      },
      wildSpecies: "rattata",
      wildLevel: 2,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "flee",
      unitId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.escaped).toBe(true);
    expect(result.state.status).toBe("finished");
  });

  it("uses four-direction movement, MP, and map obstacles", () => {
    const state = createStarterDuel("bulbasaur", {
      seed: 77,
      width: 7,
      height: 5,
      blocked: [{ x: 3, y: 2 }],
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const reachable = getReachableCells(state, player.id);

    expect(
      reachable.every(
        (cell) =>
          manhattanDistance(player.position, cell) <= player.mp,
      ),
    ).toBe(true);
    expect(
      reachable.some((cell) => cell.x === 3 && cell.y === 2),
    ).toBe(false);
  });

  it("returns presentation data for a resolved move", () => {
    let state = createStarterDuel("charmander", {
      seed: 17,
      width: 7,
      height: 5,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    player.position = { x: 2, y: 2 };
    rival.position = { x: 3, y: 2 };
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "scratch",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.presentation?.kind).toBe("move");
    if (result.presentation?.kind === "move") {
      expect(result.presentation.moveId).toBe("scratch");
      expect(result.presentation.vfxId).toBe("scratch");
      expect(result.presentation.motion).toBe("contact");
      expect(result.presentation.results[0].damage).toBeGreaterThan(0);
    }
  });

  it("returns stat-change presentation data for status moves", () => {
    let state = createStarterDuel("bulbasaur", { seed: 33 });
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    player.position = { x: 2, y: 2 };
    rival.position = { x: 4, y: 2 };
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "growl",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind === "move") {
      expect(result.presentation.motion).toBe("status");
      expect(result.presentation.results[0].statChanges).toEqual([
        { stat: "attack", delta: -1 },
      ]);
    }
  });

  it("rejects melee attacks outside range", () => {
    let state = createStarterDuel("charmander", {
      seed: 1,
      width: 7,
      height: 5,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    player.position = { x: 0, y: 0 };
    rival.position = { x: 6, y: 4 };
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "scratch",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("target-out-of-range");
  });


  it("uses an item on an ally and consumes the turn", () => {
    let state = createStarterDuel("bulbasaur", {
      seed: 42,
      width: 7,
      height: 5,
    });

    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, hp: Math.max(1, unit.hp - 10) }
          : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: player.id,
      itemId: "potion",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.items.potion).toBe(0);
    expect(getActiveDuelUnit(result.state)?.id).toBe(rival.id);
  });

  it("does not allow fleeing from the starter trainer battle", () => {
    let state = createStarterDuel("squirtle", {
      seed: 12,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "flee",
      unitId: player.id,
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("cannot-flee-trainer");
    expect(result.state.status).toBe("active");
  });

  it("exposes the exact AI actions for animation", () => {
    let state = createStarterDuel("bulbasaur", {
      seed: 991,
      width: 9,
      height: 7,
    });
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = { ...state, activeUnitId: rival.id };

    const turn = resolveSimpleAiTurnDetailed(state);

    expect(turn.steps.length).toBeGreaterThan(0);
    expect(
      turn.steps.some((step) => step.presentation?.kind === "move"),
    ).toBe(true);
  });

  it("lets the rival AI move, act, and hand back the turn", () => {
    let state = createStarterDuel("bulbasaur", {
      seed: 999,
      width: 9,
      height: 7,
    });
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = { ...state, activeUnitId: rival.id };

    state = resolveSimpleAiTurn(state);

    if (state.status === "active") {
      expect(getActiveDuelUnit(state)?.side).toBe("player");
    }
  });
});
