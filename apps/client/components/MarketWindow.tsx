"use client";

import { useMemo, useState } from "react";
import { buildBagPockets, type BagEntry } from "@/lib/gameMenu";
import { t, tx, useLocale } from "@/lib/i18n";
import { itemDescription, itemDisplayName, itemIconUrl, type OverworldItemId } from "@/lib/items";
import {
  MARKET_STOCK,
  PREMIER_BONUS_STEP,
  buyFromMarket,
  isPremierBonusBall,
  marketBuyPrice,
  marketSellPrice,
  ownedQuantity,
  sellToMarket,
  type MarketFailure,
} from "@/lib/market";
import { MART_MAX_PURCHASE_QUANTITY } from "@/lib/mart";
import type { StoryState } from "@/lib/story";
import { useDragDrop } from "./dragDrop";

type Props = {
  martId: string;
  story: StoryState;
  onStoryChange: (update: (current: StoryState) => StoryState) => void;
  onClose: () => void;
};

type Side = "shop" | "bag";
type Payload = { side: Side; id: OverworldItemId };
type Prompt = { mode: "buy" | "sell"; id: OverworldItemId; quantity: number; step: "quantity" | "confirm" };

const MART_CITY_LABEL: Record<string, string> = {
  "viridian-mart": tx("VIRIDIAN CITY"),
  "pewter-mart": tx("PEWTER CITY"),
  "cerulean-mart": tx("CERULEAN CITY"),
  "vermilion-mart": tx("VERMILION CITY"),
};

function failureText(reason: MarketFailure | undefined): string {
  switch (reason) {
    case "insufficient-funds":
      return t("You do not have enough money.");
    case "invalid-quantity":
      return t("Choose a valid quantity.");
    case "inventory-full":
      return t("You cannot carry that many.");
    case "not-owned":
      return t("You do not have that many.");
    case "not-sellable":
      return t("The shop will not buy that.");
    default:
      return t("That item is not available in this shop.");
  }
}

const money = (value: number) => `₽${value.toLocaleString("pt-BR")}`;

/**
 * The Poké Mart: your bag on the left, the whole shop on the right. Drag from the shop to your bag to
 * buy, from your bag to the shop to sell (both ask for a quantity; selling asks "are you sure?").
 * Clicking an item does the same without dragging.
 */
