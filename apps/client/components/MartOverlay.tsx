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
  "viridian-mart": "VIRIDIAN CITY",
  "pewter-mart": "PEWTER CITY",
  "cerulean-mart": "CERULEAN CITY",
  "vermilion-mart": "VERMILION CITY",
};

function purchaseMessage(
  result: MartPurchaseResult,
): string {
  if (result.accepted) {
    return `Compra concluída: ${result.purchased} item(ns) por ₽${result.spent.toLocaleString("pt-BR")}.`;
  }

  if (result.reason === "insufficient-funds") {
    return "Você não tem dinheiro suficiente.";
  }

  if (result.reason === "invalid-quantity") {
    return "Escolha uma quantidade válida.";
  }

  if (result.reason === "unknown-item") {
    return "Esse item não está disponível nesta loja.";
  }

  return "Não há espaço para mais desse item.";
}

export function MartOverlay({
  martId,
  money,
  inventory,
  bagItems,
  onBuy,
  onClose,
}: Props) {
  const stock = martStockFor(martId);
  const [notice, setNotice] = useState(
    "Clerk: Posso ajudar? Veja o que temos na loja.",
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
              {MART_CITY_LABEL[martId] ??
                WORLD_MAPS[martId.split("@")[0]]?.label ??
                "KANTO"}
            </span>
            <h2>Poké Mart</h2>
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
                  <span>{item.name}</span>
                  <strong>
                    ₽{item.price.toLocaleString("pt-BR")}
                  </strong>
                  <small>{item.description}</small>
                  <em>Na bolsa: ×{amount}</em>
                </div>

                <div className="mart-item-actions">
                  <button
                    type="button"
                    disabled={!canBuyOne}
                    onClick={() => buy(item.id, 1)}
                  >
                    Comprar 1
                  </button>
                  <button
                    type="button"
                    disabled={!canBuyFive}
                    onClick={() => buy(item.id, 5)}
                  >
                    Comprar 5
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
          Sair da loja
        </button>
      </section>
    </div>
  );
}
