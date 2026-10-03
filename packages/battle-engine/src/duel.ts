import {
  calculateHpStat,
  calculateOtherStat,
} from "./stats.js";

export type StarterSpeciesId =
  | "bulbasaur"
  | "charmander"
  | "squirtle";

export type DuelSide = "player" | "rival";
export type DuelStatus = "active" | "finished";
export type DuelMoveId =
  | "tackle"
  | "scratch"
  | "growl"
  | "tail-whip";

export interface DuelPoint {
  x: number;
  y: number;
}

export interface DuelMove {
  id: DuelMoveId;
  name: string;
  category: "physical" | "status";
  power: number | null;
  apCost: number;
  minRange: number;
  maxRange: number;
  effect?: "attack-down" | "defense-down";
}

export interface DuelUnit {
  id: string;
  side: DuelSide;
  species: StarterSpeciesId;
  displayName: string;
  type: "grass" | "fire" | "water";
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackStage: number;
  defenseStage: number;
  ap: number;
  maxAp: number;
  mp: number;
  maxMp: number;
  position: DuelPoint;
  moves: DuelMoveId[];
}

export interface DuelState {
  width: number;
  height: number;
  round: number;
  activeUnitId: string;
  status: DuelStatus;
  winner: DuelSide | null;
  units: DuelUnit[];
  log: string[];
}

export type DuelAction =
  | {
      kind: "move";
      unitId: string;
      to: DuelPoint;
    }
  | {
      kind: "use-move";
      unitId: string;
      moveId: DuelMoveId;
      targetId: string;
    }
  | {
      kind: "end-turn";
      unitId: string;
    };

export interface DuelActionResult {
  state: DuelState;
  accepted: boolean;
  reason?: string;
}

const LEVEL = 5;
const FIXED_IV = 15;
const MAX_STAGE = 6;

const SPECIES: Record<
  StarterSpeciesId,
  {
    name: string;
    type: DuelUnit["type"];
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    moves: DuelMoveId[];
  }
> = {
  bulbasaur: {
    name: "Bulbasaur",
    type: "grass",
    hp: 45,
    attack: 49,
    defense: 49,
    speed: 45,
    moves: ["tackle", "growl"],
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    hp: 39,
    attack: 52,
    defense: 43,
    speed: 65,
    moves: ["scratch", "growl"],
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    hp: 44,
    attack: 48,
    defense: 65,
    speed: 43,
    moves: ["tackle", "tail-whip"],
  },
};

export const DUEL_MOVES: Record<DuelMoveId, DuelMove> = {
  tackle: {
    id: "tackle",
    name: "Tackle",
    category: "physical",
    power: 40,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  scratch: {
    id: "scratch",
    name: "Scratch",
    category: "physical",
    power: 40,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  growl: {
    id: "growl",
    name: "Growl",
    category: "status",
    power: null,
    apCost: 2,
    minRange: 1,
    maxRange: 3,
    effect: "attack-down",
  },
  "tail-whip": {
    id: "tail-whip",
    name: "Tail Whip",
    category: "status",
    power: null,
    apCost: 2,
    minRange: 1,
    maxRange: 3,
    effect: "defense-down",
  },
};

export function rivalStarterFor(
  playerStarter: StarterSpeciesId,
): StarterSpeciesId {
  switch (playerStarter) {
    case "bulbasaur":
      return "charmander";
    case "charmander":
      return "squirtle";
    case "squirtle":
      return "bulbasaur";
  }
}

export function starterDisplayName(
  species: StarterSpeciesId,
): string {
  return SPECIES[species].name;
}

function stageMultiplier(stage: number): number {
  const bounded = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, stage));
  return bounded >= 0
    ? (2 + bounded) / 2
    : 2 / (2 - bounded);
}

