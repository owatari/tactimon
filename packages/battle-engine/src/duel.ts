import {
  calculateHpStat,
  calculateOtherStat,
} from "./stats";
import {
  experimentalCaptureChance,
  getCaptureEligibility,
  resolveCaptureRoll,
  type CaptureEligibility,
} from "./capture";

export type StarterSpeciesId =
  | "bulbasaur"
  | "charmander"
  | "squirtle";

export type WildSpeciesId = "pidgey" | "rattata";
export type DuelSpeciesId = StarterSpeciesId | WildSpeciesId;
export type DuelType =
  | "normal"
  | "grass"
  | "fire"
  | "water"
  | "flying"
  | "dark"
  | "steel";

export type DuelSide = "player" | "rival";
export type DuelStatus = "active" | "finished";
export type DuelBattleKind = "trainer" | "wild";
export type DuelItemId = "potion" | "poke-ball";
export type DuelMoveId =
  | "tackle"
  | "scratch"
  | "growl"
  | "tail-whip"
  | "vine-whip"
  | "razor-leaf"
  | "seed-bomb"
  | "ember"
  | "metal-claw"
  | "flame-burst"
  | "water-gun"
  | "bite"
  | "aqua-jet";

export type DuelMoveTargeting = "single-enemy";
export type DuelMoveMotion = "contact" | "status" | "projectile";
export type DuelStatId = "attack" | "defense";

export interface DuelPoint {
  x: number;
  y: number;
}

export interface DuelEvSpread {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface DuelPokemonBuild {
  species: DuelSpeciesId;
  level: number;
  moves: DuelMoveId[];
  evs?: Partial<DuelEvSpread>;
}

export interface TrainerDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  players: readonly DuelPokemonBuild[];
  rivals: readonly DuelPokemonBuild[];
  trainerName?: string;
}

export interface StarterDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  /** Backward-compatible single-member party input. */
  player?: DuelPokemonBuild;
  /** Every member is deployed at battle start, capped at six. */
  players?: readonly DuelPokemonBuild[];
  /** Optional explicit rival party; defaults to Blue's counter starter. */
  rivals?: readonly DuelPokemonBuild[];
}

export interface WildDuelOptions {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
  /** Backward-compatible single-member party input. */
  player?: DuelPokemonBuild;
  /** Every member is deployed at battle start, capped at six. */
  players?: readonly DuelPokemonBuild[];
  captureAllowed?: boolean;
  wildSpecies: WildSpeciesId;
  wildLevel: number;
}

export type DuelItem =
  | { id: "potion"; name: string; kind: "heal"; target: "ally"; heal: number }
  | { id: "poke-ball"; name: string; kind: "capture"; target: "wild-enemy"; ballModifier: number };

export interface DuelMove {
  id: DuelMoveId;
  name: string;
  type: DuelType;
  category: "physical" | "special" | "status";
  targeting: DuelMoveTargeting;
  motion: DuelMoveMotion;
  vfxId: DuelMoveId;
  description: string;
  power: number | null;
  apCost: number;
  minRange: number;
  maxRange: number;
  effect?: "attack-down" | "defense-down";
}

export type DuelPresentationEvent =
  | {
      kind: "movement";
      actorId: string;
      from: DuelPoint;
      to: DuelPoint;
      cost: number;
    }
  | {
      kind: "move";
      actorId: string;
      moveId: DuelMoveId;
      targetIds: string[];
      vfxId: DuelMoveId;
      motion: DuelMoveMotion;
      results: Array<{
        targetId: string;
        damage: number;
        fainted: boolean;
        statChanges: Array<{
          stat: DuelStatId;
          delta: number;
        }>;
      }>;
    }
  | {
      kind: "item";
      actorId: string;
      itemId: DuelItemId;
      targetIds: string[];
      healed: number;
    }
  | {
      kind: "capture";
      actorId: string;
      itemId: "poke-ball";
      targetIds: string[];
      success: boolean;
      chance: number;
      xpRatio: number;
      targetFlees: boolean;
    };

export interface DuelUnit {
  id: string;
  side: DuelSide;
  species: DuelSpeciesId;
  displayName: string;
  type: DuelType;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  attackStage: number;
  defenseStage: number;
  ap: number;
  maxAp: number;
  mp: number;
  maxMp: number;
  position: DuelPoint;
  moves: DuelMoveId[];
  captureAttempted: boolean;
}

