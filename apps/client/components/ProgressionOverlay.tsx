"use client";

import { useMemo, useState } from "react";
import {
  DUEL_MOVES,
  experienceProgress,
  resolveMoveLearning,
  speciesDisplayName,
  type PokemonProgression,
  type ProgressionReward,
} from "@tactimon/battle-engine";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import { t, useLocale } from "@/lib/i18n";

type Props = {
  reward: ProgressionReward;
  position?: number;
  total?: number;
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
  position = 1,
  total = 1,
  onComplete,
}: Props) {
  useLocale();
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
        <span className="eyebrow">
          {t("PROGRESSION")} · {speciesDisplayName(progression.species)}
          {total > 1 ? ` · ${position}/${total}` : ""}
        </span>

        <div className="progression-title-row">
          <PokemonPortrait
            species={progression.species}
            name={speciesDisplayName(progression.species)}
          />
          <div>
            <h2>
              {reward.levelsGained > 0
                ? t("Level {from} → {to}", {
                    from: reward.oldLevel,
                    to: reward.newLevel,
                  })
                : t("Level {level}", { level: reward.newLevel })}
            </h2>
            <p className="story-copy progression-reward-copy">
              {t("+{xp} EXP from the battle", { xp: reward.xpGained })}
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
            {t("{xp} EXP total", {
              xp: progression.experience.toLocaleString("pt-BR"),
            })}
            {xp.required > 0
              ? ` · ${t("{xp} to Lv. {level}", {
                  xp: xp.required - xp.current,
                  level: progression.level + 1,
                })}`
              : ""}
          </small>
        </div>

        {reward.levelsGained > 0 && (
          <div className="progression-section">
            <span className="panel-label">{t("EVs GAINED ON LEVEL UP")}</span>
            <div className="progression-chip-row">
              {evLines.length > 0 ? (
                evLines.map((line) => (
                  <span key={line} className="progression-chip">
                    {line}
                  </span>
                ))
              ) : (
                <span className="progression-chip muted">
                  {t("EV limit reached")}
                </span>
              )}
            </div>
          </div>
        )}

        {reward.autoLearnedMoves.length > 0 && (
          <div className="progression-section">
            <span className="panel-label">{t("NEW MOVES")}</span>
            <div className="learned-move-list">
              {reward.autoLearnedMoves.map((moveId) => (
                <div key={moveId} className="learned-move-row">
                  <strong>{DUEL_MOVES[moveId].name}</strong>
                  <span>
                    {t("Learned automatically because there was a free slot.")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPending && currentPending && (
          <div className="move-replace-panel">
            <span className="panel-label">{t("NEW MOVE")}</span>
            <h3>
              {DUEL_MOVES[currentPending].name}
            </h3>
            <p>
              {t(
                "Your Pokémon already knows 4 moves. Choose exactly one move to replace, or give up on learning this move.",
              )}
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
              {t("Do not learn {move}", {
                move: DUEL_MOVES[currentPending].name,
              })}
            </button>
          </div>
        )}

        {!hasPending && (
          <button
            type="button"
            className="progression-continue"
            onClick={() => onComplete(progression)}
          >
            {t("Continue")}
          </button>
        )}
      </section>
    </div>
  );
}
