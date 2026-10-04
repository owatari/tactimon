import { describe, expect, it } from "vitest";
import {
  MART_MAX_ITEM_QUANTITY,
  buyMartItem,
  martItemPrice,
  validateMartPurchase,
} from "../apps/client/lib/mart";

const inventory = (
  potion = 1,
  pokeBall = 5,
) => ({
  potion,
  "poke-ball": pokeBall,
});

describe("Viridian Mart", () => {
  it("uses FireRed prices for the initial catalog", () => {
    expect(martItemPrice("poke-ball")).toBe(200);
    expect(martItemPrice("potion")).toBe(300);
  });

  it("buys multiple items without mutating the original inventory", () => {
    const before = inventory();
    const result = buyMartItem(
      3_000,
      before,
      "poke-ball",
      5,
    );

    expect(result).toMatchObject({
      accepted: true,
      money: 2_000,
      spent: 1_000,
      purchased: 5,
    });
    expect(result.inventory["poke-ball"]).toBe(10);
    expect(before["poke-ball"]).toBe(5);
  });

  it("rejects purchases that exceed the available money", () => {
    const before = inventory();
    const result = buyMartItem(
      199,
      before,
      "poke-ball",
      1,
    );

    expect(result).toMatchObject({
      accepted: false,
      money: 199,
      spent: 0,
      purchased: 0,
      reason: "insufficient-funds",
    });
    expect(result.inventory).toEqual(before);
  });

  it("never lets an item stack exceed the project limit", () => {
    const before = inventory(
      1,
      MART_MAX_ITEM_QUANTITY,
    );
    const result = buyMartItem(
      99_999,
      before,
      "poke-ball",
      1,
    );

    expect(result).toMatchObject({
      accepted: false,
      reason: "inventory-full",
      spent: 0,
      purchased: 0,
    });
    expect(result.inventory["poke-ball"]).toBe(
      MART_MAX_ITEM_QUANTITY,
    );
  });

  it.each([0, -1, 1.5, 100, Number.NaN])(
    "rejects invalid purchase quantity %s",
    (quantity) => {
      expect(
        validateMartPurchase(
          99_999,
          inventory(),
          "potion",
          quantity,
        ),
      ).toEqual({
        accepted: false,
        reason: "invalid-quantity",
      });
    },
  );

  it("rejects unknown catalog items", () => {
    expect(
      validateMartPurchase(
        99_999,
        inventory(),
        "antidote" as never,
        1,
      ),
    ).toEqual({
      accepted: false,
      reason: "unknown-item",
    });
  });

  it("sanitizes negative balances instead of producing negative money", () => {
    const result = buyMartItem(
      -500,
      inventory(),
      "potion",
      1,
    );

    expect(result).toMatchObject({
      accepted: false,
      money: 0,
      reason: "insufficient-funds",
    });
  });
});
