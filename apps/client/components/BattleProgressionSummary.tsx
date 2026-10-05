"use client";

import { useMemo, useState } from "react";
import {
  DUEL_MOVES,
  speciesDisplayName,
  type ProgressionReward,
} from "@tactimon/battle-engine";
import { PokemonEvolutionOverlay } from "@/components/PokemonEvolutionOverlay";
import { PokemonPortrait } from "@/components/PokemonPortrait";

type Props = {
  rewards: readonly ProgressionReward[];
  onContinue: () => void;
};

function statusLabel(reward: ProgressionReward): string {
  const status = reward.progression.status;
  if (!status) return "NORMAL";
  if (status === "sleep") {
    return `SLEEP ${reward.progression.sleepTurnsRemaining ?? 0}`;
  }
  return status.toUpperCase();
}

function evGainLabel(reward: ProgressionReward): string {
  const labels = [
    ["hp", "HP"],
    ["attack", "ATK"],
    ["defense", "DEF"],
    ["specialAttack", "SPA"],
    ["specialDefense", "SPD"],
    ["speed", "SPE"],
  ] as const;

  const gains = labels
    .filter(([stat]) => reward.evGained[stat] > 0)
    .map(
      ([stat, label]) =>
        `${label}+${reward.evGained[stat]}`,
    );

  return gains.length > 0 ? gains.join(" · ") : "—";
}

export function BattleProgressionSummary({
  rewards,
  onContinue,
}: Props) {
  const evolutions = useMemo(
    () => rewards.flatMap((reward) => reward.evolutions),
    [rewards],
  );
  const [evolutionIndex, setEvolutionIndex] = useState(0);
  const currentEvolution = evolutions[evolutionIndex];

  if (currentEvolution) {
    return (
      <PokemonEvolutionOverlay
        evolution={currentEvolution}
        onComplete={() =>
          setEvolutionIndex((current) => current + 1)
        }
      />
    );
  }

  return (
    <div className="story-overlay battle-summary-overlay">
      <section className="story-panel battle-summary-panel">
        <header className="battle-summary-header">
          <div>
            <span className="eyebrow">RESULTADO DA BATALHA</span>
            <h2>Progresso da equipe</h2>
          </div>
          <strong>{rewards.length} Pokémon</strong>
        </header>

        <div className="battle-summary-grid">
          {rewards.map((reward, index) => {
            const progression = reward.progression;
            const learned = [
              ...reward.autoLearnedMoves,
              ...reward.pendingMoves,
            ];

            return (
              <article
                className="battle-summary-pokemon"
                key={`${progression.species}-${index}`}
              >
                <PokemonPortrait
                  species={progression.species}
                  name={speciesDisplayName(progression.species)}
                />

                <div className="battle-summary-pokemon-body">
                  <div className="battle-summary-name">
                    <strong>
                      {speciesDisplayName(progression.species)}
                    </strong>
                    <span>
                      Lv. {reward.oldLevel}
                      {reward.levelsGained > 0
                        ? ` → ${reward.newLevel}`
                        : ""}
                    </span>
                  </div>

                  <div className="battle-summary-stats">
                    <span>
                      <b>EXP</b> +{reward.xpGained}
                    </span>
                    <span>
                      <b>STATUS</b> {statusLabel(reward)}
                    </span>
                    <span>
                      <b>HP</b> {progression.currentHp}
                    </span>
                    <span>
                      <b>EV</b> {evGainLabel(reward)}
                    </span>
                  </div>

                  <div className="battle-summary-moves">
                    <b>GOLPES</b>
                    <span>
                      {progression.activeMoves
                        .map((moveId) => DUEL_MOVES[moveId].name)
                        .join(" · ")}
                    </span>
                  </div>

                  {reward.evolutions.length > 0 && (
                    <div className="battle-summary-evolution">
                      <b>EVOLUÇÃO</b>
                      <span>
                        {reward.evolutions
                          .map(
                            (evolution) =>
                              `${speciesDisplayName(evolution.from)} → ${speciesDisplayName(evolution.to)}`,
                          )
                          .join(" · ")}
                      </span>
                    </div>
                  )}

                  {learned.length > 0 && (
                    <div className="battle-summary-learned">
                      <b>
                        {reward.pendingMoves.length > 0
                          ? "NOVOS / PENDENTES"
                          : "APRENDIDOS"}
                      </b>
                      <span>
                        {learned
                          .map((moveId) => DUEL_MOVES[moveId].name)
                          .join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="battle-summary-continue"
          onClick={onContinue}
        >
          Continuar
        </button>
      </section>
    </div>
  );
}
