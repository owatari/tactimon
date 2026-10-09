"use client";

import type { ReactNode } from "react";
import type { PokemonProgression } from "@tactimon/battle-engine";
import { calculateDuelPokemonStats } from "@tactimon/battle-engine";
import type { BagEntry, BagPocket } from "@/lib/gameMenu";
import { t } from "@/lib/i18n";
import { pokemonDisplayName } from "@/lib/pokemonName";
import { useDragDrop } from "./dragDrop";

export const BAG_COLUMNS = 6;
const MIN_SLOTS = BAG_COLUMNS * 5;

export type BagSort = "default" | "name" | "quantity";
export const BAG_SORTS: readonly BagSort[] = ["default", "name", "quantity"];

type Props = {
  pockets: readonly BagPocket[];
  pocketIndex: number;
  /** Slot highlighted by the keyboard / hover cursor. */
  entryIndex: number;
  party: readonly PokemonProgression[];
  sort: BagSort;
  onPocket: (index: number) => void;
  /** Hover / focus moves the cursor (so the keyboard continues from there). */
  onCursor: (index: number) => void;
  /** Click (or Enter) on an item: the usual "use it" flow. */
  onActivate: (entry: BagEntry) => void;
  /** An item was dropped on a party Pokémon. */
  onUseOn: (entry: BagEntry, partyIndex: number) => void;
  onSort: () => void;
  /** The target picker (Pokémon, then move) of the keyboard flow, drawn over the window. */
  popup?: ReactNode;
  notice?: string;
};

function hpPercent(pokemon: PokemonProgression): number {
  const max = calculateDuelPokemonStats(pokemon).hp;
  return Math.max(0, Math.min(100, (pokemon.currentHp / Math.max(1, max)) * 100));
}

/**
 * Bag in the Ragnarok style, with our look: pocket tabs, a grid of icon slots with quantity badges,
 * the party on the right as drop targets (drag an item onto a Pokémon to use it), and the item's
 * details on hover. Items are never discarded by dragging them away.
 */
export function BagWindow({
  pockets,
  pocketIndex,
  entryIndex,
  party,
  sort,
  onPocket,
  onCursor,
  onActivate,
  onUseOn,
  onSort,
  popup,
  notice,
}: Props) {
  const pocket = pockets[pocketIndex];
  const { dragProps, dragging, over, ghost } = useDragDrop<BagEntry>((entry, target) => {
    if (target.kind === "bag-party") onUseOn(entry, Number(target.id));
  });
  const slots = Math.max(MIN_SLOTS, Math.ceil(pocket.entries.length / BAG_COLUMNS) * BAG_COLUMNS);
  const shown = pocket.entries[entryIndex] ?? null;
  const sortLabel =
    sort === "name" ? t("SORT: NAME") : sort === "quantity" ? t("SORT: QTY") : t("SORT: DEFAULT");

  return (
    <div className="bag-window">
      {ghost}
      <nav className="bag-tabs" aria-label={t("Pockets")}>
        {pockets.map((entry, index) => (
          <button
            type="button"
            key={entry.id}
            className={`bag-tab${index === pocketIndex ? " active" : ""}`}
            data-bag-tab={entry.id}
            onClick={() => onPocket(index)}
          >
            {t(entry.label)}
            <small>{entry.entries.length}</small>
          </button>
        ))}
        <button type="button" className="bag-tab sort" data-bag-sort onClick={onSort}>
          {sortLabel}
        </button>
      </nav>

      <div className="bag-grid" role="listbox" aria-label={t(pocket.label)}>
        {Array.from({ length: slots }, (_, index) => {
          const entry = pocket.entries[index];
          if (!entry) return <div key={`empty-${index}`} className="bag-slot empty" aria-hidden="true" />;
          return (
            <button
              type="button"
              key={entry.id}
              role="option"
              aria-selected={index === entryIndex}
              className={`bag-slot${index === entryIndex ? " selected" : ""}${dragging?.id === entry.id ? " dragging" : ""}${entry.usable ? "" : " unusable"}`}
              data-bag-item={entry.id}
              title={t(entry.name)}
              onMouseEnter={() => onCursor(index)}
              onFocus={() => onCursor(index)}
              onClick={() => onActivate(entry)}
              {...dragProps(
                entry,
                entry.iconUrl ? <img className="bag-ghost-icon" src={entry.iconUrl} alt="" /> : <b className="drag-chip">{t(entry.name)}</b>,
              )}
            >
              {entry.iconUrl ? <img src={entry.iconUrl} alt="" draggable={false} /> : <span className="bag-slot-blank">{t(entry.name).slice(0, 3)}</span>}
              {entry.quantity !== null && <em>{entry.quantity}</em>}
            </button>
          );
        })}
        {pocket.entries.length === 0 && (
          <p className="bag-empty">{pocket.reserved ? t("Reserved for Dungeons and Raids.") : t("Empty.")}</p>
        )}
      </div>

      <aside className="bag-side">
        <section className="bag-detail" aria-live="polite">
          {shown ? (
            <>
              <h3>
                {shown.iconUrl && <img src={shown.iconUrl} alt="" />}
                {t(shown.name)}
              </h3>
              {shown.quantity !== null && (
                <p className="bag-detail-qty">{t("Quantity: {count}", { count: shown.quantity })}</p>
              )}
              <p>{t(shown.description)}</p>
              {shown.usable && <p className="bag-detail-hint">{t("Drag it onto a Pokémon to use it.")}</p>}
            </>
          ) : (
            <p className="bag-detail-hint">{t("Point at an item to see its details.")}</p>
          )}
        </section>
        <ul className="bag-party" aria-label={t("Party")}>
          {party.map((pokemon, index) => (
            <li
              key={`${pokemon.species}-${index}`}
              data-drop-kind="bag-party"
              data-drop-id={index}
              data-bag-party={index}
              className={`bag-party-slot${dragging && over?.kind === "bag-party" && over.id === String(index) ? " drop-over" : ""}${pokemon.currentHp <= 0 ? " fainted" : ""}`}
            >
              <span className="bag-party-name">
                {pokemonDisplayName(pokemon)} <small>Lv{pokemon.level}</small>
              </span>
              <span className="bag-party-hp">
                <i style={{ width: `${hpPercent(pokemon)}%` }} />
              </span>
              <small>
                {pokemon.currentHp}/{calculateDuelPokemonStats(pokemon).hp}
              </small>
            </li>
          ))}
        </ul>
        {notice ? <p className="bag-notice">{notice}</p> : null}
      </aside>
      {popup}
    </div>
  );
}
