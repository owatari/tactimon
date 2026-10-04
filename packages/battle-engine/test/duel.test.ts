import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  calculateDuelPokemonMaxHp,
  createStarterDuel,
  createTrainerDuel,
  createWildDuel,
  DUEL_MOVES,
  getActiveDuelUnit,
  getDuelCaptureEligibility,
  getReachableCells,
  isDuelAutoCatchTarget,
  manhattanDistance,
  movementPointsForDuelPokemon,
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


describe("persistent battle health", () => {
  it("starts a deployed Pokémon from its persisted HP", () => {
    const build = {
      species: "bulbasaur" as const,
      level: 5,
      moves: ["tackle", "growl"] as const,
      currentHp: 7,
    };

    const state = createWildDuel({
      seed: 404,
      players: [
        {
          ...build,
          moves: [...build.moves],
        },
      ],
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;

    expect(player.hp).toBe(7);
    expect(player.maxHp).toBe(
      calculateDuelPokemonMaxHp(build),
    );
  });

  it("clamps persisted HP to the calculated maximum", () => {
    const state = createWildDuel({
      seed: 405,
      players: [
        {
          species: "rattata",
          level: 4,
          moves: ["tackle", "tail-whip"],
          currentHp: 99_999,
        },
      ],
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;

    expect(player.hp).toBe(player.maxHp);
  });
});


describe("Route 2 bug Pokémon", () => {
  it("creates Caterpie and Weedle with their FireRed starting moves", () => {
    const caterpie = createWildDuel({
      seed: 901,
      player: {
        species: "bulbasaur",
        level: 5,
        moves: ["tackle", "growl"],
      },
      wildSpecies: "caterpie",
      wildLevel: 4,
    });
    const caterpieUnit = caterpie.units.find(
      (unit) => unit.side === "rival",
    )!;
    expect(caterpieUnit.displayName).toBe("Caterpie");
    expect(caterpieUnit.type).toBe("bug");
    expect(caterpieUnit.moves).toEqual([
      "tackle",
      "string-shot",
    ]);

    const weedle = createWildDuel({
      seed: 902,
      player: {
        species: "squirtle",
        level: 5,
        moves: ["tackle", "tail-whip"],
      },
      wildSpecies: "weedle",
      wildLevel: 4,
    });
    const weedleUnit = weedle.units.find(
      (unit) => unit.side === "rival",
    )!;
    expect(weedleUnit.displayName).toBe("Weedle");
    expect(weedleUnit.moves).toEqual([
      "poison-sting",
      "string-shot",
    ]);
  });

  it("applies String Shot as a Speed stage reduction", () => {
    let state = createWildDuel({
      seed: 903,
      player: {
        species: "caterpie",
        level: 5,
        moves: ["tackle", "string-shot"],
      },
      wildSpecies: "weedle",
      wildLevel: 4,
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

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "string-shot",
      targetId: wild.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === wild.id,
      )?.speedStage,
    ).toBe(-1);
    if (result.presentation?.kind === "move") {
      expect(
        result.presentation.results[0].statChanges,
      ).toEqual([{ stat: "speed", delta: -1 }]);
    }
  });
});


describe("dynamic Speed initiative", () => {
  it("recalculates turn order at the start of the next round", () => {
    let state = createWildDuel({
      seed: 904,
      player: {
        species: "caterpie",
        level: 5,
        moves: ["tackle", "string-shot"],
      },
      wildSpecies: "weedle",
      wildLevel: 6,
    });

    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(wild.speed).toBeGreaterThan(player.speed);
    expect(state.turnOrder[0]).toBe(wild.id);

    state = {
      ...state,
      activeUnitId: wild.id,
      turnIndex: 0,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, speedStage: 2 }
          : unit,
      ),
    };

    const firstEnd = applyDuelAction(state, {
      kind: "end-turn",
      unitId: wild.id,
    });

    expect(firstEnd.accepted).toBe(true);
    expect(
      getActiveDuelUnit(firstEnd.state)?.id,
    ).toBe(player.id);

    const secondEnd = applyDuelAction(
      firstEnd.state,
      {
        kind: "end-turn",
        unitId: player.id,
      },
    );

    expect(secondEnd.accepted).toBe(true);
    expect(secondEnd.state.round).toBe(2);
    expect(secondEnd.state.turnOrder[0]).toBe(
      player.id,
    );
    expect(
      getActiveDuelUnit(secondEnd.state)?.id,
    ).toBe(player.id);
  });
});


describe("Route 22 Pokémon", () => {
  it("creates Spearow with Peck and Growl", () => {
    const state = createWildDuel({
      seed: 921,
      player: {
        species: "bulbasaur",
        level: 5,
        moves: ["tackle", "growl"],
      },
      wildSpecies: "spearow",
      wildLevel: 5,
    });
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(wild.displayName).toBe("Spearow");
    expect(wild.type).toBe("flying");
    expect(wild.moves).toEqual(["peck", "growl"]);
  });

  it("creates Mankey with Scratch and Leer", () => {
    const state = createWildDuel({
      seed: 922,
      player: {
        species: "charmander",
        level: 5,
        moves: ["scratch", "growl"],
      },
      wildSpecies: "mankey",
      wildLevel: 5,
    });
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(wild.displayName).toBe("Mankey");
    expect(wild.type).toBe("fighting");
    expect(wild.moves).toEqual(["scratch", "leer"]);
  });
});


describe("Viridian Forest self-target moves", () => {
  it("lets Harden raise the user's own Defense", () => {
    let state = createWildDuel({
      seed: 930,
      player: {
        species: "metapod",
        level: 5,
        moves: ["harden"],
      },
      wildSpecies: "caterpie",
      wildLevel: 4,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    state = { ...state, activeUnitId: player.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "harden",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === player.id,
      )?.defenseStage,
    ).toBe(1);
  });

  it("lets status-only cocoon AI use Harden and finish its turn", () => {
    let state = createWildDuel({
      seed: 931,
      player: {
        species: "bulbasaur",
        level: 5,
        moves: ["tackle", "growl"],
      },
      wildSpecies: "kakuna",
      wildLevel: 5,
    });
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = { ...state, activeUnitId: wild.id };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );

    expect(
      turn.state.units.find(
        (unit) => unit.id === wild.id,
      )?.defenseStage,
    ).toBe(1);
    expect(
      turn.steps.some(
        (step) =>
          step.presentation?.kind === "move" &&
          step.presentation.moveId === "harden",
      ),
    ).toBe(true);
  });
});


describe("tactical AI and move ranges", () => {
  it("lets every enemy-targeting offensive move hit from range 1", () => {
    for (const move of Object.values(DUEL_MOVES)) {
      if (
        move.targeting === "single-enemy" &&
        move.category !== "status"
      ) {
        expect(move.minRange).toBe(1);
      }
    }
  });

  it("walks around a nearby resistant target to exploit a better matchup", () => {
    let state = createTrainerDuel({
      seed: 404,
      width: 9,
      height: 5,
      players: [
        {
          species: "pidgey",
          level: 5,
          moves: ["tackle"],
        },
        {
          species: "squirtle",
          level: 5,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["growl", "vine-whip"],
        },
      ],
    });

    const actor = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const pidgey = state.units.find(
      (unit) => unit.species === "pidgey",
    )!;
    const squirtle = state.units.find(
      (unit) => unit.species === "squirtle",
    )!;

    state = {
      ...state,
      activeUnitId: actor.id,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              position: { x: 0, y: 2 },
              ap: 6,
              mp: 3,
            }
          : unit.id === pidgey.id
            ? {
                ...unit,
                position: { x: 1, y: 2 },
              }
            : unit.id === squirtle.id
              ? {
                  ...unit,
                  position: { x: 3, y: 2 },
                }
              : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const attack = turn.steps.find(
      (step) =>
        step.presentation?.kind === "move" &&
        step.presentation.moveId === "vine-whip",
    );

    expect(
      turn.steps.some(
        (step) =>
          step.presentation?.kind === "movement",
      ),
    ).toBe(true);
    expect(
      attack?.presentation?.kind === "move"
        ? attack.presentation.targetIds[0]
        : null,
    ).toBe(squirtle.id);
  });

  it("does not repeatedly spend a turn stacking status moves", () => {
    let state = createWildDuel({
      seed: 405,
      player: {
        species: "bulbasaur",
        level: 5,
        moves: ["tackle"],
      },
      wildSpecies: "kakuna",
      wildLevel: 5,
    });
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: wild.id,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, ap: 6 }
          : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const hardens = turn.steps.filter(
      (step) =>
        step.presentation?.kind === "move" &&
        step.presentation.moveId === "harden",
    );

    expect(hardens).toHaveLength(1);
  });
});


describe("move PP", () => {
  it("consumes PP and rejects a move after its PP reaches zero", () => {
    let state = createTrainerDuel({
      seed: 501,
      width: 5,
      height: 5,
      players: [{
        species: "bulbasaur",
        level: 5,
        moves: ["tackle"],
        movePp: { tackle: 1 },
      }],
      rivals: [{
        species: "charmander",
        level: 5,
        moves: ["scratch"],
      }],
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, ap: 8, position: { x: 1, y: 1 } }
          : { ...unit, position: { x: 2, y: 1 } },
      ),
    };

    const first = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "tackle",
      targetId: rival.id,
    });
    expect(first.accepted).toBe(true);
    expect(first.state.units.find(
      (unit) => unit.id === player.id,
    )?.movePp.tackle).toBe(0);

    const second = applyDuelAction(first.state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "tackle",
      targetId: rival.id,
    });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("no-pp");
  });

  it("uses Struggle instead of softlocking AI when every move is empty", () => {
    let state = createTrainerDuel({
      seed: 502,
      width: 5,
      height: 5,
      players: [{
        species: "bulbasaur",
        level: 5,
        moves: ["tackle"],
      }],
      rivals: [{
        species: "pidgey",
        level: 5,
        moves: ["tackle"],
        movePp: { tackle: 0 },
      }],
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? { ...unit, position: { x: 1, y: 1 } }
          : unit.id === player.id
            ? { ...unit, position: { x: 2, y: 1 } }
            : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(state, "rival");

    expect(turn.steps.some(
      (step) =>
        step.presentation?.kind === "move" &&
        step.presentation.moveId === "struggle",
    )).toBe(true);
  });
});


