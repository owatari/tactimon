import type {
  DuelItemId,
  PokemonProgression,
} from "@tactimon/battle-engine";
import {
  BAG_ITEM_CATALOG,
  itemDescription,
  itemDisplayName,
  itemIconUrl,
  type BagItemId,
  type OverworldItemId,
} from "./items";
import { isFieldUsableItem } from "./itemUse";
import { getPokedex } from "./pokedex";
import type {
  StoryBadgeId,
  StoryState,
} from "./story";

export type MenuScreen =
  | "root"
  | "pokedex"
  | "party"
  | "summary"
  | "bag"
  | "card"
  | "options";

export type MenuEntryId =
  | "pokedex"
  | "party"
  | "bag"
  | "card"
  | "save"
  | "options"
  | "exit";

export type MenuEntry = {
  id: MenuEntryId;
  label: string;
  enabled: boolean;
  hint?: string;
};

export const MENU_ENTRIES: readonly MenuEntry[] = [
  { id: "pokedex", label: "POKéDEX", enabled: true },
  { id: "party", label: "POKéMON", enabled: true },
  { id: "bag", label: "BAG", enabled: true },
  { id: "card", label: "TRAINER CARD", enabled: true },
  { id: "save", label: "SAVE", enabled: true },
  { id: "options", label: "OPTION", enabled: true },
  { id: "exit", label: "EXIT", enabled: true },
];

export const MAX_PARTY_SIZE = 6;

export function getStoryParty(
  story: StoryState,
): PokemonProgression[] {
  if (!story.playerPokemon) {
    return [];
  }

  return [story.playerPokemon, ...story.capturedPokemon].slice(
    0,
    MAX_PARTY_SIZE,
  );
}

export type PartyReorderResult = {
  accepted: boolean;
  story: StoryState;
  reason?: "lead-locked" | "out-of-range" | "same-slot";
};

/**
 * Swaps two party slots. The lead slot holds the starter progression
 * (typed apart from captured Pokémon), so only slots 2–6 can be swapped.
 */
export function reorderStoryParty(
  story: StoryState,
  from: number,
  to: number,
): PartyReorderResult {
  const captured = story.capturedPokemon;
  const size = Math.min(
    captured.length,
    MAX_PARTY_SIZE - 1,
  );

  if (from === to) {
    return { accepted: false, story, reason: "same-slot" };
  }

  if (from === 0 || to === 0) {
    return {
      accepted: false,
      story,
      reason: "lead-locked",
    };
  }

  const a = from - 1;
  const b = to - 1;
  if (a < 0 || b < 0 || a >= size || b >= size) {
    return {
      accepted: false,
      story,
      reason: "out-of-range",
    };
  }

  const next = [...captured];
  [next[a], next[b]] = [next[b], next[a]];

  return {
    accepted: true,
    story: { ...story, capturedPokemon: next },
  };
}

export type BagPocketId =
  | "items"
  | "balls"
  | "key"
  | "tms"
  | "berries";

export type BagEntry = {
  id: string;
  name: string;
  quantity: number | null;
  iconUrl: string | null;
  description: string;
  /** False until field/battle use of this item is implemented. */
  usable: boolean;
};

export type BagPocket = {
  id: BagPocketId;
  label: string;
  entries: BagEntry[];
  /** Reserved for the future dungeon/raid systems. */
  reserved?: boolean;
};

const BALL_IDS: ReadonlySet<OverworldItemId> = new Set([
  "poke-ball",
  "great-ball",
]);

const KEY_ITEM_LABELS: Record<string, string> = {
  "ss-ticket": "S.S. Ticket",
  "town-map": "Town Map",
  "old-amber": "Old Amber",
  "bike-voucher": "Bike Voucher",
  bicycle: "Bicycle",
};

const KEY_ITEM_DESCRIPTIONS: Record<string, string> = {
  "ss-ticket": "Passagem para embarcar no S.S. Anne em Vermilion City.",
  "town-map": "Mapa de Kanto dado pela Daisy.",
  "old-amber": "Âmbar antigo que contém DNA de um Pokémon pré-histórico.",
  "bike-voucher": "Troque na Cerulean Bike Shop por uma Bicicleta.",
  bicycle: "Bicicleta: com ela você corre ainda mais rápido (R alterna).",
};

