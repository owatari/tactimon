import type { WildSpeciesId } from "@tactimon/battle-engine";
import { grantGiftPokemon } from "./giftPokemon";
import {
  MAX_GAME_CORNER_COINS,
  hasStoryKeyItem,
  type StoryState,
} from "./story";

/** Celadon Game Corner: Coin Case, coin counter, slot machines and prizes. */

export const COIN_PACK_SIZE = 50;
export const COIN_PACK_PRICE = 1000;

export type SlotSymbol =
  | "seven-red"
  | "seven-blue"
  | "bar"
  | "cherry"
  | "pikachu"
  | "ball";

export const SLOT_SYMBOLS: readonly SlotSymbol[] = [
  "seven-red",
  "seven-blue",
  "bar",
  "cherry",
  "pikachu",
  "ball",
];

export const SLOT_SYMBOL_LABEL: Record<SlotSymbol, string> = {
  "seven-red": "7 VERMELHO",
  "seven-blue": "7 AZUL",
  bar: "BAR",
  cherry: "CEREJA",
  pikachu: "PIKACHU",
  ball: "POKé BALL",
};

export const MIN_SLOT_BET = 1;
export const MAX_SLOT_BET = 3;

/**
 * Coins paid for a 3-coin bet (scaled linearly for smaller bets). Over the 216
 * equally likely reel combinations the machine returns ≈ 83% of the coins.
 */
export function slotPayoutForMaxBet(reels: readonly SlotSymbol[]): number {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    switch (a) {
      case "seven-red":
        return 150;
      case "seven-blue":
        return 100;
      case "bar":
        return 50;
      case "pikachu":
        return 30;
      case "ball":
        return 15;
      default:
        return 15; // three cherries
    }
  }

  const sevens = reels.filter(
    (symbol) => symbol === "seven-red" || symbol === "seven-blue",
  ).length;
  if (sevens === 3) return 20; // mixed sevens

  const cherries = reels.filter((symbol) => symbol === "cherry").length;
  return cherries === 2 ? 4 : 0;
}

export function slotPayout(
  reels: readonly SlotSymbol[],
  bet: number,
): number {
  return Math.floor((slotPayoutForMaxBet(reels) * bet) / MAX_SLOT_BET);
}

export type SlotSpin = {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  bet: number;
  payout: number;
};

/** `rolls` are three integers (any size); each picks one reel symbol. */
export function spinSlots(
  rolls: readonly [number, number, number],
  bet: number,
): SlotSpin {
  const reels = rolls.map(
    (roll) =>
      SLOT_SYMBOLS[Math.abs(Math.trunc(roll)) % SLOT_SYMBOLS.length],
  ) as SlotSpin["reels"];
  return { reels, bet, payout: slotPayout(reels, bet) };
}

export type CoinResult =
  | { ok: true; story: StoryState }
  | {
      ok: false;
      reason: "no-case" | "money" | "coins-full" | "no-coins";
    };

export function buyCoins(story: StoryState): CoinResult {
  if (!hasStoryKeyItem(story, "coin-case")) {
    return { ok: false, reason: "no-case" };
  }
  if (story.money < COIN_PACK_PRICE) {
    return { ok: false, reason: "money" };
  }
  const coins = story.coins ?? 0;
  if (coins + COIN_PACK_SIZE > MAX_GAME_CORNER_COINS) {
    return { ok: false, reason: "coins-full" };
  }

  return {
    ok: true,
    story: {
      ...story,
      money: story.money - COIN_PACK_PRICE,
      coins: coins + COIN_PACK_SIZE,
    },
  };
}

export type PlaySlotsResult =
  | { ok: true; story: StoryState; spin: SlotSpin }
  | { ok: false; reason: "no-case" | "no-coins" };

/** Spends the bet and pays out the winnings (never more than the 9,999 cap). */
export function playSlots(
  story: StoryState,
  rolls: readonly [number, number, number],
  requestedBet = MAX_SLOT_BET,
): PlaySlotsResult {
  if (!hasStoryKeyItem(story, "coin-case")) {
    return { ok: false, reason: "no-case" };
  }

  const coins = story.coins ?? 0;
  const bet = Math.max(
    MIN_SLOT_BET,
    Math.min(MAX_SLOT_BET, Math.trunc(requestedBet), coins),
  );
  if (coins < MIN_SLOT_BET) return { ok: false, reason: "no-coins" };

  const spin = spinSlots(rolls, bet);
  return {
    ok: true,
    spin,
    story: {
      ...story,
      coins: Math.min(
        MAX_GAME_CORNER_COINS,
        coins - bet + spin.payout,
      ),
    },
  };
}

export type CoinPrize = {
  id: string;
  species: WildSpeciesId;
  level: number;
  cost: number;
};

/** FireRed prize counter (Pokémon only; TMs belong to raids/dungeons). */
export const COIN_PRIZES: readonly CoinPrize[] = [
  { id: "abra", species: "abra", level: 9, cost: 180 },
  { id: "clefairy", species: "clefairy", level: 8, cost: 500 },
  { id: "dratini", species: "dratini", level: 18, cost: 2800 },
  { id: "scyther", species: "scyther", level: 25, cost: 5500 },
  { id: "porygon", species: "porygon", level: 26, cost: 9999 },
];

export type PrizeResult =
  | {
      ok: true;
      story: StoryState;
      prize: CoinPrize;
      destination: "party" | "storage";
    }
  | {
      ok: false;
      reason:
        | "unknown"
        | "no-case"
        | "coins"
        | "already-received"
        | "storage-full";
    };

export function buyPrize(
  story: StoryState,
  prizeId: string,
): PrizeResult {
  const prize = COIN_PRIZES.find((entry) => entry.id === prizeId);
  if (!prize) return { ok: false, reason: "unknown" };
  if (!hasStoryKeyItem(story, "coin-case")) {
    return { ok: false, reason: "no-case" };
  }
  if ((story.coins ?? 0) < prize.cost) {
    return { ok: false, reason: "coins" };
  }

  const gift = grantGiftPokemon(
    story,
    `game-corner-${prize.id}`,
    prize.species,
    prize.level,
  );
  if (!gift.granted) {
    return {
      ok: false,
      reason:
        gift.reason === "already-received"
          ? "already-received"
          : "storage-full",
    };
  }

  return {
    ok: true,
    prize,
    destination: gift.destination ?? "party",
    story: { ...gift.story, coins: (story.coins ?? 0) - prize.cost },
  };
}
