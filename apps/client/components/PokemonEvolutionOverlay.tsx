"use client";

import { useEffect, useState } from "react";
import {
  speciesDisplayName,
  type DuelSpeciesId,
  type ProgressionEvolution,
} from "@tactimon/battle-engine";

type Props = {
  evolution: ProgressionEvolution;
  onComplete: () => void;
};

const FIRE_RED_FRONT_SPRITE: Partial<Record<DuelSpeciesId, string>> = {
  bulbasaur: "0001_bulbasaur.png",
  ivysaur: "0002_ivysaur.png",
  venusaur: "0003_venusaur.png",
  charmander: "0004_charmander.png",
  charmeleon: "0005_charmeleon.png",
  charizard: "0006_charizard.png",
  squirtle: "0007_squirtle.png",
  wartortle: "0008_wartortle.png",
  blastoise: "0009_blastoise.png",
  caterpie: "0010_caterpie.png",
  metapod: "0011_metapod.png",
  butterfree: "0012_butterfree.png",
  weedle: "0013_weedle.png",
  kakuna: "0014_kakuna.png",
  pidgey: "0016_pidgey.png",
  pidgeotto: "0017_pidgeotto.png",
  pidgeot: "0018_pidgeot.png",
  rattata: "0019_rattata.png",
  raticate: "0020_raticate.png",
  paras: "0046_paras.png",
  parasect: "0047_parasect.png",
  abra: "0063_abra.png",
  kadabra: "0064_kadabra.png",
};

function spriteUrl(species: DuelSpeciesId): string | null {
  const file = FIRE_RED_FRONT_SPRITE[species];
  return file
    ? `/game-assets/firered/pokemon/front/normal/${file}`
    : null;
}

export function PokemonEvolutionOverlay({
  evolution,
  onComplete,
}: Props) {
  const [finished, setFinished] = useState(false);
  const fromName = speciesDisplayName(evolution.from);
  const toName = speciesDisplayName(evolution.to);
  const fromSprite = spriteUrl(evolution.from);
  const toSprite = spriteUrl(evolution.to);

  useEffect(() => {
    setFinished(false);
    const timer = window.setTimeout(() => {
      setFinished(true);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [evolution.from, evolution.to, evolution.level]);

  return (
    <div className="pokemon-evolution-overlay">
      <section
        className={[
          "pokemon-evolution-scene",
          finished ? "complete" : "morphing",
        ].join(" ")}
        aria-live="polite"
      >
        <div className="pokemon-evolution-stage" aria-hidden="true">
          {fromSprite ? (
            <img
              className="pokemon-evolution-sprite old-form"
              src={fromSprite}
              alt=""
            />
          ) : null}
          {toSprite ? (
            <img
              className="pokemon-evolution-sprite new-form"
              src={toSprite}
              alt=""
            />
          ) : null}
        </div>

        <div className="pokemon-evolution-dialogue">
          <p>
            {finished
              ? `Parabéns! Seu ${fromName} evoluiu para ${toName}!`
              : `O quê? ${fromName} está evoluindo!`}
          </p>
          <span>Lv. {evolution.level}</span>
          {finished && (
            <button type="button" onClick={onComplete}>
              Continuar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
