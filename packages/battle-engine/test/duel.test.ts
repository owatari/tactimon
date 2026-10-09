import { maxActionPointsForSpeed } from "../src/actionCost";
import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  calculateDuelPokemonMaxHp,
  createStarterDuel,
  createTrainerDuel,
  createWildDuel,
  defaultMovesForSpecies,
  DUEL_MOVES,
  getActiveDuelUnit,
  getDuelCaptureEligibility,
  getDuelMoveHitChance,
  getDuelMoveAreaTargetIds,
  getReachableCells,
  isDuelAutoCatchTarget,
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
        openingTiles: 0, // raw spawn layout
        seed,
        width: 13,
        height: 7,
      });
      const [player, rival] = state.units;

      const openingDistance = manhattanDistance(
        player.position,
        rival.position,
      );
      expect(openingDistance).toBeGreaterThanOrEqual(5);
      expect(openingDistance).toBeLessThanOrEqual(8);
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
          manhattanDistance(player.position, cell) <= player.ap,
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


  it("uses an item on an ally for its AP cost without ending the turn", () => {
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
    // The potion is paid in AP (4, the cheapest item) and the same Pokémon may still act.
    const after = result.state.units.find((unit) => unit.id === player.id)!;
    expect(after.ap).toBe(player.ap - 4);
    expect(getActiveDuelUnit(result.state)?.id).toBe(player.id);
    expect(rival.id).not.toBe(player.id);

    const broke = applyDuelAction(
      { ...state, units: state.units.map((unit) => (unit.id === player.id ? { ...unit, ap: 3 } : unit)) },
      { kind: "use-item", unitId: player.id, itemId: "potion", targetId: player.id },
    );
    expect(broke.accepted).toBe(false);
    expect(broke.reason).toBe("not-enough-ap");
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
    const player = state.units.find((unit) => unit.side === "player")!;
    const rival = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, position: { x: 1, y: 3 } }
          : unit.id === rival.id
            ? { ...unit, position: { x: 5, y: 3 } }
            : unit,
      ),
    };

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
  const wildDuel = (seed: number, wildSpecies: "pidgey" | "snorlax" | "rattata", wilds?: { species: "pidgey" | "rattata"; level: number }[]) => {
    const state = createWildDuel({
      seed,
      player: { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
      wildSpecies,
      wildLevel: 3,
      ...(wilds ? { wilds } : {}),
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    return { state: { ...state, activeUnitId: player.id }, player, wilds: state.units.filter((unit) => unit.side === "rival") };
  };
  const throwBall = (state: ReturnType<typeof wildDuel>["state"], playerId: string, targetId: string) =>
    applyDuelAction(state, { kind: "use-item", unitId: playerId, itemId: "poke-ball", targetId });

  it("catches a weakened wild Pokémon: the ball costs 4 AP and the wild leaves the field", () => {
    const { state, player, wilds } = wildDuel(1, "pidgey");
    const weak = { ...state, units: state.units.map((u) => (u.id === wilds[0].id ? { ...u, hp: 1 } : u)) };
    const apBefore = weak.units.find((u) => u.id === player.id)!.ap;
    const result = throwBall(weak, player.id, wilds[0].id);
    expect(result.accepted).toBe(true);
    expect(result.state.items["poke-ball"]).toBe(2);
    expect(result.state.captures).toHaveLength(1);
    expect(result.state.captures[0]).toMatchObject({ species: "pidgey", level: 3 });
    expect(result.state.units.find((u) => u.id === player.id)!.ap).toBe(apBefore - 4);
    expect(result.state.units.find((u) => u.id === wilds[0].id)).toMatchObject({ hp: 0, captured: true });
    expect(result.state.status).toBe("finished");
    expect(result.state.winner).toBe("player");
    expect(result.presentation?.kind).toBe("capture");
  });

  it("can be thrown at full HP; a failed throw keeps the wild Pokémon and the battle going", () => {
    let tried = 0;
    let failure: ReturnType<typeof throwBall> | null = null;
    for (let seed = 1; seed <= 40 && !failure; seed += 1) {
      const { state, player, wilds } = wildDuel(seed, "snorlax");
      const result = throwBall(state, player.id, wilds[0].id);
      expect(result.accepted, `seed ${seed}`).toBe(true);
      expect(result.state.items["poke-ball"]).toBe(2);
      tried += 1;
      if (result.state.captures.length === 0) failure = result;
    }
    expect(tried).toBeGreaterThan(0);
    expect(failure).not.toBeNull();
    expect(failure!.state.status).toBe("active");
    expect(failure!.state.units.find((u) => u.side === "rival")!.hp).toBeGreaterThan(0);
    expect(failure!.state.units.find((u) => u.side === "rival")!.captured).toBeUndefined();
  });

  it("needs 4 AP to throw", () => {
    const { state, player, wilds } = wildDuel(4, "rattata");
    const short = { ...state, units: state.units.map((u) => (u.id === player.id ? { ...u, ap: 3 } : u)) };
    const result = throwBall(short, player.id, wilds[0].id);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("not-enough-ap");
    expect(result.state.items["poke-ball"]).toBe(3);
  });
});

describe("multi-wild capture flow", () => {
  it("every wild Pokémon can be caught; the battle ends only when none is left", () => {
    const state = createWildDuel({
      seed: 1902,
      width: 9,
      height: 7,
      items: { potion: 0, "poke-ball": 5 },
      players: [{ species: "bulbasaur", level: 30, moves: ["tackle"] }],
      wildSpecies: "rattata",
      wildLevel: 5,
      wilds: [
        { species: "rattata", level: 5 },
        { species: "pidgey", level: 5 },
      ],
    });
    const rivals = state.units.filter((unit) => unit.side === "rival");
    expect(getDuelCaptureEligibility(state, rivals[0].id)).toEqual({ allowed: true });
    expect(getDuelCaptureEligibility(state, rivals[1].id)).toEqual({ allowed: true });

    const player = state.units.find((u) => u.side === "player")!;
    const weakened = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((u) => (u.side === "rival" ? { ...u, hp: 1 } : { ...u, ap: 12, maxAp: 12 })),
    };
    const first = applyDuelAction(weakened, { kind: "use-item", unitId: player.id, itemId: "poke-ball", targetId: rivals[0].id });
    expect(first.accepted).toBe(true);
    expect(first.state.captures).toHaveLength(1);
    expect(first.state.status).toBe("active");
    const second = applyDuelAction(first.state, { kind: "use-item", unitId: player.id, itemId: "poke-ball", targetId: rivals[1].id });
    expect(second.accepted).toBe(true);
    expect(second.state.captures.map((c) => c.species)).toEqual(["rattata", "pidgey"]);
    expect(second.state.status).toBe("finished");
    expect(second.state.winner).toBe("player");
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
              ap: 9,
              maxAp: 9,
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
              ap: 9,
              maxAp: 9,
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
              ap: 9,
              maxAp: 9,
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

  it("uses immediate damage instead of wasting tempo on a debuff", () => {
    let state = createTrainerDuel({
      seed: 702,
      width: 7,
      height: 5,
      players: [
        {
          species: "bulbasaur",
          level: 5,
          moves: ["tackle", "growl"],
        },
        {
          species: "pidgey",
          level: 5,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 5,
          moves: ["tackle", "tail-whip"],
        },
      ],
    });
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "player",
    )!;

    state = {
      ...state,
      activeUnitId: rival.id,
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              position: { x: 3, y: 2 },
              ap: 6,
            }
          : unit.id === target.id
            ? {
                ...unit,
                position: { x: 4, y: 2 },
              }
            : {
                ...unit,
                position: { x: 1, y: 4 },
              },
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "rival",
    );
    const firstMove = turn.steps.find(
      (step) => step.presentation?.kind === "move",
    );

    expect(
      firstMove?.presentation?.kind === "move"
        ? firstMove.presentation.moveId
        : null,
    ).toBe("tackle");
  });
});


