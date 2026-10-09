"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DUEL_MOVES,
  duelSpeciesBaseStats,
  duelSpeciesTypes,
  isDuelSpeciesId,
  type DuelMoveId,
  type DuelSpeciesId,
} from "@tactimon/battle-engine";
import { bestNatureFor } from "@/lib/bestNature";
import { POKEDEX_ENTRIES } from "@/lib/generated/pokedexEntries";
import { MOVE_DESCRIPTIONS } from "@/lib/generated/moveDescriptions";
import { t, useLocale } from "@/lib/i18n";
import { localizedMoveName, localizedSpeciesName } from "@/lib/i18n/names";
import { natureEffectText, natureName, natureStatLabel } from "@/lib/natures";
import {
  getPokedex,
  pokedexFrontSpriteUrl,
  pokedexHeight,
  pokedexWeight,
  type PokedexStatus,
} from "@/lib/pokedex";
import {
  speciesCatchRate,
  speciesEvolvesFrom,
  speciesEvolvesTo,
  speciesEvYield,
  speciesLearnset,
  speciesLocations,
  speciesMachines,
  speciesStaticSources,
  type DexMethod,
} from "@/lib/pokedexData";
import { moveFacts } from "@/lib/typeIcon";
import type { StoryState } from "@/lib/story";
import { TypeIcon } from "./TypeIcon";

type Tab = "info" | "locations" | "moves" | "tms" | "stats";
type Filter = "all" | "seen" | "caught";

const TABS: readonly Tab[] = ["info", "locations", "moves", "tms", "stats"];

const METHOD_LABEL: Record<DexMethod, string> = {
  grass: "Tall grass",
  cave: "Cave",
  surf: "Surfing",
  "old-rod": "Old Rod",
  "good-rod": "Good Rod",
  "super-rod": "Super Rod",
};

const STAT_ROWS = [
  ["hp", "HP"],
  ["attack", "ATTACK"],
  ["defense", "DEFENSE"],
  ["specialAttack", "SP. ATK"],
  ["specialDefense", "SP. DEF"],
  ["speed", "SPEED"],
] as const;

/** Testing switch: `localStorage["tactimon.dex.reveal"] = "1"` unlocks every page of every species. */
function revealAll(): boolean {
  try {
    return window.localStorage.getItem("tactimon.dex.reveal") === "1";
  } catch {
    return false;
  }
}

const prettyMove = (id: string) =>
  DUEL_MOVES[id as DuelMoveId]
    ? localizedMoveName(id as DuelMoveId)
    : id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const statColor = (value: number) => (value >= 100 ? "great" : value >= 70 ? "good" : value >= 45 ? "mid" : "low");

type Props = {
  story: StoryState;
  onClose: () => void;
  /** Opens the faithful FireRed Pokédex (canvas) instead. */
  onClassic: () => void;
};

/**
 * Our own Pokédex: every species with where to find it, its level-up moves, the TMs and HMs it
 * learns, base stats, evolutions and the nature that suits it best. Seen species show the basics;
 * caught ones unlock everything (so locations are never a spoiler before you meet the Pokémon).
 */
