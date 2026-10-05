"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DUEL_MOVES,
  calculateDuelPokemonStats,
  duelSpeciesTypes,
  isDuelSpeciesId,
  experienceProgress,
  speciesDisplayName,
  type PokemonProgression,
} from "@tactimon/battle-engine";
import { PokemonPortrait } from "@/components/PokemonPortrait";
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
  const [dexIndex, setDexIndex] = useState(0);
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
    dexIndex,
    dexCount: dex.entries.length,
    partyIndex,
    partyAction,
    switchFrom,
    summaryIndex,
    summaryPage,
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
    dexIndex,
    dexCount: dex.entries.length,
    partyIndex,
    partyAction,
    switchFrom,
    summaryIndex,
    summaryPage,
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
        if (up) setDexIndex(wrap(s.dexIndex - 1, s.dexCount));
        else if (down) setDexIndex(wrap(s.dexIndex + 1, s.dexCount));
        else if (left) setDexIndex(Math.max(0, s.dexIndex - 10));
        else if (right) setDexIndex(Math.min(s.dexCount - 1, s.dexIndex + 10));
        else if (back || confirm) setScreen("root");
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
        if (up) setSummaryIndex(wrap(s.summaryIndex - 1, s.party.length));
        else if (down) setSummaryIndex(wrap(s.summaryIndex + 1, s.party.length));
        else if (left) setSummaryPage(SUMMARY_PAGES[wrap(pageIndex - 1, SUMMARY_PAGES.length)]);
        else if (right || confirm) setSummaryPage(SUMMARY_PAGES[wrap(pageIndex + 1, SUMMARY_PAGES.length)]);
        else if (back) {
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
        if (back || confirm) setScreen("root");
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
        <section className="start-menu-screen start-menu-pokedex">
          <h2>
            {t("POKéDEX · SEEN {seen} · OWN {own}", {
              seen: dex.seenCount,
              own: dex.caughtCount,
            })}
          </h2>
          <div className="start-menu-dex-body">
            <ul className="start-menu-dex-list">
              {dex.entries
                .slice(
                  Math.max(0, Math.min(dex.entries.length - 9, dexIndex - 4)),
                  Math.max(0, Math.min(dex.entries.length - 9, dexIndex - 4)) + 9,
                )
                .map((entry) => (
                  <li
                    key={entry.id}
                    className={entry.number - 1 === dexIndex ? "selected" : ""}
                  >
                    <span>{String(entry.number).padStart(3, "0")}</span>
                    <strong>
                      {entry.status === "unseen"
                        ? "----------"
                        : pokedexDisplayName(entry.id)}
                    </strong>
                    {entry.status === "caught" && <em>●</em>}
                  </li>
                ))}
            </ul>
            <DexDetail entry={dex.entries[dexIndex]} />
          </div>
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
                <PokemonPortrait
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
            <PokemonPortrait
              species={summaryPokemon.species}
              name={speciesDisplayName(summaryPokemon.species)}
            />
            {summaryPage === "info" && (
              <SummaryInfo pokemon={summaryPokemon} />
            )}
            {summaryPage === "stats" && (
              <SummaryStats pokemon={summaryPokemon} />
            )}
            {summaryPage === "moves" && (
              <SummaryMoves pokemon={summaryPokemon} />
            )}
          </div>
        </section>
      )}

      {screen === "bag" && (
        <section className="start-menu-screen start-menu-bag">
          <h2>
            {t("BAG")} · {t(pockets[pocketIndex].label)}
          </h2>
          <div className="start-menu-pockets">
            {pockets.map((pocket, index) => (
              <span
                key={pocket.id}
                className={index === pocketIndex ? "selected" : ""}
              >
                {t(pocket.label)}
              </span>
            ))}
          </div>
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
                        {DUEL_MOVES[moveId].name} PP{" "}
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
        <section className="start-menu-screen start-menu-card">
          <h2>{t("TRAINER CARD")}</h2>
          <dl>
            <dt>{t("STARTER")}</dt>
            <dd>
              {story.starter ? speciesDisplayName(story.starter) : "—"}
            </dd>
            <dt>{t("MONEY")}</dt>
            <dd>₽{card.money.toLocaleString("pt-BR")}</dd>
            <dt>{t("POKéMON")}</dt>
            <dd>{card.partySize}</dd>
            <dt>{t("TIME")}</dt>
            <dd>{card.playTime}</dd>
            <dt>{t("POKéDEX")}</dt>
            <dd>
              {t("{own} OWN / {seen} SEEN", {
                own: card.pokedexCaught,
                seen: card.pokedexSeen,
              })}
            </dd>
            {card.champion && (
              <>
                <dt>{t("HALL OF FAME")}</dt>
                <dd>{t("CHAMPION ★")}</dd>
              </>
            )}
            <dt>{t("BADGES")}</dt>
            <dd>{card.badgeCount}/8</dd>
          </dl>
          <div className="start-menu-badges">
            {card.badges.map((badge) => (
              <span
                key={badge.id}
                className={badge.earned ? "earned" : ""}
                title={t(badge.label)}
              >
                {t(badge.label)}
              </span>
            ))}
          </div>
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
        {screen === "townmap"
          ? ` · ${t("Enter fly (HM Fly + Thunder Badge) · ● visited")}`
          : ""}
      </p>
    </div>
  );
}