export interface DuelState {
  width: number;
  height: number;
  seed: number;
  blocked: DuelPoint[];
  battleKind: DuelBattleKind;
  escaped: boolean;
  captureAllowed: boolean;
  items: Record<DuelItemId, number>;
  round: number;
  turnOrder: string[];
  turnIndex: number;
  activeUnitId: string;
  status: DuelStatus;
  winner: DuelSide | null;
  captureResult: {
    success: boolean;
    species: WildSpeciesId;
    level: number;
    xpRatio: number;
    chance: number;
  } | null;
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
      kind: "use-item";
      unitId: string;
      itemId: DuelItemId;
      targetId: string;
    }
  | {
      kind: "flee";
      unitId: string;
    }
  | {
      kind: "end-turn";
      unitId: string;
    };

export interface DuelActionResult {
  state: DuelState;
  accepted: boolean;
  reason?: string;
  presentation?: DuelPresentationEvent;
}

export interface DuelAiTurnResult {
  state: DuelState;
  steps: DuelActionResult[];
}

const LEVEL = 5;
const FIXED_IV = 15;
const MAX_STAGE = 6;

type SpeciesData = {
  name: string;
  type: DuelType;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  moves: DuelMoveId[];
};

const SPECIES: Record<DuelSpeciesId, SpeciesData> = {
  bulbasaur: {
    name: "Bulbasaur",
    type: "grass",
    hp: 45,
    attack: 49,
    defense: 49,
    specialAttack: 65,
    specialDefense: 65,
    speed: 45,
    moves: ["tackle", "growl"],
  },
  charmander: {
    name: "Charmander",
    type: "fire",
    hp: 39,
    attack: 52,
    defense: 43,
    specialAttack: 60,
    specialDefense: 50,
    speed: 65,
    moves: ["scratch", "growl"],
  },
  squirtle: {
    name: "Squirtle",
    type: "water",
    hp: 44,
    attack: 48,
    defense: 65,
    specialAttack: 50,
    specialDefense: 64,
    speed: 43,
    moves: ["tackle", "tail-whip"],
  },
  pidgey: {
    name: "Pidgey",
    type: "flying",
    hp: 40,
    attack: 45,
    defense: 40,
    specialAttack: 35,
    specialDefense: 35,
    speed: 56,
    moves: ["tackle", "growl"],
  },
  rattata: {
    name: "Rattata",
    type: "normal",
    hp: 30,
    attack: 56,
    defense: 35,
    specialAttack: 25,
    specialDefense: 35,
    speed: 72,
    moves: ["tackle", "tail-whip"],
  },
};

export const DUEL_ITEMS: Record<DuelItemId, DuelItem> = {
  potion: {
    id: "potion",
    name: "Potion",
    kind: "heal",
    target: "ally",
    heal: 20,
  },
  "poke-ball": {
    id: "poke-ball",
    name: "Poké Ball",
    kind: "capture",
    target: "wild-enemy",
    ballModifier: 1,
  },
};

const WILD_CATCH_RATE: Record<WildSpeciesId, number> = {
  pidgey: 255,
  rattata: 255,
};

