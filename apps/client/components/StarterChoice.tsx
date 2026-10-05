"use client";

import type { StarterSpeciesId } from "@tactimon/battle-engine";
import { STARTER_META } from "@/lib/story";
import { t, useLocale } from "@/lib/i18n";

type Props = {
  onChoose: (starter: StarterSpeciesId) => void;
  onClose: () => void;
};

const ORDER: StarterSpeciesId[] = [
  "bulbasaur",
  "charmander",
  "squirtle",
];

export function StarterChoice({
  onChoose,
  onClose,
}: Props) {
  useLocale();
  return (
    <div className="story-overlay" role="dialog" aria-modal="true">
      <div className="story-panel starter-panel">
        <span className="eyebrow">{t("PROF. OAK")}</span>
        <h2>{t("Choose your first Pokémon")}</h2>
        <p className="story-copy">
          {t(
            "This Pokémon joins your starting party permanently. Blue will choose the starter that has the advantage over yours.",
          )}
        </p>

        <div className="starter-grid">
          {ORDER.map((starter) => {
            const meta = STARTER_META[starter];

            return (
              <button
                key={starter}
                className={`starter-card starter-${meta.type}`}
                onClick={() => onChoose(starter)}
                type="button"
              >
                <span className="starter-orb" aria-hidden="true">
                  {meta.name.charAt(0)}
                </span>
                <strong>{meta.name}</strong>
                <span className="starter-type">{meta.type}</span>
                <small>{t(meta.description)}</small>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="secondary-action"
          onClick={onClose}
        >
          {t("Not yet")}
        </button>
      </div>
    </div>
  );
}
