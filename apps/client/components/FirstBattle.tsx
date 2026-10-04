"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyDuelAction,
  createStarterDuel,
  createWildDuel,
  DUEL_ITEMS,
  DUEL_MOVES,
  experienceProgress,
  getActiveDuelUnit,
  getDuelCaptureEligibility,
  getReachableCells,
  manhattanDistance,
  resolveSimpleAiTurnDetailed,
  type DuelActionResult,
  type DuelItemId,
  type DuelMoveId,
  type DuelPoint,
  type DuelPokemonBuild,
  type DuelState,
  type DuelUnit,
  type PokemonProgression,
  type StarterSpeciesId,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import { BattleVfx } from "@/components/BattleVfx";
import { PokemonBattleSprite } from "@/components/PokemonBattleSprite";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import type { BattleSceneContext } from "@/lib/maps";

export type BattleOutcome = {
  won: boolean;
  escaped: boolean;
  capture?: {
    success: boolean;
    species: WildSpeciesId;
    level: number;
    xpRatio: number;
  };
};

export type BattleEncounter =
  | {
      kind: "trainer";
    }
  | {
      kind: "wild";
      species: WildSpeciesId;
      level: number;
    };

type Props = {
  starter: StarterSpeciesId;
  progression: PokemonProgression;
  party: readonly DuelPokemonBuild[];
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

const STEP_ANIMATION_MS = 145;
const ATTACK_WINDUP_MS = 180;

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
      label: `ATK ${unit.attackStage > 0 ? "+" : ""}${unit.attackStage}`,
      tone: unit.attackStage > 0 ? "buff" : "debuff",
    });
  }

  if (unit.defenseStage !== 0) {
    badges.push({
      label: `DEF ${unit.defenseStage > 0 ? "+" : ""}${unit.defenseStage}`,
      tone: unit.defenseStage > 0 ? "buff" : "debuff",
    });
  }

  return badges;
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

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
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
  encounter,
  context,
  onComplete,
}: Props) {
  const initialState = useMemo(() => {
    const starterBuild: DuelPokemonBuild = {
      species: progression.species,
      level: progression.level,
      moves: progression.activeMoves,
      evs: progression.evs,
    };
    const deployedParty =
      party.length > 0
        ? [...party].slice(0, 6)
        : [starterBuild];

    if (encounter.kind === "wild") {
      return createWildDuel({
        seed: context.seed,
        width: context.arenaWidth,
        height: context.arenaHeight,
        blocked: context.blocked,
        players: deployedParty,
        captureAllowed: deployedParty.length < 6,
        wildSpecies: encounter.species,
        wildLevel: encounter.level,
      });
    }

    return createStarterDuel(starter, {
      seed: context.seed,
      width: context.arenaWidth,
      height: context.arenaHeight,
      blocked: context.blocked,
      players: deployedParty,
    });
  }, [context, encounter, party, progression, starter]);

  const [state, setState] = useState<DuelState>(initialState);
  const [command, setCommand] = useState<CommandMode>("root");
  const [selectedMove, setSelectedMove] = useState<DuelMoveId | null>(null);
  const [selectedItem, setSelectedItem] = useState<DuelItemId | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoBattle, setAutoBattle] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2>(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [vfx, setVfx] = useState<VfxEvent | null>(null);
  const [animations, setAnimations] = useState<
    Record<string, UnitAnimationState>
  >({});
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
  const vfxDoneRef = useRef<(() => void) | null>(null);

  const active = getActiveDuelUnit(state);
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
  const isPlayerTurn =
    state.status === "active" &&
    active?.side === "player" &&
    !busy &&
    !autoBattle;

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

  const targetableUnitIds = useMemo(() => {
    if (!isPlayerTurn) return new Set<string>();

    if (command === "move-target" && selectedMove) {
      const move = DUEL_MOVES[selectedMove];
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

  const toggleAutoBattle = () => {
    const next = !autoBattle;
    if (next) {
      resetCommand();
    }
    setAutoBattle(next);
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

    if (!actor || !target) {
      setState(result.state);
      return;
    }

    setUnitAnimation(
      actor.id,
      "attack",
      facingBetween(actor.position, target.position),
    );
    await wait(ATTACK_WINDUP_MS);

    if ((targetResult?.damage ?? 0) > 0) {
      setUnitAnimation(target.id, "hurt");
    }

    await playVfx(
      presentation.vfxId,
      target.position,
    );

    setState(result.state);
    const nextTarget = result.state.units.find(
      (unit) => unit.id === target.id,
    );

    if (nextTarget?.hp === 0) {
      setUnitAnimation(target.id, "faint");
    } else {
      setUnitAnimation(target.id, "idle");
    }

    setUnitAnimation(actor.id, "idle");
    await wait(100);
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
    const presentation = result.presentation;
    if (presentation?.kind === "capture") {
      flashNotice(
        presentation.success
          ? "Captura bem-sucedida!"
          : "A captura falhou. O Pokémon fugiu!",
      );
      if (presentation.success) setUnitAnimation(targetId, "faint");
      await wait(520);
    } else {
      setUnitAnimation(targetId, "idle");
      flashNotice(`${DUEL_ITEMS[itemId].name} usada.`);
      await wait(320);
    }
    setState(result.state);
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
      (active?.side === "rival" || autoBattle);

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
    24,
    Math.min(
      88,
      ((menuPosition.y + 0.15) / state.height) * 100,
    ),
  );
  const latestMessage =
    notice ?? state.log[state.log.length - 1] ?? "";
  const playerXp = experienceProgress(progression);

  return (
    <div className="battle-overlay">
      <div className="battle-shell battle-shell-clean">
        <header className="battle-minimal-header">
          <div className="battle-minimal-title">
            <span className="eyebrow">
              {encounter.kind === "wild"
                ? "ENCONTRO SELVAGEM"
                : "PRIMEIRO COMBATE"}
            </span>
            <strong>
              {encounter.kind === "wild"
                ? `${rival.displayName} selvagem`
                : "Você vs. Blue"}
            </strong>
            <small>{context.mapLabel}</small>
          </div>

          <div className="battle-round-cluster">
            <div className="battle-turn">
              Round {state.round} ·{" "}
              {state.status === "finished"
                ? "Fim"
                : active
                  ? `Turno de ${active.displayName}`
                  : "Aguardando"}
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
                  battleSpeed === 2 ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={toggleBattleSpeed}
              >
                {battleSpeed}× Speed
              </button>
              <button
                type="button"
                className="end-turn-compact"
                disabled={!isPlayerTurn}
                onClick={endTurn}
              >
                Encerrar turno
              </button>
            </div>
          </div>
        </header>

        <div
          className={[
            "battle-combatant-hud-row",
            state.units.length > 2 ? "multi-unit" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {state.units.map((unit) => {
            const badges = stageBadges(unit);
            const healthTone = hpTone(unit.hp, unit.maxHp);
            const isPlayer = unit.side === "player";

            return (
              <section
                key={unit.id}
                className={[
                  "combatant-hud",
                  unit.side,
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
                      <span className="combatant-level">Lv. {unit.level}</span>
                      <span className={`combatant-type type-${unit.type}`}>
                        {unit.type}
                      </span>
                    </div>
                    <span className="combatant-side-label">
                      {isPlayer
                        ? "SEU POKÉMON"
                        : encounter.kind === "wild"
                          ? "SELVAGEM"
                          : "BLUE"}
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

                  {isPlayer && unit.id === starterUnit.id && (
                    <div className="combatant-resource-block xp-resource">
                      <div className="combatant-resource-heading">
                        <span>EXP</span>
                        <strong>
                          {playerXp.required > 0
                            ? `${playerXp.current} / ${playerXp.required}`
                            : "MAX"}
                        </strong>
                      </div>
                      <div className="combatant-exp-track">
                        <div
                          className="combatant-exp-fill"
                          style={{
                            width: `${playerXp.percent}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="combatant-meta-row">
                    <span className="resource-chip">
                      {unit.ap}/{unit.maxAp} AP
                    </span>
                    <span className="resource-chip">
                      {unit.mp}/{unit.maxMp} MP
                    </span>
                    <span className="combatant-status-label">STATUS</span>
                    {badges.length === 0 ? (
                      <span className="status-chip neutral">NORMAL</span>
                    ) : (
                      badges.map((badge) => (
                        <span
                          key={badge.label}
                          className={`status-chip ${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div
          className="duel-grid-shell clean-arena"
          style={{
            aspectRatio: `${state.width} / ${state.height}`,
          }}
        >
          <div className="duel-map-crop" aria-hidden="true">
            <div
              className="duel-map-render"
              style={{
                width:
                  `${(context.mapWidth / state.width) * 100}%`,
                height:
                  `${(context.mapHeight / state.height) * 100}%`,
                left:
                  `${(-context.cropX / state.width) * 100}%`,
                top:
                  `${(-context.cropY / state.height) * 100}%`,
                backgroundImage: `url("${context.previewUrl}")`,
              }}
            />
          </div>

          <div
            className="duel-grid"
            style={{
              gridTemplateColumns: `repeat(${state.width}, 1fr)`,
              gridTemplateRows: `repeat(${state.height}, 1fr)`,
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
            {state.units.map((unit) => {
              const position =
                visualPositions[unit.id] ?? unit.position;
              const animation =
                animations[unit.id] ?? {
                  name: unit.hp > 0 ? "idle" : "faint",
                  nonce: 0,
                  facing: unit.side === "player" ? "right" : "left",
                };
              const targetable = targetableUnitIds.has(unit.id);

              return (
                <button
                  key={unit.id}
                  type="button"
                  className={[
                    "duel-unit-position",
                    unit.side,
                    targetable ? "targetable" : "",
                    active?.id === unit.id ? "active-unit" : "",
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
                  disabled={!targetable || busy}
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
                  </div>
                </button>
              );
            })}

            {isPlayerTurn && state.status === "active" && (
              <div
                className={`battle-action-popover mode-${command}`}
                style={{
                  left: `${menuLeft}%`,
                  top: `${menuTop}%`,
                }}
              >
                <div className="battle-action-popover-caret" />

                {command === "root" && (
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
                  </div>
                )}

                {command === "walk" && (
                  <div className="battle-submenu">
                    <div className="battle-submenu-copy">
                      <span>MOVE</span>
                      <strong>Escolha um tile verde</strong>
                      <small>{reachable.length} destinos possíveis</small>
                    </div>
                    <button
                      type="button"
                      className="battle-menu-back"
                      onClick={resetCommand}
                    >
                      ← Voltar
                    </button>
                  </div>
                )}

                {command === "moves" && (
                  <div className="battle-action-list">
                    {player.moves.map((moveId) => {
                      const move = DUEL_MOVES[moveId];
                      const canPay = player.ap >= move.apCost;

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
                            {move.apCost} AP · {move.minRange}–{move.maxRange}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="battle-menu-back"
                      onClick={resetCommand}
                    >
                      ← Voltar
                    </button>
                  </div>
                )}

                {command === "move-target" && selectedMove && (
                  <div className="battle-submenu">
                    <div className="battle-submenu-copy">
                      <span>ATTACK</span>
                      <strong>{DUEL_MOVES[selectedMove].name}</strong>
                      <small>
                        {targetableUnitIds.size > 0
                          ? "Escolha o alvo destacado"
                          : "Nenhum alvo no alcance"}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="battle-menu-back"
                      onClick={() => {
                        setSelectedMove(null);
                        setCommand("moves");
                      }}
                    >
                      ← Voltar
                    </button>
                  </div>
                )}

                {command === "items" && (
                  <div className="battle-action-list">
                    {(Object.keys(DUEL_ITEMS) as DuelItemId[]).map(
                      (itemId) => {
                        const item = DUEL_ITEMS[itemId];
                        const amount = state.items[itemId] ?? 0;

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
                            <strong>{item.name}</strong>
                            <span>
                              ×{amount} · {item.kind === "heal"
                                ? `+${item.heal} HP`
                                : state.captureAllowed
                                  ? "captura com HP ≤50%"
                                  : "party 6/6"}
                            </span>
                          </button>
                        );
                      },
                    )}
                    <button
                      type="button"
                      className="battle-menu-back"
                      onClick={resetCommand}
                    >
                      ← Voltar
                    </button>
                  </div>
                )}

                {command === "item-target" && selectedItem && (
                  <div className="battle-submenu">
                    <div className="battle-submenu-copy">
                      <span>ITEM</span>
                      <strong>{DUEL_ITEMS[selectedItem].name}</strong>
                      <small>
                        {DUEL_ITEMS[selectedItem].kind === "capture"
                          ? targetableUnitIds.size > 0
                            ? "Escolha o Pokémon selvagem"
                            : "Reduza o alvo para 50% de HP ou menos"
                          : targetableUnitIds.size > 0
                            ? "Escolha um aliado"
                            : "Nenhum alvo precisa do item"}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="battle-menu-back"
                      onClick={() => {
                        setSelectedItem(null);
                        setCommand("items");
                      }}
                    >
                      ← Voltar
                    </button>
                  </div>
                )}
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
                : "Resolvendo ação…"}
            </div>
          )}
        </div>

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
            <h3>
              {state.captureResult
                ? state.captureResult.success
                  ? `${rival.displayName} foi capturado!`
                  : `${rival.displayName} escapou da Poké Ball.`
                : state.winner === "player"
                  ? encounter.kind === "wild"
                    ? `${rival.displayName} foi derrotado.`
                    : `${player.displayName} venceu o primeiro duelo.`
                  : encounter.kind === "wild"
                    ? "Seu time foi derrotado."
                    : "Blue venceu desta vez."}
            </h3>
            <p>
              {state.captureResult
                ? state.captureResult.success
                  ? "O Pokémon foi adicionado ao seu time. A EXP da captura é dividida entre todos os Pokémon que entraram na arena."
                  : `O Pokémon fugiu. Você recebe ${Math.round(
                      state.captureResult.xpRatio * 100,
                    )}% da recompensa total, dividida entre todos os Pokémon que entraram na arena.`
                : encounter.kind === "wild"
                  ? state.winner === "player"
                    ? "A EXP da vitória é dividida entre todos os Pokémon que entraram na arena e pode gerar level up, EV e novos moves."
                    : "Você retorna ao mapa sem receber recompensa."
                  : "O resultado não bloqueia a história; este combate é o tutorial do sistema tático."}
            </p>
            <button
              type="button"
              onClick={() =>
                onComplete({
                  won: state.winner === "player",
                  escaped: false,
                  capture: state.captureResult
                    ? {
                        success: state.captureResult.success,
                        species: state.captureResult.species,
                        level: state.captureResult.level,
                        xpRatio: state.captureResult.xpRatio,
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
            <span className="eyebrow">ESCAPOU</span>
            <h3>Você saiu do combate.</h3>
            <button
              type="button"
              onClick={() =>
                onComplete({
                  won: false,
                  escaped: true,
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
