"use client";

import { useState } from "react";
import type { DuelInventory } from "@tactimon/battle-engine";
import {
  BAG_ITEM_MAX_QUANTITY,
  isBagItemId,
  itemIconUrl,
  type BagItems,
  type OverworldItemId,
} from "@/lib/items";
import { WORLD_MAPS } from "@/lib/maps";
import { t, tx, useLocale } from "@/lib/i18n";
import {
  MART_MAX_ITEM_QUANTITY,
  martStockFor,
  type MartPurchaseResult,
} from "@/lib/mart";

type Props = {
  martId: string;
  money: number;
  inventory: DuelInventory;
  bagItems: BagItems;
  onBuy: (
    itemId: OverworldItemId,
    quantity: number,
  ) => MartPurchaseResult;
  onClose: () => void;
};

const MART_CITY_LABEL: Record<string, string> = {
  "viridian-mart": tx("VIRIDIAN CITY"),
  "pewter-mart": tx("PEWTER CITY"),
  "cerulean-mart": tx("CERULEAN CITY"),
  "vermilion-mart": tx("VERMILION CITY"),
};

function purchaseMessage(
  result: MartPurchaseResult,
): string {
  if (result.accepted) {
    return t("Purchase complete: {count} item(s) for ₽{spent}.", {
      count: result.purchased,
      spent: result.spent.toLocaleString("pt-BR"),
    });
  }

  if (result.reason === "insufficient-funds") {
    return t("You do not have enough money.");
  }

  if (result.reason === "invalid-quantity") {
    return t("Choose a valid quantity.");
  }

  if (result.reason === "unknown-item") {
    return t("That item is not available in this shop.");
  }

  return t("There is no room for more of that item.");
}

export function MartOverlay({
  martId,
  money,
  inventory,
  bagItems,
  onBuy,
  onClose,
}: Props) {
  useLocale();
  const stock = martStockFor(martId);
  const [notice, setNotice] = useState<string>(() =>
    t("Clerk: May I help you? Take a look at what we have in the shop."),
  );

  const buy = (
    itemId: OverworldItemId,
    quantity: number,
  ) => {
    setNotice(
      purchaseMessage(
        onBuy(itemId, quantity),
      ),
    );
  };

  return (
    <div className="mart-overlay">
      <section className="mart-panel">
        <div className="mart-header">
          <div>
            <span className="eyebrow">
              {t(
                MART_CITY_LABEL[martId] ??
                  WORLD_MAPS[martId.split("@")[0]]?.label ??
                  "KANTO",
              )}
            </span>
            <h2>{t("Poké Mart")}</h2>
          </div>
          <strong>
            ₽{money.toLocaleString("pt-BR")}
          </strong>
        </div>

        <p className="mart-copy">{notice}</p>

        <div className="mart-item-list">
          {stock.map((item) => {
            const bagItemId = isBagItemId(item.id)
              ? item.id
              : null;
            const amount = bagItemId
              ? (bagItems[bagItemId] ?? 0)
              : (inventory[
                  item.id as keyof DuelInventory
                ] ?? 0);
            const maxQuantity = bagItemId
              ? BAG_ITEM_MAX_QUANTITY
              : MART_MAX_ITEM_QUANTITY;
            const canBuyOne =
              money >= item.price &&
              amount < maxQuantity;
            const canBuyFive =
              money >= item.price * 5 &&
              amount <= maxQuantity - 5;

            return (
              <article
                key={item.id}
                className="mart-item-card"
              >
                <img
                  className="mart-item-rom-icon"
                  src={itemIconUrl(item.id)}
                  alt=""
                  aria-hidden="true"
                />
                <div className="mart-item-copy">
                  <span>{t(item.name)}</span>
                  <strong>
                    ₽{item.price.toLocaleString("pt-BR")}
                  </strong>
                  <small>{t(item.description)}</small>
                  <em>{t("In bag: ×{count}", { count: amount })}</em>
                </div>

                <div className="mart-item-actions">
                  <button
                    type="button"
                    disabled={!canBuyOne}
                    onClick={() => buy(item.id, 1)}
                  >
                    {t("Buy 1")}
                  </button>
                  <button
                    type="button"
                    disabled={!canBuyFive}
                    onClick={() => buy(item.id, 5)}
                  >
                    {t("Buy 5")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="mart-close"
          onClick={onClose}
        >
          {t("Leave shop")}
        </button>
      </section>
    </div>
  );
}
