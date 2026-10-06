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
  type PokemonProgression,
} from "@tactimon/battle-engine";
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
  MENU_ENTRIES,
  buildBagPockets,
  buildTrainerCard,
  getStoryParty,
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
};

type BagUse = {
  itemId: string;
  name: string;
  step: "pokemon" | "move";
  partyIndex: number;
  moveIndex: number;
};

type SummaryPage = "info" | "stats" | "moves";
const SUMMARY_PAGES: readonly SummaryPage[] = [
  "info",
  "stats",
  "moves",
];
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
  const [screen, setScreen] = useState<MenuScreen>("root");
  const [rootIndex, setRootIndex] = useState(1);
  const [partyIndex, setPartyIndex] = useState(0);
  const [partyAction, setPartyAction] = useState<number | null>(
    null,
  );
  const [switchFrom, setSwitchFrom] = useState<number | null>(
    null,
  );
  const [summaryIndex, setSummaryIndex] = useState(0);
  const [summaryPage, setSummaryPage] =
    useState<SummaryPage>("info");
  const [pocketIndex, setPocketIndex] = useState(0);
  const [bagIndex, setBagIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const [townIndex, setTownIndex] = useState(0);
  const [cardBack, setCardBack] = useState(false);
  // FireRed Summary: A on the moves page enters move selection, A again opens the move info page.
  const [summaryMove, setSummaryMove] = useState<number | null>(null);
  const [summaryMoveInfo, setSummaryMoveInfo] = useState(false);
  const [bagUse, setBagUse] = useState<BagUse | null>(null);
  const [notice, setNotice] = useState("");
  const eraseArmedRef = useRef(false);

  const party = useMemo(() => getStoryParty(story), [story]);
  const pockets = useMemo(() => buildBagPockets(story), [story]);
  const card = useMemo(() => buildTrainerCard(story), [story]);
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
    summaryPage,
    summaryMove,
    summaryMoveInfo,
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
    summaryPage,
    summaryMove,
    summaryMoveInfo,
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
        if (up) setRootIndex(wrap(s.rootIndex - 1, MENU_ENTRIES.length));
        else if (down) setRootIndex(wrap(s.rootIndex + 1, MENU_ENTRIES.length));
        else if (back) onClose();
        else if (confirm) {
          const entry = MENU_ENTRIES[s.rootIndex];
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
              setSummaryPage("info");
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
          else setScreen("root");
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
        const pageIndex = SUMMARY_PAGES.indexOf(s.summaryPage);
        if (s.summaryMove !== null) {
          const moveCount = s.party[s.summaryIndex]?.activeMoves.length ?? 0;
          if (s.summaryMoveInfo) {
            if (back || confirm) setSummaryMoveInfo(false);
          } else if (up) setSummaryMove(wrap(s.summaryMove - 1, moveCount));
          else if (down) setSummaryMove(wrap(s.summaryMove + 1, moveCount));
          else if (confirm) setSummaryMoveInfo(true);
          else if (back) setSummaryMove(null);
          return;
        }
        if (confirm && s.summaryPage === "moves") {
          setSummaryMove(0);
          return;
        }
        if (up) setSummaryIndex(wrap(s.summaryIndex - 1, s.party.length));
        else if (down) setSummaryIndex(wrap(s.summaryIndex + 1, s.party.length));
        else if (left) setSummaryPage(SUMMARY_PAGES[wrap(pageIndex - 1, SUMMARY_PAGES.length)]);
        else if (right || confirm) setSummaryPage(SUMMARY_PAGES[wrap(pageIndex + 1, SUMMARY_PAGES.length)]);
        else if (back) {
          setSummaryMove(null);
          setSummaryMoveInfo(false);
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
        else if (back) setScreen("root");
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
          setScreen("root");
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
      else if (back) setScreen("root");
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
          setScreen("root");
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onFly, onOptionsChange, onSave, onStoryChange]);

  const summaryPokemon = party[summaryIndex] ?? null;

  return (
    <div
      className="start-menu-overlay"
      role="dialog"
      aria-label={t("Menu")}
    >
      {screen === "root" && (
        <nav className="start-menu-root">
          {MENU_ENTRIES.map((entry, index) => (
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
            onClose={() => setScreen("root")}
          />
        </section>
      )}

      {screen === "party" && (
        <section className="start-menu-screen start-menu-party">
          <h2>{t("POKéMON")}</h2>
          <ul>
            {party.map((pokemon, index) => (
              <li
                key={`${pokemon.species}-${index}`}
                className={[
                  "start-menu-party-row",
                  index === partyIndex ? "selected" : "",
                  index === switchFrom ? "switching" : "",
                  pokemon.currentHp <= 0 ? "fainted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <FrontSprite
                  species={pokemon.species}
                  name={speciesDisplayName(pokemon.species)}
                  compact
                />
                <div className="start-menu-party-copy">
                  <strong>{speciesDisplayName(pokemon.species)}</strong>
                  <span>Lv{pokemon.level}</span>
                  {pokemon.status && (
                    <b className={`start-menu-status ${pokemon.status}`}>
                      {pokemon.status.slice(0, 3).toUpperCase()}
                    </b>
                  )}
                </div>
                <HpBar pokemon={pokemon} />
              </li>
            ))}
            {party.length === 0 && (
              <li className="start-menu-empty">
                {t("You do not have any Pokémon yet.")}
              </li>
            )}
          </ul>
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
        <section className="start-menu-screen start-menu-summary">
          <h2>
            {speciesDisplayName(summaryPokemon.species)} · Lv
            {summaryPokemon.level}
          </h2>
          <div className="start-menu-summary-tabs">
            {SUMMARY_PAGES.map((page) => (
              <span
                key={page}
                className={page === summaryPage ? "selected" : ""}
              >
                {page === "info"
                  ? t("INFO")
                  : page === "stats"
                    ? t("SKILLS")
                    : t("MOVES")}
              </span>
            ))}
          </div>
          <div className="start-menu-summary-body">
            <FrontSprite
              species={summaryPokemon.species}
              name={speciesDisplayName(summaryPokemon.species)}
            />
            {summaryPage === "info" && (
              <SummaryInfo pokemon={summaryPokemon} story={story} />
            )}
            {summaryPage === "stats" && (
              <SummaryStats pokemon={summaryPokemon} />
            )}
            {summaryPage === "moves" && (
              <SummaryMoves
                pokemon={summaryPokemon}
                selected={summaryMove}
                info={summaryMoveInfo}
              />
            )}
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
          <ul className="start-menu-bag-list">
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
                      {speciesDisplayName(pokemon.species)} Lv{pokemon.level}{" "}
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
                  <dt>{t("POKéDEX")}</dt>
                  <dd>{card.pokedexCaught}</dd>
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
                <dt>{t("POKéDEX SEEN")}</dt>
                <dd>{card.pokedexSeen}</dd>
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
          <ul>
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
          <ul>
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
        {screen === "summary" || screen === "bag"
          ? ` · ${t("←→ change page")}`
          : ""}
        {screen === "card" ? ` · ${t("Enter flip card")}` : ""}
        {screen === "townmap"
          ? ` · ${t("Enter fly (HM Fly + Thunder Badge) · ● visited")}`
          : ""}
      </p>
    </div>
  );
}

/** FireRed Summary, Pokémon Info page: dex number, species, type, OT, ID No. and held item. */
function SummaryInfo({
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
      <dd>{speciesDisplayName(pokemon.species)}</dd>
      <dt>{t("TYPE")}</dt>
      <dd>{types.map((type) => t(type.toUpperCase())).join(" / ")}</dd>
      <dt>{t("OT")}</dt>
      <dd>{story.trainerName ?? "RED"}</dd>
      <dt>{t("IDNo.")}</dt>
      <dd>{String(story.trainerId ?? 0).padStart(5, "0")}</dd>
      <dt>{t("ITEM")}</dt>
      <dd>{t("NONE")}</dd>
    </dl>
  );
}

/** FireRed Summary, Pokémon Skills page: HP, stats, EXP. POINTS and NEXT LV. */
function SummaryStats({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  const stats = calculateDuelPokemonStats(pokemon);
  const progress = experienceProgress(pokemon);

  return (
    <dl className="start-menu-dl">
      <dt>HP</dt>
      <dd>
        {pokemon.currentHp}/{stats.hp}
      </dd>
      <dd className="start-menu-dl-wide">
        <HpBar pokemon={pokemon} />
      </dd>
      <dt>{t("ATTACK")}</dt>
      <dd>{stats.attack}</dd>
      <dt>{t("DEFENSE")}</dt>
      <dd>{stats.defense}</dd>
      <dt>{t("SP. ATK")}</dt>
      <dd>{stats.specialAttack}</dd>
      <dt>{t("SP. DEF")}</dt>
      <dd>{stats.specialDefense}</dd>
      <dt>{t("SPEED")}</dt>
      <dd>{stats.speed}</dd>
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
  );
}

/** Move list; A selects a move and the info page shows POWER, ACCURACY, PP and the ROM description. */
function SummaryMoves({
  pokemon,
  selected,
  info,
}: {
  pokemon: PokemonProgression;
  selected: number | null;
  info: boolean;
}) {
  useLocale();
  const detailId =
    selected !== null ? pokemon.activeMoves[selected] : undefined;
  if (info && detailId) {
    const move = DUEL_MOVES[detailId];
    const pp = pokemon.movePp[detailId] ?? move.maxPp;
    const description =
      MOVE_DESCRIPTIONS[detailId.replace(/[^a-z]/g, "")] ?? "";
    return (
      <div className="start-menu-move-info">
        <h3>{localizedMoveName(detailId).toUpperCase()}</h3>
        <dl className="start-menu-dl">
          <dt>{t("TYPE")}</dt>
          <dd>{t(move.type.toUpperCase())}</dd>
          <dt>{t("POWER")}</dt>
          <dd>{move.power ?? "---"}</dd>
          <dt>{t("ACCURACY")}</dt>
          <dd>{move.alwaysHits ? "---" : (move.accuracy ?? 100)}</dd>
          <dt>PP</dt>
          <dd>
            {pp}/{move.maxPp}
          </dd>
        </dl>
        <p className="start-menu-move-text">{description}</p>
      </div>
    );
  }

  return (
    <ul className="start-menu-moves">
      {pokemon.activeMoves.map((moveId, index) => {
        const move = DUEL_MOVES[moveId];
        const pp = pokemon.movePp[moveId] ?? move.maxPp;

        return (
          <li
            key={moveId}
            className={index === selected ? "selected" : ""}
          >
            <span className={`start-menu-type ${move.type}`}>
              {t(move.type.toUpperCase())}
            </span>
            <strong>{localizedMoveName(moveId).toUpperCase()}</strong>
            <em>
              PP {pp}/{move.maxPp}
            </em>
          </li>
        );
      })}
    </ul>
  );
}

/** FireRed front sprite (64x64, pixelated); falls back to the PMD portrait. */
function FrontSprite({
  species,
  name,
  compact = false,
}: {
  species: string;
  name: string;
  compact?: boolean;
}) {
  const url = pokedexFrontSpriteUrl(species);
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