export const DUEL_MOVES: Record<DuelMoveId, DuelMove> = {
  tackle: {
    id: "tackle",
    name: "Tackle",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "tackle",
    description: "Avança sobre um inimigo adjacente e causa dano físico.",
    power: 40,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  scratch: {
    id: "scratch",
    name: "Scratch",
    type: "normal",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "scratch",
    description: "Golpe de contato em um inimigo adjacente.",
    power: 40,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  growl: {
    id: "growl",
    name: "Growl",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "growl",
    description: "Reduz o Attack do alvo em 1 estágio.",
    power: null,
    apCost: 2,
    minRange: 1,
    maxRange: 3,
    effect: "attack-down",
  },
  "tail-whip": {
    id: "tail-whip",
    name: "Tail Whip",
    type: "normal",
    category: "status",
    targeting: "single-enemy",
    motion: "status",
    vfxId: "tail-whip",
    description: "Reduz a Defense do alvo em 1 estágio.",
    power: null,
    apCost: 2,
    minRange: 1,
    maxRange: 3,
    effect: "defense-down",
  },
  "vine-whip": {
    id: "vine-whip",
    name: "Vine Whip",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "vine-whip",
    description: "Chicoteia um alvo a até 2 tiles de distância.",
    power: 45,
    apCost: 4,
    minRange: 1,
    maxRange: 2,
  },
  "razor-leaf": {
    id: "razor-leaf",
    name: "Razor Leaf",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "razor-leaf",
    description: "Lança folhas cortantes a média distância.",
    power: 55,
    apCost: 4,
    minRange: 2,
    maxRange: 4,
  },
  "seed-bomb": {
    id: "seed-bomb",
    name: "Seed Bomb",
    type: "grass",
    category: "physical",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "seed-bomb",
    description: "Projétil de sementes de alto impacto.",
    power: 65,
    apCost: 5,
    minRange: 2,
    maxRange: 4,
  },
  ember: {
    id: "ember",
    name: "Ember",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "ember",
    description: "Dispara brasas contra um alvo distante.",
    power: 40,
    apCost: 4,
    minRange: 2,
    maxRange: 4,
  },
  "metal-claw": {
    id: "metal-claw",
    name: "Metal Claw",
    type: "steel",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "metal-claw",
    description: "Ataque físico pesado contra um alvo adjacente.",
    power: 50,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  "flame-burst": {
    id: "flame-burst",
    name: "Flame Burst",
    type: "fire",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "flame-burst",
    description: "Projétil de fogo mais forte para média distância.",
    power: 65,
    apCost: 5,
    minRange: 2,
    maxRange: 4,
  },
  "water-gun": {
    id: "water-gun",
    name: "Water Gun",
    type: "water",
    category: "special",
    targeting: "single-enemy",
    motion: "projectile",
    vfxId: "water-gun",
    description: "Jato d'água que alcança até 4 tiles.",
    power: 40,
    apCost: 4,
    minRange: 2,
    maxRange: 4,
  },
  bite: {
    id: "bite",
    name: "Bite",
    type: "dark",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "bite",
    description: "Mordida forte contra um alvo adjacente.",
    power: 60,
    apCost: 4,
    minRange: 1,
    maxRange: 1,
  },
  "aqua-jet": {
    id: "aqua-jet",
    name: "Aqua Jet",
    type: "water",
    category: "physical",
    targeting: "single-enemy",
    motion: "contact",
    vfxId: "aqua-jet",
    description: "Investida aquática rápida em curto alcance.",
    power: 65,
    apCost: 5,
    minRange: 1,
    maxRange: 2,
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

export function speciesDisplayName(
  species: DuelSpeciesId,
): string {
  return SPECIES[species].name;
}

export function starterDisplayName(
  species: StarterSpeciesId,
): string {
  return speciesDisplayName(species);
}

export function defaultMovesForSpecies(
  species: DuelSpeciesId,
): DuelMoveId[] {
  return [...SPECIES[species].moves];
}

function pointKey(point: DuelPoint): string {
  return `${point.x},${point.y}`;
}

function createSeededRandom(seed: number): () => number {
  let value = (seed >>> 0) || 0x9e3779b9;

  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 0x100000000;
  };
}

function randomItem<T>(
  values: readonly T[],
  random: () => number,
): T {
  return values[
    Math.min(
      values.length - 1,
      Math.floor(random() * values.length),
    )
  ];
}

function connectedOpenCells(
  start: DuelPoint,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
): DuelPoint[] {
  const queue: DuelPoint[] = [{ ...start }];
  const visited = new Set<string>([pointKey(start)]);
  const result: DuelPoint[] = [{ ...start }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      const key = pointKey(next);

      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= width ||
        next.y >= height ||
        blockedKeys.has(key) ||
        visited.has(key)
      ) {
        continue;
      }

      visited.add(key);
      queue.push(next);
      result.push(next);
    }
  }

  return result;
}

function pickSpawnPositions(
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
  seed: number,
): [DuelPoint, DuelPoint] {
  const blockedKeys = new Set(blocked.map(pointKey));
  const open: DuelPoint[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const point = { x, y };
      if (!blockedKeys.has(pointKey(point))) {
        open.push(point);
      }
    }
  }

  if (open.length < 2) {
    return [
      { x: 0, y: 0 },
      { x: Math.max(0, width - 1), y: Math.max(0, height - 1) },
    ];
  }

  const random = createSeededRandom(seed);
  const interiorOpen = open.filter(
    (point) =>
      point.x > 0 &&
      point.y > 0 &&
      point.x < width - 1 &&
      point.y < height - 1,
  );
  const player = randomItem(
    interiorOpen.length >= 2 ? interiorOpen : open,
    random,
  );
  const connected = connectedOpenCells(
    player,
    width,
    height,
    blockedKeys,
  ).filter(
    (point) => pointKey(point) !== pointKey(player),
  );

  const minimumDistance = Math.max(
    4,
    Math.floor((width + height) / 3),
  );
  const interiorConnected = connected.filter(
    (point) =>
      point.x > 0 &&
      point.y > 0 &&
      point.x < width - 1 &&
      point.y < height - 1,
  );
  const rivalPool =
    interiorConnected.length > 0
      ? interiorConnected
      : connected;

  const preferredRivalCells = rivalPool.filter(
    (point) =>
      manhattanDistance(point, player) >= minimumDistance,
  );
  const fallbackRivalCells =
    rivalPool.length > 0
      ? rivalPool
      : open.filter(
          (point) => pointKey(point) !== pointKey(player),
        );

  const rival = randomItem(
    preferredRivalCells.length > 0
      ? preferredRivalCells
      : fallbackRivalCells,
    random,
  );

  return [
    { ...player },
    { ...rival },
  ];
}

function clusterSpawnPositions(
  anchor: DuelPoint,
  opposingAnchor: DuelPoint,
  count: number,
  width: number,
  height: number,
  blockedKeys: ReadonlySet<string>,
  reserved: Set<string>,
): DuelPoint[] {
  const positions: DuelPoint[] = [];

  const add = (point: DuelPoint): boolean => {
    const key = pointKey(point);
    if (blockedKeys.has(key) || reserved.has(key)) {
      return false;
    }

    positions.push({ ...point });
    reserved.add(key);
    return true;
  };

  add(anchor);

  const candidates = connectedOpenCells(
    anchor,
    width,
    height,
    blockedKeys,
  )
    .filter((point) => !reserved.has(pointKey(point)))
    .sort((a, b) => {
      const aBorder =
        a.x === 0 ||
        a.y === 0 ||
        a.x === width - 1 ||
        a.y === height - 1
          ? 1
          : 0;
      const bBorder =
        b.x === 0 ||
        b.y === 0 ||
        b.x === width - 1 ||
        b.y === height - 1
          ? 1
          : 0;

      return (
        aBorder - bBorder ||
        manhattanDistance(a, anchor) -
          manhattanDistance(b, anchor) ||
        manhattanDistance(b, opposingAnchor) -
          manhattanDistance(a, opposingAnchor) ||
        a.y - b.y ||
        a.x - b.x
      );
    });

  for (const point of candidates) {
    if (positions.length >= count) break;
    add(point);
  }

  if (positions.length < count) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (positions.length >= count) break;
        add({ x, y });
      }
      if (positions.length >= count) break;
    }
  }

  return positions.slice(0, count);
}

