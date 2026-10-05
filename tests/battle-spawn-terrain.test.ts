import { describe, expect, it } from "vitest";
import { isWaterCell, type MapLayout } from "../apps/client/lib/maps";

function layoutWithBehavior(behavior: number): MapLayout {
  return {
    index: 0,
    id: "test",
    name: "test",
    width: 1,
    height: 1,
    primary_tileset: "test",
    secondary_tileset: "test",
    cells: [
      {
        raw: 0,
        metatile: 0,
        collision: 0,
        elevation: 0,
        behavior,
      },
    ],
  };
}

describe("battle spawn terrain classification", () => {
  it("recognizes FireRed water behaviors even when collision alone is open", () => {
    expect(isWaterCell(layoutWithBehavior(0x10), 0, 0)).toBe(true);
    expect(isWaterCell(layoutWithBehavior(0x15), 0, 0)).toBe(true);
  });

  it("keeps walkable puddles and shallow water available", () => {
    expect(isWaterCell(layoutWithBehavior(0x16), 0, 0)).toBe(false);
    expect(isWaterCell(layoutWithBehavior(0x17), 0, 0)).toBe(false);
  });

  it("does not classify ordinary land as water", () => {
    expect(isWaterCell(layoutWithBehavior(0x00), 0, 0)).toBe(false);
    expect(isWaterCell(layoutWithBehavior(0x38), 0, 0)).toBe(false);
  });
});