describe("defeated unit cleanup rules", () => {
  it("does not let a fainted unit block tiles, receive turns, or be targeted", () => {
    let state = createTrainerDuel({
      seed: 601,
      width: 6,
      height: 4,
      players: [{
        species: "bulbasaur",
        level: 5,
        moves: ["tackle"],
      }],
      rivals: [
        {
          species: "pidgey",
          level: 5,
          moves: ["tackle"],
        },
        {
          species: "rattata",
          level: 5,
          moves: ["tackle"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const fainted = state.units.find(
      (unit) => unit.species === "pidgey",
    )!;
    const survivor = state.units.find(
      (unit) => unit.species === "rattata",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      turnOrder: [player.id, fainted.id, survivor.id],
      turnIndex: 0,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 0, y: 1 },
              mp: 3,
            }
          : unit.id === fainted.id
            ? {
                ...unit,
                hp: 0,
                position: { x: 1, y: 1 },
              }
            : {
                ...unit,
                position: { x: 4, y: 1 },
              },
      ),
    };

    expect(
      getReachableCells(state, player.id),
    ).toContainEqual({ x: 1, y: 1 });

    const rejected = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "tackle",
      targetId: fainted.id,
    });
    expect(rejected.accepted).toBe(false);

    const ended = applyDuelAction(state, {
      kind: "end-turn",
      unitId: player.id,
    });
    expect(ended.accepted).toBe(true);
    expect(
      getActiveDuelUnit(ended.state)?.id,
    ).toBe(survivor.id);
  });
});


