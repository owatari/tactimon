"use client";

import { POKEDEX_ENTRIES } from "@/lib/generated/pokedexEntries";
import {
  pokedexDisplayName,
  pokedexHeight,
  pokedexWeight,
  type PokedexEntry,
} from "@/lib/pokedex";
import { pokedexAreas } from "@/lib/pokedexAreas";
import { t, useLocale } from "@/lib/i18n";

export type PokedexView = "list" | "entry" | "area";

type Props = {
  entries: readonly PokedexEntry[];
  index: number;
  view: PokedexView;
  seen: number;
  caught: number;
  onSelect?: (index: number) => void;
  onOpen?: (index: number) => void;
};

const ROWS = 10;
const SPRITE_BASE = "/game-assets/firered/pokemon/front/normal/";

function FrontSprite({ id, hidden }: { id: string; hidden: boolean }) {
  const file = POKEDEX_ENTRIES[id]?.sprite;
  if (hidden || !file) {
    return <div className="dex-sprite dex-sprite-unknown">?</div>;
  }
  return (
    <img
      className="dex-sprite"
      src={`${SPRITE_BASE}${file}`}
      alt=""
      draggable={false}
    />
  );
}

export function PokedexScreen({
  entries,
  index,
  view,
  seen,
  caught,
  onSelect,
  onOpen,
}: Props) {
  useLocale();
  const entry = entries[index];
  const known = entry.status !== "unseen";
  const name = known ? pokedexDisplayName(entry.id) : "----------";
  const rom = POKEDEX_ENTRIES[entry.id];
  const number = String(entry.number).padStart(3, "0");

  if (view === "list") {
    const first = Math.max(
      0,
      Math.min(entries.length - ROWS, index - Math.floor(ROWS / 2)),
    );
    return (
      <section className="dex-screen dex-list-view">
        <aside className="dex-side">
          <div className="dex-sprite-frame">
            <FrontSprite id={entry.id} hidden={!known} />
          </div>
          <div className="dex-counts">
            <span>{t("SEEN")}</span>
            <strong>{String(seen).padStart(3, "0")}</strong>
            <span>{t("OWN")}</span>
            <strong>{String(caught).padStart(3, "0")}</strong>
          </div>
        </aside>
        <ul className="dex-list">
          {entries.slice(first, first + ROWS).map((row) => (
            <li
              key={row.id}
              className={row.number - 1 === index ? "selected" : ""}
              onMouseEnter={() => onSelect?.(row.number - 1)}
              onClick={() => onOpen?.(row.number - 1)}
            >
              <span className="dex-no">
                {String(row.number).padStart(3, "0")}
              </span>
              <i
                className={`dex-ball${row.status === "caught" ? " caught" : ""}`}
                aria-hidden="true"
              />
              <strong>
                {row.status === "unseen"
                  ? "----------"
                  : pokedexDisplayName(row.id)}
              </strong>
            </li>
          ))}
        </ul>
        <footer className="dex-help">
          {t("▲▼ SELECT   Z INFO   X BACK")}
        </footer>
      </section>
    );
  }

  if (view === "area") {
    const areas = pokedexAreas(entry.id);
    return (
      <section className="dex-screen dex-area-view">
        <header className="dex-title">{t("{name} AREA", { name })}</header>
        <div className="dex-window dex-area-list">
          {areas.length === 0 ? (
            <p>{t("AREA UNKNOWN")}</p>
          ) : (
            <ul>
              {areas.map((label) => (
                <li key={label}>{t(label)}</li>
              ))}
            </ul>
          )}
        </div>
        <footer className="dex-help">{t("Z / X BACK")}</footer>
      </section>
    );
  }

  return (
    <section className="dex-screen dex-entry-view">
      <div className="dex-sprite-frame dex-sprite-large">
        <FrontSprite id={entry.id} hidden={false} />
      </div>
      <div className="dex-entry-head">
        <span className="dex-no">No.{number}</span>
        <strong>{name}</strong>
        {rom && (
          <span className="dex-category">
            {t("{category} POKéMON", { category: rom.category })}
          </span>
        )}
        {rom && (
          <dl className="dex-size">
            <dt>{t("HT")}</dt>
            <dd>{pokedexHeight(rom.height)}</dd>
            <dt>{t("WT")}</dt>
            <dd>{pokedexWeight(rom.weight)}</dd>
          </dl>
        )}
      </div>
      <div className="dex-window dex-description">
        {entry.status === "caught" && rom ? (
          rom.pages.flat().map((line, i) => <p key={i}>{line}</p>)
        ) : (
          <p>{t("This POKéMON has not been caught yet.")}</p>
        )}
      </div>
      <footer className="dex-help">{t("Z AREA   X BACK   ▲▼ NEXT")}</footer>
    </section>
  );
}
