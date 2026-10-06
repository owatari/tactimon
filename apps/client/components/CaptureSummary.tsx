"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_NICKNAME_LENGTH,
  duelSpeciesTypes,
} from "@tactimon/battle-engine";
import { FrontSprite } from "./StartMenu";
import { ShinyStar } from "./ShinyStar";
import { TypeIcon } from "./TypeIcon";
import { MoveSlots } from "./MoveSlots";
import { PokemonStatTable } from "./PokemonStatTable";
import { t, useLocale } from "@/lib/i18n";
import { localizedSpeciesName } from "@/lib/i18n/names";
import { natureEffectText, natureName } from "@/lib/natures";
import { pokemonDisplayName } from "@/lib/pokemonName";
import { captureRoster, type CaptureDestination } from "@/lib/captureChoice";
import type { CapturedPokemon, StoryState } from "@/lib/story";

type Props = {
  story: StoryState;
  pokemon: CapturedPokemon;
  /** 1-based place of this catch in the queue and the queue length ("2/5"). */
  position: number;
  total: number;
  /** First time this species is owned: FireRed would register it in the Pokédex. */
  newEntry: boolean;
  onResolve: (choice: {
    destination: CaptureDestination;
    nickname: string;
    swapIndex?: number;
  }) => void;
  /** SEND ALL TO BOX: every pending catch goes to the box, no nicknames. */
  onSendAllToBox: () => void;
};


/** What the player sees right after a catch: portrait, stats, IVs, EVs, nature, name box, team/box. */
export function CaptureSummary({ story, pokemon, position, total, newEntry, onResolve, onSendAllToBox }: Props) {
  useLocale();
  const roster = captureRoster(story);
  const [nickname, setNickname] = useState("");
  // 0 = name box, 1 = SEND TO TEAM, 2 = SEND TO BOX, 3 = SEND ALL TO BOX (only with several catches)
  const [focus, setFocus] = useState(0);
  const lastFocus = total > 1 ? 3 : 2;
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focus === 0 && !swapOpen) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [focus, swapOpen]);

  const confirm = (destination: CaptureDestination, swap?: number) => {
    onResolve({ destination, nickname, swapIndex: swap });
  };

  const sendAll = () => {
    if (!roster.boxHasRoom) {
      setNotice(t("The box is full."));
      return;
    }
    onSendAllToBox();
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
        if (key === "ArrowDown") setFocus((f) => Math.min(lastFocus, f + 1));
        else if (key === "ArrowUp") setFocus((f) => Math.max(0, f - 1));
        else if (focus === 0) setFocus(1);
        else if (focus === 3) sendAll();
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
          {total > 1 && (
            <span className="capture-summary-count">
              {" "}
              {position}/{total}
            </span>
          )}
          {pokemon.shiny && <ShinyStar />}
        </h2>
        {pokemon.shiny && <p className="capture-summary-shiny">{t("SHINY!")}</p>}
        {newEntry && <p className="capture-summary-new">{t("NEW POKéDEX ENTRY")}</p>}
        <div className="start-menu-summary-body">
          <FrontSprite species={pokemon.species} name={name} shiny={pokemon.shiny} />
          <div className="capture-summary-info">
            <div className="capture-identity">
              <div className="capture-cell">
                <span>{t("TYPE")}</span>
                <div className="capture-types">
                  {types.map((type) => (
                    <TypeIcon key={type} type={type} scale={2} />
                  ))}
                </div>
              </div>
              <div className="capture-cell nature">
                <span>{t("NATURE")}</span>
                <strong>{pokemon.nature ? natureName(pokemon.nature) : "—"}</strong>
                {pokemon.nature && natureEffectText(pokemon.nature) ? (
                  <small>{natureEffectText(pokemon.nature)}</small>
                ) : null}
              </div>
            </div>
            <PokemonStatTable pokemon={pokemon} />
          </div>
          <MoveSlots moves={pokemon.activeMoves} movePp={pokemon.movePp} />
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
          {total > 1 && (
            <button
              type="button"
              className={`capture-send-all${focus === 3 ? " selected" : ""}`}
              onMouseEnter={() => setFocus(3)}
              onClick={sendAll}
            >
              {t("SEND ALL TO BOX ({count})", { count: total })}
            </button>
          )}
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