describe("tactical area moves", () => {
  it("damages every enemy in a Flame Burst explosion without friendly fire", () => {
    let state = createTrainerDuel({
      seed: 703,
      width: 9,
      height: 7,
      players: [
        {
          species: "charmander",
          level: 20,
          moves: ["flame-burst"],
        },
        {
          species: "pidgey",
          level: 10,
          moves: ["tackle"],
        },
      ],
      rivals: [
        {
          species: "caterpie",
          level: 10,
          moves: ["tackle"],
        },
        {
          species: "weedle",
          level: 10,
          moves: ["poison-sting"],
        },
        {
          species: "rattata",
          level: 10,
          moves: ["tackle"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.species === "charmander",
    )!;
    const ally = state.units.find(
      (unit) =>
        unit.side === "player" &&
        unit.id !== actor.id,
    )!;
    const enemies = state.units.filter(
      (unit) => unit.side === "rival",
    );
    const [primary, adjacent, distant] = enemies;

    state = {
      ...state,
      activeUnitId: actor.id,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? { ...unit, position: { x: 1, y: 3 }, ap: 12, maxAp: 12 }
          : unit.id === ally.id
            ? { ...unit, position: { x: 4, y: 2 } }
            : unit.id === primary.id
              ? { ...unit, position: { x: 4, y: 3 } }
              : unit.id === adjacent.id
                ? { ...unit, position: { x: 4, y: 4 } }
                : { ...unit, position: { x: 7, y: 5 } },
      ),
    };

    const allyHp = state.units.find(
      (unit) => unit.id === ally.id,
    )!.hp;
    const distantHp = state.units.find(
      (unit) => unit.id === distant.id,
    )!.hp;
    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "flame-burst",
      targetId: primary.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.presentation?.kind === "move"
        ? result.presentation.targetIds
        : [],
    ).toEqual(
      expect.arrayContaining([
        primary.id,
        adjacent.id,
      ]),
    );
    expect(
      result.state.units.find(
        (unit) => unit.id === primary.id,
      )!.hp,
    ).toBeLessThan(primary.hp);
    expect(
      result.state.units.find(
        (unit) => unit.id === adjacent.id,
      )!.hp,
    ).toBeLessThan(adjacent.hp);
    expect(
      result.state.units.find(
        (unit) => unit.id === distant.id,
      )!.hp,
    ).toBe(distantHp);
    expect(
      result.state.units.find(
        (unit) => unit.id === ally.id,
      )!.hp,
    ).toBe(allyHp);
  });

  it("exposes line, cone and self-radius footprints for tactical previews", () => {
    let state = createTrainerDuel({
      seed: 704,
      width: 9,
      height: 7,
      players: [{
        species: "charizard",
        level: 36,
        moves: ["razor-leaf", "twister", "flame-wheel"],
      }],
      rivals: [
        { species: "pidgey", level: 12, moves: ["tackle"] },
        { species: "rattata", level: 12, moves: ["tackle"] },
        { species: "weedle", level: 12, moves: ["poison-sting"] },
        { species: "caterpie", level: 12, moves: ["tackle"] },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rivals = state.units.filter(
      (unit) => unit.side === "rival",
    );
    const [primary, lineEnemy, coneEnemy, adjacentEnemy] = rivals;
    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? { ...unit, position: { x: 1, y: 3 } }
          : unit.id === primary.id
            ? { ...unit, position: { x: 4, y: 3 } }
            : unit.id === lineEnemy.id
              ? { ...unit, position: { x: 3, y: 3 } }
              : unit.id === coneEnemy.id
                ? { ...unit, position: { x: 3, y: 2 } }
                : { ...unit, position: { x: 1, y: 2 } },
      ),
    };

    expect(
      getDuelMoveAreaTargetIds(
        state,
        actor.id,
        "razor-leaf",
        primary.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        primary.id,
        lineEnemy.id,
      ]),
    );
    expect(
      getDuelMoveAreaTargetIds(
        state,
        actor.id,
        "razor-leaf",
        primary.id,
      ),
    ).not.toContain(coneEnemy.id);

    expect(
      getDuelMoveAreaTargetIds(
        state,
        actor.id,
        "twister",
        primary.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        primary.id,
        lineEnemy.id,
        coneEnemy.id,
      ]),
    );

    expect(
      getDuelMoveAreaTargetIds(
        state,
        actor.id,
        "flame-wheel",
        adjacentEnemy.id,
      ),
    ).toEqual([adjacentEnemy.id]);
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
        entry.includes("can't flee from a Trainer battle"),
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
              ap: 10,
              maxAp: 10,
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
              ap: 10,
              maxAp: 10,
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

  it("prepares an auto-catch with a major status before throwing the ball (healthy target)", () => {
    let state = createWildDuel({
      seed: 1605,
      width: 7,
      height: 5,
      items: {
        potion: 0,
        "poke-ball": 2,
      },
      players: [
        {
          species: "bulbasaur",
          level: 12,
          moves: ["tackle", "sleep-powder"],
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
        unit.id === player.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
            }
          : unit.id === wild.id
            ? {
                ...unit,
                position: { x: 3, y: 2 },
              }
            : unit,
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      state,
      "player",
      { autoCapture: true },
    );

    expect(turn.steps[0]?.presentation?.kind).toBe(
      "move",
    );
    expect(
      turn.steps[0]?.presentation?.kind === "move"
        ? turn.steps[0].presentation.moveId
        : null,
    ).toBe("sleep-powder");
    expect(turn.state.items["poke-ball"]).toBe(2);
  });
});


describe("rival battle inventory", () => {
  it("throws the ball right away when the target is already easy to catch", () => {
    const base = createWildDuel({
      seed: 1606,
      width: 7,
      height: 5,
      items: { potion: 0, "poke-ball": 2 },
      players: [{ species: "bulbasaur", level: 12, moves: ["tackle", "sleep-powder"] }],
      wildSpecies: "rattata",
      wildLevel: 3,
    });
    const player = base.units.find((unit) => unit.side === "player")!;
    const wild = base.units.find((unit) => unit.side === "rival")!;
    const state = {
      ...base,
      activeUnitId: player.id,
      units: base.units.map((unit) =>
        unit.id === player.id
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, hp: 1, position: { x: 3, y: 2 } },
      ),
    };
    const turn = resolveSimpleAiTurnDetailed(state, "player", { autoCapture: true });
    expect(turn.steps[0]?.presentation?.kind).toBe("capture");
    expect(wild.id).toBeDefined();
  });

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
              ...unit, ap: 12, maxAp: 12,
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


describe("late rival psychic mechanics", () => {
  it("raises both special stages with Calm Mind and consumes one PP", () => {
    let state = createTrainerDuel({
      seed: 1909,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["calm-mind", "psychic"],
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["gust"],
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

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "calm-mind",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    const updated = result.state.units.find(
      (unit) => unit.id === player.id,
    )!;
    expect(updated.specialAttackStage).toBe(1);
    expect(updated.specialDefenseStage).toBe(1);
    expect(updated.movePp["calm-mind"]).toBe(
      DUEL_MOVES["calm-mind"].maxPp - 1,
    );
    if (result.presentation?.kind === "move") {
      expect(result.presentation.results[0].statChanges).toEqual([
        { stat: "special-attack", delta: 1 },
        { stat: "special-defense", delta: 1 },
      ]);
    }

    expect(rival.specialDefenseStage).toBe(0);
  });

  it("lets Psychic lower Special Defense through its secondary effect", () => {
    let state = createTrainerDuel({
      seed: 1910,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["psychic"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
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

    const originalChance =
      DUEL_MOVES.psychic.secondaryEffectChance;
    DUEL_MOVES.psychic.secondaryEffectChance = 100;
    try {
      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "psychic",
        targetId: rival.id,
      });

      expect(result.accepted).toBe(true);
      expect(
        result.state.units.find(
          (unit) => unit.id === rival.id,
        )?.specialDefenseStage,
      ).toBe(-1);
      expect(
        result.state.units.find(
          (unit) => unit.id === player.id,
        )?.movePp.psychic,
      ).toBe(DUEL_MOVES.psychic.maxPp - 1);
      if (result.presentation?.kind === "move") {
        expect(
          result.presentation.results[0].damage,
        ).toBeGreaterThan(0);
        expect(
          result.presentation.results[0].statChanges,
        ).toEqual([
          { stat: "special-defense", delta: -1 },
        ]);
      }
    } finally {
      DUEL_MOVES.psychic.secondaryEffectChance =
        originalChance;
    }
  });
});


describe("recoil moves", () => {
  it("charges Take Down recoil from actual HP damage and consumes one PP", () => {
    let state = createTrainerDuel({
      seed: 1911,
      width: 7,
      height: 5,
      players: [
        {
          species: "rhyhorn",
          level: 45,
          moves: ["take-down"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const playerHpBefore = player.hp;
    const rivalHpBefore = rival.hp;

    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id
          ? {
              ...unit, ap: 12, maxAp: 12,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 3, y: 2 },
            },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "take-down",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.presentation?.kind).toBe("move");
    const damage =
      result.presentation?.kind === "move"
        ? result.presentation.results[0].damage
        : 0;
    const expectedRecoil = Math.max(
      1,
      Math.floor(
        Math.min(damage, rivalHpBefore) / 4,
      ),
    );
    const updatedPlayer = result.state.units.find(
      (unit) => unit.id === player.id,
    )!;

    expect(updatedPlayer.hp).toBe(
      playerHpBefore - expectedRecoil,
    );
    expect(updatedPlayer.movePp["take-down"]).toBe(
      DUEL_MOVES["take-down"].maxPp - 1,
    );
  });

  it("lets Take Down recoil faint the attacker and resolve the winner", () => {
    let state = createTrainerDuel({
      seed: 1912,
      width: 7,
      height: 5,
      players: [
        {
          species: "rhyhorn",
          level: 45,
          moves: ["take-down"],
          currentHp: 1,
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
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
              ...unit, ap: 12, maxAp: 12,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 3, y: 2 },
            },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "take-down",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === player.id,
      )?.hp,
    ).toBe(0);
    expect(
      result.state.units.find(
        (unit) => unit.id === rival.id,
      )?.hp,
    ).toBeGreaterThan(0);
    expect(result.state.status).toBe("finished");
    expect(result.state.winner).toBe("rival");
  });
});


describe("canonical late-rival direct moves", () => {
  it("matches FireRed power, PP, type and modeled secondary effects", () => {
    expect(DUEL_MOVES["wing-attack"]).toMatchObject({
      type: "flying",
      category: "physical",
      power: 60,
      maxPp: 35,
    });
    expect(DUEL_MOVES["flame-wheel"]).toMatchObject({
      type: "fire",
      category: "special",
      power: 60,
      maxPp: 25,
      secondaryStatus: "burn",
      secondaryEffectChance: 10,
    });
    expect(DUEL_MOVES.flamethrower).toMatchObject({
      type: "fire",
      category: "special",
      power: 95,
      maxPp: 15,
      secondaryStatus: "burn",
      secondaryEffectChance: 10,
    });
    expect(DUEL_MOVES["hydro-pump"]).toMatchObject({
      type: "water",
      category: "special",
      power: 120,
      maxPp: 5,
    });
    expect(DUEL_MOVES.synthesis).toMatchObject({
      type: "grass",
      category: "status",
      maxPp: 5,
      effect: "synthesis",
    });
  });

  it("heals half max HP with Synthesis in neutral weather", () => {
    let state = createTrainerDuel({
      seed: 1913,
      width: 7,
      height: 5,
      players: [
        {
          species: "venusaur",
          level: 53,
          moves: ["synthesis"],
          currentHp: 10,
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
    };

    const expectedHeal = Math.min(
      Math.max(1, Math.floor(player.maxHp / 2)),
      player.maxHp - player.hp,
    );
    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "synthesis",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    const updated = result.state.units.find(
      (unit) => unit.id === player.id,
    )!;
    expect(updated.hp).toBe(player.hp + expectedHeal);
    expect(updated.movePp.synthesis).toBe(
      DUEL_MOVES.synthesis.maxPp - 1,
    );
  });
});


describe("FireRed multi-hit moves", () => {
  it("gives Rhyhorn its full canonical late-rival moveset", () => {
    expect(defaultMovesForSpecies("rhyhorn")).toEqual([
      "take-down",
      "horn-drill",
      "rock-blast",
      "fury-attack",
    ]);
    expect(DUEL_MOVES["rock-blast"]).toMatchObject({
      type: "rock",
      category: "physical",
      power: 25,
      accuracy: 80,
      maxPp: 10,
      multiHit: "two-to-five",
    });
    expect(DUEL_MOVES["fury-attack"]).toMatchObject({
      power: 15,
      accuracy: 85,
      maxPp: 20,
      multiHit: "two-to-five",
    });
    expect(DUEL_MOVES["icicle-spear"]).toMatchObject({
      power: 10,
      accuracy: 100,
      maxPp: 30,
      multiHit: "two-to-five",
    });
  });

  it("resolves between two and five hits and reports the landed count", () => {
    let state = createTrainerDuel({
      seed: 1927,
      width: 7,
      height: 5,
      players: [
        {
          species: "rhyhorn",
          level: 45,
          moves: ["rock-blast"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
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
          ? { ...unit, ap: 12, maxAp: 12, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const originalAccuracy =
      DUEL_MOVES["rock-blast"].accuracy;
    const originalMultiHit =
      DUEL_MOVES["rock-blast"].multiHit;

    try {
      DUEL_MOVES["rock-blast"].accuracy = 100;
      DUEL_MOVES["rock-blast"].multiHit = undefined;
      const single = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "rock-blast",
        targetId: rival.id,
      });
      const singleDamage =
        single.presentation?.kind === "move"
          ? single.presentation.results[0].damage
          : 0;

      DUEL_MOVES["rock-blast"].multiHit =
        "two-to-five";
      const multi = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "rock-blast",
        targetId: rival.id,
      });
      expect(multi.accepted).toBe(true);
      expect(multi.presentation?.kind).toBe("move");
      if (multi.presentation?.kind === "move") {
        const result = multi.presentation.results[0];
        expect(result.hitCount).toBeGreaterThanOrEqual(2);
        expect(result.hitCount).toBeLessThanOrEqual(5);
        expect(result.damage).toBe(
          singleDamage * (result.hitCount ?? 0),
        );
      }
    } finally {
      DUEL_MOVES["rock-blast"].accuracy =
        originalAccuracy;
      DUEL_MOVES["rock-blast"].multiHit =
        originalMultiHit;
    }
  });
});


describe("Horn Drill OHKO", () => {
  it("uses the FireRed level-gated OHKO chance", () => {
    const state = createTrainerDuel({
      seed: 1924,
      players: [
        {
          species: "rhyhorn",
          level: 45,
          moves: ["horn-drill"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 45,
          moves: ["water-gun"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(DUEL_MOVES["horn-drill"]).toMatchObject({
      type: "normal",
      power: 1,
      accuracy: 30,
      maxPp: 5,
      effect: "ohko",
    });
    expect(
      getDuelMoveHitChance(
        player,
        rival,
        DUEL_MOVES["horn-drill"],
      ),
    ).toBe(29);
    expect(
      getDuelMoveHitChance(
        { ...player, level: 44 },
        rival,
        DUEL_MOVES["horn-drill"],
      ),
    ).toBe(0);
    expect(
      getDuelMoveHitChance(
        { ...player, level: 55 },
        rival,
        DUEL_MOVES["horn-drill"],
      ),
    ).toBe(39);
  });

  it("fails automatically against a higher-level target while spending resources", () => {
    let state = createTrainerDuel({
      seed: 1925,
      width: 7,
      height: 5,
      players: [
        {
          species: "rhyhorn",
          level: 45,
          moves: ["horn-drill"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
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
          ? { ...unit, ap: 12, maxAp: 12, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 3, y: 2 } },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "horn-drill",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    if (result.presentation?.kind === "move") {
      expect(
        result.presentation.results[0].missed,
      ).toBe(true);
    }
    const updatedPlayer = result.state.units.find(
      (unit) => unit.id === player.id,
    )!;
    const updatedRival = result.state.units.find(
      (unit) => unit.id === rival.id,
    )!;
    expect(updatedPlayer.ap).toBe(
      12 - DUEL_MOVES["horn-drill"].apCost,
    );
    expect(updatedPlayer.movePp["horn-drill"]).toBe(
      DUEL_MOVES["horn-drill"].maxPp - 1,
    );
    expect(updatedRival.hp).toBe(rival.hp);
  });

  it("knocks out the target when its OHKO chance reaches 100 percent", () => {
    let state = createTrainerDuel({
      seed: 1926,
      width: 7,
      height: 5,
      players: [
        {
          species: "rhyhorn",
          level: 100,
          moves: ["horn-drill"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 1,
          moves: ["water-gun"],
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
          ? { ...unit, ap: 12, maxAp: 12, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 3, y: 2 } },
      ),
    };

    expect(
      getDuelMoveHitChance(
        player,
        rival,
        DUEL_MOVES["horn-drill"],
      ),
    ).toBe(100);

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "horn-drill",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === rival.id,
      )?.hp,
    ).toBe(0);
    expect(result.state.status).toBe("finished");
    expect(result.state.winner).toBe("player");
  });
});


describe("FireRed Disable", () => {
  it("matches FireRed move data", () => {
    expect(DUEL_MOVES.disable).toMatchObject({
      type: "normal",
      category: "status",
      accuracy: 55,
      maxPp: 20,
      effect: "disable",
    });
  });

  it("tracks the target's last move, disables it for 2-5 rounds, and blocks only that move", () => {
    let state = createTrainerDuel({
      seed: 1942,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["disable"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 20,
          moves: ["tackle", "growl"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: target.id,
      turnIndex: state.turnOrder.indexOf(target.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              accuracyStage: 6,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              evasionStage: -6,
              position: { x: 3, y: 2 },
            },
      ),
    };

    const used = applyDuelAction(state, {
      kind: "use-move",
      unitId: target.id,
      moveId: "tackle",
      targetId: actor.id,
    });
    expect(used.accepted).toBe(true);
    expect(
      used.state.units.find(
        (unit) => unit.id === target.id,
      )?.lastMoveUsed,
    ).toBe("tackle");

    state = {
      ...used.state,
      activeUnitId: actor.id,
      turnIndex: used.state.turnOrder.indexOf(actor.id),
    };
    const disabled = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "disable",
      targetId: target.id,
    });

    expect(disabled.accepted).toBe(true);
    const disabledTarget = disabled.state.units.find(
      (unit) => unit.id === target.id,
    )!;
    expect(disabledTarget.disabledMove).toBe("tackle");
    expect(
      disabledTarget.disableTurnsRemaining,
    ).toBeGreaterThanOrEqual(2);
    expect(
      disabledTarget.disableTurnsRemaining,
    ).toBeLessThanOrEqual(5);
    expect(
      disabled.state.units.find(
        (unit) => unit.id === actor.id,
      )?.movePp.disable,
    ).toBe(DUEL_MOVES.disable.maxPp - 1);

    state = {
      ...disabled.state,
      activeUnitId: target.id,
      turnIndex: disabled.state.turnOrder.indexOf(target.id),
    };
    const blocked = applyDuelAction(state, {
      kind: "use-move",
      unitId: target.id,
      moveId: "tackle",
      targetId: actor.id,
    });
    expect(blocked.accepted).toBe(false);
    expect(blocked.reason).toBe("move-disabled");

    const otherMove = applyDuelAction(state, {
      kind: "use-move",
      unitId: target.id,
      moveId: "growl",
      targetId: actor.id,
    });
    expect(otherMove.accepted).toBe(true);
    expect(
      otherMove.state.units.find(
        (unit) => unit.id === target.id,
      )?.lastMoveUsed,
    ).toBe("growl");
  });

  it("fails after accuracy when the last move has no PP left", () => {
    let state = createTrainerDuel({
      seed: 1943,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["disable"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 20,
          moves: ["tackle"],
          movePp: { tackle: 0 },
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: actor.id,
      turnIndex: state.turnOrder.indexOf(actor.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              accuracyStage: 6,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              lastMoveUsed: "tackle" as const,
              evasionStage: -6,
              position: { x: 3, y: 2 },
            },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "disable",
      targetId: target.id,
    });

    expect(result.accepted).toBe(true);
    const updated = result.state.units.find(
      (unit) => unit.id === target.id,
    )!;
    expect(updated.disabledMove).toBeNull();
    expect(updated.disableTurnsRemaining).toBe(0);
    expect(
      result.state.units.find(
        (unit) => unit.id === actor.id,
      )?.movePp.disable,
    ).toBe(DUEL_MOVES.disable.maxPp - 1);
  });

  it("decrements Disable once per complete arena round and restores the move", () => {
    let state = createTrainerDuel({
      seed: 1944,
      width: 7,
      height: 5,
      players: [
        {
          species: "rattata",
          level: 20,
          moves: ["tackle"],
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
    const disabledId = state.turnOrder[0];
    state = {
      ...state,
      activeUnitId: disabledId,
      turnIndex: 0,
      units: state.units.map((unit) =>
        unit.id === disabledId
          ? {
              ...unit,
              disabledMove: "tackle" as const,
              disableTurnsRemaining: 2,
            }
          : unit,
      ),
    };

    let ended = applyDuelAction(state, {
      kind: "end-turn",
      unitId: disabledId,
    });
    expect(ended.accepted).toBe(true);
    expect(
      ended.state.units.find(
        (unit) => unit.id === disabledId,
      )?.disableTurnsRemaining,
    ).toBe(2);

    ended = applyDuelAction(ended.state, {
      kind: "end-turn",
      unitId: getActiveDuelUnit(ended.state)!.id,
    });
    expect(ended.accepted).toBe(true);
    expect(
      ended.state.units.find(
        (unit) => unit.id === disabledId,
      )?.disableTurnsRemaining,
    ).toBe(1);

    ended = applyDuelAction(ended.state, {
      kind: "end-turn",
      unitId: getActiveDuelUnit(ended.state)!.id,
    });
    expect(ended.accepted).toBe(true);
    ended = applyDuelAction(ended.state, {
      kind: "end-turn",
      unitId: getActiveDuelUnit(ended.state)!.id,
    });
    expect(ended.accepted).toBe(true);
    const restored = ended.state.units.find(
      (unit) => unit.id === disabledId,
    )!;
    expect(restored.disabledMove).toBeNull();
    expect(restored.disableTurnsRemaining).toBe(0);
  });

  it("allows Struggle when every learned move is out of PP or disabled", () => {
    let state = createTrainerDuel({
      seed: 1945,
      width: 7,
      height: 5,
      players: [
        {
          species: "rattata",
          level: 20,
          moves: ["tackle", "growl"],
          movePp: { growl: 0 },
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
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: actor.id,
      turnIndex: state.turnOrder.indexOf(actor.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              disabledMove: "tackle" as const,
              disableTurnsRemaining: 3,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 3, y: 2 },
            },
      ),
    };

    const direct = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "struggle",
      targetId: target.id,
    });
    expect(direct.accepted).toBe(true);
    expect(
      direct.presentation?.kind === "move"
        ? direct.presentation.moveId
        : null,
    ).toBe("struggle");

    const ai = resolveSimpleAiTurnDetailed(
      state,
      "player",
    );
    const aiMove = ai.steps.find(
      (step) => step.presentation?.kind === "move",
    )?.presentation;
    expect(
      aiMove?.kind === "move"
        ? aiMove.moveId
        : null,
    ).toBe("struggle");
  });
});


describe("FireRed Future Sight", () => {
  it("matches FireRed move data", () => {
    expect(DUEL_MOVES["future-sight"]).toMatchObject({
      type: "psychic",
      category: "special",
      power: 80,
      accuracy: 90,
      maxPp: 15,
      effect: "future-sight",
    });
  });

  it("stores setup damage and lands when the counter 3 reaches zero", () => {
    let state = createTrainerDuel({
      seed: 1938,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["future-sight"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const initialHp = target.hp;
    state = {
      ...state,
      activeUnitId: actor.id,
      turnIndex: state.turnOrder.indexOf(actor.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              accuracyStage: 6,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              evasionStage: -6,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const setup = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "future-sight",
      targetId: target.id,
    });
    expect(setup.accepted).toBe(true);
    const setupTarget = setup.state.units.find(
      (unit) => unit.id === target.id,
    )!;
    expect(setupTarget.futureSight?.roundsRemaining).toBe(3);
    expect(setupTarget.futureSight?.damage).toBeGreaterThan(0);
    expect(setupTarget.hp).toBe(initialHp);
    expect(
      setup.state.units.find(
        (unit) => unit.id === actor.id,
      )?.movePp["future-sight"],
    ).toBe(DUEL_MOVES["future-sight"].maxPp - 1);

    // The decomp stores damage now, so later stat changes must not alter it.
    state = {
      ...setup.state,
      units: setup.state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              specialAttackStage: -6,
              accuracyStage: 6,
            }
          : unit.id === target.id
            ? {
                ...unit,
                specialDefenseStage: 6,
                evasionStage: -6,
              }
            : unit,
      ),
    };

    const counters: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      for (let step = 0; step < 2; step += 1) {
        const active = getActiveDuelUnit(state)!;
        const ended = applyDuelAction(state, {
          kind: "end-turn",
          unitId: active.id,
        });
        expect(ended.accepted).toBe(true);
        state = ended.state;
      }
      counters.push(
        state.units.find(
          (unit) => unit.id === target.id,
        )?.futureSight?.roundsRemaining ?? 0,
      );
    }

    expect(counters).toEqual([2, 1, 0]);
    const finalTarget = state.units.find(
      (unit) => unit.id === target.id,
    )!;
    const storedDamage =
      setupTarget.futureSight?.damage ?? 0;
    expect(finalTarget.futureSight).toBeNull();
    expect(finalTarget.hp).toBe(
      initialHp - storedDamage,
    );
  });

  it("keeps Future Sight typeless at impact like FireRed", () => {
    let state = createTrainerDuel({
      seed: 1939,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["future-sight"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const initialHp = target.hp;
    state = {
      ...state,
      activeUnitId: actor.id,
      turnIndex: state.turnOrder.indexOf(actor.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              accuracyStage: 6,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              type: "dark",
              types: ["dark"],
              evasionStage: -6,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const setup = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "future-sight",
      targetId: target.id,
    });
    state = setup.state;

    for (let i = 0; i < 6; i += 1) {
      const active = getActiveDuelUnit(state)!;
      const ended = applyDuelAction(state, {
        kind: "end-turn",
        unitId: active.id,
      });
      expect(ended.accepted).toBe(true);
      state = ended.state;
    }

    expect(
      state.units.find(
        (unit) => unit.id === target.id,
      )?.hp,
    ).toBeLessThan(initialHp);
  });

  it("does not stack a second Future Sight on the same target and still spends PP", () => {
    let state = createTrainerDuel({
      seed: 1940,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["future-sight"],
        },
      ],
      rivals: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: actor.id,
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              ap: 20,
              maxAp: 20,
              position: { x: 2, y: 2 },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const first = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "future-sight",
      targetId: target.id,
    });
    const second = applyDuelAction(first.state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "future-sight",
      targetId: target.id,
    });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(second.reason).toBe(
      "future-sight-already-pending",
    );
    expect(
      second.state.units.find(
        (unit) => unit.id === actor.id,
      )?.movePp["future-sight"],
    ).toBe(DUEL_MOVES["future-sight"].maxPp - 2);
  });

  it("finishes the battle immediately when delayed damage defeats the last rival", () => {
    let state = createTrainerDuel({
      seed: 1941,
      width: 7,
      height: 5,
      players: [
        {
          species: "alakazam",
          level: 47,
          moves: ["future-sight"],
        },
      ],
      rivals: [
        {
          species: "rattata",
          level: 5,
          moves: ["tackle"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const lastId = state.turnOrder[state.turnOrder.length - 1];
    state = {
      ...state,
      activeUnitId: lastId,
      turnIndex: state.turnOrder.length - 1,
      units: state.units.map((unit) =>
        unit.id === target.id
          ? {
              ...unit,
              hp: 1,
              futureSight: {
                attackerId: actor.id,
                moveId: "future-sight" as const,
                damage: 10,
                roundsRemaining: 1,
              },
            }
          : unit.id === actor.id
            ? {
                ...unit,
                accuracyStage: 6,
              }
            : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: lastId,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.status).toBe("finished");
    expect(result.state.winner).toBe("player");
    expect(
      result.state.units.find(
        (unit) => unit.id === target.id,
      )?.hp,
    ).toBe(0);
  });
});


describe("Solar Beam charge turns", () => {
  it("uses FireRed data and completes Exeggcute's late-rival moveset", () => {
    expect(DUEL_MOVES["solar-beam"]).toMatchObject({
      type: "grass",
      category: "special",
      power: 120,
      accuracy: 100,
      maxPp: 10,
      effect: "solar-beam",
    });
    expect(defaultMovesForSpecies("exeggcute")).toEqual([
      "solar-beam",
      "sleep-powder",
      "poison-powder",
      "stun-spore",
    ]);
  });

  it("spends PP once, charges for one activation, then forces the release", () => {
    let state = createTrainerDuel({
      seed: 1935,
      width: 7,
      height: 5,
      players: [
        {
          species: "exeggcute",
          level: 45,
          moves: ["solar-beam"],
        },
      ],
      rivals: [
        {
          species: "geodude",
          level: 45,
          moves: ["tackle"],
        },
      ],
    });
    const actor = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    const targetHp = target.hp;
    state = {
      ...state,
      activeUnitId: actor.id,
      turnIndex: state.turnOrder.indexOf(actor.id),
      units: state.units.map((unit) =>
        unit.id === actor.id
          ? { ...unit, ap: 12, maxAp: 12, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const charged = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: "solar-beam",
      targetId: target.id,
    });

    expect(charged.accepted).toBe(true);
    expect(
      charged.state.units.find(
        (unit) => unit.id === target.id,
      )?.hp,
    ).toBe(targetHp);
    expect(
      charged.state.units.find(
        (unit) => unit.id === actor.id,
      )?.chargingMove,
    ).toEqual({
      moveId: "solar-beam",
      targetId: target.id,
    });
    expect(
      charged.state.units.find(
        (unit) => unit.id === actor.id,
      )?.movePp["solar-beam"],
    ).toBe(DUEL_MOVES["solar-beam"].maxPp - 1);
    if (charged.presentation?.kind === "move") {
      expect(charged.presentation.charging).toBe(true);
      expect(charged.presentation.results[0].damage).toBe(0);
    }

    const targetTurn = applyDuelAction(
      charged.state,
      {
        kind: "end-turn",
        unitId: target.id,
      },
    );
    expect(targetTurn.accepted).toBe(true);
    expect(targetTurn.state.activeUnitId).toBe(actor.id);

    const blocked = applyDuelAction(
      targetTurn.state,
      {
        kind: "end-turn",
        unitId: actor.id,
      },
    );
    expect(blocked.accepted).toBe(false);
    expect(blocked.reason).toBe("must-release-charge");

    const released = applyDuelAction(
      targetTurn.state,
      {
        kind: "release-charge",
        unitId: actor.id,
      },
    );

    expect(released.accepted).toBe(true);
    const releasedActor = released.state.units.find(
      (unit) => unit.id === actor.id,
    )!;
    const releasedTarget = released.state.units.find(
      (unit) => unit.id === target.id,
    )!;
    expect(releasedActor.chargingMove).toBeNull();
    expect(releasedActor.movePp["solar-beam"]).toBe(
      DUEL_MOVES["solar-beam"].maxPp - 1,
    );
    expect(releasedTarget.hp).toBeLessThan(targetHp);
    if (released.presentation?.kind === "move") {
      expect(released.presentation.charging).toBeUndefined();
      expect(
        released.presentation.results[0].damage,
      ).toBeGreaterThan(0);
    }
  });

  it("halves Solar Beam damage in rain", () => {
    const base = createTrainerDuel({
      seed: 1936,
      width: 7,
      height: 5,
      players: [
        {
          species: "exeggcute",
          level: 45,
          moves: ["solar-beam"],
        },
      ],
      rivals: [
        {
          species: "charizard",
          level: 53,
          moves: ["scratch"],
        },
      ],
    });
    const actor = base.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = base.units.find(
      (unit) => unit.side === "rival",
    )!;
    const ready = {
      ...base,
      activeUnitId: actor.id,
      turnIndex: base.turnOrder.indexOf(actor.id),
      units: base.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
              chargingMove: {
                moveId: "solar-beam" as const,
                targetId: target.id,
              },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const dry = applyDuelAction(ready, {
      kind: "release-charge",
      unitId: actor.id,
    });
    const rainy = applyDuelAction(
      {
        ...ready,
        weather: "rain",
        weatherTurnsRemaining: 5,
      },
      {
        kind: "release-charge",
        unitId: actor.id,
      },
    );

    const dryDamage =
      dry.presentation?.kind === "move"
        ? dry.presentation.results[0].damage
        : 0;
    const rainyDamage =
      rainy.presentation?.kind === "move"
        ? rainy.presentation.results[0].damage
        : 0;

    expect(dryDamage).toBeGreaterThan(0);
    expect(rainyDamage).toBe(
      Math.max(1, Math.floor(dryDamage / 2)),
    );
  });

  it("makes auto battle release a charged Solar Beam before any new decision", () => {
    const base = createTrainerDuel({
      seed: 1937,
      width: 7,
      height: 5,
      players: [
        {
          species: "exeggcute",
          level: 45,
          moves: ["solar-beam", "sleep-powder"],
        },
      ],
      rivals: [
        {
          species: "charizard",
          level: 53,
          moves: ["scratch"],
        },
      ],
    });
    const actor = base.units.find(
      (unit) => unit.side === "player",
    )!;
    const target = base.units.find(
      (unit) => unit.side === "rival",
    )!;
    const ready = {
      ...base,
      activeUnitId: actor.id,
      turnIndex: base.turnOrder.indexOf(actor.id),
      units: base.units.map((unit) =>
        unit.id === actor.id
          ? {
              ...unit,
              position: { x: 2, y: 2 },
              chargingMove: {
                moveId: "solar-beam" as const,
                targetId: target.id,
              },
            }
          : {
              ...unit,
              position: { x: 4, y: 2 },
            },
      ),
    };

    const turn = resolveSimpleAiTurnDetailed(
      ready,
      "player",
    );

    expect(turn.steps).toHaveLength(1);
    expect(
      turn.state.units.find(
        (unit) => unit.id === actor.id,
      )?.chargingMove,
    ).toBeNull();
    expect(
      turn.state.units.find(
        (unit) => unit.id === target.id,
      )?.hp,
    ).toBeLessThan(target.hp);
    expect(
      turn.steps[0].presentation?.kind,
    ).toBe("move");
  });
});


describe("late-rival direct move sets", () => {
  it("uses canonical direct moves for Charizard, Gyarados, and Alakazam", () => {
    expect(defaultMovesForSpecies("charizard")).toEqual([
      "flamethrower",
      "wing-attack",
      "slash",
      "scary-face",
    ]);
    expect(defaultMovesForSpecies("gyarados")).toEqual([
      "hydro-pump",
      "twister",
      "leer",
      "rain-dance",
    ]);
    expect(defaultMovesForSpecies("alakazam")).toEqual([
      "psychic",
      "calm-mind",
      "future-sight",
      "disable",
    ]);
  });

  it("matches FireRed data for Slash and Twister", () => {
    expect(DUEL_MOVES.slash).toMatchObject({
      type: "normal",
      category: "physical",
      power: 70,
      accuracy: 100,
      maxPp: 20,
    });
    expect(DUEL_MOVES.twister).toMatchObject({
      type: "dragon",
      category: "special",
      power: 40,
      accuracy: 100,
      maxPp: 20,
    });
  });
});


describe("move accuracy and evasion", () => {
  it("uses FireRed accuracy stages and lets always-hit moves bypass them", () => {
    const state = createTrainerDuel({
      seed: 1920,
      players: [
        {
          species: "blastoise",
          level: 53,
          moves: ["hydro-pump", "shock-wave"],
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(
      getDuelMoveHitChance(
        player,
        rival,
        DUEL_MOVES["hydro-pump"],
      ),
    ).toBe(80);
    expect(
      getDuelMoveHitChance(
        { ...player, accuracyStage: -1 },
        rival,
        DUEL_MOVES["hydro-pump"],
      ),
    ).toBe(60);
    expect(
      getDuelMoveHitChance(
        player,
        { ...rival, evasionStage: 1 },
        DUEL_MOVES["hydro-pump"],
      ),
    ).toBe(60);
    expect(
      getDuelMoveHitChance(
        { ...player, accuracyStage: -6 },
        { ...rival, evasionStage: 6 },
        DUEL_MOVES["shock-wave"],
      ),
    ).toBe(100);
  });

  it("consumes AP and PP when an inaccurate move misses", () => {
    let state = createTrainerDuel({
      seed: 1921,
      width: 7,
      height: 5,
      players: [
        {
          species: "blastoise",
          level: 53,
          moves: ["hydro-pump"],
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
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
          ? { ...unit, ap: 12, maxAp: 12, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const originalAccuracy =
      DUEL_MOVES["hydro-pump"].accuracy;
    DUEL_MOVES["hydro-pump"].accuracy = 0;
    try {
      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "hydro-pump",
        targetId: rival.id,
      });

      expect(result.accepted).toBe(true);
      expect(result.presentation?.kind).toBe("move");
      if (result.presentation?.kind === "move") {
        expect(
          result.presentation.results[0].missed,
        ).toBe(true);
        expect(
          result.presentation.results[0].damage,
        ).toBe(0);
      }

      const updatedPlayer = result.state.units.find(
        (unit) => unit.id === player.id,
      )!;
      const updatedRival = result.state.units.find(
        (unit) => unit.id === rival.id,
      )!;
      expect(updatedPlayer.ap).toBe(
        12 - DUEL_MOVES["hydro-pump"].apCost,
      );
      expect(updatedPlayer.movePp["hydro-pump"]).toBe(
        DUEL_MOVES["hydro-pump"].maxPp - 1,
      );
      expect(updatedRival.hp).toBe(rival.hp);
    } finally {
      DUEL_MOVES["hydro-pump"].accuracy =
        originalAccuracy;
    }
  });

  it("applies Accuracy and Evasion stages through status moves", () => {
    let state = createTrainerDuel({
      seed: 1922,
      width: 7,
      height: 5,
      players: [
        {
          species: "pidgeotto",
          level: 20,
          moves: ["sand-attack", "double-team"],
        },
      ],
      rivals: [
        {
          species: "rattata",
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
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const sandAttack = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "sand-attack",
      targetId: rival.id,
    });
    expect(sandAttack.accepted).toBe(true);
    expect(
      sandAttack.state.units.find(
        (unit) => unit.id === rival.id,
      )?.accuracyStage,
    ).toBe(-1);
    if (sandAttack.presentation?.kind === "move") {
      expect(
        sandAttack.presentation.results[0].statChanges,
      ).toEqual([
        { stat: "accuracy", delta: -1 },
      ]);
    }

    const doubleTeam = applyDuelAction(
      sandAttack.state,
      {
        kind: "use-move",
        unitId: player.id,
        moveId: "double-team",
        targetId: player.id,
      },
    );
    expect(doubleTeam.accepted).toBe(true);
    expect(
      doubleTeam.state.units.find(
        (unit) => unit.id === player.id,
      )?.evasionStage,
    ).toBe(1);
    if (doubleTeam.presentation?.kind === "move") {
      expect(
        doubleTeam.presentation.results[0].statChanges,
      ).toEqual([
        { stat: "evasion", delta: 1 },
      ]);
    }
  });

  it("applies major status from status moves after they hit", () => {
    let state = createTrainerDuel({
      seed: 1923,
      width: 7,
      height: 5,
      players: [
        {
          species: "pikachu",
          level: 20,
          moves: ["thunder-wave"],
        },
      ],
      rivals: [
        {
          species: "rattata",
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
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "thunder-wave",
      targetId: rival.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === rival.id,
      )?.status,
    ).toBe("paralysis");
    if (result.presentation?.kind === "move") {
      expect(
        result.presentation.results[0].statusApplied,
      ).toBe("paralysis");
    }
  });
});


describe("FireRed status type immunity", () => {
  it.each([
    {
      name: "Thunder Wave fails against Ground",
      moveId: "thunder-wave",
      attackerSpecies: "pikachu",
      targetSpecies: "rhyhorn",
      expectedStatus: null,
    },
    {
      name: "Thunder Wave paralyzes a normally affected target",
      moveId: "thunder-wave",
      attackerSpecies: "pikachu",
      targetSpecies: "rattata",
      expectedStatus: "paralysis",
    },
    {
      name: "Stun Spore still paralyzes Ground",
      moveId: "stun-spore",
      attackerSpecies: "oddish",
      targetSpecies: "rhyhorn",
      expectedStatus: "paralysis",
    },
    {
      name: "PoisonPowder keeps Steel immunity",
      moveId: "poison-powder",
      attackerSpecies: "oddish",
      targetSpecies: "magnemite",
      expectedStatus: null,
    },
    {
      name: "PoisonPowder keeps Poison immunity",
      moveId: "poison-powder",
      attackerSpecies: "oddish",
      targetSpecies: "oddish",
      expectedStatus: null,
    },
    {
      name: "Sleep Powder still sleeps Ground",
      moveId: "sleep-powder",
      attackerSpecies: "oddish",
      targetSpecies: "rhyhorn",
      expectedStatus: "sleep",
    },
    {
      name: "Hypnosis still sleeps Ground",
      moveId: "hypnosis",
      attackerSpecies: "drowzee",
      targetSpecies: "rhyhorn",
      expectedStatus: "sleep",
    },
  ] as const)(
    "$name",
    ({
      moveId,
      attackerSpecies,
      targetSpecies,
      expectedStatus,
    }) => {
      let state = createTrainerDuel({
        seed: 1934,
        width: 7,
        height: 5,
        players: [
          {
            species: attackerSpecies,
            level: 30,
            moves: [moveId],
          },
        ],
        rivals: [
          {
            species: targetSpecies,
            level: 30,
            moves: ["tackle"],
          },
        ],
      });
      const attacker = state.units.find(
        (unit) => unit.side === "player",
      )!;
      const target = state.units.find(
        (unit) => unit.side === "rival",
      )!;
      state = {
        ...state,
        activeUnitId: attacker.id,
        turnIndex: state.turnOrder.indexOf(attacker.id),
        units: state.units.map((unit) =>
          unit.id === attacker.id
            ? {
                ...unit,
                accuracyStage: 6,
                position: { x: 2, y: 2 },
              }
            : {
                ...unit,
                evasionStage: -6,
                position: { x: 4, y: 2 },
              },
        ),
      };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: attacker.id,
        moveId,
        targetId: target.id,
      });

      expect(result.accepted).toBe(true);
      const updatedAttacker = result.state.units.find(
        (unit) => unit.id === attacker.id,
      )!;
      const updatedTarget = result.state.units.find(
        (unit) => unit.id === target.id,
      )!;
      expect(updatedTarget.status).toBe(expectedStatus);
      expect(updatedAttacker.movePp[moveId]).toBe(
        DUEL_MOVES[moveId].maxPp - 1,
      );

      if (expectedStatus === "sleep") {
        expect(
          updatedTarget.sleepTurnsRemaining,
        ).toBeGreaterThanOrEqual(2);
        expect(
          updatedTarget.sleepTurnsRemaining,
        ).toBeLessThanOrEqual(5);
      }

      if (result.presentation?.kind === "move") {
        expect(
          result.presentation.results[0].statusApplied,
        ).toBe(expectedStatus ?? undefined);
      }
    },
  );
});


describe("FireRed integer accuracy", () => {
  it("truncates stage-adjusted accuracy before the 1-100 roll", () => {
    const state = createTrainerDuel({
      seed: 1928,
      players: [
        {
          species: "blastoise",
          level: 53,
          moves: ["hydro-pump"],
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const rival = state.units.find(
      (unit) => unit.side === "rival",
    )!;

    expect(
      getDuelMoveHitChance(
        { ...player, accuracyStage: -5 },
        rival,
        DUEL_MOVES["hydro-pump"],
      ),
    ).toBe(28);
    expect(
      getDuelMoveHitChance(
        { ...player, accuracyStage: -4 },
        rival,
        DUEL_MOVES["hydro-pump"],
      ),
    ).toBe(34);
  });
});

describe("persistent FireRed Sleep", () => {
  it("applies Sleep Powder for a deterministic 2-5 turn counter", () => {
    let state = createTrainerDuel({
      seed: 1929,
      width: 7,
      height: 5,
      players: [
        {
          species: "oddish",
          level: 20,
          moves: ["sleep-powder"],
        },
      ],
      rivals: [
        {
          species: "rattata",
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
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const originalAccuracy =
      DUEL_MOVES["sleep-powder"].accuracy;
    DUEL_MOVES["sleep-powder"].accuracy = 100;
    try {
      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "sleep-powder",
        targetId: rival.id,
      });

      expect(result.accepted).toBe(true);
      const sleeping = result.state.units.find(
        (unit) => unit.id === rival.id,
      )!;
      expect(sleeping.status).toBe("sleep");
      expect(
        sleeping.sleepTurnsRemaining,
      ).toBeGreaterThanOrEqual(2);
      expect(
        sleeping.sleepTurnsRemaining,
      ).toBeLessThanOrEqual(5);
      if (result.presentation?.kind === "move") {
        expect(
          result.presentation.results[0].statusApplied,
        ).toBe("sleep");
      }
    } finally {
      DUEL_MOVES["sleep-powder"].accuracy =
        originalAccuracy;
    }
  });

  it("skips a sleeping activation and decrements its counter", () => {
    let state = createTrainerDuel({
      seed: 1930,
      width: 7,
      height: 5,
      players: [
        {
          species: "pikachu",
          level: 20,
          moves: ["thunder-shock"],
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
      turnIndex: state.turnOrder.indexOf(player.id),
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              status: "sleep",
              sleepTurnsRemaining: 3,
            }
          : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: player.id,
    });

    expect(result.accepted).toBe(true);
    const sleeping = result.state.units.find(
      (unit) => unit.id === rival.id,
    )!;
    expect(sleeping.status).toBe("sleep");
    expect(sleeping.sleepTurnsRemaining).toBe(2);
    expect(result.state.activeUnitId).toBe(player.id);
    expect(result.state.round).toBe(2);
  });

  it("wakes at counter one and can act on that same activation", () => {
    let state = createTrainerDuel({
      seed: 1931,
      width: 7,
      height: 5,
      players: [
        {
          species: "pikachu",
          level: 20,
          moves: ["thunder-shock"],
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
      turnIndex: state.turnOrder.indexOf(player.id),
      units: state.units.map((unit) =>
        unit.id === rival.id
          ? {
              ...unit,
              status: "sleep",
              sleepTurnsRemaining: 1,
            }
          : unit,
      ),
    };

    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: player.id,
    });

    expect(result.accepted).toBe(true);
    const awakened = result.state.units.find(
      (unit) => unit.id === rival.id,
    )!;
    expect(awakened.status).toBe(null);
    expect(awakened.sleepTurnsRemaining).toBe(0);
    expect(result.state.activeUnitId).toBe(rival.id);
    expect(awakened.ap).toBe(awakened.maxAp);
    expect(result.state.round).toBe(1);
  });
  it("skips the fastest sleeping combatant when a battle starts", () => {
    const state = createTrainerDuel({
      seed: 1932,
      width: 7,
      height: 5,
      players: [
        {
          species: "pikachu",
          level: 20,
          moves: ["thunder-shock"],
          status: "sleep",
          sleepTurnsRemaining: 3,
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

    expect(player.status).toBe("sleep");
    expect(player.sleepTurnsRemaining).toBe(2);
    expect(state.activeUnitId).toBe(rival.id);
    expect(state.round).toBe(1);
    expect(state.status).toBe("active");
  });

  it("scans a full 6x10 arena of sleeping combatants without ending the battle", () => {
    let state = createWildDuel({
      seed: 1933,
      width: 13,
      height: 9,
      players: [
        { species: "pikachu", level: 20, moves: ["thunder-shock"] },
        { species: "pidgeotto", level: 20, moves: ["gust"] },
        { species: "rattata", level: 20, moves: ["tackle"] },
        { species: "bulbasaur", level: 20, moves: ["tackle"] },
        { species: "charmander", level: 20, moves: ["scratch"] },
        { species: "squirtle", level: 20, moves: ["tackle"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 10,
      wilds: Array.from({ length: 10 }, () => ({
        species: "rattata" as const,
        level: 10,
      })),
    });
    const activeId = state.activeUnitId;
    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === activeId
          ? unit
          : {
              ...unit,
              status: "sleep",
              sleepTurnsRemaining: 5,
            },
      ),
    };

    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: activeId,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.units).toHaveLength(16);
    expect(result.state.status).toBe("active");
    expect(result.state.winner).toBeNull();
    expect(result.state.round).toBe(2);
    expect(result.state.activeUnitId).toBe(activeId);
    expect(
      result.state.units
        .filter((unit) => unit.id !== activeId)
        .every(
          (unit) =>
            unit.status === "sleep" &&
            unit.sleepTurnsRemaining === 4,
        ),
    ).toBe(true);
  });

});


describe("Rain Dance weather", () => {
  it("starts five rounds of rain and consumes exactly one PP", () => {
    let state = createTrainerDuel({
      seed: 1914,
      width: 7,
      height: 5,
      players: [
        {
          species: "blastoise",
          level: 53,
          moves: ["rain-dance", "water-gun"],
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;

    state = {
      ...state,
      activeUnitId: player.id,
    };

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "rain-dance",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(result.state.weather).toBe("rain");
    expect(result.state.weatherTurnsRemaining).toBe(5);
    expect(
      result.state.units.find(
        (unit) => unit.id === player.id,
      )?.movePp["rain-dance"],
    ).toBe(DUEL_MOVES["rain-dance"].maxPp - 1);
  });

  it("boosts Water damage and halves Fire damage", () => {
    let waterState = createTrainerDuel({
      seed: 1915,
      width: 7,
      height: 5,
      players: [
        {
          species: "blastoise",
          level: 53,
          moves: ["water-gun"],
        },
      ],
      rivals: [
        {
          species: "charizard",
          level: 53,
          moves: ["ember"],
        },
      ],
    });
    const waterActor = waterState.units.find(
      (unit) => unit.side === "player",
    )!;
    const waterTarget = waterState.units.find(
      (unit) => unit.side === "rival",
    )!;
    waterState = {
      ...waterState,
      activeUnitId: waterActor.id,
      units: waterState.units.map((unit) =>
        unit.id === waterActor.id
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const dryWater = applyDuelAction(waterState, {
      kind: "use-move",
      unitId: waterActor.id,
      moveId: "water-gun",
      targetId: waterTarget.id,
    });
    const rainyWater = applyDuelAction(
      {
        ...waterState,
        weather: "rain",
        weatherTurnsRemaining: 5,
      },
      {
        kind: "use-move",
        unitId: waterActor.id,
        moveId: "water-gun",
        targetId: waterTarget.id,
      },
    );

    const dryWaterDamage =
      dryWater.presentation?.kind === "move"
        ? dryWater.presentation.results[0].damage
        : 0;
    const rainyWaterDamage =
      rainyWater.presentation?.kind === "move"
        ? rainyWater.presentation.results[0].damage
        : 0;
    expect(rainyWaterDamage).toBeGreaterThan(
      dryWaterDamage,
    );

    let fireState = createTrainerDuel({
      seed: 1916,
      width: 7,
      height: 5,
      players: [
        {
          species: "charizard",
          level: 53,
          moves: ["ember"],
        },
      ],
      rivals: [
        {
          species: "venusaur",
          level: 53,
          moves: ["razor-leaf"],
        },
      ],
    });
    const fireActor = fireState.units.find(
      (unit) => unit.side === "player",
    )!;
    const fireTarget = fireState.units.find(
      (unit) => unit.side === "rival",
    )!;
    fireState = {
      ...fireState,
      activeUnitId: fireActor.id,
      units: fireState.units.map((unit) =>
        unit.id === fireActor.id
          ? { ...unit, position: { x: 2, y: 2 } }
          : { ...unit, position: { x: 4, y: 2 } },
      ),
    };

    const dryFire = applyDuelAction(fireState, {
      kind: "use-move",
      unitId: fireActor.id,
      moveId: "ember",
      targetId: fireTarget.id,
    });
    const rainyFire = applyDuelAction(
      {
        ...fireState,
        weather: "rain",
        weatherTurnsRemaining: 5,
      },
      {
        kind: "use-move",
        unitId: fireActor.id,
        moveId: "ember",
        targetId: fireTarget.id,
      },
    );

    const dryFireDamage =
      dryFire.presentation?.kind === "move"
        ? dryFire.presentation.results[0].damage
        : 0;
    const rainyFireDamage =
      rainyFire.presentation?.kind === "move"
        ? rainyFire.presentation.results[0].damage
        : 0;
    expect(rainyFireDamage).toBeLessThan(
      dryFireDamage,
    );
  });

  it("reduces Synthesis healing to one quarter under rain", () => {
    let state = createTrainerDuel({
      seed: 1917,
      width: 7,
      height: 5,
      players: [
        {
          species: "venusaur",
          level: 53,
          moves: ["synthesis"],
          currentHp: 10,
        },
      ],
      rivals: [
        {
          species: "pidgeot",
          level: 47,
          moves: ["wing-attack"],
        },
      ],
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    state = {
      ...state,
      activeUnitId: player.id,
      weather: "rain",
      weatherTurnsRemaining: 5,
    };

    const expectedHeal = Math.min(
      Math.max(1, Math.floor(player.maxHp / 4)),
      player.maxHp - player.hp,
    );
    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: player.id,
      moveId: "synthesis",
      targetId: player.id,
    });

    expect(result.accepted).toBe(true);
    expect(
      result.state.units.find(
        (unit) => unit.id === player.id,
      )?.hp,
    ).toBe(player.hp + expectedHeal);
  });

  it("decrements weather only after the full arena round", () => {
    let state = createTrainerDuel({
      seed: 1918,
      width: 7,
      height: 5,
      players: [
        {
          species: "squirtle",
          level: 10,
          moves: ["water-gun"],
        },
      ],
      rivals: [
        {
          species: "bulbasaur",
          level: 10,
          moves: ["tackle"],
        },
      ],
    });
    state = {
      ...state,
      weather: "rain",
      weatherTurnsRemaining: 1,
    };

    const first = applyDuelAction(state, {
      kind: "end-turn",
      unitId: state.activeUnitId,
    });
    expect(first.accepted).toBe(true);
    expect(first.state.weather).toBe("rain");
    expect(first.state.weatherTurnsRemaining).toBe(1);

    const second = applyDuelAction(first.state, {
      kind: "end-turn",
      unitId: first.state.activeUnitId,
    });
    expect(second.accepted).toBe(true);
    expect(second.state.weather).toBe(null);
    expect(second.state.weatherTurnsRemaining).toBe(0);
    expect(second.state.round).toBe(2);
  });
});


describe("battle movement and deployment scale", () => {
  it("gives every Pokémon 6 AP plus 1 per 25 Speed (walking, moves and balls share the pool)", () => {
    const state = createWildDuel({
      seed: 9,
      width: 9,
      height: 7,
      players: [
        { species: "slowpoke", level: 5, moves: ["tackle"] },
        { species: "kadabra", level: 60, moves: ["confusion"] },
      ],
      wildSpecies: "rattata",
      wildLevel: 5,
    });
    for (const unit of state.units) {
      expect(unit.maxAp, unit.id).toBe(maxActionPointsForSpeed(unit.speed));
      expect(unit.ap, unit.id).toBe(unit.maxAp);
    }
    const kadabra = state.units.find((u) => u.species === "kadabra")!;
    const slowpoke = state.units.find((u) => u.species === "slowpoke")!;
    expect(kadabra.maxAp).toBeGreaterThan(slowpoke.maxAp);
  });

  it("charges 1 AP per tile of the real path length around obstacles", () => {
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
              ap: 4,
              maxAp: 4,
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
      )?.ap,
    ).toBe(0);
  });

  it("deploys large wild packs with player units on the left and enemies on the right", () => {
    const state = createWildDuel({
      openingTiles: 0, // raw spawn layout
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
            ap: 9,
            maxAp: 9,
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


