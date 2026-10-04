"use client";

import { useState } from "react";
import type {
  DuelInventory,
  DuelItemId,
} from "@tactimon/battle-engine";
import {
  MART_MAX_ITEM_QUANTITY,
  VIRIDIAN_MART_ITEMS,
  type MartPurchaseResult,
} from "@/lib/mart";

type Props = {
  money: number;
  inventory: DuelInventory;
  onBuy: (
    itemId: DuelItemId,
    quantity: number,
  ) => MartPurchaseResult;
  onClose: () => void;
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
  money,
  inventory,
  onBuy,
  onClose,
}: Props) {
  const [notice, setNotice] = useState(
    "Clerk: Posso ajudar? Temos Poké Balls e Potions.",
  );

  const buy = (
    itemId: DuelItemId,
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
            <span className="eyebrow">VIRIDIAN CITY</span>
            <h2>Poké Mart</h2>
          </div>
          <strong>
            ₽{money.toLocaleString("pt-BR")}
          </strong>
        </div>

        <p className="mart-copy">{notice}</p>

        <div className="mart-item-list">
          {VIRIDIAN_MART_ITEMS.map((item) => {
            const amount = inventory[item.id] ?? 0;
            const canBuyOne =
              money >= item.price &&
              amount < MART_MAX_ITEM_QUANTITY;
            const canBuyFive =
              money >= item.price * 5 &&
              amount <= MART_MAX_ITEM_QUANTITY - 5;

            return (
              <article
                key={item.id}
                className="mart-item-card"
              >
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
