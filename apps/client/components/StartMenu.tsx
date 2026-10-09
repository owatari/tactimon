"use client";

import { localizedMoveName } from "@/lib/i18n/names";
import { localizedSpeciesName as speciesDisplayName } from "@/lib/i18n/names";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DUEL_MOVES,
  calculateDuelPokemonStats,
  duelSpeciesTypes,
  isDuelSpeciesId,
  experienceProgress,
  natureEffect,
  type NatureStat,
  type PokemonProgression,
} from "@tactimon/battle-engine";
import { natureEffectText, natureName } from "@/lib/natures";
import { pokemonDisplayName } from "@/lib/pokemonName";
import { ShinyStar } from "./ShinyStar";
import { TypeIcon } from "./TypeIcon";
import { MoveSlots } from "./MoveSlots";
import { PokemonWindow } from "./PokemonWindow";
import { PokemonStatTable } from "./PokemonStatTable";
import { PokemonPortrait } from "@/components/PokemonPortrait";
import { pokedexFrontSpriteUrl } from "@/lib/pokedex";
import { PLAYER_SPRITE } from "@/lib/maps";
import { MOVE_DESCRIPTIONS } from "@/lib/generated/moveDescriptions";
import { POKEDEX_SPECIES } from "@/lib/pokedex";
import { PokedexGba } from "@/components/PokedexGba";
import {
  getPokedex,
  pokedexDisplayName,
} from "@/lib/pokedex";
import {
  menuEntriesFor,
  buildBagPockets,
  buildTrainerCard,
  getStoryParty,
  reorderPartyMoves,
  reorderStoryParty,
  type MenuScreen,
} from "@/lib/gameMenu";
import type { GameOptions } from "@/lib/options";
import {
  itemNeedsMoveTarget,
  itemTargetsTrainer,
  useBagItem,
} from "@/lib/itemUse";
import type { OverworldItemId } from "@/lib/items";
import type { ProgressionReward } from "@tactimon/battle-engine";
import {
  LOCALES,
  LOCALE_LABELS,
  getLocale,
  setLocale,
  t,
  useLocale,
} from "@/lib/i18n";
import { clearAllSaves } from "@/lib/saveReset";
import type { StoryState } from "@/lib/story";
import {
  checkFlyDestination,
  townMapRows,
  type TownMapEntry,
} from "@/lib/townMap";

type Props = {
  story: StoryState;
  options: GameOptions;
  onStoryChange: (next: StoryState) => void;
  onOptionsChange: (next: GameOptions) => void;
  /** Flushes pending play time and returns the confirmation text. */
  onSave: () => string;
  /** Called when an item (Rare Candy) produced a level-up reward. */
  onItemReward?: (reward: ProgressionReward, partyIndex: number) => void;
  /** Fly to a visited town (Town Map screen). */
  onFly?: (destination: TownMapEntry) => void;
  onClose: () => void;
  /** Opens straight on this screen (HUD buttons). Going back from it closes the menu. */
  initialScreen?: MenuScreen;
};

type BagUse = {
  itemId: string;
  name: string;
  step: "pokemon" | "move";
  partyIndex: number;
  moveIndex: number;
};

const PARTY_ACTIONS = ["SUMMARY", "SWITCH", "CANCEL"] as const;
const OPTION_ROWS = [
  "MUSIC VOLUME",
  "MUSIC",
  "BATTLE SPEED",
  "LANGUAGE",
  "ERASE SAVE",
  "CLOSE",
] as const;

const wrap = (value: number, size: number) =>
  size <= 0 ? 0 : (value + size) % size;

function hpClass(pokemon: PokemonProgression, maxHp: number) {
  const ratio = pokemon.currentHp / Math.max(1, maxHp);
  return ratio <= 0.2 ? "low" : ratio <= 0.5 ? "mid" : "high";
}

