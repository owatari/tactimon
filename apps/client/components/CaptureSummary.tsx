"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_NICKNAME_LENGTH,
  calculateDuelPokemonStats,
  duelSpeciesTypes,
  natureEffect,
  totalEv,
  type NatureStat,
} from "@tactimon/battle-engine";
import { FrontSprite } from "./StartMenu";
import { ShinyStar } from "./ShinyStar";
import { t, useLocale } from "@/lib/i18n";
import { localizedMoveName, localizedSpeciesName } from "@/lib/i18n/names";
import { natureEffectText, natureName } from "@/lib/natures";
import { pokemonDisplayName } from "@/lib/pokemonName";
import { captureRoster, type CaptureDestination } from "@/lib/captureChoice";
import type { CapturedPokemon, StoryState } from "@/lib/story";

type Props = {
  story: StoryState;
  pokemon: CapturedPokemon;
  /** First time this species is owned: FireRed would register it in the Pokédex. */
  newEntry: boolean;
  onResolve: (choice: {
    destination: CaptureDestination;
    nickname: string;
    swapIndex?: number;
  }) => void;
};

type Row = {
  label: string;
  stat: "hp" | NatureStat;
  value: number;
  iv: number;
  ev: number;
};

/** What the player sees right after a catch: portrait, stats, IVs, EVs, nature, name box, team/box. */
export function CaptureSummary({ story, pokemon, newEntry, onResolve }: Props) {
  useLocale();
  const stats = calculateDuelPokemonStats(pokemon);
  const effect = pokemon.nature ? natureEffect(pokemon.nature) : null;
  const showEvs = totalEv(pokemon.evs) > 0;
  const roster = captureRoster(story);
  const [nickname, setNickname] = useState("");
  // 0 = name box, 1 = SEND TO TEAM, 2 = SEND TO BOX
  const [focus, setFocus] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const rows: Row[] = [
    { label: "HP", stat: "hp", value: stats.hp, iv: pokemon.ivs?.hp ?? 15, ev: pokemon.evs.hp },
    { label: t("ATTACK"), stat: "attack", value: stats.attack, iv: pokemon.ivs?.attack ?? 15, ev: pokemon.evs.attack },
    { label: t("DEFENSE"), stat: "defense", value: stats.defense, iv: pokemon.ivs?.defense ?? 15, ev: pokemon.evs.defense },
    { label: t("SP. ATK"), stat: "specialAttack", value: stats.specialAttack, iv: pokemon.ivs?.specialAttack ?? 15, ev: pokemon.evs.specialAttack },
    { label: t("SP. DEF"), stat: "specialDefense", value: stats.specialDefense, iv: pokemon.ivs?.specialDefense ?? 15, ev: pokemon.evs.specialDefense },
    { label: t("SPEED"), stat: "speed", value: stats.speed, iv: pokemon.ivs?.speed ?? 15, ev: pokemon.evs.speed },
  ];
  const tint = (stat: Row["stat"]) =>
    stat === "hp" ? undefined : effect?.up === stat ? "nature-up" : effect?.down === stat ? "nature-down" : undefined;
  const arrow = (stat: Row["stat"]) =>
    stat === "hp" ? "" : effect?.up === stat ? " ▲" : effect?.down === stat ? " ▼" : "";

  useEffect(() => {
    if (focus === 0 && !swapOpen) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [focus, swapOpen]);

  const confirm = (destination: CaptureDestination, swap?: number) => {
    onResolve({ destination, nickname, swapIndex: swap });
  };

  const choose = (destination: CaptureDestination) => {
    if (destination === "box") {
      if (!roster.boxHasRoom) {
        setNotice(t("The box is full."));
        return;
      }
      confirm("box");
      return;
    }
    if (roster.teamHasRoom) {
      confirm("team");
      return;
    }
    if (!roster.boxHasRoom) {
      setNotice(t("The team and the box are full."));
      return;
    }
    setSwapIndex(0);
    setSwapOpen(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (swapOpen) {
        event.preventDefault();
        event.stopPropagation();
        const count = story.capturedPokemon.length;
        if (key === "ArrowUp") setSwapIndex((i) => (i + count - 1) % count);
        else if (key === "ArrowDown") setSwapIndex((i) => (i + 1) % count);
        else if (key === "Enter" || key === " ") confirm("team", swapIndex);
        else if (key === "Escape") setSwapOpen(false);
        return;
      }
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (key === "ArrowDown") setFocus((f) => Math.min(2, f + 1));
        else if (key === "ArrowUp") setFocus((f) => Math.max(0, f - 1));
        else if (focus === 0) setFocus(1);
        else choose(focus === 1 ? "team" : "box");
      }
      // Any other key is typing for the name box: the game is paused, so nothing else reacts to it.
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const types = duelSpeciesTypes(pokemon.species);
  const name = localizedSpeciesName(pokemon.species);

  return (
    <div className="start-menu-overlay capture-summary-overlay">
      <section className="start-menu-screen start-menu-summary capture-summary" aria-live="polite">
        <h2>
          {t("Gotcha! {name} was caught!", { name })} · Lv{pokemon.level}
          {pokemon.shiny && <ShinyStar />}
        </h2>
        {pokemon.shiny && <p className="capture-summary-shiny">{t("SHINY!")}</p>}
        {newEntry && <p className="capture-summary-new">{t("NEW POKéDEX ENTRY")}</p>}
        <div className="start-menu-summary-body">
          <FrontSprite species={pokemon.species} name={name} shiny={pokemon.shiny} />
          <div className="capture-summary-info">
            <dl className="start-menu-dl">
              <dt>{t("TYPE")}</dt>
              <dd>{types.map((type) => t(type.toUpperCase())).join(" / ")}</dd>
              <dt>{t("NATURE")}</dt>
              <dd>
                {pokemon.nature ? natureName(pokemon.nature) : "—"}
                {pokemon.nature && natureEffectText(pokemon.nature) ? (
                  <small className="start-menu-nature-effect"> {natureEffectText(pokemon.nature)}</small>
                ) : null}
              </dd>
            </dl>
            <table className="capture-stats">
              <thead>
                <tr>
                  <th />
                  <th>{t("STAT")}</th>
                  <th>IV</th>
                  {showEvs && <th>EV</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.stat}>
                    <th className={tint(row.stat)}>
                      {row.label}
                      {arrow(row.stat)}
                    </th>
                    <td className={tint(row.stat)}>{row.value}</td>
                    <td>
                      <span className="capture-iv-bar" aria-hidden="true">
                        <i style={{ width: `${(row.iv / 31) * 100}%` }} />
                      </span>
                      {row.iv}
                    </td>
                    {showEvs && <td>{row.ev}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="capture-moves">
              {pokemon.activeMoves.map((moveId) => (
                <li key={moveId}>{localizedMoveName(moveId)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="capture-actions">
          <label className={focus === 0 ? "selected" : ""}>
            <span>{t("NICKNAME")}</span>
            <input
              ref={inputRef}
              type="text"
              value={nickname}
              maxLength={MAX_NICKNAME_LENGTH}
              placeholder={pokemonDisplayName(pokemon)}
              onChange={(event) => setNickname(event.target.value)}
              onFocus={() => setFocus(0)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className={focus === 1 ? "selected" : ""}
            onMouseEnter={() => setFocus(1)}
            onClick={() => choose("team")}
          >
            {t("SEND TO TEAM")}
          </button>
          <button
            type="button"
            className={focus === 2 ? "selected" : ""}
            onMouseEnter={() => setFocus(2)}
            onClick={() => choose("box")}
          >
            {t("SEND TO BOX")}
          </button>
        </div>
        {notice && <p className="capture-summary-notice">{notice}</p>}

        {swapOpen && (
          <div className="start-menu-popup capture-swap" role="dialog">
            <strong>{t("Which Pokémon goes to the box?")}</strong>
            {story.capturedPokemon.map((member, index) => (
              <div
                key={`${member.species}-${index}`}
                className={index === swapIndex ? "selected" : ""}
                onMouseEnter={() => setSwapIndex(index)}
                onClick={() => confirm("team", index)}
              >
                {pokemonDisplayName(member)} Lv{member.level}
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="start-menu-help capture-summary-help">
        {swapOpen
          ? t("↑↓ move · Enter confirm · Esc back")
          : t("↑↓ move · Enter confirm · type a nickname (optional)")}
      </p>
    </div>
  );
}
