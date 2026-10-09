"use client";

import { useState } from "react";
import { useDragDrop } from "./dragDrop";
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
  onReorder,
}: {
  moves: readonly DuelMoveId[];
  movePp?: Readonly<Record<string, number>>;
  /** Keyboard-driven selection (Summary); wins over the pointer while set. */
  selected?: number | null;
  /** Dropping a move on another slot (or Alt + arrows on a focused slot) reorders them. */
  onReorder?: (from: number, to: number) => void;
}) {
  const { dragProps, dragging, over, ghost } = useDragDrop<number>((from, target) => {
    if (target.kind === "move-slot") onReorder?.(from, Number(target.id));
  });
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
      {ghost}
      <div className="move-slot-grid" onMouseLeave={() => setShown(null)}>
        {slots.map((moveId, index) =>
          moveId ? (
            <button
              type="button"
              key={index}
              className={`move-slot${shown === index ? " active" : ""}${dragging === index ? " dragging" : ""}${over?.kind === "move-slot" && over.id === String(index) && dragging !== null && dragging !== index ? " drop-over" : ""}`}
              data-drop-kind="move-slot"
              data-drop-id={index}
              {...(onReorder ? dragProps(index, <b className="drag-chip">{localizedMoveName(moveId)}</b>) : {})}
              onKeyDown={(event) => {
                if (!onReorder || !event.altKey) return;
                const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[event.key];
                if (!step) return;
                const to = index + step;
                if (to < 0 || to >= moves.length) return;
                event.preventDefault();
                event.stopPropagation();
                onReorder(index, to);
              }}
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
            <div key={index} className="move-slot empty" aria-hidden="true" data-drop-kind="move-slot" data-drop-id={index}>
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
