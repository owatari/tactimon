"use client";

import { itemIconUrl } from "@/lib/items";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  applyDuelAction,
  createStarterDuel,
  createTrainerDuel,
  createWildDuel,
  DUEL_ITEMS,
  DUEL_MOVES,
  calculateTypeEffectiveness,
  getActiveDuelUnit,
  getDuelCaptureEligibility,
  isDuelAutoCatchTarget,
  getDuelMovePp,
  getDuelMoveAreaTargetIds,
  getReachableCells,
  manhattanDistance,
  resolveSimpleAiTurnDetailed,
  type DuelActionResult,
  type DuelPresentationEvent,
  type DuelInventory,
  type DuelItemId,
  type DuelMajorStatus,
  type DuelMoveId,
  type DuelMovePp,
  type DuelPoint,
  type DuelPokemonBuild,
  type DuelState,
  type DuelUnit,
  type DuelSpeciesId,
  type PokemonProgression,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import { BattleVfx } from "@/components/BattleVfx";
import { t, useLocale } from "@/lib/i18n";
import {
  localizedMoveName,
  localizeLogEntry,
  localizedSpeciesName,
} from "@/lib/i18n/names";
import { PokemonBattleSprite } from "@/components/PokemonBattleSprite";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import {
  TILE_SIZE,
  WORLD_ZOOM,
  type BattleSceneContext,
} from "@/lib/maps";
import { E2E_BATTLE_SPEED, isE2eMode } from "@/lib/e2eMode";
import type { StoryBadgeId } from "@/lib/story";

export type BattleOutcome = {
  won: boolean;
  escaped: boolean;
  escapedBy?: "player" | "rival";
  /** Trainer name or first wild Pokémon, for the results headline. */
  opponentName: string;
  opponentCount: number;
  inventory: DuelInventory;
  playerHp: number[];
  playerStatuses: DuelMajorStatus[];
  playerSleepTurnsRemaining: number[];
  playerMovePp: DuelMovePp[];
  defeatedEnemies: Array<{
    species: DuelSpeciesId;
    level: number;
  }>;
  capture?: {
    success: boolean;
    species: WildSpeciesId;
    level: number;
    xpRatio: number;
    status: DuelMajorStatus;
    sleepTurnsRemaining: number;
  };
};

export type BattleEncounter =
  | {
      kind: "trainer";
      trainerId?: string;
      trainerName?: string;
      rewardMoney?: number;
      badgeId?: StoryBadgeId;
      rivals?: readonly DuelPokemonBuild[];
    }
  | {
      kind: "wild";
      species: WildSpeciesId;
      level: number;
      wilds?: readonly {
        species: WildSpeciesId;
        level: number;
      }[];
      areaLevel?: number;
      equivalentPartyStrength?: number;
      /** One-off overworld battle (Snorlax, ghost, legendary bird). */
      staticId?: string;
    };

type Props = {
  starter: StarterSpeciesId;
  progression: PokemonProgression;
  party: readonly DuelPokemonBuild[];
  captureAllowed: boolean;
  inventory: DuelInventory;
  encounter: BattleEncounter;
  context: BattleSceneContext;
  onComplete: (outcome: BattleOutcome) => void;
  /** Options menu default; the battle HUD can still toggle it. */
  initialBattleSpeed?: number;
};

type CommandMode =
  | "root"
  | "walk"
  | "moves"
  | "move-target"
  | "items"
  | "item-target";

const FIRE_RED_ITEM_ICON = {
  get: itemIconUrl,
};

type SpriteAnimation = "idle" | "walk" | "attack" | "hurt" | "faint";
type Facing = "up" | "down" | "left" | "right";

type UnitAnimationState = {
  name: SpriteAnimation;
  nonce: number;
  facing?: Facing;
};

type FloaterKind =
  | "damage"
  | "super"
  | "resist"
  | "heal"
  | "miss"
  | "immune"
  | "status"
  | "stat-up"
  | "stat-down";

type Floater = {
  id: number;
  position: DuelPoint;
  text: string;
  kind: FloaterKind;
  /** Stagger so several numbers on one tile do not overlap. */
  offset: number;
};

type ProjectileEvent = {
  from: DuelPoint;
  to: DuelPoint;
  type: string;
  nonce: number;
};

const STAT_LABEL: Record<string, string> = {
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SP.ATK",
  "special-defense": "SP.DEF",
  accuracy: "ACC",
  evasion: "EVA",
  speed: "SPD",
};

const STATUS_LABEL: Record<string, string> = {
  poison: "PSN",
  burn: "BRN",
  paralysis: "PAR",
  sleep: "SLP",
  freeze: "FRZ",
};

const TYPE_FX_COLOR: Record<string, string> = {
  fire: "#ff7a1a",
  water: "#4aa8ff",
  electric: "#ffe14a",
  grass: "#59c844",
  bug: "#a8c820",
  ice: "#9be8ff",
  psychic: "#ff7bd0",
  ghost: "#8f6bd0",
  dark: "#5a4a6a",
  dragon: "#6a5cff",
  poison: "#b45ad6",
  ground: "#b08850",
  rock: "#8f8677",
  flying: "#e6f0ff",
  fighting: "#ff8a2a",
  steel: "#d8e0f0",
  normal: "#fff7d6",
};

type VfxEvent = {
  moveId: DuelMoveId;
  type?: string;
  category?: "physical" | "special" | "status";
  position: DuelPoint;
  nonce: number;
};

type CaptureThrowEvent = {
  from: DuelPoint;
  to: DuelPoint;
  nonce: number;
};

const STEP_ANIMATION_MS = 145;
const ATTACK_WINDUP_MS = 180;
/** Short FireRed-like vanish; fainted units must not linger on the board. */
const FAINT_VANISH_MS = 260;
/** Beat after the last action before the shared results screen opens. */
const BATTLE_END_BEAT_MS = 650;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hpPercent(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(100, (hp / maxHp) * 100));
}

function hpTone(hp: number, maxHp: number): "good" | "warn" | "danger" {
  const percent = hpPercent(hp, maxHp);
  if (percent <= 25) return "danger";
  if (percent <= 50) return "warn";
  return "good";
}

function stageBadges(unit: DuelUnit): Array<{
  label: string;
  tone: "buff" | "debuff";
}> {
  const badges: Array<{
    label: string;
    tone: "buff" | "debuff";
  }> = [];

  if (unit.attackStage !== 0) {
    badges.push({
      label: `ATK ${unit.attackStage > 0 ? "▲" : "▼"}${Math.abs(unit.attackStage)}`,
      tone: unit.attackStage > 0 ? "buff" : "debuff",
    });
  }

  if (unit.defenseStage !== 0) {
    badges.push({
      label: `DEF ${unit.defenseStage > 0 ? "▲" : "▼"}${Math.abs(unit.defenseStage)}`,
      tone: unit.defenseStage > 0 ? "buff" : "debuff",
    });
  }

  if (unit.specialAttackStage !== 0) {
    badges.push({
      label:
        `SP.ATK ${unit.specialAttackStage > 0 ? "▲" : "▼"}${Math.abs(unit.specialAttackStage)}`,
      tone:
        unit.specialAttackStage > 0
          ? "buff"
          : "debuff",
    });
  }

  if (unit.specialDefenseStage !== 0) {
    badges.push({
      label:
        `SP.DEF ${unit.specialDefenseStage > 0 ? "▲" : "▼"}${Math.abs(unit.specialDefenseStage)}`,
      tone:
        unit.specialDefenseStage > 0
          ? "buff"
          : "debuff",
    });
  }

  if (unit.accuracyStage !== 0) {
    badges.push({
      label:
        `ACC ${unit.accuracyStage > 0 ? "▲" : "▼"}${Math.abs(unit.accuracyStage)}`,
      tone:
        unit.accuracyStage > 0
          ? "buff"
          : "debuff",
    });
  }

  if (unit.evasionStage !== 0) {
    badges.push({
      label:
        `EVA ${unit.evasionStage > 0 ? "▲" : "▼"}${Math.abs(unit.evasionStage)}`,
      tone:
        unit.evasionStage > 0
          ? "buff"
          : "debuff",
    });
  }

  if (unit.speedStage !== 0) {
    badges.push({
      label: `SPD ${unit.speedStage > 0 ? "▲" : "▼"}${Math.abs(unit.speedStage)}`,
      tone: unit.speedStage > 0 ? "buff" : "debuff",
    });
  }

  return badges;
}