describe("AI utility planning", () => {
  it("walks farther for a damaging attack instead of camping on a ranged debuff", () => {
    let state = createTrainerDuel({
      seed: 701,
      width: 7,
      height: 3,
      players: [{
        species: "bulbasaur",
        level: 5,
        moves: ["tackle"],
      }],
      rivals: [{
        species: "rattata",
        level: 5,
        moves: ["tackle", "tail-whip"],
      }],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              position: { x: 0, y: 1 },
              mp: 3,
              ap: 6,
            }
          : {
              ...unit,
              position: { x: 4, y: 1 },
            },
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const usedMoves = turn.steps
      .filter(
        (step) =>
          step.presentation?.kind === "move",
      )
      .map((step) =>
        step.presentation?.kind === "move"
          ? step.presentation.moveId
          : null,
      );

    expect(
      turn.steps.some(
        (step) =>
          step.presentation?.kind === "movement",
      ),
    ).toBe(true);
    expect(usedMoves[0]).toBe("tackle");
    expect(usedMoves).not.toContain("tail-whip");

    const finalRival = turn.state.units.find(
      (unit) => unit.id === rival.id,
    )!;
    expect(finalRival.ap).toBe(2);
  });
});


describe("Cerulean Gym battle moves", () => {
  it("lets Recover restore half max HP without exceeding full HP", () => {
    let state = createTrainerDuel({
      seed: 1201,
      players: [
        {
          species: "staryu",
          level: 18,
          moves: ["recover", "water-pulse"],
        },
      ],
      rivals: [
        {
          species: "geodude",
          level: 12,
          moves: ["tackle"],
        },
      ],
      trainerName: "Misty",
    });

    const staryu = state.units.find(
      (unit) => unit.species === "staryu",
    )!;
    state = {
      ...state,
      activeUnitId: staryu.id,
      units: state.units.map((unit) =>
        unit.id === staryu.id
          ? { ...unit, hp: Math.max(1, unit.maxHp - 12) }
          : unit,
      ),
    };
    const before = state.units.find(
      (unit) => unit.id === staryu.id,
    )!;

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: staryu.id,
      moveId: "recover",
      targetId: staryu.id,
    });

    expect(result.accepted).toBe(true);
    const after = result.state.units.find(
      (unit) => unit.id === staryu.id,
    )!;
    expect(after.hp).toBe(
      Math.min(
        before.maxHp,
        before.hp + Math.max(1, Math.floor(before.maxHp / 2)),
      ),
    );
  });

  it("makes Water Pulse strongly effective against Rock/Ground", () => {
    let state = createTrainerDuel({
      seed: 1202,
      width: 9,
      height: 7,
      players: [
        {
          species: "staryu",
          level: 18,
          moves: ["water-pulse"],
        },
      ],
      rivals: [
        {
          species: "geodude",
          level: 12,
          moves: ["tackle"],
        },
      ],
    });

    const staryu = state.units.find(
      (unit) => unit.species === "staryu",
    )!;
    const geodude = state.units.find(
      (unit) => unit.species === "geodude",
    )!;
    staryu.position = { x: 2, y: 2 };
    geodude.position = { x: 5, y: 2 };
    state = { ...state, activeUnitId: staryu.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: staryu.id,
      moveId: "water-pulse",
      targetId: geodude.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind === "move") {
      expect(
        result.presentation.results[0].typeEffectiveness,
      ).toBe(4);
      expect(result.presentation.results[0].damage).toBeGreaterThan(0);
    }
  });
});