function itemEntry(
  id: OverworldItemId,
  quantity: number,
): BagEntry {
  return {
    id,
    name: itemDisplayName(id),
    quantity,
    iconUrl: itemIconUrl(id),
    description: itemDescription(id),
    usable: isFieldUsableItem(id),
  };
}

export function buildBagPockets(
  story: StoryState,
): BagPocket[] {
  const items: BagEntry[] = [];
  const balls: BagEntry[] = [];

  for (const id of ["potion", "poke-ball"] as DuelItemId[]) {
    const quantity = story.inventory[id] ?? 0;
    if (quantity > 0) {
      (BALL_IDS.has(id) ? balls : items).push(
        itemEntry(id, quantity),
      );
    }
  }

  for (const id of Object.keys(
    BAG_ITEM_CATALOG,
  ) as BagItemId[]) {
    const quantity = story.bagItems?.[id] ?? 0;
    if (quantity > 0) {
      (BALL_IDS.has(id) ? balls : items).push(
        itemEntry(id, quantity),
      );
    }
  }

  const nuggets = story.valuables?.nugget ?? 0;
  if (nuggets > 0) {
    items.push({
      id: "nugget",
      name: "Nugget",
      quantity: nuggets,
      iconUrl: null,
      description: "Pepita de ouro puro. Vende por um ótimo preço.",
      usable: false,
    });
  }

  const key: BagEntry[] = (story.keyItemIds ?? []).map(
    (id) => ({
      id,
      name: KEY_ITEM_LABELS[id] ?? id,
      quantity: null,
      iconUrl: null,
      description: KEY_ITEM_DESCRIPTIONS[id] ?? "",
      usable: false,
    }),
  );

  return [
    { id: "items", label: "ITEMS", entries: items },
    { id: "key", label: "KEY ITEMS", entries: key },
    { id: "balls", label: "POKé BALLS", entries: balls },
    {
      id: "tms",
      label: "TMs & HMs",
      entries: [],
      reserved: true,
    },
    {
      id: "berries",
      label: "BERRIES",
      entries: [],
      reserved: true,
    },
  ];
}

export const BADGE_ORDER: readonly {
  id: StoryBadgeId;
  label: string;
}[] = [
  { id: "boulder", label: "Boulder" },
  { id: "cascade", label: "Cascade" },
  { id: "thunder", label: "Thunder" },
  { id: "rainbow", label: "Rainbow" },
  { id: "soul", label: "Soul" },
  { id: "marsh", label: "Marsh" },
  { id: "volcano", label: "Volcano" },
  { id: "earth", label: "Earth" },
];

export type TrainerCardData = {
  money: number;
  badges: { id: StoryBadgeId; label: string; earned: boolean }[];
  badgeCount: number;
  partySize: number;
  playTime: string;
  pokedexSeen: number;
  pokedexCaught: number;
  /** True after beating the Champion (Hall of Fame). */
  champion: boolean;
};

export function formatPlayTime(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds));
  const hours = Math.min(999, Math.floor(total / 3600));
  const minutes = Math.floor((total % 3600) / 60);

  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function buildTrainerCard(
  story: StoryState,
): TrainerCardData {
  const earned = new Set(story.badgeIds);
  const dex = getPokedex(story);

  return {
    money: story.money,
    badges: BADGE_ORDER.map((badge) => ({
      ...badge,
      earned: earned.has(badge.id),
    })),
    badgeCount: BADGE_ORDER.filter((badge) =>
      earned.has(badge.id),
    ).length,
    partySize: getStoryParty(story).length,
    playTime: formatPlayTime(story.playTimeSeconds ?? 0),
    pokedexSeen: dex.seenCount,
    pokedexCaught: dex.caughtCount,
    champion: story.defeatedTrainerIds.some((id) =>
      id.startsWith("league-champion-blue-"),
    ),
  };
}
