import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createStarterDuel,
  createTrainerDuel,
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


  it("deploys the whole player party in trainer battles too", () => {
    const state = createStarterDuel("bulbasaur", {
      seed: 122,
      width: 13,
      height: 7,
      players: [
        { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
        { species: "pidgey", level: 3, moves: ["tackle", "growl"] },
        { species: "rattata", level: 3, moves: ["tackle", "tail-whip"] },
      ],
    });

    expect(
      state.units.filter((unit) => unit.side === "player"),
    ).toHaveLength(3);
    expect(
      state.units.filter((unit) => unit.side === "rival"),
    ).toHaveLength(1);
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

  it("keeps combatants well separated on the expanded battle field", () => {
    for (const seed of [1, 2, 3, 77, 2026]) {
      const state = createStarterDuel("bulbasaur", {
        seed,
        width: 13,
        height: 7,
      });
      const [player, rival] = state.units;

      expect(
        manhattanDistance(player.position, rival.position),
      ).toBeGreaterThanOrEqual(6);
      expect(player.position.x).toBeGreaterThan(0);
      expect(player.position.x).toBeLessThan(12);
      expect(player.position.y).toBeGreaterThan(0);
      expect(player.position.y).toBeLessThan(6);
    }
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

  it("can automate a player turn with the same tactical AI", () => {
    let state = createStarterDuel("bulbasaur", {
      seed: 1337,
      width: 9,
      height: 7,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    state = {
      ...state,
      activeUnitId: player.id,
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "player",
    );

    expect(turn.steps.length).toBeGreaterThan(0);
    if (turn.state.status === "active") {
      expect(
        getActiveDuelUnit(turn.state)?.side,
      ).toBe("rival");
    }
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


describe("wild capture integration", () => {
  it("uses a Poké Ball on a weakened wild Pokémon", () => {
    let state = createWildDuel({
      seed: 1,
      player: { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
      wildSpecies: "pidgey",
      wildLevel: 3,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const wild = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === wild.id ? { ...unit, hp: 1 } : unit,
      ),
    };
    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: player.id,
      itemId: "poke-ball",
      targetId: wild.id,
    });
    expect(result.accepted).toBe(true);
    expect(result.state.items["poke-ball"]).toBe(2);
    expect(result.state.captureResult).not.toBeNull();
    expect(result.state.status).toBe("finished");
    expect(result.presentation?.kind).toBe("capture");
  });

  it("requires 50% HP or less before capture", () => {
    let state = createWildDuel({
      seed: 4,
      player: { species: "squirtle", level: 5, moves: ["tackle", "tail-whip"] },
      wildSpecies: "rattata",
      wildLevel: 3,
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const wild = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, hp: Math.floor(unit.maxHp * 0.51) + 1 }
          : unit,
      ),
    };
    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: player.id,
      itemId: "poke-ball",
      targetId: wild.id,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("capture-hp-too-high");
    expect(result.state.items["poke-ball"]).toBe(3);
  });
});


describe("trainer team battles", () => {
  it("deploys up to six Pokémon for both trainer teams", () => {
    const state = createTrainerDuel({
      seed: 777,
      width: 13,
      height: 7,
      trainerName: "Ace Trainer",
      players: [
        { species: "bulbasaur", level: 8, moves: ["tackle", "vine-whip"] },
        { species: "pidgey", level: 6, moves: ["tackle", "growl"] },
        { species: "rattata", level: 6, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 7, moves: ["tackle", "growl"] },
        { species: "rattata", level: 7, moves: ["tackle", "tail-whip"] },
        { species: "squirtle", level: 8, moves: ["tackle", "water-gun"] },
      ],
      rivals: [
        { species: "charmander", level: 8, moves: ["scratch", "ember"] },
        { species: "pidgey", level: 6, moves: ["tackle", "growl"] },
        { species: "rattata", level: 6, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 7, moves: ["tackle", "growl"] },
        { species: "rattata", level: 7, moves: ["tackle", "tail-whip"] },
        { species: "bulbasaur", level: 8, moves: ["tackle", "vine-whip"] },
      ],
    });

    expect(
      state.units.filter((unit) => unit.side === "player"),
    ).toHaveLength(6);
    expect(
      state.units.filter((unit) => unit.side === "rival"),
    ).toHaveLength(6);
    expect(state.turnOrder).toHaveLength(12);
    expect(
      new Set(
        state.units.map(
          (unit) => `${unit.position.x},${unit.position.y}`,
        ),
      ).size,
    ).toBe(12);
  });

  it("does not end a trainer battle until the whole rival team faints", () => {
    let state = createTrainerDuel({
      seed: 778,
      width: 9,
      height: 7,
      players: [
        { species: "charmander", level: 10, moves: ["scratch", "ember"] },
      ],
      rivals: [
        { species: "pidgey", level: 3, moves: ["tackle", "growl"] },
        { species: "rattata", level: 3, moves: ["tackle", "tail-whip"] },
      ],
    });

    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rivals = state.units.filter(
      (unit) => unit.side === "rival",
    );

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, position: { x: 3, y: 3 } }
          : unit.id === rivals[0].id
            ? { ...unit, hp: 1, position: { x: 4, y: 3 } }
            : unit.id === rivals[1].id
              ? { ...unit, position: { x: 7, y: 5 } }
              : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "scratch",
      targetId: rivals[0].id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === rivals[0].id,
      )?.hp,
    ).toBe(0);
    expect(
      result.state.units.find(
        (unit) => unit.id === rivals[1].id,
      )?.hp,
    ).toBeGreaterThan(0);
    expect(result.state.status).toBe("active");
    expect(result.state.winner).toBeNull();
  });

  it("caps oversized trainer teams at six Pokémon per side", () => {
    const seven = Array.from({ length: 7 }, (_, index) => ({
      species: index % 2 === 0 ? "pidgey" as const : "rattata" as const,
      level: 5,
      moves: index % 2 === 0
        ? ["tackle", "growl"] as const
        : ["tackle", "tail-whip"] as const,
    }));

    const state = createTrainerDuel({
      seed: 779,
      width: 13,
      height: 7,
      players: seven.map((pokemon) => ({
        ...pokemon,
        moves: [...pokemon.moves],
      })),
      rivals: seven.map((pokemon) => ({
        ...pokemon,
        moves: [...pokemon.moves],
      })),
    });

    expect(
      state.units.filter((unit) => unit.side === "player"),
    ).toHaveLength(6);
    expect(
      state.units.filter((unit) => unit.side === "rival"),
    ).toHaveLength(6);
  });
});

describe("multi-unit party battles", () => {
  it("deploys every party member up to six on unique cells", () => {
    const state = createWildDuel({
      seed: 2027,
      width: 13,
      height: 7,
      players: [
        { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
        { species: "pidgey", level: 3, moves: ["tackle", "growl"] },
        { species: "rattata", level: 3, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 4, moves: ["tackle", "growl"] },
        { species: "rattata", level: 4, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 5, moves: ["tackle", "growl"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 4,
    });

    const players = state.units.filter((unit) => unit.side === "player");
    expect(players).toHaveLength(6);
    expect(new Set(players.map((unit) => unit.id)).size).toBe(6);
    expect(
      new Set(
        state.units.map(
          (unit) => `${unit.position.x},${unit.position.y}`,
        ),
      ).size,
    ).toBe(state.units.length);
    expect(state.turnOrder).toHaveLength(7);
  });

  it("cycles initiative through every living unit by speed", () => {
    let state = createWildDuel({
      seed: 44,
      width: 13,
      height: 7,
      players: [
        { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
        { species: "pidgey", level: 4, moves: ["tackle", "growl"] },
        { species: "rattata", level: 4, moves: ["tackle", "tail-whip"] },
      ],
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const firstRound = state.round;
    const seen: string[] = [];

    for (let index = 0; index < state.turnOrder.length; index += 1) {
      const active = getActiveDuelUnit(state)!;
      seen.push(active.id);
      const result = applyDuelAction(state, {
        kind: "end-turn",
        unitId: active.id,
      });
      expect(result.accepted).toBe(true);
      state = result.state;
    }

    expect(new Set(seen)).toEqual(new Set(state.turnOrder));
    expect(state.round).toBe(firstRound + 1);
  });

  it("keeps battle active when one ally faints but teammates remain", () => {
    let state = createWildDuel({
      seed: 91,
      width: 9,
      height: 7,
      players: [
        { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
        { species: "pidgey", level: 3, moves: ["tackle", "growl"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 5,
    });

    const wild = state.units.find((unit) => unit.side === "rival")!;
    const targets = state.units.filter((unit) => unit.side === "player");
    const target = targets[0];
    const teammate = targets[1];

    state = {
      ...state,
      activeUnitId: wild.id,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, position: { x: 3, y: 3 } }
          : unit.id === target.id
            ? { ...unit, hp: 1, position: { x: 4, y: 3 } }
            : unit.id === teammate.id
              ? { ...unit, position: { x: 1, y: 1 } }
              : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: wild.id,
      moveId: "tackle",
      targetId: target.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(0);
    expect(
      result.state.units.find((unit) => unit.id === teammate.id)?.hp,
    ).toBeGreaterThan(0);
    expect(result.state.status).toBe("active");
    expect(result.state.winner).toBeNull();
  });

  it("disables capture when all six party slots are occupied", () => {
    const state = createWildDuel({
      seed: 88,
      width: 13,
      height: 7,
      captureAllowed: false,
      players: [
        { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
        { species: "pidgey", level: 2, moves: ["tackle", "growl"] },
        { species: "rattata", level: 2, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 3, moves: ["tackle", "growl"] },
        { species: "rattata", level: 3, moves: ["tackle", "tail-whip"] },
        { species: "pidgey", level: 4, moves: ["tackle", "growl"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 3,
    });

    expect(state.items["poke-ball"]).toBe(0);
    expect(state.captureAllowed).toBe(false);
  });
});


describe("persistent battle inventory", () => {
  it("starts from the supplied inventory and consumes that exact balance", () => {
    let state = createWildDuel({
      seed: 314,
      players: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle", "growl"],
        },
      ],
      items: {
        potion: 4,
        "poke-ball": 2,
      },
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    state = {
      ...state,
      activeUnitId: player.id,
      items: { ...state.items },
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              hp: Math.max(1, unit.maxHp - 5),
            }
          : unit,
      ),
    };

    expect(state.items).toEqual({
      potion: 4,
      "poke-ball": 2,
    });

    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: player.id,
      itemId: "potion",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.items).toEqual({
      potion: 3,
      "poke-ball": 2,
    });
  });

  it("keeps Poké Balls in trainer battles without allowing capture", () => {
    const state = createStarterDuel("bulbasaur", {
      items: {
        potion: 2,
        "poke-ball": 5,
      },
    });

    expect(state.items).toEqual({
      potion: 2,
      "poke-ball": 5,
    });
    expect(state.captureAllowed).toBe(false);
  });
});