describe("Cerulean rival moves", () => {
  it("keeps trainer Teleport in battle and logs the failed escape", () => {
    let state = createTrainerDuel({
      seed: 1301,
      players: [
        {
          species: "abra",
          level: 16,
          moves: ["teleport"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 15,
          moves: ["tackle"],
        },
      ],
    });

    const abra = state.units.find(
      (unit) => unit.species === "abra",
    )!;
    state = { ...state, activeUnitId: abra.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: abra.id,
      moveId: "teleport",
      targetId: abra.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.escaped).toBe(false);
    expect(result.state.status).toBe("active");
    expect(
      result.state.log.some((entry) =>
        entry.includes("não pode fugir de uma batalha de Treinador"),
      ),
    ).toBe(true);
  });

  it("models Withdraw as a self Defense boost", () => {
    let state = createTrainerDuel({
      seed: 1302,
      players: [
        {
          species: "squirtle",
          level: 18,
          moves: ["withdraw"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 15,
          moves: ["tackle"],
        },
      ],
    });

    const squirtle = state.units.find(
      (unit) => unit.species === "squirtle",
    )!;
    state = { ...state, activeUnitId: squirtle.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: squirtle.id,
      moveId: "withdraw",
      targetId: squirtle.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find((unit) => unit.id === squirtle.id)
        ?.defenseStage,
    ).toBe(1);
  });
});


describe("Route 24 wild mechanics", () => {
  it("lets wild Abra escape with Teleport and records who fled", () => {
    let state = createWildDuel({
      seed: 1401,
      players: [
        {
          species: "pidgey",
          level: 11,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "abra",
      wildLevel: 10,
    });

    const abra = state.units.find(
      (unit) => unit.species === "abra",
    )!;
    state = { ...state, activeUnitId: abra.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: abra.id,
      moveId: "teleport",
      targetId: abra.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.status).toBe("finished");
    expect(result.state.escaped).toBe(true);
    expect(result.state.escapedBy).toBe("rival");
    expect(result.state.winner).toBeNull();
  });

  it("still makes Teleport fail in trainer battles", () => {
    let state = createTrainerDuel({
      seed: 1402,
      players: [
        {
          species: "abra",
          level: 16,
          moves: ["teleport"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 15,
          moves: ["tackle"],
        },
      ],
    });

    const abra = state.units.find(
      (unit) => unit.species === "abra",
    )!;
    state = { ...state, activeUnitId: abra.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: abra.id,
      moveId: "teleport",
      targetId: abra.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.escaped).toBe(false);
    expect(result.state.escapedBy).toBeNull();
    expect(result.state.status).toBe("active");
  });

  it("heals Absorb's user for half the damage dealt", () => {
    let state = createTrainerDuel({
      seed: 1403,
      width: 9,
      height: 7,
      players: [
        {
          species: "oddish",
          level: 12,
          moves: ["absorb"],
        },
      ],
      rivals: [
        {
          species: "geodude",
          level: 12,
          moves: ["tackle"],
        },
      ],
    });

    const oddish = state.units.find(
      (unit) => unit.species === "oddish",
    )!;
    const geodude = state.units.find(
      (unit) => unit.species === "geodude",
    )!;
    oddish.position = { x: 2, y: 2 };
    geodude.position = { x: 4, y: 2 };
    oddish.hp = Math.max(1, oddish.maxHp - 10);
    state = { ...state, activeUnitId: oddish.id };
    const hpBefore = oddish.hp;

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: oddish.id,
      moveId: "absorb",
      targetId: geodude.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind !== "move") {
      throw new Error("Expected move presentation");
    }

    const damage = result.presentation.results[0].damage;
    const healedOddish = result.state.units.find(
      (unit) => unit.id === oddish.id,
    )!;
    expect(healedOddish.hp).toBe(
      Math.min(
        healedOddish.maxHp,
        hpBefore + Math.max(1, Math.floor(damage / 2)),
      ),
    );
  });
});


describe("Vermilion Gym move mechanics", () => {
  it("makes Sonic Boom deal exactly 20 damage when the target is not immune", () => {
    let state = createTrainerDuel({
      seed: 1501,
      players: [
        {
          species: "voltorb",
          level: 21,
          moves: ["sonic-boom"],
        },
      ],
      rivals: [
        {
          species: "pikachu",
          level: 18,
          moves: ["quick-attack"],
        },
      ],
    });

    const voltorb = state.units.find(
      (unit) => unit.species === "voltorb",
    )!;
    const pikachu = state.units.find(
      (unit) => unit.species === "pikachu",
    )!;
    voltorb.position = { x: 2, y: 2 };
    pikachu.position = { x: 4, y: 2 };
    state = { ...state, activeUnitId: voltorb.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: voltorb.id,
      moveId: "sonic-boom",
      targetId: pikachu.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind !== "move") {
      throw new Error("Expected move presentation");
    }
    expect(result.presentation.results[0].damage).toBe(20);
  });

  it("makes Screech lower Defense by two stages", () => {
    let state = createTrainerDuel({
      seed: 1502,
      players: [
        {
          species: "voltorb",
          level: 21,
          moves: ["screech"],
        },
      ],
      rivals: [
        {
          species: "pikachu",
          level: 18,
          moves: ["quick-attack"],
        },
      ],
    });

    const voltorb = state.units.find(
      (unit) => unit.species === "voltorb",
    )!;
    const pikachu = state.units.find(
      (unit) => unit.species === "pikachu",
    )!;
    voltorb.position = { x: 2, y: 2 };
    pikachu.position = { x: 4, y: 2 };
    state = { ...state, activeUnitId: voltorb.id };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: voltorb.id,
      moveId: "screech",
      targetId: pikachu.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === pikachu.id,
      )?.defenseStage,
    ).toBe(-2);
  });
});


describe("sequential tactical AI decisions", () => {
  it("can attack first, then move, then attack another target", () => {
    let state = createTrainerDuel({
      seed: 1601,
      width: 10,
      height: 5,
      players: [
        {
          species: "pidgey",
          level: 5,
          moves: ["tackle"],
        },
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "charmander",
          level: 8,
          moves: ["scratch", "ember"],
        },
      ],
    });

    const actor = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const pidgey = state.units.find(
      (unit) => unit.species === "pidgey",
    )!;
    const bulbasaur = state.units.find(
      (unit) => unit.species === "bulbasaur",
    )!;

    state = {
      ...state,
      activeUnitId: actor.id,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
              ap: 6,
              mp: 4,
            }
          : unit.id === pidgey.id
            ? {
                ...unit,
                hp: 1,
                position: { x: 3, y: 2 },
              }
            : unit.id === bulbasaur.id
              ? {
                  ...unit,
                  position: { x: 7, y: 2 },
                }
              : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const presentations = turn.steps
      .map((step) => step.presentation)
      .filter(Boolean);

    const firstAttackIndex = presentations.findIndex(
      (presentation) =>
        presentation?.kind === "move",
    );
    const movementAfterAttackIndex =
      presentations.findIndex(
        (presentation, index) =>
          index > firstAttackIndex &&
          presentation?.kind === "movement",
      );

    expect(firstAttackIndex).toBeGreaterThanOrEqual(0);
    expect(movementAfterAttackIndex).toBeGreaterThan(
      firstAttackIndex,
    );
  });

  it("can move first and immediately attack from the new position", () => {
    let state = createTrainerDuel({
      seed: 1602,
      width: 10,
      height: 5,
      players: [
        {
          species: "squirtle",
          level: 6,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "bulbasaur",
          level: 6,
          moves: ["vine-whip"],
        },
      ],
    });

    const actor = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "player",
    )!;

    state = {
      ...state,
      activeUnitId: actor.id,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              position: { x: 1, y: 2 },
              ap: 6,
              mp: 4,
            }
          : unit.id === target.id
            ? {
                ...unit,
                position: { x: 6, y: 2 },
              }
            : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "movement",
    );
    expect(
      turn.steps.some(
        (step) =>
          step.presentation?.kind === "move" &&
          step.presentation.targetIds[0] === target.id,
      ),
    ).toBe(true);
  });

  it("lets player Auto Battle spend a Potion on a threatened ally", () => {
    let state = createWildDuel({
      seed: 1603,
      items: {
        potion: 2,
        "poke-ball": 0,
      },
      players: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "pidgey",
      wildLevel: 5,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              hp: Math.max(
                1,
                Math.floor(unit.maxHp * 0.25),
              ),
            }
          : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "player",
      { useItems: true },
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "item",
    );
    expect(turn.state.items.potion).toBe(1);
  });

  it("can auto-catch an eligible low-HP wild target without full Auto Battle", () => {
    let state = createWildDuel({
      seed: 1604,
      items: {
        potion: 0,
        "poke-ball": 2,
      },
      players: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "rattata",
      wildLevel: 3,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, hp: 1 }
          : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "player",
      { autoCapture: true },
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "capture",
    );
    expect(turn.state.items["poke-ball"]).toBe(1);
    expect(turn.state.status).toBe("finished");
  });
});


