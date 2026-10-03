"use client";

import { useState } from "react";
import type { StarterSpeciesId } from "@tactimon/battle-engine";

type Props = {
  species: StarterSpeciesId;
  name: string;
};

export function PokemonPortrait({ species, name }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="battle-portrait-frame" aria-hidden="true">
      {!failed ? (
        <img
          src={`/game-assets/pokemon-sprites/${species}/portrait.png`}
          alt=""
          className="battle-portrait-image"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="battle-portrait-fallback">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}