function majorStatusToken(
  status: DuelMajorStatus,
): { label: string; className: string } | null {
  if (status === "poison") {
    return { label: "PSN", className: "psn" };
  }
  if (status === "paralysis") {
    return { label: "PAR", className: "par" };
  }
  if (status === "burn") {
    return { label: "BRN", className: "brn" };
  }
  if (status === "sleep") {
    return { label: "SLP", className: "slp" };
  }
  return null;
}

function pointKey(point: DuelPoint): string {
  return `${point.x},${point.y}`;
}

function facingBetween(from: DuelPoint, to: DuelPoint): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return dx > 0 ? "right" : "left";
  }

  if (dy !== 0) {
    return dy > 0 ? "down" : "up";
  }

  return "right";
}

function findPath(
  state: DuelState,
  unitId: string,
  destination: DuelPoint,
): DuelPoint[] {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit) return [];

  const blocked = new Set(state.blocked.map(pointKey));
  const occupied = new Set(
    state.units
      .filter((candidate) => candidate.hp > 0 && candidate.id !== unitId)
      .map((candidate) => pointKey(candidate.position)),
  );

  const startKey = pointKey(unit.position);
  const destinationKey = pointKey(destination);
  const queue: DuelPoint[] = [{ ...unit.position }];
  const previous = new Map<string, string | null>([[startKey, null]]);
  const points = new Map<string, DuelPoint>([[startKey, { ...unit.position }]]);

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    const currentKey = pointKey(current);

    if (currentKey === destinationKey) {
      break;
    }

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
        next.x >= state.width ||
        next.y >= state.height ||
        blocked.has(key) ||
        occupied.has(key) ||
        previous.has(key)
      ) {
        continue;
      }

      previous.set(key, currentKey);
      points.set(key, next);
      queue.push(next);
    }
  }

  if (!previous.has(destinationKey)) {
    return [];
  }

  const reversed: DuelPoint[] = [];
  let cursor: string | null = destinationKey;

  while (cursor && cursor !== startKey) {
    const point = points.get(cursor);
    if (!point) break;
    reversed.push(point);
    cursor = previous.get(cursor) ?? null;
  }

  return reversed.reverse();
}