function makeUnit(
  species: StarterSpeciesId,
  side: DuelSide,
  position: DuelPoint,
): DuelUnit {
  const base = SPECIES[species];

  const maxHp = calculateHpStat({
    base: base.hp,
    iv: FIXED_IV,
    ev: 0,
    level: LEVEL,
  });

  return {
    id: `${side}-${species}`,
    side,
    species,
    displayName: base.name,
    type: base.type,
    level: LEVEL,
    hp: maxHp,
    maxHp,
    attack: calculateOtherStat({
      base: base.attack,
      iv: FIXED_IV,
      ev: 0,
      level: LEVEL,
    }),
    defense: calculateOtherStat({
      base: base.defense,
      iv: FIXED_IV,
      ev: 0,
      level: LEVEL,
    }),
    speed: calculateOtherStat({
      base: base.speed,
      iv: FIXED_IV,
      ev: 0,
      level: LEVEL,
    }),
    attackStage: 0,
    defenseStage: 0,
    ap: 6,
    maxAp: 6,
    mp: 3,
    maxMp: 3,
    position,
    moves: [...base.moves],
  };
}

export function createStarterDuel(
  playerStarter: StarterSpeciesId,
): DuelState {
  const rivalStarter = rivalStarterFor(playerStarter);
  const player = makeUnit(
    playerStarter,
    "player",
    { x: 1, y: 2 },
  );
  const rival = makeUnit(
    rivalStarter,
    "rival",
    { x: 5, y: 2 },
  );

  const active =
    player.speed >= rival.speed ? player : rival;

  return {
    width: 7,
    height: 5,
    round: 1,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    units: [player, rival],
    log: [
      `Blue desafia você! ${rival.displayName} entra na arena.`,
      `${active.displayName} age primeiro pela Speed.`,
    ],
  };
}

export function manhattanDistance(
  a: DuelPoint,
  b: DuelPoint,
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getActiveDuelUnit(
  state: DuelState,
): DuelUnit | null {
  return (
    state.units.find(
      (unit) => unit.id === state.activeUnitId,
    ) ?? null
  );
}

function cloneState(state: DuelState): DuelState {
  return {
    ...state,
    units: state.units.map((unit) => ({
      ...unit,
      position: { ...unit.position },
      moves: [...unit.moves],
    })),
    log: [...state.log],
  };
}

function appendLog(state: DuelState, message: string): void {
  state.log = [...state.log, message].slice(-12);
}

function inBounds(
  state: DuelState,
  point: DuelPoint,
): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < state.width &&
    point.y < state.height
  );
}

function pointKey(point: DuelPoint): string {
  return `${point.x},${point.y}`;
}

export function getReachableCells(
  state: DuelState,
  unitId: string,
): DuelPoint[] {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId,
  );
  if (!unit || unit.hp <= 0 || unit.mp <= 0) {
    return [];
  }

  const occupied = new Set(
    state.units
      .filter(
        (candidate) =>
          candidate.hp > 0 && candidate.id !== unitId,
      )
      .map((candidate) => pointKey(candidate.position)),
  );

  const visited = new Map<string, number>();
  const queue: Array<{ point: DuelPoint; cost: number }> = [
    { point: { ...unit.position }, cost: 0 },
  ];
  visited.set(pointKey(unit.position), 0);

  const result: DuelPoint[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const neighbors = [
      { x: current.point.x + 1, y: current.point.y },
      { x: current.point.x - 1, y: current.point.y },
      { x: current.point.x, y: current.point.y + 1 },
      { x: current.point.x, y: current.point.y - 1 },
    ];

    for (const next of neighbors) {
      const cost = current.cost + 1;
      const key = pointKey(next);

      if (
        cost > unit.mp ||
        !inBounds(state, next) ||
        occupied.has(key)
      ) {
        continue;
      }

      const known = visited.get(key);
      if (known !== undefined && known <= cost) {
        continue;
      }

      visited.set(key, cost);
      queue.push({ point: next, cost });
      result.push(next);
    }
  }

  return result;
}

