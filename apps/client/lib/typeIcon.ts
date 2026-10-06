import { DUEL_MOVES, type DuelMove, type DuelMoveId, type DuelType } from "@tactimon/battle-engine";

/** Row of each type in `public/game-assets/ui/type-icons.png` (FireRed type ids; 9 is the ??? type). */
export const TYPE_ICON_ROW: Readonly<Record<DuelType, number>> = {
  normal: 0, fighting: 1, flying: 2, poison: 3, ground: 4, rock: 5, bug: 6, ghost: 7, steel: 8,
  fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16, dark: 17,
};

/** Fallback pill colours (the ROM palette's own tones) for any type without a ROM icon. */
export const TYPE_COLOR: Readonly<Record<DuelType, string>> = {
  normal: "#a8a878", fighting: "#c03028", flying: "#a890f0", poison: "#a040a0", ground: "#e0c068",
  rock: "#b8a038", bug: "#a8b820", ghost: "#705898", steel: "#b8b8d0", fire: "#f08030",
  water: "#6890f0", grass: "#78c850", electric: "#f8d030", psychic: "#f85888", ice: "#98d8d8",
  dragon: "#7038f8", dark: "#705848",
};

export const TYPE_ICON_SRC = "/game-assets/ui/type-icons.png";
export const TYPE_ICON_WIDTH = 32;
export const TYPE_ICON_HEIGHT = 12;

export type MoveFacts = {
  category: DuelMove["category"];
  power: string;
  accuracy: string;
  ap: number;
  maxPp: number;
};

/** Numbers shown for a move; status moves and sure-hit moves have no power / accuracy ("—"). */
export function moveFacts(moveId: DuelMoveId): MoveFacts {
  const move = DUEL_MOVES[moveId];
  return {
    category: move.category,
    power: move.power ? String(move.power) : "—",
    accuracy: move.alwaysHits || move.category === "status" ? "—" : String(move.accuracy ?? 100),
    ap: move.apCost,
    maxPp: move.maxPp,
  };
}