function pickTeamSpawnPositions(
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
  seed: number,
  playerSize: number,
  rivalSize: number,
): {
  players: DuelPoint[];
  rivals: DuelPoint[];
} {
  const [playerAnchor, rivalAnchor] =
    pickSpawnPositions(
      width,
      height,
      blocked,
      seed,
    );
  const blockedKeys = new Set(blocked.map(pointKey));
  const reserved = new Set<string>();

  // Keep both team anchors free while the first cluster is selected.
  reserved.add(pointKey(rivalAnchor));
  const players = clusterSpawnPositions(
    playerAnchor,
    rivalAnchor,
    playerSize,
    width,
    height,
    blockedKeys,
    reserved,
  );

  reserved.delete(pointKey(rivalAnchor));
  reserved.add(pointKey(playerAnchor));
  for (const point of players) {
    reserved.add(pointKey(point));
  }

  const rivals = clusterSpawnPositions(
    rivalAnchor,
    playerAnchor,
    rivalSize,
    width,
    height,
    blockedKeys,
    reserved,
  );

  return {
    players,
    rivals,
  };
}

function createTurnOrder(units: readonly DuelUnit[]): string[] {
  return [...units]
    .sort(
      (a, b) =>
        b.speed - a.speed ||
        (a.side === b.side
          ? 0
          : a.side === "player"
            ? -1
            : 1) ||
        a.id.localeCompare(b.id),
    )
    .map((unit) => unit.id);
}

function stageMultiplier(stage: number): number {
  const bounded = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, stage));
  return bounded >= 0
    ? (2 + bounded) / 2
    : 2 / (2 - bounded);
}