export function MarketWindow({ martId, story, onStoryChange, onClose }: Props) {
  useLocale();
  const [hover, setHover] = useState<Payload | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [notice, setNotice] = useState(() => t("Welcome! Drag items to buy or sell."));

  const bagEntries = useMemo(() => {
    const pockets = buildBagPockets(story);
    return pockets
      .filter((pocket) => pocket.id === "items" || pocket.id === "balls")
      .flatMap((pocket) => pocket.entries) as BagEntry[];
  }, [story]);

  const open = (payload: Payload) => {
    if (payload.side === "shop") {
      setPrompt({ mode: "buy", id: payload.id, quantity: 1, step: "quantity" });
    } else if (marketSellPrice(payload.id) === null) {
      setNotice(t("The shop will not buy that."));
    } else if (ownedQuantity(story, payload.id) > 0) {
      setPrompt({ mode: "sell", id: payload.id, quantity: 1, step: "quantity" });
    }
  };

  const { dragProps, dragging, over, ghost } = useDragDrop<Payload>((payload, target) => {
    if (target.kind === "market-bag" && payload.side === "shop") open(payload);
    else if (target.kind === "market-shop" && payload.side === "bag") open(payload);
  });

  const maxQuantity = (current: Prompt): number => {
    if (current.mode === "sell") return Math.max(1, ownedQuantity(story, current.id));
    const price = marketBuyPrice(current.id) ?? 1;
    return Math.max(1, Math.min(MART_MAX_PURCHASE_QUANTITY, Math.floor(story.money / price)));
  };

  const confirm = (current: Prompt) => {
    if (current.mode === "buy") {
      const result = buyFromMarket(story, current.id, current.quantity);
      if (result.accepted) {
        onStoryChange((state) => buyFromMarket(state, current.id, current.quantity).story);
        const bought = t("Bought {count}× {item} for {price}.", {
          count: result.quantity,
          item: t(itemDisplayName(current.id)),
          price: money(result.amount),
        });
        setNotice(result.bonusPremier > 0 ? `${bought} ${t("+{count} Premier Ball!", { count: result.bonusPremier })}` : bought);
      } else {
        setNotice(failureText(result.reason));
      }
    } else {
      const result = sellToMarket(story, current.id, current.quantity);
      if (result.accepted) {
        onStoryChange((state) => sellToMarket(state, current.id, current.quantity).story);
        setNotice(
          t("Sold {count}× {item} for {price}.", {
            count: result.quantity,
            item: t(itemDisplayName(current.id)),
            price: money(result.amount),
          }),
        );
      } else {
        setNotice(failureText(result.reason));
      }
    }
    setPrompt(null);
  };

  const shown = hover;
  const shownBuy = shown ? marketBuyPrice(shown.id) : null;
  const shownSell = shown ? marketSellPrice(shown.id) : null;

  const slot = (side: Side, id: OverworldItemId, quantity: number | null, name: string, sellable = true) => (
    <button
      type="button"
      key={`${side}-${id}`}
      className={`bag-slot market-slot${dragging?.id === id && dragging.side === side ? " dragging" : ""}${sellable ? "" : " unusable"}`}
      data-market-item={`${side}:${id}`}
      title={name}
      onMouseEnter={() => setHover({ side, id })}
      onFocus={() => setHover({ side, id })}
      onClick={() => open({ side, id })}
      {...dragProps({ side, id }, <img className="bag-ghost-icon" src={itemIconUrl(id)} alt="" />)}
    >
      <img src={itemIconUrl(id)} alt="" draggable={false} />
      {quantity !== null && <em>{quantity}</em>}
      {side === "shop" && <span className="market-price">{marketBuyPrice(id)}</span>}
    </button>
  );

  return (
    <div className="mart-overlay market-overlay">
      <section className="market-window" aria-label={t("Poké Mart")}>
        {ghost}
        <header className="pc-header">
          <h2>
            {t("Poké Mart")} · {t(MART_CITY_LABEL[martId] ?? tx("KANTO"))}
          </h2>
          <strong className="pc-money" data-market-money>
            {money(story.money)}
          </strong>
          <button type="button" className="pc-close" data-input-back={prompt ? undefined : true} onClick={onClose}>
            {t("Leave")}
          </button>
        </header>

        <div className="market-body">
          <section
            className={`market-panel${dragging?.side === "shop" && over?.kind === "market-bag" ? " drop-over" : ""}`}
            data-drop-kind="market-bag"
            data-drop-id="bag"
          >
            <h3>{t("YOUR BAG")}</h3>
            <div className="bag-grid market-grid" data-market-grid="bag">
              {bagEntries.map((entry) =>
                slot("bag", entry.id as OverworldItemId, entry.quantity, t(entry.name), marketSellPrice(entry.id as OverworldItemId) !== null),
              )}
              {bagEntries.length === 0 && <p className="bag-empty">{t("Empty.")}</p>}
            </div>
          </section>

          <section
            className={`market-panel${dragging?.side === "bag" && over?.kind === "market-shop" ? " drop-over" : ""}`}
            data-drop-kind="market-shop"
            data-drop-id="shop"
          >
            <h3>{t("MARKET")}</h3>
            <div className="bag-grid market-grid" data-market-grid="shop">
              {MARKET_STOCK.map((item) => slot("shop", item.id, null, t(item.name)))}
            </div>
          </section>

          <aside className="market-detail bag-detail" aria-live="polite">
            {shown ? (
              <>
                <h3>
                  <img src={itemIconUrl(shown.id)} alt="" />
                  {t(itemDisplayName(shown.id))}
                </h3>
                <p>{t(itemDescription(shown.id))}</p>
                <dl className="market-prices">
                  <dt>{t("You own")}</dt>
                  <dd>{ownedQuantity(story, shown.id)}</dd>
                  {shownBuy !== null && (
                    <>
                      <dt>{t("Buy")}</dt>
                      <dd>{money(shownBuy)}</dd>
                    </>
                  )}
                  <dt>{t("Sell")}</dt>
                  <dd>{shownSell !== null ? money(shownSell) : "—"}</dd>
                </dl>
                {isPremierBonusBall(shown.id) && (
                  <p className="bag-detail-hint">
                    {t("Every {count} bought gives a free Premier Ball.", { count: PREMIER_BONUS_STEP[shown.id] })}
                  </p>
                )}
              </>
            ) : (
              <p className="bag-detail-hint">
                {t("Point at an item for its price. Drag it across to buy or sell, or just click it.")}
              </p>
            )}
          </aside>
        </div>

        <p className="pc-notice" data-market-notice>
          {notice}
        </p>

        {prompt && (
          <div className="market-prompt" role="dialog" aria-modal="true" data-market-prompt>
            <div className="market-prompt-box">
              <h3>
                <img src={itemIconUrl(prompt.id)} alt="" />
                {prompt.mode === "buy" ? t("Buy") : t("Sell")} {t(itemDisplayName(prompt.id))}
              </h3>
              {prompt.step === "quantity" ? (
                <>
                  <div className="market-qty">
                    <button
                      type="button"
                      aria-label="-"
                      onClick={() => setPrompt({ ...prompt, quantity: Math.max(1, prompt.quantity - 1) })}
                    >
                      −
                    </button>
                    <output data-market-qty>{prompt.quantity}</output>
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => setPrompt({ ...prompt, quantity: Math.min(maxQuantity(prompt), prompt.quantity + 1) })}
                    >
                      +
                    </button>
                    <button type="button" onClick={() => setPrompt({ ...prompt, quantity: maxQuantity(prompt) })}>
                      {t("MAX")}
                    </button>
                  </div>
                  <p>
                    {t("Total")}:{" "}
                    <strong>
                      {money(
                        prompt.quantity *
                          ((prompt.mode === "buy" ? marketBuyPrice(prompt.id) : marketSellPrice(prompt.id)) ?? 0),
                      )}
                    </strong>
                  </p>
                  <div className="pc-actions">
                    <button
                      type="button"
                      data-market-ok
                      onClick={() => (prompt.mode === "sell" ? setPrompt({ ...prompt, step: "confirm" }) : confirm(prompt))}
                    >
                      {t("OK")}
                    </button>
                    <button type="button" data-input-back onClick={() => setPrompt(null)}>
                      {t("Cancel")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    {t("Are you sure you want to sell {count}× {item} for {price}?", {
                      count: prompt.quantity,
                      item: t(itemDisplayName(prompt.id)),
                      price: money(prompt.quantity * (marketSellPrice(prompt.id) ?? 0)),
                    })}
                  </p>
                  <div className="pc-actions">
                    <button type="button" data-market-yes onClick={() => confirm(prompt)}>
                      {t("Yes")}
                    </button>
                    <button type="button" data-input-back onClick={() => setPrompt(null)}>
                      {t("No")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
