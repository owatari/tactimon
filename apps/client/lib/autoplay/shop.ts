import { buyFromMarket, marketBuyPrice, ownedQuantity } from "../market";
import type { StoryState } from "../story";

/** What the Auto Player wants in the bag, in the order it spends money. */
const WISHLIST: readonly { id: "potion" | "super-potion" | "hyper-potion" | "poke-ball" | "great-ball" | "ultra-ball" | "revive" | "antidote"; want: number; minMoney: number }[] = [
  { id: "poke-ball", want: 12, minMoney: 0 },
  { id: "potion", want: 10, minMoney: 0 },
  { id: "super-potion", want: 8, minMoney: 4000 },
  { id: "great-ball", want: 10, minMoney: 6000 },
  { id: "hyper-potion", want: 8, minMoney: 12000 },
  { id: "revive", want: 4, minMoney: 12000 },
  { id: "ultra-ball", want: 10, minMoney: 20000 },
];

/** Spends up to 80% of the money on the wishlist (each item topped up to its target). Pure. */
export function autoShop(story: StoryState): StoryState {
  let next = story;
  const budget = Math.floor(story.money * 0.8);
  let spent = 0;
  for (const entry of WISHLIST) {
    if (story.money < entry.minMoney) continue;
    const price = marketBuyPrice(entry.id);
    if (price === null) continue;
    const missing = entry.want - ownedQuantity(next, entry.id);
    if (missing <= 0) continue;
    const affordable = Math.floor((budget - spent) / price);
    const quantity = Math.min(missing, affordable, 99);
    if (quantity < 1) continue;
    const result = buyFromMarket(next, entry.id, quantity);
    if (!result.accepted) continue;
    next = result.story;
    spent += result.amount;
  }
  return next;
}