function SummaryInfo({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  const progress = experienceProgress(pokemon);
  const types = duelSpeciesTypes(pokemon.species);

  return (
    <dl className="start-menu-dl">
      <dt>{t("TYPE")}</dt>
      <dd>{types.map((type) => t(type.toUpperCase())).join(" / ")}</dd>
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
      <dd className="start-menu-dl-wide">
        <HpBar pokemon={pokemon} />
      </dd>
    </dl>
  );
}

function SummaryStats({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  const stats = calculateDuelPokemonStats(pokemon);

  return (
    <dl className="start-menu-dl">
      <dt>HP</dt>
      <dd>
        {pokemon.currentHp}/{stats.hp}
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
    </dl>
  );
}

function SummaryMoves({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  return (
    <ul className="start-menu-moves">
      {pokemon.activeMoves.map((moveId) => {
        const move = DUEL_MOVES[moveId];
        const pp = pokemon.movePp[moveId] ?? move.maxPp;

        return (
          <li key={moveId}>
            <span className={`start-menu-type ${move.type}`}>
              {t(move.type.toUpperCase())}
            </span>
            <strong>{move.name.toUpperCase()}</strong>
            <em>
              PP {pp}/{move.maxPp}
            </em>
            <small>
              {move.power
                ? t("PWR {power}", { power: move.power })
                : "—"}
            </small>
          </li>
        );
      })}
    </ul>
  );
}

function DexDetail({
  entry,
}: {
  entry: { number: number; id: string; status: string } | undefined;
}) {
  useLocale();
  if (!entry || entry.status === "unseen") {
    return (
      <div className="start-menu-dex-detail">
        <p>{t("No data recorded.")}</p>
      </div>
    );
  }

  const implemented = isDuelSpeciesId(entry.id);

  return (
    <div className="start-menu-dex-detail">
      {implemented && (
        <PokemonPortrait
          species={entry.id as never}
          name={pokedexDisplayName(entry.id)}
        />
      )}
      <h3>
        No. {String(entry.number).padStart(3, "0")}{" "}
        {pokedexDisplayName(entry.id)}
      </h3>
      {implemented && (
        <p>
          {t("TYPE:")}{" "}
          {duelSpeciesTypes(entry.id as never)
            .map((type) => t(type.toUpperCase()))
            .join(" / ")}
        </p>
      )}
      <p>{entry.status === "caught" ? t("Caught.") : t("Seen.")}</p>
    </div>
  );
}
