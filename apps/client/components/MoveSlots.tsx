"use client";

import { useState } from "react";
import { DUEL_MOVES, type DuelMoveId } from "@tactimon/battle-engine";
import { TypeIcon } from "./TypeIcon";
import { t } from "@/lib/i18n";
import { localizedMoveName } from "@/lib/i18n/names";
import { moveFacts } from "@/lib/typeIcon";
import { MOVE_DESCRIPTIONS } from "@/lib/generated/moveDescriptions";

/** Four fixed move slots (2×2); hover, focus or a tap shows the details panel underneath. */
export function MoveSlots({
  moves,
  movePp,
  selected = null,
}: {
  moves: readonly DuelMoveId[];
  movePp?: Readonly<Record<string, number>>;
  /** Keyboard-driven selection (Summary); wins over the pointer while set. */
  selected?: number | null;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = selected ?? hovered;
  const setShown = setHovered;
  const slots = [0, 1, 2, 3].map((index) => moves[index] ?? null);
  const current = shown !== null ? slots[shown] : null;
  const facts = current ? moveFacts(current) : null;
  const description = current ? (MOVE_DESCRIPTIONS[current.replace(/[^a-z]/g, "")] ?? "") : "";
  const categoryLabel =
    facts?.category === "physical" ? t("PHYSICAL") : facts?.category === "special" ? t("SPECIAL") : t("STATUS");

  return (
    <div className="move-slots">
      <div className="move-slot-grid" onMouseLeave={() => setShown(null)}>
        {slots.map((moveId, index) =>
          moveId ? (
            <button
              type="button"
              key={index}
              className={`move-slot${shown === index ? " active" : ""}`}
              onMouseEnter={() => setShown(index)}
              onFocus={() => setShown(index)}
              onClick={() => setShown(index)}
            >
              <TypeIcon type={DUEL_MOVES[moveId].type} scale={1} />
              <strong>{localizedMoveName(moveId)}</strong>
              <em>
                PP {movePp?.[moveId] ?? DUEL_MOVES[moveId].maxPp}/{DUEL_MOVES[moveId].maxPp}
              </em>
            </button>
          ) : (
            <div key={index} className="move-slot empty" aria-hidden="true">
              —
            </div>
          ),
        )}
      </div>
      <div className="move-detail start-menu-move-info" aria-live="polite">
        {current && facts ? (
          <>
            <div className="move-detail-head">
              <TypeIcon type={DUEL_MOVES[current].type} scale={1} />
              <strong>{localizedMoveName(current)}</strong>
            </div>
            <dl>
              <dt>{t("CATEGORY")}</dt>
              <dd>{categoryLabel}</dd>
              <dt>{t("POWER")}</dt>
              <dd>{facts.power}</dd>
              <dt>{t("ACCURACY")}</dt>
              <dd>{facts.accuracy}</dd>
              <dt>{t("AP")}</dt>
              <dd>{facts.ap}</dd>
            </dl>
            <p>{description.replace(/\n/g, " ")}</p>
          </>
        ) : (
          <p className="move-detail-hint">{t("Point at a move to see its details.")}</p>
        )}
      </div>
    </div>
  );
}