function nextLivingUnit(
  state: DuelState,
  current: DuelUnit,
): DuelUnit | null {
  return (
    state.units.find(
      (unit) =>
        unit.hp > 0 && unit.side !== current.side,
    ) ?? null
  );
}

function resolveTurnEnd(
  state: DuelState,
  current: DuelUnit,
): void {
  const next = nextLivingUnit(state, current);

  if (!next) {
    state.status = "finished";
    state.winner = current.side;
    return;
  }

  next.ap = next.maxAp;
  next.mp = next.maxMp;
  state.activeUnitId = next.id;

  if (next.side === "player") {
    state.round += 1;
  }

  appendLog(
    state,
    `Turno de ${next.displayName}. AP ${next.ap}, MP ${next.mp}.`,
  );
}

function calculateDamage(
  attacker: DuelUnit,
  defender: DuelUnit,
  move: DuelMove,
): number {
  if (move.power === null) {
    return 0;
  }

  const attack =
    attacker.attack *
    stageMultiplier(attacker.attackStage);
  const defense = Math.max(
    1,
    defender.defense *
      stageMultiplier(defender.defenseStage),
  );

  return Math.max(
    1,
    Math.floor(
      (((2 * attacker.level) / 5 + 2) *
        move.power *
        attack) /
        defense /
        50 +
        2,
    ),
  );
}

export function applyDuelAction(
  input: DuelState,
  action: DuelAction,
): DuelActionResult {
  if (input.status !== "active") {
    return {
      state: input,
      accepted: false,
      reason: "battle-finished",
    };
  }

  const state = cloneState(input);
  const actor = state.units.find(
    (unit) => unit.id === action.unitId,
  );

  if (
    !actor ||
    actor.hp <= 0 ||
    actor.id !== state.activeUnitId
  ) {
    return {
      state: input,
      accepted: false,
      reason: "not-active-unit",
    };
  }

  if (action.kind === "end-turn") {
    resolveTurnEnd(state, actor);
    return { state, accepted: true };
  }

  if (action.kind === "move") {
    const reachable = getReachableCells(state, actor.id);
    const target = reachable.find(
      (cell) =>
        cell.x === action.to.x && cell.y === action.to.y,
    );

    if (!target) {
      return {
        state: input,
        accepted: false,
        reason: "cell-not-reachable",
      };
    }

    const cost = manhattanDistance(
      actor.position,
      action.to,
    );
    actor.position = { ...action.to };
    actor.mp -= cost;

    appendLog(
      state,
      `${actor.displayName} se moveu ${cost} tile${cost === 1 ? "" : "s"}.`,
    );

    return { state, accepted: true };
  }

  const move = DUEL_MOVES[action.moveId];
  const target = state.units.find(
    (unit) => unit.id === action.targetId,
  );

  if (
    !move ||
    !actor.moves.includes(move.id) ||
    !target ||
    target.hp <= 0 ||
    target.side === actor.side
  ) {
    return {
      state: input,
      accepted: false,
      reason: "invalid-move-target",
    };
  }

  if (actor.ap < move.apCost) {
    return {
      state: input,
      accepted: false,
      reason: "not-enough-ap",
    };
  }

  const distance = manhattanDistance(
    actor.position,
    target.position,
  );

  if (
    distance < move.minRange ||
    distance > move.maxRange
  ) {
    return {
      state: input,
      accepted: false,
      reason: "target-out-of-range",
    };
  }

  actor.ap -= move.apCost;

  if (move.category === "physical") {
    const damage = calculateDamage(actor, target, move);
    target.hp = Math.max(0, target.hp - damage);

    appendLog(
      state,
      `${actor.displayName} usou ${move.name}: ${damage} de dano.`,
    );

    if (target.hp <= 0) {
      appendLog(
        state,
        `${target.displayName} desmaiou.`,
      );
      state.status = "finished";
      state.winner = actor.side;
    }
  } else if (move.effect === "attack-down") {
    target.attackStage = Math.max(
      -MAX_STAGE,
      target.attackStage - 1,
    );
    appendLog(
      state,
      `${move.name} reduziu o Attack de ${target.displayName}.`,
    );
  } else if (move.effect === "defense-down") {
    target.defenseStage = Math.max(
      -MAX_STAGE,
      target.defenseStage - 1,
    );
    appendLog(
      state,
      `${move.name} reduziu a Defense de ${target.displayName}.`,
    );
  }

  return { state, accepted: true };
}