export function PokedexWindow({ story, onClose, onClassic }: Props) {
  useLocale();
  const dex = useMemo(() => getPokedex(story), [story]);
  const unlocked = useMemo(revealAll, []);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>(dex.entries[0].id);
  const [tab, setTab] = useState<Tab>("info");
  const listRef = useRef<HTMLDivElement>(null);

  const statusOf = (id: string): PokedexStatus =>
    unlocked ? "caught" : (dex.entries.find((entry) => entry.id === id)?.status ?? "unseen");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dex.entries.filter((entry) => {
      const status = unlocked ? "caught" : entry.status;
      if (filter === "seen" && status === "unseen") return false;
      if (filter === "caught" && status !== "caught") return false;
      if (!needle) return true;
      const known = status !== "unseen";
      const name = known ? localizedSpeciesName(entry.id).toLowerCase() : "";
      return name.includes(needle) || String(entry.number).padStart(3, "0").includes(needle);
    });
  }, [dex, filter, query, unlocked]);

  const status = statusOf(selected);
  const entry = dex.entries.find((item) => item.id === selected) ?? dex.entries[0];
  const known = status !== "unseen";
  const caught = status === "caught";
  const id = selected as DuelSpeciesId;
  const rom = POKEDEX_ENTRIES[selected as keyof typeof POKEDEX_ENTRIES];
  const sprite = pokedexFrontSpriteUrl(selected);

  // Keyboard: ↑↓ walk the list, ←→ change tab, Esc closes (the search box keeps its own keys).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const typing = (event.target as HTMLElement | null)?.tagName === "INPUT";
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        if (typing && query) setQuery("");
        else onClose();
        return;
      }
      if (typing) return;
      const index = visible.findIndex((item) => item.id === selected);
      if (key === "arrowdown" || key === "s") {
        event.preventDefault();
        event.stopPropagation();
        const next = visible[Math.min(visible.length - 1, index + 1)];
        if (next) setSelected(next.id);
      } else if (key === "arrowup" || key === "w") {
        event.preventDefault();
        event.stopPropagation();
        const next = visible[Math.max(0, index - 1)];
        if (next) setSelected(next.id);
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        event.stopPropagation();
        setTab((current) => TABS[Math.min(TABS.length - 1, TABS.indexOf(current) + 1)]);
      } else if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        event.stopPropagation();
        setTab((current) => TABS[Math.max(0, TABS.indexOf(current) - 1)]);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible, selected, query, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-dex="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const locked = (needsCaught: boolean) => (needsCaught ? !caught : !known);

  const body = () => {
    if (!known) return <p className="dex-locked">{t("Not registered yet. Meet this Pokémon to see its basics.")}</p>;
    if (tab === "info") {
      const from = speciesEvolvesFrom(selected);
      const to = speciesEvolvesTo(selected);
      const best = caught && isDuelSpeciesId(selected) ? bestNatureFor(id) : null;
      const evs = Object.entries(speciesEvYield(selected));
      return (
        <div className="dex-info">
          <p className="dex-category">{rom ? t("{category} Pokémon", { category: rom.category }) : ""}</p>
          <dl className="start-menu-dl">
            <dt>{t("HEIGHT")}</dt>
            <dd>{rom ? pokedexHeight(rom.height) : "—"}</dd>
            <dt>{t("WEIGHT")}</dt>
            <dd>{rom ? pokedexWeight(rom.weight) : "—"}</dd>
            {caught && (
              <>
                <dt>{t("CATCH RATE")}</dt>
                <dd>{speciesCatchRate(selected)}</dd>
                <dt>{t("EV YIELD")}</dt>
                <dd>
                  {evs.length
                    ? evs
                        .map(([stat, value]) => `+${value} ${natureStatLabel(stat as never)}`)
                        .join(", ")
                    : "—"}
                </dd>
              </>
            )}
          </dl>
          {rom && <p className="dex-text">{rom.pages.map((page) => page.join(" ")).join(" ")}</p>}
          <div className="dex-evolutions">
            {from && (
              <p>
                {t("Evolves from")}{" "}
                <button type="button" className="dex-link" onClick={() => setSelected(from)}>
                  {statusOf(from) === "unseen" ? "???" : localizedSpeciesName(from)}
                </button>
              </p>
            )}
            {to.map((step) => (
              <p key={`${step.species}-${"level" in step.how ? step.how.level : step.how.stone}`}>
                {t("Evolves into")}{" "}
                <button type="button" className="dex-link" onClick={() => setSelected(step.species)}>
                  {statusOf(step.species) === "unseen" ? "???" : localizedSpeciesName(step.species)}
                </button>{" "}
                {"level" in step.how
                  ? t("at Lv. {level}", { level: step.how.level })
                  : t("with {stone}", { stone: step.how.stone.replace(/-/g, " ") })}
              </p>
            ))}
            {!from && to.length === 0 && <p>{t("It does not evolve.")}</p>}
          </div>
          {best ? (
            <div className="dex-nature">
              <strong>{t("Best nature")}</strong>: {natureName(best.nature)}{" "}
              <span className="dex-nature-effect">{natureEffectText(best.nature)}</span>
              {best.alternatives.length > 0 && (
                <p>{t("Also used: {natures}", { natures: best.alternatives.map((alt) => natureName(alt)).join(", ") })}</p>
              )}
              <p>
                {best.source === "smogon"
                  ? t("Most used nature in Smogon's Gen 3 {tier} sets ({set}).", {
                      tier: (best.tier ?? "").toUpperCase(),
                      set: best.set ?? "",
                    })
                  : best.source === "evolution"
                    ? t("It has no Gen 3 sets of its own: taken from its evolution {name}.", {
                        name: localizedSpeciesName(best.from ?? selected),
                      })
                    : best.kind === "bulky"
                      ? t("It has no strong attack, so it benefits from sturdier defenses.")
                      : best.kind === "physical"
                        ? t("It relies on Attack: raise it and drop the unused Sp. Atk.")
                        : best.kind === "special"
                          ? t("It relies on Sp. Atk: raise it and drop the unused Attack.")
                          : best.kind === "fast-physical"
                            ? t("It is fast enough that Speed beats extra Attack; the unused Sp. Atk pays.")
                            : t("It is fast enough that Speed beats extra Sp. Atk; the unused Attack pays.")}
              </p>
            </div>
          ) : (
            <p className="dex-hint">{t("Catch it to see its best nature.")}</p>
          )}
        </div>
      );
    }
    if (tab === "stats") {
      if (!isDuelSpeciesId(selected)) return null;
      const base = duelSpeciesBaseStats(id);
      const total = STAT_ROWS.reduce((sum, [key]) => sum + base[key], 0);
      return (
        <div className="dex-stats">
          {STAT_ROWS.map(([key, label]) => (
            <div key={key} className="dex-stat-row">
              <span>{t(label)}</span>
              <b>{base[key]}</b>
              <i className={`dex-bar ${statColor(base[key])}`} style={{ width: `${Math.min(100, (base[key] / 160) * 100)}%` }} />
            </div>
          ))}
          <p className="dex-total">
            {t("TOTAL")} <b>{total}</b>
          </p>
        </div>
      );
    }
    if (locked(true)) return <p className="dex-locked">{t("Catch it to unlock this page.")}</p>;
    if (tab === "locations") {
      const places = speciesLocations(selected);
      const sources = speciesStaticSources(selected);
      return (
        <div className="dex-locations">
          {sources.map((source) => (
            <p key={source} className="dex-source">
              {t(source)}
            </p>
          ))}
          {places.length === 0 && sources.length === 0 && (
            <p className="dex-hint">{speciesEvolvesFrom(selected) ? t("Found by evolving an earlier form.") : t("No known location yet.")}</p>
          )}
          {places.length > 0 && (
            <table className="dex-table">
              <thead>
                <tr>
                  <th>{t("PLACE")}</th>
                  <th>{t("HOW")}</th>
                  <th>{t("LEVELS")}</th>
                  <th>{t("CHANCE")}</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place) => (
                  <tr key={`${place.mapId}-${place.method}`}>
                    <td>{t(place.label)}</td>
                    <td>{t(METHOD_LABEL[place.method])}</td>
                    <td>
                      {place.minLevel === place.maxLevel ? place.minLevel : `${place.minLevel}–${place.maxLevel}`}
                    </td>
                    <td>{place.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    if (tab === "moves") {
      const learnset = speciesLearnset(selected);
      return (
        <table className="dex-table dex-moves">
          <thead>
            <tr>
              <th>{t("LV.")}</th>
              <th>{t("MOVE")}</th>
              <th>{t("TYPE")}</th>
              <th>{t("POWER")}</th>
              <th>{t("ACCURACY")}</th>
              <th>{t("AP")}</th>
            </tr>
          </thead>
          <tbody>
            {learnset.map((entryRow, index) => {
              const move = DUEL_MOVES[entryRow.moveId];
              const facts = moveFacts(entryRow.moveId);
              return (
                <tr key={`${entryRow.level}-${entryRow.moveId}-${index}`} title={(MOVE_DESCRIPTIONS[entryRow.moveId.replace(/[^a-z]/g, "")] ?? "").replace(/\n/g, " ")}>
                  <td>{entryRow.level <= 1 ? "—" : entryRow.level}</td>
                  <td>{localizedMoveName(entryRow.moveId)}</td>
                  <td>
                    <TypeIcon type={move.type} scale={1} />
                  </td>
                  <td>{facts.power}</td>
                  <td>{facts.accuracy}</td>
                  <td>{facts.ap}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    const machines = speciesMachines(selected);
    return (
      <div className="dex-machines">
        {machines.length === 0 && <p className="dex-hint">{t("It cannot learn any TM or HM.")}</p>}
        {machines.map((machine) => (
          <p key={`${machine.kind}${machine.number}`} className="dex-machine">
            <b>
              {machine.kind}
              {String(machine.number).padStart(2, "0")}
            </b>{" "}
            {prettyMove(machine.moveId)}
          </p>
        ))}
        <p className="dex-hint">{t("TMs and held items come from raids and dungeons.")}</p>
      </div>
    );
  };

  return (
    <div className="pokedex-window" data-input-back>
      <header className="dex-header">
        <h2>{t("POKéDEX")}</h2>
        <span className="dex-counts">
          {t("SEEN")} {dex.seenCount} · {t("CAUGHT")} {dex.caughtCount}
        </span>
        <button type="button" className="pc-close" data-dex-classic onClick={onClassic}>
          {t("Classic mode")}
        </button>
        <button type="button" className="pc-close" data-input-back onClick={onClose}>
          {t("Close")}
        </button>
      </header>

      <aside className="dex-list-panel">
        <div className="dex-filters">
          <input
            type="search"
            value={query}
            placeholder={t("Search name or number")}
            aria-label={t("Search name or number")}
            data-dex-search
            onChange={(event) => setQuery(event.target.value)}
          />
          {(["all", "seen", "caught"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={`dex-chip${filter === value ? " active" : ""}`}
              data-dex-filter={value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? t("ALL") : value === "seen" ? t("SEEN") : t("CAUGHT")}
            </button>
          ))}
        </div>
        <div className="dex-list" ref={listRef} role="listbox" aria-label={t("POKéDEX")}>
          {visible.map((item) => {
            const itemStatus = unlocked ? "caught" : item.status;
            return (
              <button
                type="button"
                key={item.id}
                role="option"
                aria-selected={item.id === selected}
                data-dex={item.id}
                className={`dex-row${item.id === selected ? " selected" : ""} ${itemStatus}`}
                onClick={() => setSelected(item.id)}
              >
                <span className="dex-no">{String(item.number).padStart(3, "0")}</span>
                <span className="dex-ball" aria-hidden="true">
                  {itemStatus === "caught" ? "●" : itemStatus === "seen" ? "○" : ""}
                </span>
                <span className="dex-name">
                  {itemStatus === "unseen" ? "-----" : localizedSpeciesName(item.id)}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && <p className="dex-hint">{t("No Pokémon match.")}</p>}
        </div>
      </aside>

      <section className="dex-detail" aria-live="polite">
        <div className="dex-title">
          {sprite && (
            <img
              className={`dex-sprite${known ? "" : " silhouette"}`}
              src={sprite}
              alt=""
              draggable={false}
            />
          )}
          <div>
            <h3 data-dex-name>
              <span className="dex-no">{String(entry.number).padStart(3, "0")}</span>{" "}
              {known ? localizedSpeciesName(selected) : "???"}
            </h3>
            <div className="dex-types">
              {known && isDuelSpeciesId(selected) &&
                duelSpeciesTypes(id).map((type) => <TypeIcon key={type} type={type} scale={1} />)}
            </div>
          </div>
        </div>
        <nav className="dex-tabs" aria-label={t("Pages")}>
          {TABS.map((value) => (
            <button
              type="button"
              key={value}
              className={`dex-tab${tab === value ? " active" : ""}${known && (value === "stats" || value === "info" || caught) ? "" : " disabled"}`}
              data-dex-tab={value}
              onClick={() => setTab(value)}
            >
              {value === "info"
                ? t("INFO")
                : value === "locations"
                  ? t("LOCATIONS")
                  : value === "moves"
                    ? t("MOVES")
                    : value === "tms"
                      ? t("TMs")
                      : t("STATS")}
            </button>
          ))}
        </nav>
        <div className="dex-body">{body()}</div>
      </section>
    </div>
  );
}
