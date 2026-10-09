import {
  createPokemonProgression,
  createTrainerDuel,
  getActiveDuelUnit,
  resolveSimpleAiTurnDetailed,
  type DuelAiTurnOptions,
  type DuelState,
} from "../../src";

const ROSTER = ["charmander", "squirtle", "bulbasaur", "pidgey", "geodude", "pikachu", "machop", "rattata"];

function build(species: string, level: number) {
  const p = createPokemonProgression(species as never, level);
  return { species: p.species, level, moves: p.activeMoves, movePp: { ...p.movePp }, currentHp: p.currentHp } as never;
}

export type MirrorResult = {
  winner: "player" | "rival" | null;
  /** Side that held the first turn of the fight. */
  firstSide: "player" | "rival";
  rounds: number;
  /** Longest run of rounds in which nobody lost HP. */
  longestQuiet: number;
  finished: boolean;
};

export type MirrorOptions = {
  size: number;
  level?: number;
  width?: number;
  height?: number;
  ai?: DuelAiTurnOptions;
  /** Opening walk in tiles; default is the engine's OPENING_TILES (0 = the old spawn distance). */
  openingTiles?: number;
  /** Hook run on the fresh state (an opening phase, a spawn change...). */
  prepare?: (state: DuelState) => DuelState;
  /** Side that wins Speed ties (default player): +1 Speed to that side's Pokémon, so both orientations can be measured. */
  firstSide?: "player" | "rival";
};

const totalHp = (state: DuelState) => state.units.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);

/**
 * Both sides field the SAME team and use the same AI, so any win-rate gap between the side that acts
 * first and the one that acts second comes from turn order and distance alone, not from strength.
 */
export function playMirror(seed: number, options: MirrorOptions): MirrorResult {
  const names = Array.from({ length: options.size }, (_, index) => ROSTER[(seed + index * 3) % ROSTER.length]);
  const level = options.level ?? 14;
  let state = createTrainerDuel({
    seed,
    width: options.width ?? 13,
    height: options.height ?? 9,
    blocked: [],
    players: names.map((name) => build(name, level)),
    rivals: names.map((name) => build(name, level)),
    items: {},
    trainerName: "x",
    ...(options.openingTiles !== undefined ? { openingTiles: options.openingTiles } : {}),
  } as never);
  if (options.firstSide === "rival") {
    const units = state.units.map((unit) => (unit.side === "rival" ? { ...unit, speed: unit.speed + 1 } : unit));
    const order = [...units]
      .sort((a, b) => b.speed - a.speed || (a.side === b.side ? 0 : a.side === "rival" ? -1 : 1) || a.id.localeCompare(b.id))
      .map((unit) => unit.id);
    state = {
      ...state,
      units: units.map((unit) => (unit.id === order[0] ? { ...unit, ap: unit.maxAp } : unit)),
      turnOrder: order,
      turnIndex: 0,
      activeUnitId: order[0],
    };
  }
  if (options.prepare) state = options.prepare(state);
  const firstSide = getActiveDuelUnit(state)!.side;
  let quiet = 0;
  let longestQuiet = 0;
  let lastHp = totalHp(state);
  for (let step = 0; step < 2500 && state.status === "active"; step += 1) {
    const actor = getActiveDuelUnit(state)!;
    const turn = resolveSimpleAiTurnDetailed(state, actor.side, options.ai ?? {});
    state = turn.state;
    const hp = totalHp(state);
    if (hp < lastHp) quiet = 0;
    else quiet += 1;
    longestQuiet = Math.max(longestQuiet, quiet);
    lastHp = hp;
  }
  return {
    winner: state.status === "finished" ? state.winner : null,
    firstSide,
    rounds: state.round,
    longestQuiet,
    finished: state.status === "finished",
  };
}

export type FirstMoverReport = {
  fights: number;
  firstWins: number;
  secondWins: number;
  draws: number;
  /** Win rate of the first mover among decided fights, in percent. */
  firstRate: number;
  /** Percentage points above 50: the gap to close. */
  gap: number;
  stalled: number;
  worstQuiet: number;
  avgRounds: number;
};

export function measureFirstMover(sizes: readonly number[], seeds: number, options: Omit<MirrorOptions, "size"> = {}): FirstMoverReport {
  let firstWins = 0;
  let secondWins = 0;
  let draws = 0;
  let stalled = 0;
  let worstQuiet = 0;
  let rounds = 0;
  let fights = 0;
  for (const size of sizes) {
    for (let seed = 1; seed <= seeds; seed += 1) {
      const result = playMirror(seed, { ...options, size });
      fights += 1;
      rounds += result.rounds;
      worstQuiet = Math.max(worstQuiet, result.longestQuiet);
      if (!result.finished) stalled += 1;
      if (result.winner === null) draws += 1;
      else if (result.winner === result.firstSide) firstWins += 1;
      else secondWins += 1;
    }
  }
  const decided = Math.max(1, firstWins + secondWins);
  const firstRate = (firstWins / decided) * 100;
  return { fights, firstWins, secondWins, draws, firstRate, gap: firstRate - 50, stalled, worstQuiet, avgRounds: rounds / fights };
}

/** Option 5: in round 1 the units farthest from their nearest foe act first (round 2 goes back to Speed). */
export function reorderFirstRoundByDistance(state: DuelState): DuelState {
  const distance = (unitId: string) => {
    const unit = state.units.find((u) => u.id === unitId)!;
    return Math.min(
      ...state.units
        .filter((u) => u.hp > 0 && u.side !== unit.side)
        .map((u) => Math.abs(u.position.x - unit.position.x) + Math.abs(u.position.y - unit.position.y)),
    );
  };
  const order = [...state.turnOrder].sort((a, b) => distance(b) - distance(a));
  const first = state.units.find((u) => u.id === order[0])!;
  return {
    ...state,
    turnOrder: order,
    turnIndex: 0,
    activeUnitId: first.id,
    units: state.units.map((u) => (u.id === first.id ? { ...u, ap: u.maxAp } : u)),
  };
}

/** Both orientations (player first, rival first) pooled: removes any left/right placement bias. */
export function measureBalanced(sizes: readonly number[], seeds: number, options: Omit<MirrorOptions, "size" | "firstSide"> = {}) {
  const a = measureFirstMover(sizes, seeds, { ...options, firstSide: "player" });
  const b = measureFirstMover(sizes, seeds, { ...options, firstSide: "rival" });
  const firstWins = a.firstWins + b.firstWins;
  const secondWins = a.secondWins + b.secondWins;
  const decided = Math.max(1, firstWins + secondWins);
  const firstRate = (firstWins / decided) * 100;
  return {
    fights: a.fights + b.fights,
    firstWins,
    secondWins,
    draws: a.draws + b.draws,
    firstRate,
    gap: firstRate - 50,
    stalled: a.stalled + b.stalled,
    worstQuiet: Math.max(a.worstQuiet, b.worstQuiet),
    avgRounds: (a.avgRounds + b.avgRounds) / 2,
    playerFirstRate: a.firstRate,
    rivalFirstRate: b.firstRate,
  } satisfies FirstMoverReport & { playerFirstRate: number; rivalFirstRate: number };
}
