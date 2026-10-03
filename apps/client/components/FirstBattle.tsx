"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyDuelAction,
  createStarterDuel,
  DUEL_MOVES,
  getActiveDuelUnit,
  getReachableCells,
  manhattanDistance,
  resolveSimpleAiTurn,
  type DuelMoveId,
  type DuelState,
  type StarterSpeciesId,
} from "@tactimon/battle-engine";
import { PokemonBattleSprite } from "@/components/PokemonBattleSprite";
import type { BattleSceneContext } from "@/lib/maps";

type Props = {
  starter: StarterSpeciesId;
  context: BattleSceneContext;
  onComplete: (won: boolean) => void;
};

function hpPercent(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(100, (hp / maxHp) * 100));
}

export function FirstBattle({
  starter,
  context,
  onComplete,
}: Props) {
  const [state, setState] = useState<DuelState>(() =>
    createStarterDuel(starter, {
      seed: context.seed,
      width: context.arenaWidth,
      height: context.arenaHeight,
      blocked: context.blocked,
    }),
  );

  const active = getActiveDuelUnit(state);
  const player = state.units.find((unit) => unit.side === "player")!;
  const rival = state.units.find((unit) => unit.side === "rival")!;
  const isPlayerTurn =
    state.status === "active" && active?.side === "player";

  const reachable = useMemo(
    () =>
      isPlayerTurn
        ? getReachableCells(state, player.id)
        : [],
    [isPlayerTurn, player.id, state],
  );

  const reachableKeys = useMemo(
    () => new Set(reachable.map((cell) => `${cell.x},${cell.y}`)),
    [reachable],
  );

  const blockedKeys = useMemo(
    () =>
      new Set(
        state.blocked.map((cell) => `${cell.x},${cell.y}`),
      ),
    [state.blocked],
  );

  useEffect(() => {
    if (
      state.status !== "active" ||
      active?.side !== "rival"
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setState((current) =>
        resolveSimpleAiTurn(current),
      );
    }, 520);

    return () => clearTimeout(timer);
  }, [active?.side, state.status]);

  const useMove = (moveId: DuelMoveId) => {
    setState((current) => {
      const actor = getActiveDuelUnit(current);
      const target = current.units.find(
        (unit) => unit.side === "rival" && unit.hp > 0,
      );

      if (!actor || actor.side !== "player" || !target) {
        return current;
      }

      return applyDuelAction(current, {
        kind: "use-move",
        unitId: actor.id,
        moveId,
        targetId: target.id,
      }).state;
    });
  };

  const endTurn = () => {
    setState((current) => {
      const actor = getActiveDuelUnit(current);
      if (!actor || actor.side !== "player") {
        return current;
      }

      return applyDuelAction(current, {
        kind: "end-turn",
        unitId: actor.id,
      }).state;
    });
  };

  const moveTo = (x: number, y: number) => {
    if (!isPlayerTurn || !reachableKeys.has(`${x},${y}`)) {
      return;
    }

    setState((current) => {
      const actor = getActiveDuelUnit(current);
      if (!actor || actor.side !== "player") {
        return current;
      }

      return applyDuelAction(current, {
        kind: "move",
        unitId: actor.id,
        to: { x, y },
      }).state;
    });
  };

  const canUse = (moveId: DuelMoveId) => {
    if (!isPlayerTurn) return false;

    const move = DUEL_MOVES[moveId];
    const distance = manhattanDistance(
      player.position,
      rival.position,
    );

    return (
      player.ap >= move.apCost &&
      distance >= move.minRange &&
      distance <= move.maxRange
    );
  };

  return (
    <div className="battle-overlay">
      <div className="battle-shell">
        <header className="battle-header">
          <div>
            <span className="eyebrow">PRIMEIRO COMBATE</span>
            <h2>Você vs. Blue</h2>
            <small className="battle-location">
              Arena gerada de {context.mapLabel}
            </small>
          </div>
          <div className="battle-turn">
            Round {state.round} ·{" "}
            {state.status === "finished"
              ? "Fim"
              : active?.side === "player"
                ? "Seu turno"
                : "Turno do rival"}
          </div>
        </header>

        <div className="duel-status-row">
          {[player, rival].map((unit) => (
            <div key={unit.id} className="duel-status-card">
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
              <small>
                HP {unit.hp}/{unit.maxHp} · AP {unit.ap}/{unit.maxAp} ·
                MP {unit.mp}/{unit.maxMp}
              </small>
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
            }}
          >
            {Array.from({
              length: state.width * state.height,
            }).map((_, index) => {
              const x = index % state.width;
              const y = Math.floor(index / state.width);
              const key = `${x},${y}`;
              const unit = state.units.find(
                (candidate) =>
                  candidate.hp > 0 &&
                  candidate.position.x === x &&
                  candidate.position.y === y,
              );
              const reachableCell = reachableKeys.has(key);
              const blockedCell = blockedKeys.has(key);

              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "duel-cell",
                    reachableCell ? "reachable" : "",
                    blockedCell ? "blocked-terrain" : "",
                    unit?.side === "player" ? "player-unit-cell" : "",
                    unit?.side === "rival" ? "rival-unit-cell" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => moveTo(x, y)}
                  disabled={blockedCell}
                >
                  {unit && (
                    <div className={`duel-unit ${unit.side}`}>
                      <PokemonBattleSprite
                        species={unit.species}
                        side={unit.side}
                      />
                      <span className="duel-unit-label">
                        {unit.displayName}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="battle-actions">
          <div>
            <span className="panel-label">Arena local</span>
            <p>
              O terreno é um recorte do mapa do encontro. Paredes e objetos
              bloqueados no overworld também bloqueiam movimento aqui.
            </p>
          </div>

          <div className="move-buttons">
            {player.moves.map((moveId) => {
              const move = DUEL_MOVES[moveId];
              return (
                <button
                  key={moveId}
                  type="button"
                  disabled={!canUse(moveId)}
                  onClick={() => useMove(moveId)}
                >
                  <strong>{move.name}</strong>
                  <span>
                    {move.apCost} AP · alcance {move.minRange}-{move.maxRange}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              className="end-turn"
              disabled={!isPlayerTurn}
              onClick={endTurn}
            >
              Encerrar turno
            </button>
          </div>
        </div>

        <div className="battle-log">
          {state.log.slice(-5).map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>

        {state.status === "finished" && (
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
              O resultado não bloqueia a história; este combate é o tutorial
              do sistema tático.
            </p>
            <button
              type="button"
              onClick={() => onComplete(state.winner === "player")}
            >
              Voltar ao laboratório
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