function attackMoveFor(unit: DuelUnit): DuelMoveId {
  return unit.moves.find(
    (moveId) =>
      DUEL_MOVES[moveId].category === "physical",
  ) ?? unit.moves[0];
}

function statusMoveFor(
  unit: DuelUnit,
): DuelMoveId | null {
  return (
    unit.moves.find(
      (moveId) =>
        DUEL_MOVES[moveId].category === "status",
    ) ?? null
  );
}

function bestAiDestination(
  state: DuelState,
  actor: DuelUnit,
  target: DuelUnit,
): DuelPoint | null {
  const reachable = getReachableCells(state, actor.id);

  return (
    reachable
      .map((point) => ({
        point,
        distance: manhattanDistance(
          point,
          target.position,
        ),
      }))
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          a.point.y - b.point.y ||
          a.point.x - b.point.x,
      )[0]?.point ?? null
  );
}

export function resolveSimpleAiTurn(
  input: DuelState,
): DuelState {
  let state = input;
  let actor = getActiveDuelUnit(state);

  if (
    state.status !== "active" ||
    !actor ||
    actor.side !== "rival"
  ) {
    return state;
  }

  const target = state.units.find(
    (unit) => unit.side === "player" && unit.hp > 0,
  );
  if (!target) {
    return state;
  }

  const attackMoveId = attackMoveFor(actor);
  const attackMove = DUEL_MOVES[attackMoveId];

  if (
    manhattanDistance(actor.position, target.position) >
      attackMove.maxRange &&
    actor.mp > 0
  ) {
    const destination = bestAiDestination(
      state,
      actor,
      target,
    );

    if (destination) {
      state = applyDuelAction(state, {
        kind: "move",
        unitId: actor.id,
        to: destination,
      }).state;
      actor = getActiveDuelUnit(state);
    }
  }

  if (!actor || actor.side !== "rival") {
    return state;
  }

  const currentTarget = state.units.find(
    (unit) => unit.side === "player" && unit.hp > 0,
  );
  if (!currentTarget) {
    return state;
  }

  const distance = manhattanDistance(
    actor.position,
    currentTarget.position,
  );

  if (
    actor.ap >= attackMove.apCost &&
    distance <= attackMove.maxRange
  ) {
    state = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId: attackMoveId,
      targetId: currentTarget.id,
    }).state;
  }

  if (state.status === "finished") {
    return state;
  }

  actor = getActiveDuelUnit(state);
  if (!actor || actor.side !== "rival") {
    return state;
  }

  const statusMoveId = statusMoveFor(actor);
  const refreshedTarget = state.units.find(
    (unit) => unit.side === "player" && unit.hp > 0,
  );

  if (statusMoveId && refreshedTarget) {
    const statusMove = DUEL_MOVES[statusMoveId];
    const statusDistance = manhattanDistance(
      actor.position,
      refreshedTarget.position,
    );

    if (
      actor.ap >= statusMove.apCost &&
      statusDistance <= statusMove.maxRange
    ) {
      state = applyDuelAction(state, {
        kind: "use-move",
        unitId: actor.id,
        moveId: statusMoveId,
        targetId: refreshedTarget.id,
      }).state;
    }
  }

  actor = getActiveDuelUnit(state);
  if (
    state.status === "active" &&
    actor?.side === "rival"
  ) {
    state = applyDuelAction(state, {
      kind: "end-turn",
      unitId: actor.id,
    }).state;
  }

  return state;
}
