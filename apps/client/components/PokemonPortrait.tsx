"use client";

import { useState } from "react";
import type { DuelSpeciesId } from "@tactimon/battle-engine";

type Props = {
  species: DuelSpeciesId;
  name: string;
  compact?: boolean;
};

export function PokemonPortrait({
  species,
  name,
  compact = false,
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={[
        "battle-portrait-frame",
        compact ? "compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {!failed ? (
        <img
          src={`/game-assets/pokemon-sprites/${species}/portrait.png`}
          alt=""
          className="battle-portrait-image eos-portrait"
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
