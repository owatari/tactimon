import { describe, expect, it } from "vitest";
import {
  isCounterCell,
  isLedgeCell,
  isLedgeForDirection,
  type MapLayout,
} from "../apps/client/lib/maps";

function layoutWithBehavior(
  behavior: number,
): MapLayout {
  return {
    index: 0,
    id: "TEST",
    name: "Test",
    width: 1,
    height: 1,
    primary_tileset: "general",
    secondary_tileset: "general",
    cells: [{
      raw: 0,
      metatile: 0,
      collision: 1,
      elevation: 0,
      behavior,
    }],
  };
}

describe("FireRed metatile behavior helpers", () => {
  it("recognizes counters generically", () => {
    const layout = layoutWithBehavior(0x80);
    expect(isCounterCell(layout, 0, 0)).toBe(true);
    expect(isLedgeCell(layout, 0, 0)).toBe(false);
  });

  it("only permits ledge jumps in the encoded direction", () => {
    const south = layoutWithBehavior(0x3b);

    expect(isLedgeCell(south, 0, 0)).toBe(true);
    expect(
      isLedgeForDirection(
        south,
        0,
        0,
        "south",
      ),
    ).toBe(true);
    expect(
      isLedgeForDirection(
        south,
        0,
        0,
        "north",
      ),
    ).toBe(false);
  });
});
