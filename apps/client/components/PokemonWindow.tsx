"use client";

import type { ReactNode } from "react";
import type { PokemonProgression } from "@tactimon/battle-engine";
import { pokemonDisplayName } from "@/lib/pokemonName";
import { MAX_PARTY_SIZE } from "@/lib/gameMenu";
import { useDragDrop } from "./dragDrop";

type Props = {
  party: readonly PokemonProgression[];
  /** Slot highlighted by the keyboard / hover cursor. */
  selectedIndex: number;
  /** Slot whose Summary a click pinned open. */
  pinnedIndex: number | null;
  /** Slot being swapped through the keyboard SWITCH action. */
  switchFrom: number | null;
  onPin: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  renderSlot: (pokemon: PokemonProgression, index: number) => ReactNode;
  /** The Summary of the pinned or hovered Pokémon, shown at the side. */
  summary: ReactNode;
  notice?: string;
};

/**
 * The Pokémon window: six slots you can drag to reorder (slot 1 stays the lead), with the Summary
 * of the hovered Pokémon at the right; a click pins it open and its moves can be dragged to reorder.
 */
export function PokemonWindow({
  party,
  selectedIndex,
  pinnedIndex,
  switchFrom,
  onPin,
  onReorder,
  renderSlot,
  summary,
  notice,
}: Props) {
  const { dragProps, dragging, over, ghost } = useDragDrop<number>((from, target) => {
    if (target.kind === "party-slot") onReorder(from, Number(target.id));
  });
  const slots = Array.from({ length: MAX_PARTY_SIZE }, (_, index) => party[index] ?? null);

  return (
    <div className="pokemon-window">
      {ghost}
      <ul className="pokemon-window-slots" data-nav="vertical">
        {slots.map((pokemon, index) =>
          pokemon ? (
            <li
              key={`${pokemon.species}-${index}`}
              data-drop-kind="party-slot"
              data-drop-id={index}
              data-party-slot={index}
              className={[
                "start-menu-party-row",
                "pokemon-window-slot",
                index === selectedIndex ? "selected" : "",
                index === pinnedIndex ? "pinned" : "",
                index === switchFrom ? "switching" : "",
                dragging === index ? "dragging" : "",
                over?.kind === "party-slot" && over.id === String(index) && dragging !== null && dragging !== index
                  ? "drop-over"
                  : "",
                pokemon.currentHp <= 0 ? "fainted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-input-native
              onClick={() => onPin(index)}
              {...dragProps(index, <b className="drag-chip">{pokemonDisplayName(pokemon)}</b>)}
            >
              {renderSlot(pokemon, index)}
            </li>
          ) : (
            <li key={`empty-${index}`} className="pokemon-window-slot empty" aria-hidden="true">
              —
            </li>
          ),
        )}
      </ul>
      <div className="pokemon-window-summary">
        {summary}
        {notice ? <p className="pokemon-window-notice">{notice}</p> : null}
      </div>
    </div>
  );
}