function makeUnit(
  build: DuelPokemonBuild,
  side: DuelSide,
  position: DuelPoint,
  slot = 0,
): DuelUnit {
  const base = SPECIES[build.species];
  const evs = {
    hp: build.evs?.hp ?? 0,
    attack: build.evs?.attack ?? 0,
    defense: build.evs?.defense ?? 0,
    specialAttack: build.evs?.specialAttack ?? 0,
    specialDefense: build.evs?.specialDefense ?? 0,
    speed: build.evs?.speed ?? 0,
  };
  const level = Math.max(1, Math.min(100, Math.trunc(build.level)));

  const maxHp = calculateHpStat({
    base: base.hp,
    iv: FIXED_IV,
    ev: evs.hp,
    level,
  });

  return {
    id: `${side}-${slot}-${build.species}`,
    side,
    species: build.species,
    displayName: base.name,
    type: base.type,
    level,
    hp: maxHp,
    maxHp,
    attack: calculateOtherStat({
      base: base.attack,
      iv: FIXED_IV,
      ev: evs.attack,
      level,
    }),
    defense: calculateOtherStat({
      base: base.defense,
      iv: FIXED_IV,
      ev: evs.defense,
      level,
    }),
    specialAttack: calculateOtherStat({
      base: base.specialAttack,
      iv: FIXED_IV,
      ev: evs.specialAttack,
      level,
    }),
    specialDefense: calculateOtherStat({
      base: base.specialDefense,
      iv: FIXED_IV,
      ev: evs.specialDefense,
      level,
    }),
    speed: calculateOtherStat({
      base: base.speed,
      iv: FIXED_IV,
      ev: evs.speed,
      level,
    }),
    attackStage: 0,
    defenseStage: 0,
    ap: 6,
    maxAp: 6,
    mp: 3,
    maxMp: 3,
    position,
    moves: [...build.moves].slice(0, 4),
    captureAttempted: false,
  };
}

function normalizeArenaOptions(options: {
  seed?: number;
  width?: number;
  height?: number;
  blocked?: readonly DuelPoint[];
}) {
  const width = Math.max(3, Math.trunc(options.width ?? 7));
  const height = Math.max(3, Math.trunc(options.height ?? 5));
  const seed = (options.seed ?? 1) >>> 0;
  const blocked = (options.blocked ?? [])
    .filter(
      (point) =>
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < width &&
        point.y < height,
    )
    .map((point) => ({ ...point }));

  return { width, height, seed, blocked };
}

export function createTrainerDuel(
  options: TrainerDuelOptions,
): DuelState {
  const { width, height, seed, blocked } =
    normalizeArenaOptions(options);
  const party = [...options.players].slice(0, 6);
  const rivalParty = [...options.rivals].slice(0, 6);

  if (party.length === 0) {
    throw new Error(
      "Trainer duel requires at least one player Pokémon.",
    );
  }
  if (rivalParty.length === 0) {
    throw new Error(
      "Trainer duel requires at least one rival Pokémon.",
    );
  }

  const positions = pickTeamSpawnPositions(
    width,
    height,
    blocked,
    seed,
    party.length,
    rivalParty.length,
  );
  const players = party.map((build, index) =>
    makeUnit(
      build,
      "player",
      positions.players[index],
      index,
    ),
  );
  const rivals = rivalParty.map((build, index) =>
    makeUnit(
      build,
      "rival",
      positions.rivals[index],
      index,
    ),
  );
  const units = [...players, ...rivals];
  const turnOrder = createTurnOrder(units);
  const active = units.find(
    (unit) => unit.id === turnOrder[0],
  )!;
  const trainerName =
    options.trainerName?.trim() || "Treinador rival";

  return {
    width,
    height,
    seed,
    blocked,
    battleKind: "trainer",
    escaped: false,
    captureAllowed: false,
    items: {
      potion: 1,
      "poke-ball": 0,
    },
    round: 1,
    turnOrder,
    turnIndex: 0,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    captureResult: null,
    units,
    log: [
      `${trainerName} desafia você!`,
      players.length > 1
        ? `${players.length} Pokémon do seu time entram na arena.`
        : `${players[0].displayName} entra na arena.`,
      rivals.length > 1
        ? `${trainerName} coloca ${rivals.length} Pokémon na arena.`
        : `${rivals[0].displayName} entra pelo lado rival.`,
      `${active.displayName} age primeiro pela Speed.`,
    ],
  };
}