function HpBar({ pokemon }: { pokemon: PokemonProgression }) {
  const maxHp = calculateDuelPokemonStats(pokemon).hp;

  return (
    <div className="start-menu-hp">
      <span>HP</span>
      <div className="start-menu-hp-track">
        <div
          className={`start-menu-hp-fill ${hpClass(pokemon, maxHp)}`}
          style={{
            width: `${Math.max(0, Math.min(100, (pokemon.currentHp / Math.max(1, maxHp)) * 100))}%`,
          }}
        />
      </div>
      <em>
        {pokemon.currentHp}/{maxHp}
      </em>
    </div>
  );
}

export function StartMenu({
  story,
  options,
  onStoryChange,
  onOptionsChange,
  onSave,
  onItemReward,
  onFly,
  onClose,
  initialScreen,
}: Props) {
  const locale = useLocale();
  const optionLabels = [
    t("MUSIC VOLUME"),
    t("MUSIC"),
    t("BATTLE SPEED"),
    t("LANGUAGE"),
    t("ERASE SAVE"),
    t("CLOSE"),
  ];
  const closeOnBack = initialScreen !== undefined && initialScreen !== "root";
  const [screen, setScreen] = useState<MenuScreen>(initialScreen ?? "root");
  const leave = () => (closeOnBack ? onClose() : setScreen("root"));
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  const [rootIndex, setRootIndex] = useState(0);
  const [partyIndex, setPartyIndex] = useState(0);
  const [partyAction, setPartyAction] = useState<number | null>(
    null,
  );
  const [switchFrom, setSwitchFrom] = useState<number | null>(
    null,
  );
  const [summaryIndex, setSummaryIndex] = useState(0);
  const [pocketIndex, setPocketIndex] = useState(0);
  const [bagIndex, setBagIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const [townIndex, setTownIndex] = useState(0);
  const [cardBack, setCardBack] = useState(false);
  // FireRed Summary: A on the moves page enters move selection, A again opens the move info page.
  const [summaryMove, setSummaryMove] = useState<number | null>(null);
  const [bagUse, setBagUse] = useState<BagUse | null>(null);
  const [notice, setNotice] = useState("");
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const eraseArmedRef = useRef(false);

  const party = useMemo(() => getStoryParty(story), [story]);
  const pockets = useMemo(() => buildBagPockets(story), [story]);
  const card = useMemo(() => buildTrainerCard(story), [story]);
  const menuEntries = useMemo(() => menuEntriesFor(story), [story]);
  const dex = useMemo(() => getPokedex(story), [story]);
  const townRows = useMemo(() => townMapRows(story), [story]);

  // Keep the key handler stable while reading the latest state.
  const latest = useRef({
    screen,
    rootIndex,
    partyIndex,
    partyAction,
    switchFrom,
    summaryIndex,
    summaryMove,
    pocketIndex,
    bagIndex,
    optionIndex,
    townIndex,
    townRows,
    bagUse,
    party,
    pockets,
    story,
    options,
  });
  latest.current = {
    screen,
    rootIndex,
    partyIndex,
    partyAction,
    switchFrom,
    summaryIndex,
    summaryMove,
    pocketIndex,
    bagIndex,
    optionIndex,
    townIndex,
    townRows,
    bagUse,
    party,
    pockets,
    story,
    options,
  };

  const applyItem = (
    use: BagUse,
    partyIndex: number,
    moveIndex: number,
  ) => {
    const result = useBagItem(
      latest.current.story,
      use.itemId as OverworldItemId,
      partyIndex,
      moveIndex,
    );
    setNotice(result.message);
    if (result.accepted) {
      onStoryChange(result.story);
      setBagUse(null);
      setBagIndex(0);
      if (result.reward) {
        onItemReward?.(result.reward, partyIndex);
      }
    } else if (itemTargetsTrainer(use.itemId)) {
      setBagUse(null);
    }
  };
  const applyItemRef = useRef(applyItem);
  applyItemRef.current = applyItem;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const k = event.key.toLowerCase();
      const up = k === "arrowup" || k === "w";
      const down = k === "arrowdown" || k === "s";
      const left = k === "arrowleft" || k === "a";
      const right = k === "arrowright" || k === "d";
      const confirm =
        k === "enter" || k === " " || k === "z" || k === "e";
      const back =
        k === "escape" ||
        k === "x" ||
        k === "backspace" ||
        k === "tab" ||
        k === "m";
      if (!(up || down || left || right || confirm || back)) {
        return;
      }
      event.preventDefault();
      if (event.repeat && (confirm || back)) return;

      const s = latest.current;
      setNotice("");
      if (!(s.screen === "options" && s.optionIndex === 4 && confirm)) {
        eraseArmedRef.current = false;
      }

      if (s.screen === "root") {
        if (up) setRootIndex(wrap(s.rootIndex - 1, menuEntries.length));
        else if (down) setRootIndex(wrap(s.rootIndex + 1, menuEntries.length));
        else if (back) onClose();
        else if (confirm) {
          const entry = menuEntries[s.rootIndex];
          if (!entry.enabled) {
            setNotice(
              t("{label}: {hint}.", {
                label: t(entry.label),
                hint: entry.hint ? t(entry.hint) : t("unavailable"),
              }),
            );
          } else if (entry.id === "exit") onClose();
          else if (entry.id === "save") setNotice(onSave());
          else {
            setScreen(
              entry.id === "pokedex"
                ? "pokedex"
                : entry.id === "party"
                ? "party"
                : entry.id === "bag"
                  ? "bag"
                  : entry.id === "card"
                    ? "card"
                    : "options",
            );
            setPartyAction(null);
            setSwitchFrom(null);
          }
        }
        return;
      }

      if (s.screen === "pokedex") {
        return;
      }

      if (s.screen === "party") {
        const count = s.party.length;
        if (s.partyAction !== null) {
          if (up) setPartyAction(wrap(s.partyAction - 1, PARTY_ACTIONS.length));
          else if (down) setPartyAction(wrap(s.partyAction + 1, PARTY_ACTIONS.length));
          else if (back) setPartyAction(null);
          else if (confirm) {
            const action = PARTY_ACTIONS[s.partyAction];
            setPartyAction(null);
            if (action === "SUMMARY") {
              setSummaryIndex(s.partyIndex);
              setScreen("summary");
            } else if (action === "SWITCH") {
              if (s.partyIndex === 0) {
                setNotice(t("The lead Pokémon cannot be swapped."));
              } else {
                setSwitchFrom(s.partyIndex);
                setNotice(t("Choose the other Pokémon."));
              }
            }
          }
          return;
        }
        if (up) setPartyIndex(wrap(s.partyIndex - 1, count));
        else if (down) setPartyIndex(wrap(s.partyIndex + 1, count));
        else if (back) {
          if (s.switchFrom !== null) setSwitchFrom(null);
          else leaveRef.current();
        } else if (confirm && count > 0) {
          if (s.switchFrom !== null) {
            const result = reorderStoryParty(
              s.story,
              s.switchFrom,
              s.partyIndex,
            );
            if (result.accepted) {
              onStoryChange(result.story);
              setNotice(t("Pokémon swapped places."));
            } else if (result.reason === "lead-locked") {
              setNotice(t("The lead Pokémon cannot be swapped."));
            }
            setSwitchFrom(null);
          } else {
            setPartyAction(0);
          }
        }
        return;
      }

      if (s.screen === "summary") {
        // One screen with everything: arrows flip between Pokémon, A selects a move, B backs out.
        if (s.summaryMove !== null) {
          const moveCount = s.party[s.summaryIndex]?.activeMoves.length ?? 0;
          if (up) setSummaryMove(wrap(s.summaryMove - 1, moveCount));
          else if (down) setSummaryMove(wrap(s.summaryMove + 1, moveCount));
          else if (back || confirm) setSummaryMove(null);
          return;
        }
        if (confirm) {
          if ((s.party[s.summaryIndex]?.activeMoves.length ?? 0) > 0) setSummaryMove(0);
          return;
        }
        if (up || left) setSummaryIndex(wrap(s.summaryIndex - 1, s.party.length));
        else if (down || right) setSummaryIndex(wrap(s.summaryIndex + 1, s.party.length));
        else if (back) {
          setSummaryMove(null);
          setPartyIndex(s.summaryIndex);
          setScreen("party");
        }
        return;
      }

      if (s.screen === "bag") {
        const entries = s.pockets[s.pocketIndex]?.entries ?? [];
        if (s.bagUse) {
          const use = s.bagUse;
          const target = s.party[use.partyIndex];
          if (use.step === "pokemon") {
            if (up) setBagUse({ ...use, partyIndex: wrap(use.partyIndex - 1, s.party.length) });
            else if (down) setBagUse({ ...use, partyIndex: wrap(use.partyIndex + 1, s.party.length) });
            else if (back) setBagUse(null);
            else if (confirm) {
              if (itemNeedsMoveTarget(use.itemId)) {
                setBagUse({ ...use, step: "move", moveIndex: 0 });
              } else {
                applyItemRef.current(use, use.partyIndex, 0);
              }
            }
          } else {
            const moveCount = target?.activeMoves.length ?? 0;
            if (up) setBagUse({ ...use, moveIndex: wrap(use.moveIndex - 1, moveCount) });
            else if (down) setBagUse({ ...use, moveIndex: wrap(use.moveIndex + 1, moveCount) });
            else if (back) setBagUse({ ...use, step: "pokemon" });
            else if (confirm) applyItemRef.current(use, use.partyIndex, use.moveIndex);
          }
          return;
        }
        if (left) {
          setPocketIndex(wrap(s.pocketIndex - 1, s.pockets.length));
          setBagIndex(0);
        } else if (right) {
          setPocketIndex(wrap(s.pocketIndex + 1, s.pockets.length));
          setBagIndex(0);
        } else if (up) setBagIndex(wrap(s.bagIndex - 1, entries.length));
        else if (down) setBagIndex(wrap(s.bagIndex + 1, entries.length));
        else if (back) leaveRef.current();
        else if (confirm && entries[s.bagIndex]) {
          const entry = entries[s.bagIndex];
          if (entry.id === "town-map") {
            setTownIndex(0);
            setScreen("townmap");
          } else if (!entry.usable) {
            setNotice(t("This item cannot be used right now."));
          } else if (itemTargetsTrainer(entry.id)) {
            applyItemRef.current(
              {
                itemId: entry.id,
                name: entry.name,
                step: "pokemon",
                partyIndex: 0,
                moveIndex: 0,
              },
              0,
              0,
            );
          } else if (s.party.length === 0) {
            setNotice(t("You have no Pokémon."));
          } else {
            setBagUse({
              itemId: entry.id,
              name: entry.name,
              step: "pokemon",
              partyIndex: 0,
              moveIndex: 0,
            });
            setNotice(
              t("Use {item} on which Pokémon?", { item: t(entry.name) }),
            );
          }
        }
        return;
      }

      if (s.screen === "card") {
        // FireRed: A flips the card, B closes it.
        if (confirm) setCardBack((flipped) => !flipped);
        else if (back) {
          setCardBack(false);
          leaveRef.current();
        }
        return;
      }

      if (s.screen === "townmap") {
        if (up) setTownIndex(wrap(s.townIndex - 1, s.townRows.length));
        else if (down) setTownIndex(wrap(s.townIndex + 1, s.townRows.length));
        else if (back) setScreen("bag");
        else if (confirm) {
          const row = s.townRows[s.townIndex];
          const check = checkFlyDestination(s.story, row.id);
          if (!check.ok) {
            setNotice(check.message);
          } else {
            onFly?.(check.entry);
          }
        }
        return;
      }

      // options
      const o = s.options;
      if (up) setOptionIndex(wrap(s.optionIndex - 1, OPTION_ROWS.length));
      else if (down) setOptionIndex(wrap(s.optionIndex + 1, OPTION_ROWS.length));
      else if (back) leaveRef.current();
      else if (left || right || confirm) {
        const step = left ? -10 : 10;
        if (s.optionIndex === 0 && (left || right)) {
          onOptionsChange({
            ...o,
            musicVolume: Math.max(0, Math.min(100, o.musicVolume + step)),
          });
        } else if (s.optionIndex === 1) {
          onOptionsChange({ ...o, musicMuted: !o.musicMuted });
        } else if (s.optionIndex === 2) {
          onOptionsChange({ ...o, battleSpeed: o.battleSpeed === 1 ? 2 : 1 });
        } else if (s.optionIndex === 3 && (left || right || confirm)) {
          const dir = left ? -1 : 1;
          const at = LOCALES.indexOf(getLocale());
          setLocale(LOCALES[wrap(at + dir, LOCALES.length)]);
        } else if (s.optionIndex === 4 && confirm) {
          if (eraseArmedRef.current) {
            clearAllSaves(window.localStorage);
            window.location.reload();
          } else {
            eraseArmedRef.current = true;
            setNotice(
              t("Press ENTER again to erase your save. Any other key cancels."),
            );
          }
          return;
        } else if (s.optionIndex === 5 && confirm) {
          leaveRef.current();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuEntries, onClose, onFly, onOptionsChange, onSave, onStoryChange]);

  const summaryPokemon = party[summaryIndex] ?? null;

  return (
    <div
      className="start-menu-overlay"
      role="dialog"
      aria-label={t("Menu")}
    >
      {screen === "root" && (
        <nav className="start-menu-root">
          {menuEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={[
                "start-menu-entry",
                index === rootIndex ? "selected" : "",
                entry.enabled ? "" : "disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setRootIndex(index)}
              onClick={() => {
                setRootIndex(index);
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "Enter" }),
                );
              }}
            >
              {t(entry.label)}
            </button>
          ))}
        </nav>
      )}

      {screen === "pokedex" && (
        <section className="start-menu-gba">
          <PokedexGba
            story={story}
            musicVolume={options.musicMuted ? 0 : options.musicVolume}
            onClose={() => leaveRef.current()}
          />
        </section>
      )}

      {screen === "party" && (
        <section className="start-menu-screen start-menu-party">
          <h2>{t("POKéMON")}</h2>
          {party.length === 0 ? (
            <p className="start-menu-empty">{t("You do not have any Pokémon yet.")}</p>
          ) : (
            <PokemonWindow
              party={party}
              selectedIndex={partyIndex}
              pinnedIndex={pinnedIndex}
              switchFrom={switchFrom}
              notice={notice}
              onPin={(index) => {
                setPartyIndex(index);
                setPinnedIndex((current) => (current === index ? null : index));
              }}
              onReorder={(from, to) => {
                const result = reorderStoryParty(story, from, to);
                if (result.accepted) {
                  onStoryChange(result.story);
                  setPinnedIndex(null);
                  setNotice(t("Pokémon swapped places."));
                } else if (result.reason === "lead-locked") {
                  setNotice(t("The lead Pokémon cannot be swapped."));
                }
              }}
              renderSlot={(pokemon) => (
                <>
                  <FrontSprite
                    species={pokemon.species}
                    name={speciesDisplayName(pokemon.species)}
                    compact
                    shiny={pokemon.shiny}
                  />
                  <div className="start-menu-party-copy">
                    <strong>
                      {pokemonDisplayName(pokemon)}
                      {pokemon.shiny && <ShinyStar />}
                    </strong>
                    <span>Lv{pokemon.level}</span>
                    {pokemon.status && (
                      <b className={`start-menu-status ${pokemon.status}`}>
                        {pokemon.status.slice(0, 3).toUpperCase()}
                      </b>
                    )}
                  </div>
                  <HpBar pokemon={pokemon} />
                </>
              )}
              summary={(() => {
                const shownIndex = pinnedIndex ?? partyIndex;
                const shown = party[shownIndex];
                if (!shown) return null;
                return (
                  <div className="pokemon-window-card" data-pinned={pinnedIndex !== null}>
                    <h3>
                      {pokemonDisplayName(shown)}
                      {shown.shiny && <ShinyStar />} · Lv{shown.level}
                    </h3>
                    <div className="pokemon-window-card-top">
                      <FrontSprite
                        species={shown.species}
                        name={speciesDisplayName(shown.species)}
                        shiny={shown.shiny}
                      />
                      <SummaryInfo pokemon={shown} story={story} />
                    </div>
                    <SummaryStats pokemon={shown} />
                    <MoveSlots
                      moves={shown.activeMoves}
                      movePp={shown.movePp}
                      onReorder={
                        pinnedIndex !== null
                          ? (from, to) => {
                              const result = reorderPartyMoves(story, shownIndex, from, to);
                              if (result.accepted) onStoryChange(result.story);
                            }
                          : undefined
                      }
                    />
                    <p className="pokemon-window-hint">
                      {pinnedIndex !== null
                        ? t("Drag moves to reorder them. Click the Pokémon again to unpin.")
                        : t("Click a Pokémon to pin its Summary. Drag Pokémon to reorder the party.")}
                    </p>
                  </div>
                );
              })()}
            />
          )}
          {partyAction !== null && (
            <div className="start-menu-popup">
              {PARTY_ACTIONS.map((action, index) => (
                <div
                  key={action}
                  className={index === partyAction ? "selected" : ""}
                >
                  {t(action)}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === "summary" && summaryPokemon && (
        <section className="start-menu-screen start-menu-summary start-menu-summary-single">
          <h2>
            {pokemonDisplayName(summaryPokemon)}
            {summaryPokemon.shiny && <ShinyStar />} · Lv
            {summaryPokemon.level}
            <span className="capture-summary-count">
              {" "}
              {summaryIndex + 1}/{party.length}
            </span>
          </h2>
          <div className="start-menu-summary-body">
            <div className="summary-col summary-col-id">
              <FrontSprite
                species={summaryPokemon.species}
                name={speciesDisplayName(summaryPokemon.species)}
                shiny={summaryPokemon.shiny}
              />
              <SummaryInfo pokemon={summaryPokemon} story={story} />
            </div>
            <div className="summary-col">
              <SummaryStats pokemon={summaryPokemon} />
            </div>
            <div className="summary-col">
              <MoveSlots
                moves={summaryPokemon.activeMoves}
                movePp={summaryPokemon.movePp}
                selected={summaryMove}
              />
            </div>
          </div>
        </section>
      )}

      {screen === "bag" && (
        <section className="start-menu-screen start-menu-bag">
          <aside className="start-menu-bag-side">
            <div className="start-menu-bag-pocket">
              <span aria-hidden="true">◀</span>
              <strong>{t(pockets[pocketIndex].label)}</strong>
              <span aria-hidden="true">▶</span>
            </div>
            <div className="start-menu-pockets" aria-hidden="true">
              {pockets.map((pocket, index) => (
                <i
                  key={pocket.id}
                  className={index === pocketIndex ? "selected" : ""}
                />
              ))}
            </div>
            {pockets[pocketIndex].entries[bagIndex]?.iconUrl && (
              <img
                className="start-menu-bag-big"
                src={pockets[pocketIndex].entries[bagIndex].iconUrl}
                alt=""
              />
            )}
          </aside>
          <ul className="start-menu-bag-list" data-nav="vertical">
            {pockets[pocketIndex].entries.map((entry, index) => (
              <li
                key={entry.id}
                className={index === bagIndex ? "selected" : ""}
              >
                {entry.iconUrl ? (
                  <img src={entry.iconUrl} alt="" />
                ) : (
                  <span className="start-menu-bag-icon-blank" />
                )}
                <span>{t(entry.name)}</span>
                {entry.quantity !== null && <em>×{entry.quantity}</em>}
              </li>
            ))}
            {pockets[pocketIndex].entries.length === 0 && (
              <li className="start-menu-empty">
                {pockets[pocketIndex].reserved
                  ? t("Reserved for Dungeons and Raids.")
                  : t("Empty.")}
              </li>
            )}
          </ul>
          <p className="start-menu-description">
            {t(pockets[pocketIndex].entries[bagIndex]?.description ?? "")}
          </p>
          {bagUse && (
            <div className="start-menu-popup start-menu-bag-target">
              {bagUse.step === "pokemon"
                ? party.map((pokemon, index) => (
                    <div
                      key={`${pokemon.species}-${index}`}
                      className={index === bagUse.partyIndex ? "selected" : ""}
                    >
                      {pokemonDisplayName(pokemon)} Lv{pokemon.level}{" "}
                      {pokemon.currentHp}HP
                    </div>
                  ))
                : (party[bagUse.partyIndex]?.activeMoves ?? []).map(
                    (moveId, index) => (
                      <div
                        key={moveId}
                        className={index === bagUse.moveIndex ? "selected" : ""}
                      >
                        {localizedMoveName(moveId)} PP{" "}
                        {party[bagUse.partyIndex].movePp[moveId] ??
                          DUEL_MOVES[moveId].maxPp}
                        /{DUEL_MOVES[moveId].maxPp}
                      </div>
                    ),
                  )}
            </div>
          )}
        </section>
      )}

      {screen === "card" && (
        <section
          className={`start-menu-screen start-menu-card stars-${card.stars}`}
        >
          <h2>
            {cardBack
              ? t("{name}'s TRAINER CARD", { name: card.name })
              : t("TRAINER CARD")}
            <span className="start-menu-card-stars" aria-label={t("Stars")}>
              {"★".repeat(card.stars)}
              {"☆".repeat(4 - card.stars)}
            </span>
          </h2>
          {!cardBack ? (
            <>
              <div className="start-menu-card-body">
                <dl>
                  <dt>{t("NAME")}</dt>
                  <dd>{card.name}</dd>
                  <dt>{t("IDNo.")}</dt>
                  <dd>{card.idNo}</dd>
                  <dt>{t("MONEY")}</dt>
                  <dd>₽{card.money.toLocaleString("pt-BR")}</dd>
                  {card.hasPokedex && (
                    <>
                      <dt>{t("POKéDEX")}</dt>
                      <dd>{card.pokedexCaught}</dd>
                    </>
                  )}
                  <dt>{t("TIME")}</dt>
                  <dd>{card.playTime}</dd>
                </dl>
                <div
                  className="start-menu-card-trainer"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url("${PLAYER_SPRITE.url}")`,
                    backgroundSize: `${PLAYER_SPRITE.sheetWidth}px ${PLAYER_SPRITE.sheetHeight}px`,
                  }}
                />
              </div>
              <div className="start-menu-badges">
                {card.badges.map((badge) => (
                  <span
                    key={badge.id}
                    className={badge.earned ? "earned" : ""}
                    title={t(badge.label)}
                  >
                    <i aria-hidden="true" />
                    {t(badge.label)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="start-menu-card-body">
              <dl>
                <dt>{t("HALL OF FAME DEBUT")}</dt>
                <dd>{card.hofDebut ?? "—"}</dd>
                <dt>{t("POKéMON TRADES")}</dt>
                <dd>{card.pokemonTrades}</dd>
                {card.hasPokedex && (
                  <>
                    <dt>{t("POKéDEX SEEN")}</dt>
                    <dd>{card.pokedexSeen}</dd>
                  </>
                )}
                <dt>{t("POKéMON IN PARTY")}</dt>
                <dd>{card.partySize}</dd>
              </dl>
            </div>
          )}
        </section>
      )}

      {screen === "townmap" && (
        <section className="start-menu-screen start-menu-options start-menu-townmap">
          <h2>{t("TOWN MAP")}</h2>
          <ul data-nav="vertical">
            {townRows.map((row, index) => (
              <li
                key={row.id}
                className={index === townIndex ? "selected" : ""}
              >
                <span>{t(row.label)}</span>
                <em>{row.visited ? "●" : "—"}</em>
              </li>
            ))}
          </ul>
          <p className="start-menu-hint">
            {t("Enter: fly (HM Fly + Thunder Badge) · ● already visited")}
          </p>
        </section>
      )}

      {screen === "options" && (
        <section className="start-menu-screen start-menu-options">
          <h2>{t("OPTION")}</h2>
          <ul data-nav="vertical">
            {OPTION_ROWS.map((row, index) => (
              <li
                key={row}
                className={index === optionIndex ? "selected" : ""}
              >
                <span>{optionLabels[index]}</span>
                <em>
                  {index === 0
                    ? `◀ ${options.musicVolume}% ▶`
                    : index === 1
                      ? options.musicMuted
                        ? t("OFF")
                        : t("ON")
                      : index === 2
                        ? `${options.battleSpeed}x`
                        : index === 3
                          ? `◀ ${LOCALE_LABELS[locale]} ▶`
                          : ""}
                </em>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notice && <p className="start-menu-notice">{notice}</p>}
      <p className="start-menu-help">
        {t("↑↓ move · Enter confirm · Esc back")}
        {screen === "bag" ? ` · ${t("←→ change page")}` : ""}
        {screen === "summary" ? " · " + t("←→ switch Pokémon · Enter moves") : ""}
        {screen === "card" ? ` · ${t("Enter flip card")}` : ""}
        {screen === "townmap"
          ? ` · ${t("Enter fly (HM Fly + Thunder Badge) · ● visited")}`
          : ""}
      </p>
    </div>
  );
}

/** FireRed Summary, Pokémon Info page: dex number, species, type, OT, ID No. and held item. */
export function SummaryInfo({
  pokemon,
  story,
}: {
  pokemon: PokemonProgression;
  story: StoryState;
}) {
  useLocale();
  const types = duelSpeciesTypes(pokemon.species);
  const dexNo = POKEDEX_SPECIES.indexOf(pokemon.species) + 1;

  return (
    <dl className="start-menu-dl">
      <dt>{t("POKéDEX No.")}</dt>
      <dd>{dexNo > 0 ? String(dexNo).padStart(3, "0") : "—"}</dd>
      <dt>{t("NAME")}</dt>
      <dd>{pokemonDisplayName(pokemon)}</dd>
      <dt>{t("TYPE")}</dt>
      <dd className="summary-types">
        {types.map((type) => (
          <TypeIcon key={type} type={type} scale={1} />
        ))}
      </dd>
      <dt>{t("NATURE")}</dt>
      <dd>
        {pokemon.nature ? natureName(pokemon.nature) : "—"}
        {pokemon.nature && natureEffectText(pokemon.nature) ? (
          <small className="start-menu-nature-effect"> {natureEffectText(pokemon.nature)}</small>
        ) : null}
      </dd>
      <dt>{t("OT")}</dt>
      <dd>{story.trainerName ?? "RED"}</dd>
      <dt>{t("IDNo.")}</dt>
      <dd>{String(story.trainerId ?? 0).padStart(5, "0")}</dd>
      <dt>{t("ITEM")}</dt>
      <dd>{t("NONE")}</dd>
    </dl>
  );
}

/** HP + bar, the STAT / IV / EV table, EXP, NEXT LV. and STATUS (the old Skills page). */
export function SummaryStats({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  const progress = experienceProgress(pokemon);

  return (
    <div className="summary-stats">
      <HpBar pokemon={pokemon} />
      <PokemonStatTable pokemon={pokemon} />
      <dl className="start-menu-dl">
        <dt>{t("EXP. POINTS")}</dt>
        <dd>{progress.total}</dd>
        <dt>{t("NEXT LV.")}</dt>
        <dd>{Math.max(0, progress.nextLevelTotal - progress.total)}</dd>
        <dt>{t("STATUS")}</dt>
        <dd>
          {pokemon.currentHp <= 0
            ? "FNT"
            : (pokemon.status ?? "OK").toUpperCase()}
        </dd>
      </dl>
    </div>
  );
}

/** FireRed front sprite (64x64, pixelated); falls back to the PMD portrait. */
export function FrontSprite({
  species,
  name,
  compact = false,
  shiny = false,
}: {
  species: string;
  name: string;
  compact?: boolean;
  shiny?: boolean;
}) {
  const url = pokedexFrontSpriteUrl(species, shiny);
  if (!url) {
    return (
      <PokemonPortrait species={species as never} name={name} compact={compact} />
    );
  }
  return (
    <div className={`start-menu-front${compact ? " compact" : ""}`}>
      <img src={url} alt="" draggable={false} />
    </div>
  );
}
