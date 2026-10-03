"use client";

import { useMemo, useState } from "react";
import {
  DUEL_MOVES,
  experienceProgress,
  resolveMoveLearning,
  type PokemonProgression,
  type ProgressionReward,
} from "@tactimon/battle-engine";

type Props = {
  reward: ProgressionReward;
  onComplete: (progression: PokemonProgression) => void;
};

function evSummary(reward: ProgressionReward): string[] {
  const labels: Array<[keyof ProgressionReward["evGained"], string]> = [
    ["hp", "HP"],
    ["attack", "ATK"],
    ["defense", "DEF"],
    ["specialAttack", "SPA"],
    ["specialDefense", "SPD"],
    ["speed", "SPE"],
  ];

  return labels
    .filter(([stat]) => reward.evGained[stat] > 0)
    .map(([stat, label]) => `${label} +${reward.evGained[stat]}`);
}

export function ProgressionOverlay({
  reward,
  onComplete,
}: Props) {
  const [progression, setProgression] =
    useState<PokemonProgression>(reward.progression);
  const [pendingIndex, setPendingIndex] = useState(0);

  const currentPending =
    reward.pendingMoves[pendingIndex] ?? null;
  const evLines = useMemo(() => evSummary(reward), [reward]);
  const xp = experienceProgress(progression);

  const resolvePending = (replaceIndex: number | null) => {
    if (!currentPending) return;

    setProgression((current) =>
      resolveMoveLearning(
        current,
        currentPending,
        replaceIndex,
      ),
    );
    setPendingIndex((current) => current + 1);
  };

  const hasPending = Boolean(currentPending);

  return (
    <div className="story-overlay progression-overlay">
      <section className="story-panel progression-panel">
        <span className="eyebrow">PROGRESSÃO</span>

        <div className="progression-title-row">
          <div>
            <h2>
              {reward.levelsGained > 0
                ? `Level ${reward.oldLevel} → ${reward.newLevel}`
                : `Level ${reward.newLevel}`}
            </h2>
            <p className="story-copy progression-reward-copy">
              +{reward.xpGained} EXP da batalha
            </p>
          </div>

          <div className="level-orb">
            {progression.level}
          </div>
        </div>

        <div className="progression-exp-card">
          <div className="progression-exp-heading">
            <span>EXP</span>
            <strong>
              {xp.required > 0
                ? `${xp.current} / ${xp.required}`
                : "MAX"}
            </strong>
          </div>
          <div className="progression-exp-track">
            <div
              className="progression-exp-fill"
              style={{ width: `${xp.percent}%` }}
            />
          </div>
          <small>
            {progression.experience.toLocaleString("pt-BR")} EXP total
            {xp.required > 0
              ? ` · ${xp.required - xp.current} para o Lv. ${progression.level + 1}`
              : ""}
          </small>
        </div>

        {reward.levelsGained > 0 && (
          <div className="progression-section">
            <span className="panel-label">EV GANHO AO SUBIR DE NÍVEL</span>
            <div className="progression-chip-row">
              {evLines.length > 0 ? (
                evLines.map((line) => (
                  <span key={line} className="progression-chip">
                    {line}
                  </span>
                ))
              ) : (
                <span className="progression-chip muted">
                  Limite de EV atingido
                </span>
              )}
            </div>
          </div>
        )}

        {reward.autoLearnedMoves.length > 0 && (
          <div className="progression-section">
            <span className="panel-label">NOVOS MOVES</span>
            <div className="learned-move-list">
              {reward.autoLearnedMoves.map((moveId) => (
                <div key={moveId} className="learned-move-row">
                  <strong>{DUEL_MOVES[moveId].name}</strong>
                  <span>
                    Aprendido automaticamente porque havia um slot livre.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPending && currentPending && (
          <div className="move-replace-panel">
            <span className="panel-label">NOVO MOVE</span>
            <h3>
              {DUEL_MOVES[currentPending].name}
            </h3>
            <p>
              Seu Pokémon já conhece 4 moves. Escolha exatamente um move para
              substituir, ou deixe de aprender este move.
            </p>

            <div className="replace-move-list">
              {progression.activeMoves.map((moveId, index) => (
                <button
                  key={`${moveId}-${index}`}
                  type="button"
                  onClick={() => resolvePending(index)}
                >
                  <span>
                    <strong>{DUEL_MOVES[moveId].name}</strong>
                    <small>
                      {DUEL_MOVES[moveId].type} ·{" "}
                      {DUEL_MOVES[moveId].category}
                    </small>
                  </span>
                  <span className="replace-arrow">
                    → {DUEL_MOVES[currentPending].name}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="skip-move-button"
              onClick={() => resolvePending(null)}
            >
              Não aprender {DUEL_MOVES[currentPending].name}
            </button>
          </div>
        )}

        {!hasPending && (
          <button
            type="button"
            className="progression-continue"
            onClick={() => onComplete(progression)}
          >
            Continuar
          </button>
        )}
      </section>
    </div>
  );
}