describe("rival battle inventory", () => {
  it("lets rival AI heal from its own bag without consuming player items", () => {
    let state = createTrainerDuel({
      seed: 1701,
      items: {
        potion: 4,
        "poke-ball": 3,
      },
      rivalItems: {
        potion: 1,
        "poke-ball": 0,
      },
      players: [
        {
          species: "bulbasaur",
          level: 6,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "charmander",
          level: 6,
          moves: ["scratch"],
        },
      ],
    });

    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              hp: Math.max(
                1,
                Math.floor(unit.maxHp * 0.25),
              ),
            }
          : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
      { useItems: true },
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "item",
    );
    expect(turn.state.rivalItems.potion).toBe(0);
    expect(turn.state.items).toEqual({
      potion: 4,
      "poke-ball": 3,
    });
  });
});


describe("auto catch threshold and item priorities", () => {
  it("treats 30 percent HP as the Auto Catch low-life threshold", () => {
    let state = createWildDuel({
      seed: 1801,
      items: {
        potion: 0,
        "poke-ball": 3,
      },
      players: [
        {
          species: "bulbasaur",
          level: 10,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "rattata",
      wildLevel: 10,
    });
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const lowHp = Math.max(
      1,
      Math.floor(wild.maxHp * 0.3),
    );
    const aboveLowHp = Math.min(
      wild.maxHp - 1,
      lowHp + 1,
    );

    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, hp: lowHp }
          : unit,
      ),
    };
    expect(
      isDuelAutoCatchTarget(state, wild.id),
    ).toBe(true);

    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === wild.id
          ? { ...unit, hp: aboveLowHp }
          : unit,
      ),
    };
    expect(
      isDuelAutoCatchTarget(state, wild.id),
    ).toBe(false);
  });

  it("takes a guaranteed KO instead of spending an emergency Potion", () => {
    let state = createTrainerDuel({
      seed: 1802,
      width: 5,
      height: 5,
      rivalItems: {
        potion: 1,
        "poke-ball": 0,
      },
      players: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "charmander",
          level: 5,
          moves: ["scratch"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              hp: Math.max(
                1,
                Math.floor(unit.maxHp * 0.25),
              ),
              position: { x: 2, y: 2 },
            }
          : unit.id === player.id
            ? {
                ...unit,
                hp: 1,
                position: { x: 3, y: 2 },
              }
            : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
      { useItems: true },
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "move",
    );
    expect(turn.state.rivalItems.potion).toBe(1);
    expect(turn.state.winner).toBe("rival");
  });
});


