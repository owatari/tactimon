"use client";

import { useMemo, useState } from "react";
import {
  DUEL_MOVES,
  experienceProgress,
  speciesDisplayName,
  type ProgressionReward,
} from "@tactimon/battle-engine";
import { PokemonEvolutionOverlay } from "@/components/PokemonEvolutionOverlay";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import type { BattleResultHeadline } from "@/lib/battleResult";

type Props = {
  headline: BattleResultHeadline;
  prizeMoney: number;
  rewards: readonly ProgressionReward[];
  onContinue: () => void;
};

function moveNames(moveIds: readonly string[]): string {
  return moveIds
    .map(
      (moveId) =>
        DUEL_MOVES[moveId as keyof typeof DUEL_MOVES]?.name ?? moveId,
    )
    .join(", ");
}

/**
 * The single post-battle screen: outcome, rewards and every deployed
 * Pokémon's progress on one compact FireRed-style panel. Evolutions play
 * afterwards as their own visual event, then the flow returns to the map.
 */
export function BattleResultsScreen({
  headline,
  prizeMoney,
  rewards,
  onContinue,
}: Props) {
  const evolutions = useMemo(
    () => rewards.flatMap((reward) => reward.evolutions),
    [rewards],
  );
  const [phase, setPhase] = useState<"summary" | "evolutions">(
    "summary",
  );
  const [evolutionIndex, setEvolutionIndex] = useState(0);

  const finishSummary = () => {
    if (evolutions.length > 0) {
      setPhase("evolutions");
    } else {
      onContinue();
    }
  };

  if (phase === "evolutions") {
    const evolution = evolutions[evolutionIndex];
    if (!evolution) {
      return null;
    }

    return (
      <PokemonEvolutionOverlay
        key={evolutionIndex}
        evolution={evolution}
        onComplete={() => {
          if (evolutionIndex + 1 >= evolutions.length) {
            onContinue();
          } else {
            setEvolutionIndex((current) => current + 1);
          }
        }}
      />
    );
  }

  return (
    <div className="battle-results-overlay">
      <section
        className={`battle-results-panel ${headline.kind}`}
        role="dialog"
        aria-label="Resultado da batalha"
      >
        <header className="battle-results-banner">
          <strong className="battle-results-title">
            {headline.title}
          </strong>
          <p>{headline.message}</p>
        </header>

        {(prizeMoney > 0 || headline.note) && (
          <div className="battle-results-rewards">
            {prizeMoney > 0 && (
              <span className="battle-results-money">
                Prêmio <b>₽{prizeMoney.toLocaleString("pt-BR")}</b>
              </span>
            )}
            {headline.note && <span>{headline.note}</span>}
          </div>
        )}

        {rewards.length > 0 && (
          <ul className="battle-results-list">
            {rewards.map((reward, index) => {
              const evolution = reward.evolutions[0];
              const species =
                evolution?.from ?? reward.progression.species;
              const name = speciesDisplayName(species);
              const xp = experienceProgress(reward.progression);

              return (
                <li
                  className="battle-results-row"
                  key={`${reward.progression.species}-${index}`}
                >
                  <PokemonPortrait
                    species={species}
                    name={name}
                    compact
                  />
                  <div className="battle-results-row-main">
                    <div className="battle-results-row-head">
                      <strong>{name}</strong>
                      <span>
                        Lv. {reward.oldLevel}
                        {reward.levelsGained > 0 &&
                          ` → ${reward.newLevel}`}
                      </span>
                      {reward.levelsGained > 0 && (
                        <em className="battle-results-tag level">
                          LV UP!
                        </em>
                      )}
                    </div>
                    <div className="battle-results-exp">
                      <b>EXP</b>
                      <span className="battle-results-exp-bar">
                        <i style={{ width: `${xp.percent}%` }} />
                      </span>
                      <span>+{reward.xpGained}</span>
                    </div>
                    {(reward.autoLearnedMoves.length > 0 ||
                      reward.pendingMoves.length > 0 ||
                      evolution) && (
                      <div className="battle-results-events">
                        {reward.autoLearnedMoves.length > 0 && (
                          <span>
                            Aprendeu {moveNames(reward.autoLearnedMoves)}
                          </span>
                        )}
                        {reward.pendingMoves.length > 0 && (
                          <span className="pending">
                            Quer aprender {moveNames(reward.pendingMoves)}
                          </span>
                        )}
                        {evolution && (
                          <span className="evolution">
                            Evoluindo → {speciesDisplayName(evolution.to)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="battle-results-footer">
          <button
            type="button"
            className="battle-results-continue"
            onClick={finishSummary}
            autoFocus
          >
            Continuar ▶
          </button>
        </footer>
      </section>
    </div>
  );
}
