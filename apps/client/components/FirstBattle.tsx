"use client";

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
import { PokemonBattleSprite } from "@/components/PokemonBattleSprite";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import {
  TILE_SIZE,
  WORLD_ZOOM,
  type BattleSceneContext,
} from "@/lib/maps";
import type { StoryBadgeId } from "@/lib/story";

export type BattleOutcome = {
  won: boolean;
  escaped: boolean;
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
};

type CommandMode =
  | "root"
  | "walk"
  | "moves"
  | "move-target"
  | "items"
  | "item-target";

const FIRE_RED_ITEM_ICON: Record<
  DuelItemId,
  string
> = {
  potion:
    "/game-assets/firered/ui/items/013_potion.png",
  "poke-ball":
    "/game-assets/firered/ui/items/004_poke_ball.png",
};

type SpriteAnimation = "idle" | "walk" | "attack" | "hurt" | "faint";
type Facing = "up" | "down" | "left" | "right";

type UnitAnimationState = {
  name: SpriteAnimation;
  nonce: number;
  facing?: Facing;
};

type VfxEvent = {
  moveId: DuelMoveId;
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
}: Props) {
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
          encounter.trainerName ?? "Treinador rival",
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
  const [autoBattle, setAutoBattle] = useState(false);
  const [autoCatch, setAutoCatch] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2>(1);
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
  const battleSpeedRef = useRef<1 | 2>(1);
  const animationNonceRef = useRef(0);
  const vfxNonceRef = useRef(0);
  const captureThrowNonceRef = useRef(0);
  const vfxDoneRef = useRef<(() => void) | null>(null);

  const active = getActiveDuelUnit(state);
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
  const resultRival =
    state.captureResult
      ? rivalUnits.find(
          (unit) =>
            unit.species ===
              state.captureResult?.species &&
            unit.level ===
              state.captureResult?.level,
        ) ?? rival
      : rival;
  const trainerName =
    encounter.kind === "trainer"
      ? encounter.trainerName ?? "Blue"
      : null;
  const defeatedEnemies = state.units
    .filter(
      (unit) =>
        unit.side === "rival" &&
        unit.hp <= 0,
    )
    .map((unit) => ({
      species: unit.species,
      level: unit.level,
    }));
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
    const next: 1 | 2 =
      battleSpeedRef.current === 1 ? 2 : 1;
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

  const playVfx = (
    moveId: DuelMoveId,
    position: DuelPoint,
  ): Promise<void> => {
    vfxNonceRef.current += 1;

    return new Promise((resolve) => {
      vfxDoneRef.current = resolve;
      setVfx({
        moveId,
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
        `${actor.displayName} está absorvendo luz!`,
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

    const landedTargets = affectedTargets.filter(
      ({ entry }) => !entry.missed,
    );
    if (
      affectedTargets.length > 0 &&
      landedTargets.length === 0
    ) {
      setState(result.state);
      flashNotice(
        `${DUEL_MOVES[presentation.moveId].name} errou!`,
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
          ? "Captura bem-sucedida!"
          : "A captura falhou. O Pokémon fugiu!",
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
    flashNotice(
      `${DUEL_ITEMS[presentation.itemId].name} usada.`,
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
      flashNotice("Não é possível andar até esse tile.");
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
          ? "O alvo está fora do alcance."
          : "Esse golpe não pode ser usado agora.",
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
          ? "Esse Pokémon já está com HP cheio."
          : "Não é possível usar esse item agora.",
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
      flashNotice("Você não pode fugir de uma batalha de treinador.");
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
    notice ?? state.log[state.log.length - 1] ?? "";

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
          name={unit.displayName}
        />

        <div className="combatant-hud-body">
          <div className="combatant-name-row">
            <div className="combatant-identity">
              <strong>{unit.displayName}</strong>
              <span className="combatant-level">
                Lv. {unit.level}
              </span>
              <span
                className={`combatant-type type-${unit.type}`}
              >
                {unit.types.join("/")}
              </span>
            </div>
            <span className="combatant-side-label">
              {isPlayer
                ? "SEU POKÉMON"
                : encounter.kind === "wild"
                  ? "SELVAGEM"
                  : trainerName?.toUpperCase() ?? "RIVAL"}
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
                ? "ENCONTRO SELVAGEM"
                : encounter.rivals?.length
                  ? "BATALHA DE TREINADOR"
                  : "PRIMEIRO COMBATE"}
            </span>
            <strong>
              {encounter.kind === "wild"
                ? rivalUnits.length > 1
                  ? `${rivalUnits.length} Pokémon selvagens`
                  : `${rival.displayName} selvagem`
                : `Você vs. ${trainerName}`}
            </strong>
            <small>{context.mapLabel}</small>
          </div>

          <div
            className="battle-action-order"
            aria-label="Ordem das ações"
          >
            <span className="battle-action-order-label">
              ORDEM
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
                  title={`${index + 1}. ${unit.displayName}`}
                >
                  <PokemonPortrait
                    species={unit.species}
                    name={unit.displayName}
                    compact
                  />
                  <span>{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="battle-round-cluster">
            <div className="battle-turn">
              Round {state.round} ·{" "}
              {state.status === "finished"
                ? "Fim"
                : active
                  ? `Turno de ${active.displayName}`
                  : "Aguardando"}
              {state.weather === "rain"
                ? ` · Chuva ${state.weatherTurnsRemaining}`
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
                Auto {autoBattle ? "ON" : "OFF"}
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
                title="Auto Catch usa Poké Ball automaticamente em Pokémon selvagem com 30% de HP ou menos."
              >
                Auto Catch {autoCatch ? "ON" : "OFF"}
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
                {battleSpeed}× Speed
              </button>
              <div
                className="battle-zoom-control"
                aria-label="Zoom da arena"
              >
                <button
                  type="button"
                  disabled={battleZoom === 1}
                  onClick={zoomBattleOut}
                >
                  −
                </button>
                <span>MAP {battleZoom}×</span>
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
                    Cancelar ação
                  </button>
                )}
            </div>
          </div>
        </header>

        <div className="battle-stage-layout">
          <aside
            className="battle-combatant-sidebar player"
            aria-label="Sua equipe"
          >
            <div className="battle-combatant-sidebar-title">
              SUA EQUIPE
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
                  aria-label={`Tile ${x}, ${y}`}
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
                      {unit.displayName}
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
                            ? "SEM EFEITO"
                            : moveEffectiveness > 1
                              ? "SUPER EFETIVO"
                              : moveEffectiveness < 1
                                ? "POUCO EFETIVO"
                                : "DANO NORMAL"}
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
                      <strong>Move</strong>
                      <span>{player.mp} MP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommand("moves")}
                    >
                      <strong>Attack</strong>
                      <span>{player.ap} AP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommand("items")}
                    >
                      <strong>Item</strong>
                      <span>
                        Potion ×{state.items.potion}
                        {state.items["poke-ball"] > 0
                          ? ` · Ball ×${state.items["poke-ball"]}`
                          : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="run-action"
                      onClick={handleFlee}
                    >
                      <strong>Run</strong>
                      <span>Escape</span>
                    </button>
                    <button
                      type="button"
                      className="end-turn-action"
                      onClick={endTurn}
                    >
                      <strong>Encerrar turno</strong>
                      <span>Passar para o próximo</span>
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
                  src={FIRE_RED_ITEM_ICON["poke-ball"]}
                  alt=""
                />
              </div>
            )}

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
                ? `Auto Battle · ${battleSpeed}×`
                : autoCatchReady
                  ? `Auto Catch · ${battleSpeed}×`
                  : "Resolvendo ação…"}
            </div>
          )}
          </div>
        </div>

          <aside
            className="battle-combatant-sidebar rival"
            aria-label={
              encounter.kind === "wild"
                ? "Pokémon selvagens"
                : "Equipe rival"
            }
          >
            <div className="battle-combatant-sidebar-title">
              {encounter.kind === "wild"
                ? "SELVAGENS"
                : "EQUIPE RIVAL"}
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
                    <strong>Escolha um golpe</strong>
                    <span>{player.ap} AP disponível</span>
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
                          <strong>{move.name}</strong>
                          <span>
                            {move.apCost} AP ·{" "}
                            {moveId === "struggle"
                              ? "PP —"
                              : isDisabled
                                ? `DESABILITADO ${player.disableTurnsRemaining} · PP ${currentPp} / ${move.maxPp}`
                                : `PP ${currentPp} / ${move.maxPp}`} ·{" "}
                            {move.targeting === "self"
                              ? "self"
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
                    <strong>Escolha um item</strong>
                    <span>Bolsa de batalha</span>
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
                                src={FIRE_RED_ITEM_ICON[itemId]}
                                alt=""
                                aria-hidden="true"
                              />
                              <strong>{item.name}</strong>
                            </span>
                            <span>
                              ×{amount} ·{" "}
                              {item.kind === "heal"
                                ? `+${item.heal} HP`
                                : state.captureAllowed
                                  ? "captura com HP ≤50%"
                                  : "captura indisponível"}
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
                ← Voltar
              </button>
            </div>
          )}

        <div className="battle-message-strip">
          <span>{latestMessage}</span>
        </div>

        {state.status === "finished" && !state.escaped && (
          <div className="battle-result">
            <span className="eyebrow">
              {state.captureResult
                ? state.captureResult.success
                  ? "CAPTURADO"
                  : "FUGIU"
                : state.winner === "player"
                  ? "VITÓRIA"
                  : "DERROTA"}
            </span>
            <div
              className="battle-result-sprites"
              aria-hidden="true"
            >
              <PokemonPortrait
                species={starterUnit.species}
                name={starterUnit.displayName}
              />
              <span>
                {rivalUnits.length > 1
                  ? `VS ×${rivalUnits.length}`
                  : "VS"}
              </span>
              <PokemonPortrait
                species={resultRival.species}
                name={resultRival.displayName}
              />
            </div>
            <h3>
              {state.captureResult
                ? state.captureResult.success
                  ? `${resultRival.displayName} foi capturado!`
                  : `${resultRival.displayName} escapou da Poké Ball.`
                : state.winner === "player"
                  ? encounter.kind === "wild"
                    ? rivalUnits.length > 1
                      ? `${rivalUnits.length} Pokémon selvagens foram derrotados.`
                      : `${rival.displayName} foi derrotado.`
                    : `Seu time venceu ${trainerName}.`
                  : encounter.kind === "wild"
                    ? rivalUnits.length > 1
                      ? "Seu time foi derrotado pelo grupo selvagem."
                      : "Seu time foi derrotado."
                    : `${trainerName} venceu desta vez.`}
            </h3>
            <p>
              {state.captureResult
                ? state.captureResult.success
                  ? "O Pokémon foi capturado. Ele irá para sua party ou para o PC conforme houver espaço. A EXP da captura é dividida entre todos os Pokémon que entraram na arena."
                  : `O Pokémon fugiu. Você recebe ${Math.round(
                      state.captureResult.xpRatio * 100,
                    )}% da recompensa total, dividida entre todos os Pokémon que entraram na arena.`
                : encounter.kind === "wild"
                  ? state.winner === "player"
                    ? "A EXP da vitória é dividida entre todos os Pokémon que entraram na arena e pode gerar level up, EV e novos moves."
                    : "Você retorna ao mapa sem receber recompensa."
                  : defeatedEnemies.length > 0
                    ? `A EXP de treinador dos ${defeatedEnemies.length} Pokémon derrotados será dividida entre todos os seus Pokémon que entraram na arena.`
                    : encounter.rivals?.length
                      ? "A batalha termina somente quando todos os Pokémon de um dos treinadores forem derrotados."
                      : "O resultado não bloqueia a história; este combate é o tutorial do sistema tático."}
            </p>
            {encounter.kind === "trainer" &&
              state.winner === "player" &&
              (encounter.rewardMoney ?? 0) > 0 && (
                <p>
                  Prêmio de vitória: ₽
                  {(encounter.rewardMoney ?? 0).toLocaleString("pt-BR")}
                </p>
              )}
            <button
              type="button"
              onClick={() =>
                onComplete({
                  won: state.winner === "player",
                  escaped: false,
                  inventory: { ...state.items },
                  playerHp: playerUnits.map((unit) => unit.hp),
                  playerStatuses: playerUnits.map((unit) => unit.status),
                  playerSleepTurnsRemaining:
                    playerUnits.map(
                      (unit) =>
                        unit.sleepTurnsRemaining,
                    ),
                  playerMovePp: playerUnits.map(
                    (unit) => ({ ...unit.movePp }),
                  ),
                  defeatedEnemies,
                  capture: state.captureResult
                    ? {
                        success: state.captureResult.success,
                        species: state.captureResult.species,
                        level: state.captureResult.level,
                        xpRatio: state.captureResult.xpRatio,
                        status: state.captureResult.status,
                        sleepTurnsRemaining:
                          state.captureResult
                            .sleepTurnsRemaining,
                      }
                    : undefined,
                })
              }
            >
              Continuar
            </button>
          </div>
        )}

        {state.status === "finished" && state.escaped && (
          <div className="battle-result">
            <span className="eyebrow">
              {state.escapedBy === "rival" ? "FUGIU" : "ESCAPOU"}
            </span>
            <div
              className="battle-result-sprites"
              aria-hidden="true"
            >
              <PokemonPortrait
                species={starterUnit.species}
                name={starterUnit.displayName}
              />
              <span>↔</span>
              <PokemonPortrait
                species={resultRival.species}
                name={resultRival.displayName}
              />
            </div>
            <h3>
              {state.escapedBy === "rival"
                ? `${rival.displayName} fugiu do combate.`
                : "Você saiu do combate."}
            </h3>
            <button
              type="button"
              onClick={() =>
                onComplete({
                  won: false,
                  escaped: true,
                  inventory: { ...state.items },
                  playerHp: playerUnits.map((unit) => unit.hp),
                  playerStatuses: playerUnits.map((unit) => unit.status),
                  playerSleepTurnsRemaining:
                    playerUnits.map(
                      (unit) =>
                        unit.sleepTurnsRemaining,
                    ),
                  playerMovePp: playerUnits.map(
                    (unit) => ({ ...unit.movePp }),
                  ),
                  defeatedEnemies,
                })
              }
            >
              Voltar ao mapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