export function createStarterDuel(
  playerStarter: StarterSpeciesId,
  options: StarterDuelOptions = {},
): DuelState {
  const rivalStarter = rivalStarterFor(playerStarter);
  const fallbackPlayer: DuelPokemonBuild = {
    species: playerStarter,
    level: LEVEL,
    moves: SPECIES[playerStarter].moves,
  };
  const party = (
    options.players && options.players.length > 0
      ? [...options.players]
      : options.player
        ? [options.player]
        : [fallbackPlayer]
  ).slice(0, 6);
  const rivals = (
    options.rivals && options.rivals.length > 0
      ? [...options.rivals]
      : [
          {
            species: rivalStarter,
            level: LEVEL,
            moves: SPECIES[rivalStarter].moves,
          },
        ]
  ).slice(0, 6);

  return createTrainerDuel({
    seed: options.seed,
    width: options.width,
    height: options.height,
    blocked: options.blocked,
    players: party,
    rivals,
    trainerName: "Blue",
  });
}

export function createWildDuel(
  options: WildDuelOptions,
): DuelState {
  const { width, height, seed, blocked } =
    normalizeArenaOptions(options);
  const party = (
    options.players && options.players.length > 0
      ? [...options.players]
      : options.player
        ? [options.player]
        : []
  ).slice(0, 6);

  if (party.length === 0) {
    throw new Error("Wild duel requires at least one player Pokémon.");
  }

  const positions = pickTeamSpawnPositions(
    width,
    height,
    blocked,
    seed,
    party.length,
    1,
  );
  const players = party.map((build, index) =>
    makeUnit(
      build,
      "player",
      positions.players[index],
      index,
    ),
  );
  const wild = makeUnit(
    {
      species: options.wildSpecies,
      level: options.wildLevel,
      moves: SPECIES[options.wildSpecies].moves,
    },
    "rival",
    positions.rivals[0],
    0,
  );
  const units = [...players, wild];
  const turnOrder = createTurnOrder(units);
  const active = units.find(
    (unit) => unit.id === turnOrder[0],
  )!;
  const captureAllowed = options.captureAllowed ?? true;

  return {
    width,
    height,
    seed,
    blocked,
    battleKind: "wild",
    escaped: false,
    captureAllowed,
    items: {
      potion: 1,
      "poke-ball": captureAllowed ? 3 : 0,
    },
    round: 1,
    turnOrder,
    turnIndex: 0,
    activeUnitId: active.id,
    status: "active",
    winner: null,
    captureResult: null,
    units,
    log: [
      `Um ${wild.displayName} selvagem apareceu!`,
      players.length > 1
        ? `${players.length} Pokémon do seu time entram na arena.`
        : `${players[0].displayName} entra na arena.`,
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
    blocked: state.blocked.map((point) => ({ ...point })),
    turnOrder: [...state.turnOrder],
    items: { ...state.items },
    captureResult: state.captureResult ? { ...state.captureResult } : null,
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
  const blocked = new Set(state.blocked.map(pointKey));

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
        occupied.has(key) ||
        blocked.has(key)
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

function sideHasLivingUnit(
  state: DuelState,
  side: DuelSide,
): boolean {
  return state.units.some(
    (unit) => unit.side === side && unit.hp > 0,
  );
}

function resolveTurnEnd(
  state: DuelState,
  current: DuelUnit,
): void {
  const opposingSide: DuelSide =
    current.side === "player" ? "rival" : "player";

  if (!sideHasLivingUnit(state, opposingSide)) {
    state.status = "finished";
    state.winner = current.side;
    return;
  }

  const orderLength = state.turnOrder.length;
  const currentIndex = Math.max(
    0,
    state.turnOrder.indexOf(current.id),
  );

  for (let step = 1; step <= orderLength; step += 1) {
    const nextIndex =
      (currentIndex + step) % orderLength;
    const nextId = state.turnOrder[nextIndex];
    const next = state.units.find(
      (unit) => unit.id === nextId && unit.hp > 0,
    );

    if (!next) {
      continue;
    }

    next.ap = next.maxAp;
    next.mp = next.maxMp;
    state.activeUnitId = next.id;
    state.turnIndex = nextIndex;

    if (nextIndex <= currentIndex) {
      state.round += 1;
    }

    appendLog(
      state,
      `Turno de ${next.displayName}. AP ${next.ap}, MP ${next.mp}.`,
    );
    return;
  }

  state.status = "finished";
  state.winner = current.side;
}

function calculateDamage(
  attacker: DuelUnit,
  defender: DuelUnit,
  move: DuelMove,
): number {
  if (move.power === null) {
    return 0;
  }

  const isSpecial = move.category === "special";
  const attack = isSpecial
    ? attacker.specialAttack
    : attacker.attack * stageMultiplier(attacker.attackStage);
  const defense = Math.max(
    1,
    isSpecial
      ? defender.specialDefense
      : defender.defense * stageMultiplier(defender.defenseStage),
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

export function getDuelCaptureEligibility(
  state: DuelState,
  targetId: string,
): CaptureEligibility {
  const target = state.units.find((unit) => unit.id === targetId);
  if (!target) return { allowed: false, reason: "target-not-wild" };
  return getCaptureEligibility(
    {
      id: target.id,
      ownerId: target.side === "player" ? "player" : null,
      wild: state.battleKind === "wild" && target.side === "rival",
      boss: false,
      currentHp: target.hp,
      maxHp: target.maxHp,
      speed: target.speed,
      position: target.position,
      captureAttempted: target.captureAttempted,
    },
    {
      capturePolicy:
        state.battleKind === "wild" && state.captureAllowed
          ? "allowed"
          : "forbidden",
      captureHpThresholdRatio: 0.5,
    },
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

  if (action.kind === "flee") {
    if (state.battleKind === "trainer") {
      appendLog(
        state,
        "Não é possível fugir de uma batalha de treinador.",
      );
      return {
        state,
        accepted: false,
        reason: "cannot-flee-trainer",
      };
    }

    state.status = "finished";
    state.escaped = true;
    state.winner = null;
    appendLog(state, `${actor.displayName} escapou da batalha.`);
    return { state, accepted: true };
  }

  if (action.kind === "use-item") {
    const item = DUEL_ITEMS[action.itemId];
    const target = state.units.find((unit) => unit.id === action.targetId);
    if (!item || !target || target.hp <= 0) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if ((state.items[item.id] ?? 0) <= 0) {
      return { state: input, accepted: false, reason: "item-unavailable" };
    }

    if (item.kind === "capture") {
      const eligibility = getDuelCaptureEligibility(state, target.id);
      if (!eligibility.allowed) {
        return {
          state: input,
          accepted: false,
          reason: eligibility.reason === "hp-too-high"
            ? "capture-hp-too-high"
            : eligibility.reason ?? "capture-not-allowed",
        };
      }
      const species = target.species as WildSpeciesId;
      const chance = experimentalCaptureChance({
        catchRate: WILD_CATCH_RATE[species],
        ballModifier: item.ballModifier,
        statusModifier: 1,
        hpRatio: target.hp / target.maxHp,
        thresholdRatio: 0.5,
      });
      const random = createSeededRandom(
        (state.seed ^ Math.imul(state.round, 0x9e3779b9) ^ target.hp) >>> 0,
      );
      const resolution = resolveCaptureRoll(random(), chance, target.hp, target.maxHp);
      target.captureAttempted = true;
      state.items[item.id] -= 1;
      state.status = "finished";
      state.winner = resolution.success ? "player" : null;
      state.captureResult = {
        success: resolution.success,
        species,
        level: target.level,
        xpRatio: resolution.xpRatio,
        chance,
      };
      appendLog(
        state,
        resolution.success
          ? `${target.displayName} foi capturado!`
          : `${target.displayName} escapou da Poké Ball e fugiu.`,
      );
      return {
        state,
        accepted: true,
        presentation: {
          kind: "capture",
          actorId: actor.id,
          itemId: "poke-ball",
          targetIds: [target.id],
          success: resolution.success,
          chance,
          xpRatio: resolution.xpRatio,
          targetFlees: resolution.targetFlees,
        },
      };
    }

    if (target.side !== actor.side) {
      return { state: input, accepted: false, reason: "invalid-item-target" };
    }
    if (target.hp >= target.maxHp) {
      return { state: input, accepted: false, reason: "target-full-hp" };
    }
    const healed = Math.min(item.heal, target.maxHp - target.hp);
    target.hp += healed;
    state.items[item.id] -= 1;
    appendLog(state, `${target.displayName} recuperou ${healed} HP com ${item.name}.`);
    resolveTurnEnd(state, actor);
    return {
      state,
      accepted: true,
      presentation: {
        kind: "item",
        actorId: actor.id,
        itemId: item.id,
        targetIds: [target.id],
        healed,
      },
    };
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

    const from = { ...actor.position };
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

    return {
      state,
      accepted: true,
      presentation: {
        kind: "movement",
        actorId: actor.id,
        from,
        to: { ...action.to },
        cost,
      },
    };
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

  let damage = 0;
  const statChanges: Array<{
    stat: DuelStatId;
    delta: number;
  }> = [];

  if (move.category !== "status") {
    damage = calculateDamage(actor, target, move);
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

      if (!sideHasLivingUnit(state, target.side)) {
        state.status = "finished";
        state.winner = actor.side;
      }
    }
  } else if (move.effect === "attack-down") {
    const before = target.attackStage;
    target.attackStage = Math.max(
      -MAX_STAGE,
      target.attackStage - 1,
    );
    statChanges.push({
      stat: "attack",
      delta: target.attackStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu o Attack de ${target.displayName}.`,
    );
  } else if (move.effect === "defense-down") {
    const before = target.defenseStage;
    target.defenseStage = Math.max(
      -MAX_STAGE,
      target.defenseStage - 1,
    );
    statChanges.push({
      stat: "defense",
      delta: target.defenseStage - before,
    });
    appendLog(
      state,
      `${move.name} reduziu a Defense de ${target.displayName}.`,
    );
  }

  return {
    state,
    accepted: true,
    presentation: {
      kind: "move",
      actorId: actor.id,
      moveId: move.id,
      targetIds: [target.id],
      vfxId: move.vfxId,
      motion: move.motion,
      results: [
        {
          targetId: target.id,
          damage,
          fainted: target.hp <= 0,
          statChanges,
        },
      ],
    },
  };
}

function attackMoveFor(unit: DuelUnit): DuelMoveId {
  return unit.moves.find(
    (moveId) =>
      DUEL_MOVES[moveId].category !== "status",
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

function bestAiTarget(
  state: DuelState,
  actor: DuelUnit,
): DuelUnit | null {
  return (
    state.units
      .filter(
        (unit) =>
          unit.hp > 0 &&
          unit.side !== actor.side,
      )
      .sort(
        (a, b) =>
          manhattanDistance(actor.position, a.position) -
            manhattanDistance(actor.position, b.position) ||
          a.hp - b.hp ||
          b.speed - a.speed,
      )[0] ?? null
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

export function resolveSimpleAiTurnDetailed(
  input: DuelState,
  side: DuelSide = "rival",
): DuelAiTurnResult {
  let state = input;
  const steps: DuelActionResult[] = [];
  let actor = getActiveDuelUnit(state);

  const run = (action: DuelAction): DuelActionResult => {
    const result = applyDuelAction(state, action);
    if (result.accepted) {
      state = result.state;
      steps.push(result);
    }
    return result;
  };

  if (
    state.status !== "active" ||
    !actor ||
    actor.side !== side
  ) {
    return { state, steps };
  }

  const target = bestAiTarget(state, actor);
  if (!target) {
    return { state, steps };
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
      run({
        kind: "move",
        unitId: actor.id,
        to: destination,
      });
      actor = getActiveDuelUnit(state);
    }
  }

  if (!actor || actor.side !== side) {
    return { state, steps };
  }

  const currentTarget = bestAiTarget(state, actor);
  if (!currentTarget) {
    return { state, steps };
  }

  const distance = manhattanDistance(
    actor.position,
    currentTarget.position,
  );

  if (
    actor.ap >= attackMove.apCost &&
    distance <= attackMove.maxRange
  ) {
    const attackResult = run({
      kind: "use-move",
      unitId: actor.id,
      moveId: attackMoveId,
      targetId: currentTarget.id,
    });

    if (attackResult.state.status === "finished") {
      return { state, steps };
    }
  }

  actor = getActiveDuelUnit(state);
  if (!actor || actor.side !== side) {
    return { state, steps };
  }

  const statusMoveId = statusMoveFor(actor);
  const refreshedTarget = bestAiTarget(state, actor);

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
      run({
        kind: "use-move",
        unitId: actor.id,
        moveId: statusMoveId,
        targetId: refreshedTarget.id,
      });
    }
  }

  actor = getActiveDuelUnit(state);
  if (
    state.status === "active" &&
    actor?.side === side
  ) {
    run({
      kind: "end-turn",
      unitId: actor.id,
    });
  }

  return { state, steps };
}

export function resolveSimpleAiTurn(
  input: DuelState,
  side: DuelSide = "rival",
): DuelState {
  return resolveSimpleAiTurnDetailed(input, side).state;
}