describe("late rival stage moves", () => {
  it("applies FireRed two-stage stat changes and consumes PP", () => {
    let state = createTrainerDuel({
      seed: 1906,
      width: 7,
      height: 5,
      players: [
        {
          species: "pidgey",
          level: 20,
          moves: [
            "feather-dance",
            "agility",
            "scary-face",
          ],
        },
      ],
      rivals: [
        {
          species: "machop",
          level: 20,
          moves: ["karate-chop"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const featherDance = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "feather-dance",
      targetId: rival.id,
    });
    expect(featherDance.accepted).toBe(true);
    expect(
      featherDance.state.units.find(
        (unit) => unit.id === rival.id,
      )?.attackStage,
    ).toBe(-2);
    expect(
      featherDance.state.units.find(
        (unit) => unit.id === player.id,
      )?.movePp["feather-dance"],
    ).toBe(
      DUEL_MOVES["feather-dance"].maxPp - 1,
    );

    const agility = applyDuelAction(
      featherDance.state,
      {
        kind: "use-move",
        unitId: player.id,
        moveId: "agility",
        targetId: player.id,
      },
    );
    expect(agility.accepted).toBe(true);
    expect(
      agility.state.units.find(
        (unit) => unit.id === player.id,
      )?.speedStage,
    ).toBe(2);

    const scaryFace = applyDuelAction(
      agility.state,
      {
        kind: "use-move",
        unitId: player.id,
        moveId: "scary-face",
        targetId: rival.id,
      },
    );
    expect(scaryFace.accepted).toBe(true);
    expect(
      scaryFace.state.units.find(
        (unit) => unit.id === rival.id,
      )?.speedStage,
    ).toBe(-2);
  });
});


describe("special stat stages", () => {
  it("applies Growth to special damage and respects the stage cap", () => {
    let state = createTrainerDuel({
      seed: 1907,
      width: 7,
      height: 5,
      players: [
        {
          species: "bulbasaur",
          level: 20,
          moves: ["growth", "absorb"],
        },
      ],
      rivals: [
        {
          species: "squirtle",
          level: 20,
          moves: ["tackle"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const baseline = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "absorb",
      targetId: rival.id,
    });
    expect(baseline.accepted).toBe(true);
    expect(baseline.presentation?.kind).toBe("move");
    const baselineDamage =
      baseline.presentation?.kind === "move"
        ? baseline.presentation.results[0].damage
        : 0;

    const growth = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "growth",
      targetId: player.id,
    });
    expect(growth.accepted).toBe(true);
    expect(
      growth.state.units.find(
        (unit) => unit.id === player.id,
      )?.specialAttackStage,
    ).toBe(1);
    if (growth.presentation?.kind === "move") {
      expect(growth.presentation.results[0].statChanges).toEqual([
        { stat: "special-attack", delta: 1 },
      ]);
    }

    const boosted = applyDuelAction(growth.state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "absorb",
      targetId: rival.id,
    });
    expect(boosted.accepted).toBe(true);
    expect(boosted.presentation?.kind).toBe("move");
    const boostedDamage =
      boosted.presentation?.kind === "move"
        ? boosted.presentation.results[0].damage
        : 0;
    expect(boostedDamage).toBeGreaterThan(baselineDamage);

    const cappedState = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              specialAttackStage: 6,
            }
          : unit,
      ),
    };
    const capped = applyDuelAction(cappedState, {
      kind: "use-move",
      unitId: player.id,
      moveId: "growth",
      targetId: player.id,
    });
    expect(capped.accepted).toBe(true);
    expect(
      capped.state.units.find(
        (unit) => unit.id === player.id,
      )?.specialAttackStage,
    ).toBe(6);
    if (capped.presentation?.kind === "move") {
      expect(capped.presentation.results[0].statChanges).toEqual([
        { stat: "special-attack", delta: 0 },
      ]);
    }
  });

  it("uses Special Defense stages when resolving special damage", () => {
    let state = createTrainerDuel({
      seed: 1908,
      width: 7,
      height: 5,
      players: [
        {
          species: "charmander",
          level: 20,
          moves: ["ember"],
        },
      ],
      rivals: [
        {
          species: "bulbasaur",
          level: 20,
          moves: ["tackle"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const baseline = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "ember",
      targetId: rival.id,
    });
    const defended = applyDuelAction(
      {
        ...state,
        units: state.units.map((unit) =>
          unit.id === rival.id
            ? {
                ...unit,
                specialDefenseStage: 2,
              }
            : unit,
        ),
      },
      {
        kind: "use-move",
        unitId: player.id,
        moveId: "ember",
        targetId: rival.id,
      },
    );

    expect(baseline.accepted).toBe(true);
    expect(defended.accepted).toBe(true);
    const baselineDamage =
      baseline.presentation?.kind === "move"
        ? baseline.presentation.results[0].damage
        : 0;
    const defendedDamage =
      defended.presentation?.kind === "move"
        ? defended.presentation.results[0].damage
        : 0;
    expect(defendedDamage).toBeLessThan(baselineDamage);
  });
});


describe("battle movement and deployment scale", () => {
  it("derives MP from species Speed instead of giving every Pokémon 3", () => {
    expect(
      movementPointsForDuelPokemon("slowpoke"),
    ).toBe(2);
    expect(
      movementPointsForDuelPokemon("bulbasaur"),
    ).toBe(3);
    expect(
      movementPointsForDuelPokemon("pikachu"),
    ).toBe(4);
    expect(
      movementPointsForDuelPokemon("kadabra"),
    ).toBe(5);
  });

  it("charges MP by the real path length around obstacles", () => {
    let state = createWildDuel({
      seed: 1904,
      width: 5,
      height: 5,
      players: [
        {
          species: "pikachu",
          level: 10,
          moves: ["thunder-shock"],
        },
      ],
      wildSpecies: "rattata",
      wildLevel: 5,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
      blocked: [{ x: 1, y: 2 }],
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 0, y: 2 },
              mp: 4,
              maxMp: 4,
            }
          : unit.id === wild.id
            ? {
                ...unit,
                position: { x: 4, y: 4 },
              }
            : unit,
      ),
    };

    expect(
      getReachableCells(state, player.id),
    ).toContainEqual({ x: 2, y: 2 });

    const moved = applyDuelAction(state, {
      kind: "move",
      unitId: player.id,
      to: { x: 2, y: 2 },
    });

    expect(moved.accepted).toBe(true);
    expect(moved.presentation).toMatchObject({
      kind: "movement",
      cost: 4,
    });
    expect(
      moved.state.units.find(
        (unit) => unit.id === player.id,
      )?.mp,
    ).toBe(0);
  });

  it("deploys large wild packs with player units on the left and enemies on the right", () => {
    const state = createWildDuel({
      seed: 1901,
      width: 17,
      height: 9,
      players: [
        {
          species: "bulbasaur",
          level: 10,
          moves: ["tackle"],
        },
        {
          species: "pidgey",
          level: 8,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "rattata",
      wildLevel: 5,
      wilds: Array.from(
        { length: 10 },
        (_, index) => ({
          species:
            index % 2 === 0
              ? "rattata" as const
              : "pidgey" as const,
          level: 5,
        }),
      ),
    });

    const players = state.units.filter(
      (unit) => unit.side === "player",
    );
    const rivals = state.units.filter(
      (unit) => unit.side === "rival",
    );

    expect(players).toHaveLength(2);
    expect(rivals).toHaveLength(10);
    expect(
      Math.max(
        ...players.map((unit) => unit.position.x),
      ),
    ).toBeLessThan(state.width / 2);
    expect(
      Math.min(
        ...rivals.map((unit) => unit.position.x),
      ),
    ).toBeGreaterThan(state.width / 2);
  });
});

describe("crowded tactical AI", () => {
  it("advances toward a target even when allies temporarily block the full route", () => {
    let state = createTrainerDuel({
      seed: 1905,
      width: 7,
      height: 3,
      players: [
        {
          species: "squirtle",
          level: 10,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "charmander",
          level: 10,
          moves: ["scratch"],
        },
        {
          species: "pidgey",
          level: 10,
          moves: ["tackle"],
        },
        {
          species: "rattata",
          level: 10,
          moves: ["tackle"],
        },
        {
          species: "bulbasaur",
          level: 10,
          moves: ["tackle"],
        },
      ],
    });
    const target = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const actor = state.units.find(
      (unit) => unit.species === "charmander",
    )!;
    const blockers = state.units.filter(
      (unit) =>
        unit.side === "rival" &&
        unit.id !== actor.id,
    );

    state = {
      ...state,
      activeUnitId: actor.id,
      blocked: [],
      units: state.units.map((unit) => {
        if (unit.id === target.id) {
          return {
            ...unit,
            position: { x: 0, y: 1 },
          };
        }
        if (unit.id === actor.id) {
          return {
            ...unit,
            position: { x: 6, y: 1 },
            mp: 3,
          };
        }

        const blockerIndex = blockers.findIndex(
          (candidate) => candidate.id === unit.id,
        );
        return blockerIndex >= 0
          ? {
              ...unit,
              position: {
                x: 4,
                y: blockerIndex,
              },
            }
          : unit;
      }),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );

    expect(turn.steps[0]?.presentation).toMatchObject({
      kind: "movement",
      actorId: actor.id,
      to: { x: 5, y: 1 },
      cost: 1,
    });
    expect(
      turn.steps.filter(
        (step) =>
          step.presentation?.kind === "movement",
      ),
    ).toHaveLength(1);
  });

  it("acts deterministically in a full 6v10 wild battle", () => {
    let state = createWildDuel({
      seed: 1903,
      width: 17,
      height: 9,
      players: [
        { species: "bulbasaur", level: 10, moves: ["tackle", "vine-whip"] },
        { species: "charmander", level: 10, moves: ["scratch", "ember"] },
        { species: "squirtle", level: 10, moves: ["tackle", "water-gun"] },
        { species: "pidgey", level: 10, moves: ["tackle", "gust"] },
        { species: "rattata", level: 10, moves: ["tackle", "tail-whip"] },
        { species: "pikachu", level: 10, moves: ["thunder-shock", "growl"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 8,
      wilds: Array.from(
        { length: 10 },
        (_, index) => ({
          species:
            index % 2 === 0
              ? "rattata" as const
              : "pidgey" as const,
          level: 8,
        }),
      ),
    });

    const actor = state.units.find(
      (unit) =>
        unit.side === "rival" &&
        getReachableCells(state, unit.id).length > 0,
    );
    expect(actor).toBeDefined();

    state = {
      ...state,
      activeUnitId: actor!.id,
    };

    const first = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const second = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const firstPresentations = first.steps
      .map((step) => step.presentation)
      .filter(Boolean);
    const secondPresentations = second.steps
      .map((step) => step.presentation)
      .filter(Boolean);

    expect(firstPresentations).toEqual(
      secondPresentations,
    );
    expect(
      firstPresentations.some(
        (presentation) =>
          presentation?.kind === "movement" ||
          presentation?.kind === "move",
      ),
    ).toBe(true);
  });
});


describe("multi-wild capture flow", () => {
  it("keeps capture locked until only one wild Pokémon is still standing", () => {
    let state = createWildDuel({
      seed: 1902,
      width: 9,
      height: 7,
      items: {
        potion: 0,
        "poke-ball": 3,
      },
      players: [
        {
          species: "bulbasaur",
          level: 8,
          moves: ["tackle"],
        },
      ],
      wildSpecies: "rattata",
      wildLevel: 5,
      wilds: [
        {
          species: "rattata",
          level: 5,
        },
        {
          species: "pidgey",
          level: 5,
        },
      ],
    });

    const rivals = state.units.filter(
      (unit) => unit.side === "rival",
    );
    expect(
      getDuelCaptureEligibility(
        state,
        rivals[0].id,
      ),
    ).toEqual({
      allowed: false,
      reason: "multiple-wilds",
    });

    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === rivals[0].id
          ? {
              ...unit,
              hp: Math.max(
                1,
                Math.floor(unit.maxHp * 0.2),
              ),
            }
          : unit.id === rivals[1].id
            ? {
                ...unit,
                hp: 0,
              }
            : unit,
      ),
    };

    expect(
      getDuelCaptureEligibility(
        state,
        rivals[0].id,
      ).allowed,
    ).toBe(true);
  });
});
