"use client";

import type { PokemonProgression } from "@tactimon/battle-engine";
import { t } from "@/lib/i18n";
import { MIN_EXP_SHARE_PERCENT, channelExpShare, defaultExpShare, maxExpShare, setMemberShare } from "@/lib/expShare";
import { pokemonDisplayName } from "@/lib/pokemonName";

type Props = {
  party: readonly PokemonProgression[];
  /** Percent per party slot, summing to 100 (already fitted to the party). */
  shares: readonly number[];
  onChange: (next: number[]) => void;
};

/**
 * How the EXP of every battle is split: one slider per Pokémon (at least 5% each, always 100% in
 * total). Moving a slider takes from / gives to the others; "ALL" sends everything above the others'
 * 5% to that Pokémon; "EQUAL" goes back to an even split.
 */
export function ExpShareSlider({ party, shares, onChange }: Props) {
  if (party.length <= 1) return null;
  const max = maxExpShare(party.length);
  return (
    <section className="exp-share" aria-label={t("EXP SHARE")}>
      <header>
        <strong>{t("EXP SHARE")}</strong>
        <span className="exp-share-hint">
          {t("Each Pokémon keeps at least {min}%. Put the rest on one.", { min: MIN_EXP_SHARE_PERCENT })}
        </span>
        <button type="button" data-exp-equal onClick={() => onChange(defaultExpShare(party.length))}>
          {t("EQUAL")}
        </button>
      </header>
      <div className="exp-share-rows">
        {party.map((pokemon, index) => (
          <label key={`${pokemon.species}-${index}`} className="exp-share-row" data-exp-row={index}>
            <span className="exp-share-name">{pokemonDisplayName(pokemon)}</span>
            <input
              type="range"
              min={MIN_EXP_SHARE_PERCENT}
              max={max}
              step={1}
              value={shares[index] ?? MIN_EXP_SHARE_PERCENT}
              aria-label={t("EXP share of {name}", { name: pokemonDisplayName(pokemon) })}
              data-exp-slider={index}
              onChange={(event) => onChange(setMemberShare(shares, index, Number(event.target.value)))}
            />
            <output data-exp-value={index}>{shares[index]}%</output>
            <button
              type="button"
              data-exp-all={index}
              title={t("Give all the rest to this Pokémon")}
              onClick={() => onChange(channelExpShare(party.length, index))}
            >
              {t("ALL")}
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}