export function FirstBattle({
  starter,
  progression,
  party,
  captureAllowed,
  inventory,
  encounter,
  context,
  onComplete,
  initialBattleSpeed = 1,
}: Props) {
  useLocale();
  const initialState = useMemo(() => {
    const starterBuild: DuelPokemonBuild = {
      species: progression.species,
      level: progression.level,
      moves: progression.activeMoves,
      movePp: { ...progression.movePp },
      evs: progression.evs,
      currentHp: progression.currentHp,
      status: progression.status,
      sleepTurnsRemaining:
        progression.sleepTurnsRemaining,
    };
    const deployedParty =
      party.length > 0
        ? [...party].slice(0, 6)
        : [starterBuild];

    if (encounter.kind === "wild") {
      const openCells =
        context.arenaWidth * context.arenaHeight -
        context.blocked.length;
      const maxWilds = Math.max(
        1,
        Math.min(
          10,
          openCells - deployedParty.length,
        ),
      );
      const wilds = (
        encounter.wilds &&
        encounter.wilds.length > 0
          ? encounter.wilds
          : [
              {
                species: encounter.species,
                level: encounter.level,
              },
            ]
      ).slice(0, maxWilds);

      return createWildDuel({
        seed: context.seed,
        width: context.arenaWidth,
        height: context.arenaHeight,
        blocked: context.blocked,
        players: deployedParty,
        captureAllowed,
        items: inventory,
        wildSpecies: encounter.species,
        wildLevel: encounter.level,
        wilds,
      });
    }

    if (
      encounter.rivals &&
      encounter.rivals.length > 0
    ) {
      return createTrainerDuel({
        seed: context.seed,
        width: context.arenaWidth,
        height: context.arenaHeight,
        blocked: context.blocked,
        players: deployedParty,
        rivals: encounter.rivals,
        items: inventory,
        trainerName:
          encounter.trainerName ?? t("Rival Trainer"),
      });
    }

    return createStarterDuel(starter, {
      seed: context.seed,
      width: context.arenaWidth,
      height: context.arenaHeight,
      blocked: context.blocked,
      players: deployedParty,
      items: inventory,
    });
  }, [
    context,
    encounter,
    inventory,
    party,
    captureAllowed,
    progression,
    starter,
  ]);

  const [state, setState] = useState<DuelState>(initialState);
  const [command, setCommand] = useState<CommandMode>("root");
  const [selectedMove, setSelectedMove] = useState<DuelMoveId | null>(null);
  const [selectedItem, setSelectedItem] = useState<DuelItemId | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoBattle, setAutoBattle] = useState(() => isE2eMode());
  const [autoCatch, setAutoCatch] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState<number>(() =>
    isE2eMode() ? E2E_BATTLE_SPEED : initialBattleSpeed,
  );
  const [battleZoom, setBattleZoom] = useState<1 | 2 | 3>(
    WORLD_ZOOM as 3,
  );
  const [hoveredTargetId, setHoveredTargetId] =
    useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [vfx, setVfx] = useState<VfxEvent | null>(null);
  const [captureThrow, setCaptureThrow] =
    useState<CaptureThrowEvent | null>(null);
  const [animations, setAnimations] = useState<
    Record<string, UnitAnimationState>
  >({});
  const [hiddenUnitIds, setHiddenUnitIds] = useState<
    Set<string>
  >(() => new Set());
  const faintTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const [visualPositions, setVisualPositions] = useState<
    Record<string, DuelPoint>
  >(() =>
    Object.fromEntries(
      initialState.units.map((unit) => [
        unit.id,
        { ...unit.position },
      ]),
    ),
  );

  const aiRunningRef = useRef(false);
  const battleSpeedRef = useRef<number>(battleSpeed);
  const animationNonceRef = useRef(0);
  const vfxNonceRef = useRef(0);
  const captureThrowNonceRef = useRef(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterIdRef = useRef(0);
  const [projectile, setProjectile] = useState<ProjectileEvent | null>(
    null,
  );
  const projectileNonceRef = useRef(0);
  const vfxDoneRef = useRef<(() => void) | null>(null);

  const active = getActiveDuelUnit(state);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  // Hand the outcome to the single post-battle results screen (GameClient)
  // shortly after the last action; there is no in-battle result panel.
  useEffect(() => {
    if (state.status !== "finished" || completedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      const players = state.units.filter(
        (unit) => unit.side === "player",
      );
      const rivals = state.units.filter(
        (unit) => unit.side === "rival",
      );
      onCompleteRef.current({
        won: !state.escaped && state.winner === "player",
        escaped: state.escaped,
        escapedBy:
          state.escaped && state.escapedBy
            ? state.escapedBy
            : undefined,
        opponentName:
          encounter.kind === "trainer"
            ? encounter.trainerName ?? "Blue"
            : (rivals[0] ? localizedSpeciesName(rivals[0].species) : "Pokémon"),
        opponentCount: rivals.length,
        inventory: { ...state.items },
        playerHp: players.map((unit) => unit.hp),
        playerStatuses: players.map((unit) => unit.status),
        playerSleepTurnsRemaining: players.map(
          (unit) => unit.sleepTurnsRemaining,
        ),
        playerMovePp: players.map((unit) => ({ ...unit.movePp })),
        defeatedEnemies: rivals
          .filter((unit) => unit.hp <= 0)
          .map((unit) => ({
            species: unit.species,
            level: unit.level,
          })),
        capture:
          !state.escaped && state.captureResult
            ? {
                success: state.captureResult.success,
                species: state.captureResult.species,
                level: state.captureResult.level,
                xpRatio: state.captureResult.xpRatio,
                status: state.captureResult.status,
                sleepTurnsRemaining:
                  state.captureResult.sleepTurnsRemaining,
              }
            : undefined,
      });
    }, BATTLE_END_BEAT_MS / battleSpeedRef.current);

    return () => clearTimeout(timer);
  }, [encounter, state]);

  // A fainted unit is already gone for the engine (no tile, turn or
  // targeting). Visually it only plays a short vanish instead of the full
  // PMD faint animation, then leaves the board.
  useEffect(() => {
    const timers = faintTimersRef.current;
    for (const unit of state.units) {
      if (
        unit.hp > 0 ||
        hiddenUnitIds.has(unit.id) ||
        timers.has(unit.id)
      ) {
        continue;
      }

      timers.set(
        unit.id,
        setTimeout(() => {
          timers.delete(unit.id);
          setHiddenUnitIds((current) => {
            if (current.has(unit.id)) return current;
            const next = new Set(current);
            next.add(unit.id);
            return next;
          });
        }, FAINT_VANISH_MS / battleSpeedRef.current),
      );
    }
  }, [hiddenUnitIds, state.units]);

  useEffect(() => {
    const timers = faintTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const playerUnits = state.units.filter(
    (unit) => unit.side === "player",
  );
  const rivalUnits = state.units.filter(
    (unit) => unit.side === "rival",
  );
  const starterUnit = playerUnits[0]!;
  const player =
    active?.side === "player"
      ? active
      : starterUnit;
  const rival = rivalUnits[0]!;
  const trainerName =
    encounter.kind === "trainer"
      ? encounter.trainerName ?? "Blue"
      : null;
  const autoCatchReady =
    autoCatch &&
    state.status === "active" &&
    active?.side === "player" &&
    state.battleKind === "wild" &&
    state.captureAllowed &&
    (state.items["poke-ball"] ?? 0) > 0 &&
    state.units.some(
      (unit) =>
        unit.side === "rival" &&
        unit.hp > 0 &&
        isDuelAutoCatchTarget(
          state,
          unit.id,
        ),
    );
  const isPlayerTurn =
    state.status === "active" &&
    active?.side === "player" &&
    !active.chargingMove &&
    !busy &&
    !autoBattle &&
    !autoCatchReady;

  const blockedKeys = useMemo(
    () => new Set(state.blocked.map(pointKey)),
    [state.blocked],
  );

  const reachable = useMemo(
    () =>
      command === "walk" && isPlayerTurn
        ? getReachableCells(state, player.id)
        : [],
    [command, isPlayerTurn, player.id, state],
  );

  const reachableKeys = useMemo(
    () => new Set(reachable.map(pointKey)),
    [reachable],
  );

  const moveRangeKeys = useMemo(() => {
    if (command !== "move-target" || !selectedMove) {
      return new Set<string>();
    }

    const move = DUEL_MOVES[selectedMove];
    const keys = new Set<string>();

    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const distance = manhattanDistance(player.position, { x, y });
        if (
          distance >= move.minRange &&
          distance <= move.maxRange
        ) {
          keys.add(`${x},${y}`);
        }
      }
    }

    return keys;
  }, [command, player.position, selectedMove, state.height, state.width]);

  const areaPreviewUnitIds = useMemo(() => {
    if (
      command !== "move-target" ||
      !selectedMove ||
      !hoveredTargetId
    ) {
      return new Set<string>();
    }

    return new Set(
      getDuelMoveAreaTargetIds(
        state,
        player.id,
        selectedMove,
        hoveredTargetId,
      ),
    );
  }, [
    command,
    hoveredTargetId,
    player.id,
    selectedMove,
    state,
  ]);

  const targetableUnitIds = useMemo(() => {
    if (!isPlayerTurn) return new Set<string>();

    if (command === "move-target" && selectedMove) {
      const move = DUEL_MOVES[selectedMove];

      if (move.targeting === "self") {
        return new Set(
          player.hp > 0 ? [player.id] : [],
        );
      }

      return new Set(
        state.units
          .filter(
            (unit) =>
              unit.hp > 0 &&
              unit.side !== player.side &&
              manhattanDistance(player.position, unit.position) >=
                move.minRange &&
              manhattanDistance(player.position, unit.position) <=
                move.maxRange,
          )
          .map((unit) => unit.id),
      );
    }

    if (command === "item-target" && selectedItem) {
      const item = DUEL_ITEMS[selectedItem];
      if (item.kind === "capture") {
        return new Set(
          state.units
            .filter((unit) => getDuelCaptureEligibility(state, unit.id).allowed)
            .map((unit) => unit.id),
        );
      }
      if (item.kind === "cure") {
        const cures = item.cures as readonly string[];
        return new Set(
          state.units
            .filter(
              (unit) =>
                unit.hp > 0 &&
                unit.side === player.side &&
                unit.status !== null &&
                cures.includes(unit.status),
            )
            .map((unit) => unit.id),
        );
      }
      return new Set(
        state.units
          .filter(
            (unit) =>
              unit.hp > 0 &&
              unit.side === player.side &&
              unit.hp < unit.maxHp,
          )
          .map((unit) => unit.id),
      );
    }

    return new Set<string>();
  }, [
    command,
    isPlayerTurn,
    player.position,
    player.side,
    selectedItem,
    selectedMove,
    state.units,
  ]);

  const setUnitAnimation = (
    unitId: string,
    name: SpriteAnimation,
    facing?: Facing,
  ) => {
    animationNonceRef.current += 1;
    setAnimations((current) => ({
      ...current,
      [unitId]: {
        name,
        nonce: animationNonceRef.current,
        facing: facing ?? current[unitId]?.facing,
      },
    }));
  };

  const setVisualPosition = (unitId: string, position: DuelPoint) => {
    setVisualPositions((current) => ({
      ...current,
      [unitId]: { ...position },
    }));
  };

  const resetCommand = () => {
    setCommand("root");
    setSelectedMove(null);
    setSelectedItem(null);
  };

  const wait = (ms: number): Promise<void> =>
    sleep(ms / battleSpeedRef.current);

  const toggleBattleSpeed = () => {
    const next = battleSpeedRef.current === 1 ? 2 : 1;
    battleSpeedRef.current = next;
    setBattleSpeed(next);
  };

  const zoomBattleOut = () => {
    setBattleZoom((current) =>
      current === 3 ? 2 : 1,
    );
  };

  const zoomBattleIn = () => {
    setBattleZoom((current) =>
      current === 1 ? 2 : 3,
    );
  };

  const toggleAutoBattle = () => {
    const next = !autoBattle;
    if (next) {
      resetCommand();
    }
    setAutoBattle(next);
  };

  const toggleAutoCatch = () => {
    if (
      state.battleKind !== "wild" ||
      !state.captureAllowed
    ) {
      return;
    }

    const next = !autoCatch;
    if (next) {
      resetCommand();
    }
    setAutoCatch(next);
  };

  const flashNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 1800 / battleSpeedRef.current);
  };

  const spawnFloater = (
    position: DuelPoint,
    text: string,
    kind: FloaterKind,
    offset = 0,
  ) => {
    floaterIdRef.current += 1;
    const id = floaterIdRef.current;
    setFloaters((current) => [
      ...current,
      { id, position: { ...position }, text, kind, offset },
    ]);
    window.setTimeout(() => {
      setFloaters((current) =>
        current.filter((floater) => floater.id !== id),
      );
    }, 1050 / battleSpeed);
  };

  /** Damage / heal / miss / status numbers rising from each affected unit. */
  const showMoveFloaters = (
    presentation: Extract<DuelPresentationEvent, { kind: "move" }>,
    beforeState: DuelState,
    afterState: DuelState,
  ) => {
    const spotOf = (unitId: string) => {
      const unit = beforeState.units.find((entry) => entry.id === unitId);
      return unit
        ? (visualPositions[unitId] ?? unit.position)
        : null;
    };

    presentation.results.forEach((entry, index) => {
      const spot = spotOf(entry.targetId);
      if (!spot) return;
      const offset = index * 10;

      if (entry.missed) {
        spawnFloater(spot, t("MISS"), "miss", offset);
        return;
      }
      if (entry.typeEffectiveness === 0) {
        spawnFloater(spot, t("NO EFFECT"), "immune", offset);
      } else if (entry.damage > 0) {
        const effectiveness = entry.typeEffectiveness ?? 1;
        spawnFloater(
          spot,
          `-${entry.damage}`,
          effectiveness > 1
            ? "super"
            : effectiveness < 1
              ? "resist"
              : "damage",
          offset,
        );
      }
      if (entry.statusApplied) {
        spawnFloater(
          spot,
          STATUS_LABEL[entry.statusApplied] ?? entry.statusApplied,
          "status",
          offset + 14,
        );
      }
      entry.statChanges.forEach((change, changeIndex) => {
        const up = Math.abs(change.delta) > 1 ? "▲▲" : "▲";
        const down = Math.abs(change.delta) > 1 ? "▼▼" : "▼";
        spawnFloater(
          spot,
          `${STAT_LABEL[change.stat] ?? change.stat} ${
            change.delta > 0 ? up : down
          }`,
          change.delta > 0 ? "stat-up" : "stat-down",
          offset + 14 + changeIndex * 10,
        );
      });
    });

    // The attacker itself: drained HP (+) or recoil (-).
    const actorBefore = beforeState.units.find(
      (unit) => unit.id === presentation.actorId,
    );
    const actorAfter = afterState.units.find(
      (unit) => unit.id === presentation.actorId,
    );
    if (actorBefore && actorAfter && actorAfter.hp !== actorBefore.hp) {
      const spot =
        visualPositions[actorBefore.id] ?? actorBefore.position;
      const delta = actorAfter.hp - actorBefore.hp;
      spawnFloater(
        spot,
        delta > 0 ? `+${delta}` : `${delta}`,
        delta > 0 ? "heal" : "damage",
        -10,
      );
    }
  };

  const playProjectile = (
    from: DuelPoint,
    to: DuelPoint,
    type: string,
  ): Promise<void> => {
    projectileNonceRef.current += 1;
    setProjectile({
      from: { ...from },
      to: { ...to },
      type,
      nonce: projectileNonceRef.current,
    });
    return wait(270 / battleSpeed).then(() => setProjectile(null));
  };

  const playVfx = (
    moveId: DuelMoveId,
    position: DuelPoint,
  ): Promise<void> => {
    vfxNonceRef.current += 1;
    const move = DUEL_MOVES[moveId];

    return new Promise((resolve) => {
      vfxDoneRef.current = resolve;
      setVfx({
        moveId,
        type: move?.type,
        category: move?.category,
        position: { ...position },
        nonce: vfxNonceRef.current,
      });
    });
  };

  const animatePath = async (
    currentState: DuelState,
    unit: DuelUnit,
    destination: DuelPoint,
  ) => {
    const path = findPath(currentState, unit.id, destination);
    let previous = { ...unit.position };
    let lastFacing: Facing =
      unit.side === "player" ? "right" : "left";

    for (const step of path) {
      lastFacing = facingBetween(previous, step);
      setUnitAnimation(unit.id, "walk", lastFacing);
      setVisualPosition(unit.id, step);
      await wait(STEP_ANIMATION_MS);
      previous = step;
    }

    setUnitAnimation(unit.id, "idle", lastFacing);
  };

  const animateResolvedMove = async (
    beforeState: DuelState,
    result: DuelActionResult,
  ) => {
    const presentation = result.presentation;
    if (!presentation || presentation.kind !== "move") {
      setState(result.state);
      return;
    }

    const actor = beforeState.units.find(
      (unit) => unit.id === presentation.actorId,
    );
    const targetId = presentation.targetIds[0];
    const target = beforeState.units.find(
      (unit) => unit.id === targetId,
    );
    const targetResult = presentation.results.find(
      (entry) => entry.targetId === targetId,
    );
    const affectedTargets = presentation.results
      .map((entry) => ({
        entry,
        unit: beforeState.units.find(
          (unit) => unit.id === entry.targetId,
        ),
      }))
      .filter(
        (
          affected,
        ): affected is {
          entry: (typeof presentation.results)[number];
          unit: DuelUnit;
        } => Boolean(affected.unit),
      );

    if (!actor || !target) {
      setState(result.state);
      return;
    }

    if (presentation.charging) {
      setUnitAnimation(
        actor.id,
        "attack",
        facingBetween(
          actor.position,
          target.position,
        ),
      );
      setState(result.state);
      flashNotice(
        t("{name} is absorbing light!", {
          name: localizedSpeciesName(actor.species),
        }),
      );
      await wait(ATTACK_WINDUP_MS);
      setUnitAnimation(actor.id, "idle");
      return;
    }

    setUnitAnimation(
      actor.id,
      "attack",
      facingBetween(actor.position, target.position),
    );
    await wait(ATTACK_WINDUP_MS);

    if (presentation.motion === "projectile") {
      await playProjectile(
        visualPositions[actor.id] ?? actor.position,
        visualPositions[target.id] ?? target.position,
        DUEL_MOVES[presentation.moveId].type,
      );
    }

    const landedTargets = affectedTargets.filter(
      ({ entry }) => !entry.missed,
    );
    if (
      affectedTargets.length > 0 &&
      landedTargets.length === 0
    ) {
      setState(result.state);
      showMoveFloaters(presentation, beforeState, result.state);
      flashNotice(
        t("{move} missed!", {
          move: localizedMoveName(presentation.moveId),
        }),
      );
      setUnitAnimation(actor.id, "idle");
      await wait(100);
      return;
    }

    for (const { entry, unit } of affectedTargets) {
      if (!entry.missed && entry.damage > 0) {
        setUnitAnimation(unit.id, "hurt");
      }
    }

    await playVfx(
      presentation.vfxId,
      target.position,
    );

    setState(result.state);
    showMoveFloaters(presentation, beforeState, result.state);
    if ((targetResult?.hitCount ?? 0) > 1) {
      flashNotice(
        `${targetResult?.hitCount} acertos!`,
      );
    }
    for (const { entry, unit } of affectedTargets) {
      const nextTarget = result.state.units.find(
        (candidate) => candidate.id === unit.id,
      );

      if (!entry.missed && nextTarget?.hp === 0) {
        setUnitAnimation(unit.id, "faint");
      } else {
        setUnitAnimation(unit.id, "idle");
      }
    }

    setUnitAnimation(actor.id, "idle");
    await wait(100);
  };

  const animateResolvedItem = async (
    beforeState: DuelState,
    result: DuelActionResult,
  ) => {
    const presentation = result.presentation;
    if (
      !presentation ||
      (presentation.kind !== "item" &&
        presentation.kind !== "capture")
    ) {
      setState(result.state);
      return;
    }

    const targetId = presentation.targetIds[0];

    if (presentation.kind === "capture") {
      const actorBefore = beforeState.units.find(
        (unit) => unit.id === presentation.actorId,
      );
      const targetBefore = beforeState.units.find(
        (unit) => unit.id === targetId,
      );

      if (actorBefore && targetBefore) {
        setCaptureThrow({
          from:
            visualPositions[actorBefore.id] ??
            actorBefore.position,
          to:
            visualPositions[targetBefore.id] ??
            targetBefore.position,
          nonce: ++captureThrowNonceRef.current,
        });
        await wait(360);
        setCaptureThrow(null);
      }

      flashNotice(
        presentation.success
          ? t("Capture successful!")
          : t("The capture failed. The Pokémon ran away!"),
      );
      if (presentation.success) {
        setUnitAnimation(targetId, "faint");
      }
      setState(result.state);
      await wait(360);
      return;
    }

    setUnitAnimation(targetId, "idle");
    setState(result.state);
    if (presentation.healed > 0) {
      const healed = beforeState.units.find(
        (unit) => unit.id === targetId,
      );
      if (healed) {
        spawnFloater(
          visualPositions[healed.id] ?? healed.position,
          `+${presentation.healed}`,
          "heal",
        );
      }
    }
    flashNotice(
      t("{item} used.", {
        item: t(DUEL_ITEMS[presentation.itemId].name),
      }),
    );
    await wait(320);
  };

  const handleWalk = async (destination: DuelPoint) => {
    if (
      !isPlayerTurn ||
      busy ||
      !reachableKeys.has(pointKey(destination))
    ) {
      return;
    }

    const actor = getActiveDuelUnit(state);
    if (!actor || actor.side !== "player") return;

    const result = applyDuelAction(state, {
      kind: "move",
      unitId: actor.id,
      to: destination,
    });

    if (!result.accepted) {
      flashNotice(t("You cannot walk to that tile."));
      return;
    }

    setBusy(true);
    resetCommand();
    await animatePath(state, actor, destination);
    setState(result.state);
    setBusy(false);
  };

  const performMove = async (
    moveId: DuelMoveId,
    targetId: string,
  ) => {
    if (!isPlayerTurn || busy) return;

    const actor = getActiveDuelUnit(state);
    if (!actor || actor.side !== "player") return;

    const result = applyDuelAction(state, {
      kind: "use-move",
      unitId: actor.id,
      moveId,
      targetId,
    });

    if (!result.accepted) {
      flashNotice(
        result.reason === "target-out-of-range"
          ? t("The target is out of range.")
          : t("That move cannot be used right now."),
      );
      return;
    }

    setBusy(true);
    resetCommand();
    await animateResolvedMove(state, result);
    setBusy(false);
  };

  const performItem = async (
    itemId: DuelItemId,
    targetId: string,
  ) => {
    if (!isPlayerTurn || busy) return;

    const actor = getActiveDuelUnit(state);
    if (!actor || actor.side !== "player") return;

    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: actor.id,
      itemId,
      targetId,
    });

    if (!result.accepted) {
      flashNotice(
        result.reason === "target-full-hp"
          ? t("That Pokémon already has full HP.")
          : result.reason === "target-no-status"
            ? t("That Pokémon does not have that status condition.")
            : t("That item cannot be used right now."),
      );
      return;
    }

    setBusy(true);
    resetCommand();
    await animateResolvedItem(state, result);
    setBusy(false);
  };

  const handleUnitTarget = (unitId: string) => {
    if (!targetableUnitIds.has(unitId) || busy) {
      return;
    }

    if (command === "move-target" && selectedMove) {
      void performMove(selectedMove, unitId);
      return;
    }

    if (command === "item-target" && selectedItem) {
      void performItem(selectedItem, unitId);
    }
  };

  const handleFlee = () => {
    if (!isPlayerTurn || busy) return;
    const actor = getActiveDuelUnit(state);
    if (!actor || actor.side !== "player") return;

    const result = applyDuelAction(state, {
      kind: "flee",
      unitId: actor.id,
    });

    if (!result.accepted) {
      flashNotice(t("You cannot flee from a trainer battle."));
      return;
    }

    setState(result.state);
  };

  const endTurn = () => {
    if (!isPlayerTurn || busy) return;

    const actor = getActiveDuelUnit(state);
    if (!actor || actor.side !== "player") return;

    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: actor.id,
    });

    if (result.accepted) {
      resetCommand();
      setState(result.state);
    }
  };

  useEffect(() => {
    const shouldAutomate =
      state.status === "active" &&
      Boolean(active) &&
      (
        Boolean(active?.chargingMove) ||
        active?.side === "rival" ||
        autoBattle ||
        autoCatchReady
      );

    if (
      !shouldAutomate ||
      busy ||
      aiRunningRef.current ||
      !active
    ) {
      return;
    }

    const automatedSide = active.side;
    aiRunningRef.current = true;
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      void (async () => {
        setBusy(true);

        try {
          const turn = resolveSimpleAiTurnDetailed(
            state,
            automatedSide,
            {
              useItems:
                automatedSide === "rival" ||
                autoBattle,
              autoCapture:
                automatedSide === "player" &&
                autoCatch,
            },
          );
          let visualState = state;

          for (const step of turn.steps) {
            const presentation = step.presentation;

            if (presentation?.kind === "movement") {
              const actorBefore = visualState.units.find(
                (unit) =>
                  unit.id === presentation.actorId,
              );

              if (actorBefore) {
                await animatePath(
                  visualState,
                  actorBefore,
                  presentation.to,
                );
                setVisualPosition(
                  actorBefore.id,
                  presentation.to,
                );
              }

              setState(step.state);
            } else if (
              presentation?.kind === "move"
            ) {
              await animateResolvedMove(
                visualState,
                step,
              );
            } else if (
              presentation?.kind === "item" ||
              presentation?.kind === "capture"
            ) {
              await animateResolvedItem(
            visualState,
            step,
          );
            } else {
              setState(step.state);
            }

            visualState = step.state;
          }

          for (const unit of turn.state.units) {
            setVisualPosition(
              unit.id,
              unit.position,
            );
            if (unit.hp <= 0) {
              setUnitAnimation(
                unit.id,
                "faint",
              );
            }
          }

          setState(turn.state);
        } finally {
          setBusy(false);
          aiRunningRef.current = false;
        }
      })();
    }, 380 / battleSpeedRef.current);

    return () => {
      window.clearTimeout(timer);
      if (!started) {
        aiRunningRef.current = false;
      }
    };
  }, [
    active?.id,
    active?.side,
    autoBattle,
    autoCatch,
    autoCatchReady,
    battleSpeed,
    busy,
    state,
  ]);

  const menuPosition =
    visualPositions[player.id] ?? player.position;
  const menuLeft = Math.max(
    16,
    Math.min(
      84,
      ((menuPosition.x + 0.5) / state.width) * 100,
    ),
  );
  const menuTop = Math.max(
    10,
    Math.min(
      90,
      ((menuPosition.y + 0.5) / state.height) * 100,
    ),
  );
  const menuPlacement =
    menuPosition.y < state.height / 2 ? "below" : "above";
  const latestMessage =
    notice ??
    localizeLogEntry(
      state.logData[state.logData.length - 1],
      state.log[state.log.length - 1] ?? "",
    );

  const battleTilePixels =
    TILE_SIZE * battleZoom;
  const battleArenaWidth =
    state.width * battleTilePixels;
  const battleArenaHeight =
    state.height * battleTilePixels;
  const naturalMapWidth =
    context.mapWidth * TILE_SIZE * battleZoom;
  const naturalMapHeight =
    context.mapHeight * TILE_SIZE * battleZoom;
  const orderedTurnIds = [
    ...state.turnOrder.slice(state.turnIndex),
    ...state.turnOrder.slice(0, state.turnIndex),
  ];
  const actionOrderUnits = orderedTurnIds
    .map((id) =>
      state.units.find((unit) => unit.id === id),
    )
    .filter(
      (unit): unit is DuelUnit =>
        Boolean(unit && unit.hp > 0),
    );

  const renderCombatantHud = (
    unit: (typeof state.units)[number],
  ) => {
    const badges = stageBadges(unit);
    const statusToken = majorStatusToken(unit.status);
    const healthTone = hpTone(unit.hp, unit.maxHp);
    const isPlayer = unit.side === "player";

    return (
      <section
        key={unit.id}
        className={[
          "combatant-hud",
          unit.side,
          unit.ownerKind === "party-member"
            ? "party-member"
            : "",
          statusToken || badges.length > 0 ? "has-status" : "",
          active?.id === unit.id ? "active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <PokemonPortrait
          species={unit.species}
          name={localizedSpeciesName(unit.species)}
        />

        <div className="combatant-hud-body">
          <div className="combatant-name-row">
            <div className="combatant-identity">
              <strong>{localizedSpeciesName(unit.species)}</strong>
              <span className="combatant-level">
                Lv. {unit.level}
              </span>
              <span
                className={`combatant-type type-${unit.type}`}
              >
                {unit.types
                  .map((type) => t(type.toUpperCase()).toLowerCase())
                  .join("/")}
              </span>
            </div>
            <span className="combatant-side-label">
              {isPlayer
                ? t("YOUR POKÉMON")
                : encounter.kind === "wild"
                  ? t("WILD")
                  : trainerName
                    ? t(trainerName).toUpperCase()
                    : t("RIVAL")}
            </span>
          </div>

          <div className="combatant-resource-block">
            <div className="combatant-resource-heading">
              <span>HP</span>
              <strong>
                {unit.hp} / {unit.maxHp}
              </strong>
            </div>
            <div className="combatant-hp-track">
              <div
                className={`combatant-hp-fill ${healthTone}`}
                style={{
                  width: `${hpPercent(unit.hp, unit.maxHp)}%`,
                }}
              />
            </div>
          </div>

          <div className="combatant-meta-row">
            <span className="resource-chip">
              AP {unit.ap}/{unit.maxAp}
            </span>
            <span className="resource-chip">
              MP {unit.mp}/{unit.maxMp}
            </span>
            {statusToken ? (
              <span
                className={`status-chip major ${statusToken.className}`}
              >
                {statusToken.label}
              </span>
            ) : null}
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={`status-chip stage ${badge.tone}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div
      className={`battle-overlay battle-speed-${battleSpeed}`}
    >
      <div className="battle-shell battle-shell-clean">
        <header className="battle-minimal-header">
          <div className="battle-minimal-title">
            <span className="eyebrow">
              {encounter.kind === "wild"
                ? t("WILD ENCOUNTER")
                : encounter.rivals?.length
                  ? t("TRAINER BATTLE")
                  : t("FIRST BATTLE")}
            </span>
            <strong>
              {encounter.kind === "wild"
                ? rivalUnits.length > 1
                  ? t("{count} wild Pokémon", {
                      count: rivalUnits.length,
                    })
                  : t("Wild {name}", {
                      name: localizedSpeciesName(rival.species),
                    })
                : t("You vs. {name}", {
                    name: t(trainerName ?? ""),
                  })}
            </strong>
            <small>{context.mapLabel}</small>
          </div>

          <div
            className="battle-action-order"
            aria-label={t("Action order")}
          >
            <span className="battle-action-order-label">
              {t("ORDER")}
            </span>
            <div className="battle-action-order-list">
              {actionOrderUnits.map((unit, index) => (
                <div
                  key={`${unit.id}-order-${index}`}
                  className={[
                    "battle-action-order-entry",
                    unit.side,
                    unit.ownerKind === "party-member"
                      ? "party-member"
                      : "",
                    index === 0 ? "current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={`${index + 1}. ${localizedSpeciesName(unit.species)}`}
                >
                  <PokemonPortrait
                    species={unit.species}
                    name={localizedSpeciesName(unit.species)}
                    compact
                  />
                  <span>{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="battle-round-cluster">
            <div className="battle-turn">
              {t("Round {round}", { round: state.round })} ·{" "}
              {state.status === "finished"
                ? t("End")
                : active
                  ? t("{name}'s turn", {
                      name: localizedSpeciesName(active.species),
                    })
                  : t("Waiting")}
              {state.weather === "rain"
                ? ` · ${t("Rain {turns}", {
                    turns: state.weatherTurnsRemaining,
                  })}`
                : ""}
            </div>
            <div className="battle-control-row">
              <button
                type="button"
                className={[
                  "battle-control-toggle",
                  autoBattle ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={state.status === "finished"}
                onClick={toggleAutoBattle}
              >
                {autoBattle ? t("Auto ON") : t("Auto OFF")}
              </button>
              <button
                type="button"
                className={[
                  "battle-control-toggle",
                  autoCatch ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={
                  state.status === "finished" ||
                  state.battleKind !== "wild" ||
                  !state.captureAllowed
                }
                onClick={toggleAutoCatch}
                title={t(
                  "Auto Catch uses a Poké Ball automatically on a wild Pokémon with 30% HP or less.",
                )}
              >
                {autoCatch ? t("Auto Catch ON") : t("Auto Catch OFF")}
              </button>
              <button
                type="button"
                className={[
                  "battle-control-toggle",
                  battleSpeed === 2 ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={toggleBattleSpeed}
              >
                {t("{speed}× Speed", { speed: battleSpeed })}
              </button>
              <div
                className="battle-zoom-control"
                aria-label={t("Arena zoom")}
              >
                <button
                  type="button"
                  disabled={battleZoom === 1}
                  onClick={zoomBattleOut}
                >
                  −
                </button>
                <span>{t("MAP {zoom}×", { zoom: battleZoom })}</span>
                <button
                  type="button"
                  disabled={battleZoom === 3}
                  onClick={zoomBattleIn}
                >
                  +
                </button>
              </div>
              {(command === "walk" ||
                command === "move-target" ||
                command === "item-target") &&
                isPlayerTurn && (
                  <button
                    type="button"
                    className="end-turn-compact"
                    onClick={resetCommand}
                  >
                    {t("Cancel action")}
                  </button>
                )}
            </div>
          </div>
        </header>

        <div className="battle-stage-layout">
          <aside
            className="battle-combatant-sidebar player"
            aria-label={t("Your team")}
          >
            <div className="battle-combatant-sidebar-title">
              {t("YOUR TEAM")}
            </div>
            {playerUnits.map(renderCombatantHud)}
          </aside>

          <div className="battle-arena-scroll">
          <div
            className="duel-grid-shell clean-arena"
            style={{
              width: `${battleArenaWidth + 20}px`,
              height: `${battleArenaHeight + 20}px`,
              minWidth: `${battleArenaWidth + 20}px`,
              minHeight: `${battleArenaHeight + 20}px`,
            }}
          >
          <div className="duel-map-crop" aria-hidden="true">
            <div
              className="duel-map-render"
              style={{
                width: `${naturalMapWidth}px`,
                height: `${naturalMapHeight}px`,
                left:
                  `${-context.cropX * battleTilePixels}px`,
                top:
                  `${-context.cropY * battleTilePixels}px`,
                backgroundImage:
                  `url("${context.previewUrl}")`,
                backgroundSize:
                  `${naturalMapWidth}px ${naturalMapHeight}px`,
              }}
            />
          </div>

          <div
            className="duel-grid"
            style={{
              gridTemplateColumns:
                `repeat(${state.width}, ${battleTilePixels}px)`,
              gridTemplateRows:
                `repeat(${state.height}, ${battleTilePixels}px)`,
            }}
          >
            {Array.from({
              length: state.width * state.height,
            }).map((_, index) => {
              const x = index % state.width;
              const y = Math.floor(index / state.width);
              const key = `${x},${y}`;
              const reachableCell = reachableKeys.has(key);
              const blockedCell = blockedKeys.has(key);
              const inMoveRange = moveRangeKeys.has(key);
              const targetOnCell = state.units.find(
                (unit) =>
                  unit.hp > 0 &&
                  unit.position.x === x &&
                  unit.position.y === y &&
                  targetableUnitIds.has(unit.id),
              );

              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "duel-cell",
                    reachableCell ? "reachable" : "",
                    blockedCell ? "blocked-terrain" : "",
                    inMoveRange ? "move-range" : "",
                    targetOnCell ? "target-cell" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (targetOnCell) {
                      handleUnitTarget(targetOnCell.id);
                    } else if (reachableCell) {
                      void handleWalk({ x, y });
                    }
                  }}
                  disabled={
                    blockedCell ||
                    busy ||
                    (!reachableCell && !targetOnCell)
                  }
                  aria-label={t("Tile {x}, {y}", { x, y })}
                />
              );
            })}
          </div>

          <div className="duel-units-layer">
            {state.units
              .filter(
                (unit) => !hiddenUnitIds.has(unit.id),
              )
              .map((unit) => {
              const position =
                visualPositions[unit.id] ?? unit.position;
              const requestedAnimation =
                animations[unit.id];
              const fainted = unit.hp <= 0;
              const animation: UnitAnimationState =
                fainted
                  ? {
                      name: "hurt",
                      nonce: 0,
                      facing:
                        requestedAnimation?.facing ??
                        (unit.side === "player"
                          ? "right"
                          : "left"),
                    }
                  : requestedAnimation ?? {
                      name: "idle",
                      nonce: 0,
                      facing:
                        unit.side === "player"
                          ? "right"
                          : "left",
                    };
              const targetable = targetableUnitIds.has(unit.id);
              const moveEffectiveness =
                selectedMove &&
                unit.side === "rival" &&
                unit.hp > 0 &&
                DUEL_MOVES[selectedMove].category !== "status"
                  ? calculateTypeEffectiveness(
                      DUEL_MOVES[selectedMove].type,
                      unit.types,
                    )
                  : null;

              return (
                <button
                  key={unit.id}
                  type="button"
                  className={[
                    "duel-unit-position",
                    unit.side,
                    unit.ownerKind === "party-member"
                      ? "party-member"
                      : "",
                    position.y > 0 &&
                    (position.x + position.y) % 2 === 0
                      ? "label-above"
                      : "label-below",
                    targetable ? "targetable" : "",
                    areaPreviewUnitIds.has(unit.id)
                      ? "area-preview"
                      : "",
                    active?.id === unit.id ? "active-unit" : "",
                    fainted ? "fainting" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: `${(position.x / state.width) * 100}%`,
                    top: `${(position.y / state.height) * 100}%`,
                    width: `${100 / state.width}%`,
                    height: `${100 / state.height}%`,
                  }}
                  onClick={() => handleUnitTarget(unit.id)}
                  onMouseEnter={() => {
                    if (
                      targetable ||
                      moveEffectiveness !== null
                    ) {
                      setHoveredTargetId(unit.id);
                    }
                  }}
                  onMouseLeave={() =>
                    setHoveredTargetId((current) =>
                      current === unit.id ? null : current,
                    )
                  }
                  aria-disabled={!targetable || busy || fainted}
                  disabled={busy || fainted}
                >
                  <div className="duel-unit">
                    <PokemonBattleSprite
                      key={`${unit.id}-${animation.name}-${animation.nonce}`}
                      species={unit.species}
                      side={unit.side}
                      animation={animation.name}
                      facing={animation.facing}
                      speed={battleSpeed}
                    />
                    <span className="duel-unit-label">
                      {localizedSpeciesName(unit.species)}
                    </span>
                    {hoveredTargetId === unit.id &&
                      moveEffectiveness !== null && (
                        <span
                          className={[
                            "move-effectiveness-preview",
                            moveEffectiveness === 0
                              ? "immune"
                              : moveEffectiveness > 1
                                ? "super"
                                : moveEffectiveness < 1
                                  ? "resisted"
                                  : "neutral",
                          ].join(" ")}
                        >
                          {moveEffectiveness === 0
                            ? t("NO EFFECT")
                            : moveEffectiveness > 1
                              ? t("SUPER EFFECTIVE")
                              : moveEffectiveness < 1
                                ? t("NOT VERY EFFECTIVE")
                                : t("NORMAL DAMAGE")}
                        </span>
                      )}
                  </div>
                </button>
              );
            })}

            {isPlayerTurn &&
              state.status === "active" &&
              command === "root" && (
                <div
                  className={`battle-action-popover mode-root menu-${menuPlacement}`}
                  style={{
                    left: `${menuLeft}%`,
                    top: `${menuTop}%`,
                  }}
                >
                  <div className="battle-action-popover-caret" />
                  <div className="battle-action-list">
                    <button
                      type="button"
                      disabled={player.mp <= 0}
                      onClick={() => setCommand("walk")}
                    >
                      <strong>{t("Move")}</strong>
                      <span>{player.mp} MP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommand("moves")}
                    >
                      <strong>{t("Attack")}</strong>
                      <span>{player.ap} AP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommand("items")}
                    >
                      <strong>{t("Item")}</strong>
                      <span>
                        {t("Potion ×{count}", {
                          count: state.items.potion,
                        })}
                        {state.items["poke-ball"] > 0
                          ? ` · ${t("Ball ×{count}", {
                              count: state.items["poke-ball"],
                            })}`
                          : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="run-action"
                      onClick={handleFlee}
                    >
                      <strong>{t("Run")}</strong>
                      <span>{t("Escape")}</span>
                    </button>
                    <button
                      type="button"
                      className="end-turn-action"
                      onClick={endTurn}
                    >
                      <strong>{t("End turn")}</strong>
                      <span>{t("Pass to the next")}</span>
                    </button>
                  </div>
                </div>
              )}

            {captureThrow && (
              <div
                key={captureThrow.nonce}
                className="capture-throw-position"
                style={{
                  left: `${(captureThrow.from.x / state.width) * 100}%`,
                  top: `${(captureThrow.from.y / state.height) * 100}%`,
                  width: `${100 / state.width}%`,
                  height: `${100 / state.height}%`,
                  "--capture-dx":
                    `${(captureThrow.to.x - captureThrow.from.x) * 100}%`,
                  "--capture-dy":
                    `${(captureThrow.to.y - captureThrow.from.y) * 100}%`,
                  "--capture-half-dx":
                    `${(captureThrow.to.x - captureThrow.from.x) * 50}%`,
                  "--capture-half-dy":
                    `${(captureThrow.to.y - captureThrow.from.y) * 50}%`,
                } as CSSProperties}
              >
                <img
                  src={FIRE_RED_ITEM_ICON.get("poke-ball")}
                  alt=""
                />
              </div>
            )}

            {projectile && (
              <div
                key={projectile.nonce}
                className="battle-projectile-position"
                style={{
                  left: `${(projectile.from.x / state.width) * 100}%`,
                  top: `${(projectile.from.y / state.height) * 100}%`,
                  width: `${100 / state.width}%`,
                  height: `${100 / state.height}%`,
                  "--proj": TYPE_FX_COLOR[projectile.type] ?? "#fff",
                  "--proj-dx": `${(projectile.to.x - projectile.from.x) * 100}%`,
                  "--proj-dy": `${(projectile.to.y - projectile.from.y) * 100}%`,
                } as CSSProperties}
              >
                <span />
              </div>
            )}

            {floaters.map((floater) => (
              <div
                key={floater.id}
                className="battle-floater-position"
                style={{
                  left: `${(floater.position.x / state.width) * 100}%`,
                  top: `${(floater.position.y / state.height) * 100}%`,
                  width: `${100 / state.width}%`,
                  height: `${100 / state.height}%`,
                  transform: `translateY(${-(floater.offset + 18)}px)`,
                }}
              >
                <span className={`battle-floater ${floater.kind}`}>
                  {floater.text}
                </span>
              </div>
            ))}

            {vfx && (
              <div
                className="battle-vfx-position"
                style={{
                  left: `${(vfx.position.x / state.width) * 100}%`,
                  top: `${(vfx.position.y / state.height) * 100}%`,
                  width: `${100 / state.width}%`,
                  height: `${100 / state.height}%`,
                }}
              >
                <BattleVfx
                  moveId={vfx.moveId}
                  type={vfx.type}
                  category={vfx.category}
                  nonce={vfx.nonce}
                  speed={battleSpeed}
                  onComplete={() => {
                    const done = vfxDoneRef.current;
                    vfxDoneRef.current = null;
                    setVfx(null);
                    done?.();
                  }}
                />
              </div>
            )}
          </div>

          {busy && (
            <div className="battle-busy-indicator">
              {autoBattle
                ? t("Auto Battle · {speed}×", { speed: battleSpeed })
                : autoCatchReady
                  ? t("Auto Catch · {speed}×", { speed: battleSpeed })
                  : t("Resolving action…")}
            </div>
          )}
          </div>
        </div>

          <aside
            className="battle-combatant-sidebar rival"
            aria-label={
              encounter.kind === "wild"
                ? t("Wild Pokémon")
                : t("Rival team")
            }
          >
            <div className="battle-combatant-sidebar-title">
              {encounter.kind === "wild"
                ? t("WILD")
                : t("RIVAL TEAM")}
            </div>
            {rivalUnits.map(renderCombatantHud)}
          </aside>
        </div>

        {isPlayerTurn &&
          state.status === "active" &&
          (command === "moves" ||
            command === "items") && (
            <div className="battle-selection-dock">
              {command === "moves" && (
                <>
                  <div className="battle-selection-dock-title">
                    <strong>{t("Choose a move")}</strong>
                    <span>{t("{ap} AP available", { ap: player.ap })}</span>
                  </div>
                  <div className="battle-selection-dock-grid">
                    {[
                      ...player.moves,
                      ...(player.moves.length > 0 &&
                      player.moves.every(
                        (moveId) =>
                          getDuelMovePp(player, moveId) <= 0 ||
                          (
                            player.disabledMove === moveId &&
                            player.disableTurnsRemaining > 0
                          ),
                      )
                        ? (["struggle"] as DuelMoveId[])
                        : []),
                    ].map((moveId) => {
                      const move = DUEL_MOVES[moveId];
                      const currentPp =
                        moveId === "struggle"
                          ? null
                          : getDuelMovePp(player, moveId);
                      const hasPp =
                        moveId === "struggle" ||
                        (currentPp ?? 0) > 0;
                      const isDisabled =
                        moveId !== "struggle" &&
                        player.disabledMove === moveId &&
                        player.disableTurnsRemaining > 0;
                      const canPay =
                        player.ap >= move.apCost &&
                        hasPp &&
                        !isDisabled;

                      return (
                        <button
                          key={moveId}
                          type="button"
                          disabled={!canPay}
                          onClick={() => {
                            setSelectedMove(moveId);
                            setCommand("move-target");
                          }}
                        >
                          <strong>{localizedMoveName(moveId)}</strong>
                          <span>
                            {move.apCost} AP ·{" "}
                            {moveId === "struggle"
                              ? "PP —"
                              : isDisabled
                                ? t("DISABLED {turns} · PP {pp} / {max}", {
                                    turns: player.disableTurnsRemaining,
                                    pp: currentPp ?? 0,
                                    max: move.maxPp,
                                  })
                                : `PP ${currentPp} / ${move.maxPp}`} ·{" "}
                            {move.targeting === "self"
                              ? t("self")
                              : `${move.minRange}–${move.maxRange}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {command === "items" && (
                <>
                  <div className="battle-selection-dock-title">
                    <strong>{t("Choose an item")}</strong>
                    <span>{t("Battle bag")}</span>
                  </div>
                  <div className="battle-selection-dock-grid">
                    {(Object.keys(DUEL_ITEMS) as DuelItemId[])
                      .filter(
                        (itemId) =>
                          DUEL_ITEMS[itemId].kind !== "capture" ||
                          state.battleKind === "wild",
                      )
                      .map((itemId) => {
                        const item = DUEL_ITEMS[itemId];
                        const amount =
                          state.items[itemId] ?? 0;

                        return (
                          <button
                            key={itemId}
                            type="button"
                            disabled={amount <= 0}
                            onClick={() => {
                              setSelectedItem(itemId);
                              setCommand("item-target");
                            }}
                          >
                            <span className="battle-item-choice-name">
                              <img
                                src={FIRE_RED_ITEM_ICON.get(itemId)}
                                alt=""
                                aria-hidden="true"
                              />
                              <strong>{t(item.name)}</strong>
                            </span>
                            <span>
                              ×{amount} ·{" "}
                              {item.kind === "heal"
                                ? `+${item.heal} HP`
                                : item.kind === "cure"
                                  ? t("cures status")
                                : state.captureAllowed
                                  ? t("captures at HP ≤50%")
                                  : t("capture unavailable")}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              <button
                type="button"
                className="battle-selection-dock-back"
                onClick={resetCommand}
              >
                {t("← Back")}
              </button>
            </div>
          )}

        <div className="battle-message-strip">
          <span>{latestMessage}</span>
        </div>

      </div>
    </div>
  );
}
