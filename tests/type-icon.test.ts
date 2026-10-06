import { describe, expect, it } from "vitest";
import { DUEL_MOVES, type DuelMoveId, type DuelType } from "../packages/battle-engine/src";
import { TYPE_COLOR, TYPE_ICON_ROW, moveFacts } from "../apps/client/lib/typeIcon";

const TYPES = Object.keys(TYPE_COLOR) as DuelType[];

describe("type icons", () => {
  it("maps every battle type to its own ROM sprite row (the ??? type, row 9, is skipped)", () => {
    const rows = TYPES.map((type) => TYPE_ICON_ROW[type]);
    expect(rows.every((row) => Number.isInteger(row) && row >= 0 && row <= 17 && row !== 9)).toBe(true);
    expect(new Set(rows).size).toBe(17);
    expect(TYPE_ICON_ROW.fire).toBe(10);
    expect(TYPE_ICON_ROW.dark).toBe(17);
  });

  it("every move's type has an icon", () => {
    for (const move of Object.values(DUEL_MOVES)) expect(TYPE_ICON_ROW[move.type], move.id).toBeDefined();
  });
});

describe("move facts", () => {
  it("shows power, accuracy and the AP cost of damaging and status moves", () => {
    const damaging = Object.keys(DUEL_MOVES).find((id) => DUEL_MOVES[id as DuelMoveId].power) as DuelMoveId;
    expect(moveFacts(damaging).power).not.toBe("—");
    expect(moveFacts(damaging).ap).toBe(DUEL_MOVES[damaging].apCost);
    const status = Object.keys(DUEL_MOVES).find((id) => DUEL_MOVES[id as DuelMoveId].category === "status") as DuelMoveId;
    expect(moveFacts(status)).toMatchObject({ power: "—", accuracy: "—", category: "status" });
  });
});
