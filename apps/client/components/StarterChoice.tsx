"use client";

import type { StarterSpeciesId } from "@tactimon/battle-engine";
import { STARTER_META } from "@/lib/story";

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
  return (
    <div className="story-overlay" role="dialog" aria-modal="true">
      <div className="story-panel starter-panel">
        <span className="eyebrow">PROF. OAK</span>
        <h2>Escolha seu primeiro Pokémon</h2>
        <p className="story-copy">
          Este Pokémon entra permanentemente na sua party inicial.
          Blue escolherá o starter com vantagem sobre o seu.
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
                <small>{meta.description}</small>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="secondary-action"
          onClick={onClose}
        >
          Ainda não
        </button>
      </div>
    </div>
  );
}
