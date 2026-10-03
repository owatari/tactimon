"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyDuelAction,
  createStarterDuel,
  DUEL_ITEMS,
  DUEL_MOVES,
  getActiveDuelUnit,
  getReachableCells,
  manhattanDistance,
  resolveSimpleAiTurnDetailed,
  type DuelActionResult,
  type DuelItemId,
  type DuelMoveId,
  type DuelPoint,
  type DuelState,
  type DuelUnit,
  type StarterSpeciesId,
} from "@tactimon/battle-engine";
import { BattleVfx } from "@/components/BattleVfx";
import { PokemonBattleSprite } from "@/components/PokemonBattleSprite";
import type { BattleSceneContext } from "@/lib/maps";

type Props = {
  starter: StarterSpeciesId;
  context: BattleSceneContext;
  onComplete: (won: boolean) => void;
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

function pointKey(point: DuelPoint): string {
  return `${point.x},${point.y}`;
}

function primaryAttackMove(species: StarterSpeciesId): DuelMoveId {
  return species === "charmander" ? "scratch" : "tackle";
}

function primaryStatusMove(species: StarterSpeciesId): DuelMoveId {
  return species === "squirtle" ? "tail-whip" : "growl";
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
  context,
  onComplete,
}: Props) {
  const initialState = useMemo(
    () =>
      createStarterDuel(starter, {
        seed: context.seed,
        width: context.arenaWidth,
        height: context.arenaHeight,
        blocked: context.blocked,
      }),
    [context, starter],
  );

  const [state, setState] = useState<DuelState>(initialState);
  const [command, setCommand] = useState<CommandMode>("root");
  const [selectedMove, setSelectedMove] = useState<DuelMoveId | null>(null);
  const [selectedItem, setSelectedItem] = useState<DuelItemId | null>(null);
  const [busy, setBusy] = useState(false);
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
  const animationNonceRef = useRef(0);
  const vfxNonceRef = useRef(0);
  const vfxDoneRef = useRef<(() => void) | null>(null);

  const active = getActiveDuelUnit(state);
  const player = state.units.find((unit) => unit.side === "player")!;
  const rival = state.units.find((unit) => unit.side === "rival")!;
  const isPlayerTurn =
    state.status === "active" && active?.side === "player" && !busy;

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

  const flashNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 1800);
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
      await sleep(STEP_ANIMATION_MS);
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
    await sleep(ATTACK_WINDUP_MS);

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
    await sleep(100);
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
    setUnitAnimation(targetId, "idle");
    flashNotice(`${DUEL_ITEMS[itemId].name} usada.`);
    await sleep(320);
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
    if (
      state.status !== "active" ||
      active?.side !== "rival" ||
      busy ||
      aiRunningRef.current
    ) {
      return;
    }

    aiRunningRef.current = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        setBusy(true);

        const turn = resolveSimpleAiTurnDetailed(state);
        let visualState = state;

        for (const step of turn.steps) {
          const presentation = step.presentation;

          if (presentation?.kind === "movement") {
            const actorBefore = visualState.units.find(
              (unit) => unit.id === presentation.actorId,
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
          } else if (presentation?.kind === "move") {
            await animateResolvedMove(visualState, step);
          } else {
            setState(step.state);
          }

          visualState = step.state;
        }

        for (const unit of turn.state.units) {
          setVisualPosition(unit.id, unit.position);
          if (unit.hp <= 0) {
            setUnitAnimation(unit.id, "faint");
          }
        }

        setState(turn.state);
        setBusy(false);
        aiRunningRef.current = false;
      })();
    }, 380);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active?.side, busy, state]);

  const prompt =
    command === "walk"
      ? "Escolha um tile destacado para andar."
      : command === "move-target" && selectedMove
        ? `Escolha quem receberá ${DUEL_MOVES[selectedMove].name}.`
        : command === "item-target" && selectedItem
          ? `Escolha quem receberá ${DUEL_ITEMS[selectedItem].name}.`
          : command === "moves"
            ? "Escolha um golpe."
            : command === "items"
              ? "Escolha um item."
              : "Escolha sua próxima ação.";

  return (
    <div className="battle-overlay">
      <div className="battle-shell battle-shell-v2">
        <header className="battle-header">
          <div>
            <span className="eyebrow">PRIMEIRO COMBATE</span>
            <h2>Você vs. Blue</h2>
            <small className="battle-location">
              Arena gerada de {context.mapLabel}
            </small>
          </div>

          <div className="battle-round-cluster">
            <div className="battle-turn">
              Round {state.round} ·{" "}
              {state.status === "finished"
                ? "Fim"
                : active?.side === "player"
                  ? "Seu turno"
                  : "Turno do rival"}
            </div>
            <button
              type="button"
              className="end-turn-compact"
              disabled={!isPlayerTurn}
              onClick={endTurn}
            >
              Encerrar turno
            </button>
          </div>
        </header>

        <div className="duel-status-row battle-party-row">
          {[player, rival].map((unit) => (
            <div
              key={unit.id}
              className={`duel-status-card ${unit.side} ${
                active?.id === unit.id ? "active" : ""
              }`}
            >
              <div className="duel-status-name">
                <strong>{unit.displayName}</strong>
                <span>Lv. {unit.level}</span>
              </div>
              <div className="hp-track">
                <div
                  className="hp-fill"
                  style={{
                    width: `${hpPercent(unit.hp, unit.maxHp)}%`,
                  }}
                />
              </div>
              <div className="resource-row">
                <small>
                  HP {unit.hp}/{unit.maxHp}
                </small>
                <small>AP {unit.ap}/{unit.maxAp}</small>
                <small>MP {unit.mp}/{unit.maxMp}</small>
              </div>
            </div>
          ))}
        </div>

        <div
          className="duel-grid-shell"
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
                    />
                    <span className="duel-unit-label">
                      {unit.displayName}
                    </span>
                  </div>
                </button>
              );
            })}

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
              Resolvendo ação…
            </div>
          )}
        </div>

        <section className="battle-command-hud">
          <div className="battle-command-context">
            <span className="panel-label">COMANDO</span>
            <strong>{prompt}</strong>
            <div className="active-resource-strip">
              <span>{player.displayName}</span>
              <span>{player.ap} AP</span>
              <span>{player.mp} MP</span>
              <span>Potion ×{state.items.potion}</span>
            </div>
          </div>

          <div className="battle-command-panel">
            {command === "root" && (
              <div className="command-grid">
                <button
                  type="button"
                  className="command-button command-walk"
                  disabled={!isPlayerTurn || player.mp <= 0}
                  onClick={() => setCommand("walk")}
                >
                  <span className="command-index">01</span>
                  <strong>Andar</strong>
                  <small>Gaste MP para reposicionar.</small>
                </button>
                <button
                  type="button"
                  className="command-button command-move"
                  disabled={!isPlayerTurn}
                  onClick={() => setCommand("moves")}
                >
                  <span className="command-index">02</span>
                  <strong>Move</strong>
                  <small>Escolha golpe e depois o alvo.</small>
                </button>
                <button
                  type="button"
                  className="command-button command-item"
                  disabled={!isPlayerTurn}
                  onClick={() => setCommand("items")}
                >
                  <span className="command-index">03</span>
                  <strong>Item</strong>
                  <small>Use um item da mochila.</small>
                </button>
                <button
                  type="button"
                  className="command-button command-flee"
                  disabled={!isPlayerTurn}
                  onClick={handleFlee}
                >
                  <span className="command-index">04</span>
                  <strong>Fugir</strong>
                  <small>Tente abandonar o combate.</small>
                </button>
              </div>
            )}

            {command === "walk" && (
              <div className="command-detail">
                <div>
                  <span className="panel-label">ANDAR</span>
                  <strong>{reachable.length} destinos ao alcance</strong>
                  <p>
                    Clique em um tile verde. O custo é a distância
                    percorrida e sai do MP atual.
                  </p>
                </div>
                <button
                  type="button"
                  className="back-command"
                  onClick={resetCommand}
                >
                  Voltar
                </button>
              </div>
            )}

            {command === "moves" && (
              <div className="move-selection-grid">
                {player.moves.map((moveId) => {
                  const move = DUEL_MOVES[moveId];
                  const canPay = player.ap >= move.apCost;

                  return (
                    <button
                      key={moveId}
                      type="button"
                      className="move-card"
                      disabled={!canPay}
                      onClick={() => {
                        setSelectedMove(moveId);
                        setCommand("move-target");
                      }}
                    >
                      <div>
                        <strong>{move.name}</strong>
                        <span>{move.type} · {move.category}</span>
                      </div>
                      <small className="move-description">
                        {move.description}
                      </small>
                      <small>
                        {move.apCost} AP · alcance {move.minRange}–
                        {move.maxRange}
                      </small>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="back-command"
                  onClick={resetCommand}
                >
                  Voltar
                </button>
              </div>
            )}

            {command === "move-target" && selectedMove && (
              <div className="command-detail target-detail">
                <div>
                  <span className="panel-label">ALVO</span>
                  <strong>{DUEL_MOVES[selectedMove].name}</strong>
                  <p>
                    {targetableUnitIds.size > 0
                      ? "Clique no Pokémon inimigo destacado."
                      : "Nenhum inimigo está dentro do alcance. Volte e se mova primeiro."}
                  </p>
                </div>
                <button
                  type="button"
                  className="back-command"
                  onClick={() => {
                    setSelectedMove(null);
                    setCommand("moves");
                  }}
                >
                  Voltar
                </button>
              </div>
            )}

            {command === "items" && (
              <div className="item-selection-grid">
                {(Object.keys(DUEL_ITEMS) as DuelItemId[]).map(
                  (itemId) => {
                    const item = DUEL_ITEMS[itemId];
                    const amount = state.items[itemId] ?? 0;

                    return (
                      <button
                        key={itemId}
                        type="button"
                        className="item-card"
                        disabled={amount <= 0}
                        onClick={() => {
                          setSelectedItem(itemId);
                          setCommand("item-target");
                        }}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>×{amount}</span>
                        </div>
                        <small>Recupera {item.heal} HP.</small>
                      </button>
                    );
                  },
                )}
                <button
                  type="button"
                  className="back-command"
                  onClick={resetCommand}
                >
                  Voltar
                </button>
              </div>
            )}

            {command === "item-target" && selectedItem && (
              <div className="command-detail target-detail">
                <div>
                  <span className="panel-label">ALVO DO ITEM</span>
                  <strong>{DUEL_ITEMS[selectedItem].name}</strong>
                  <p>
                    {targetableUnitIds.size > 0
                      ? "Clique em um Pokémon aliado destacado."
                      : "Nenhum aliado precisa desse item agora."}
                  </p>
                </div>
                <button
                  type="button"
                  className="back-command"
                  onClick={() => {
                    setSelectedItem(null);
                    setCommand("items");
                  }}
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="battle-feed">
          {state.log.slice(-4).map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>

        {notice && <div className="battle-notice">{notice}</div>}

        {state.status === "finished" && !state.escaped && (
          <div className="battle-result">
            <span className="eyebrow">
              {state.winner === "player" ? "VITÓRIA" : "DERROTA"}
            </span>
            <h3>
              {state.winner === "player"
                ? `${player.displayName} venceu o primeiro duelo.`
                : "Blue venceu desta vez."}
            </h3>
            <p>
              O resultado não bloqueia a história; este combate é o
              tutorial do sistema tático.
            </p>
            <button
              type="button"
              onClick={() => onComplete(state.winner === "player")}
            >
              Voltar ao laboratório
            </button>
          </div>
        )}

        {state.status === "finished" && state.escaped && (
          <div className="battle-result">
            <span className="eyebrow">ESCAPOU</span>
            <h3>Você saiu do combate.</h3>
            <button type="button" onClick={() => onComplete(false)}>
              Voltar ao mapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
