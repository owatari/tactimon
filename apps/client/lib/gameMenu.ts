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
import { getPokedex, hasAllKantoMons } from "./pokedex";
import { hasPokedex } from "./story";
import { tx } from "./i18n";
import {
  KEY_ITEM_DESCRIPTIONS,
  KEY_ITEM_LABELS,
} from "./keyItems";
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
  | "options"
  | "townmap";

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
  { id: "pokedex", label: tx("POKéDEX"), enabled: true },
  { id: "party", label: tx("POKéMON"), enabled: true },
  { id: "bag", label: tx("BAG"), enabled: true },
  { id: "card", label: tx("TRAINER CARD"), enabled: true },
  { id: "save", label: tx("SAVE"), enabled: true },
  { id: "options", label: tx("OPTION"), enabled: true },
  { id: "exit", label: tx("EXIT"), enabled: true },
];

/** FireRed shows POKéDEX in the Start menu only after Prof. Oak gave it (FLAG_SYS_POKEDEX_GET). */
export function menuEntriesFor(story: StoryState): readonly MenuEntry[] {
  return MENU_ENTRIES.filter(
    (entry) => entry.id !== "pokedex" || hasPokedex(story),
  );
}

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
  "ultra-ball",
  "master-ball",
  "premier-ball",
]);

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
      description: tx("A nugget of pure gold. Sells for a great price."),
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
      // The Town Map opens its own screen (Fly lives there).
      usable: id === "town-map",
    }),
  );

  return [
    { id: "items", label: tx("ITEMS"), entries: items },
    { id: "key", label: tx("KEY ITEMS"), entries: key },
    { id: "balls", label: tx("POKé BALLS"), entries: balls },
    {
      id: "tms",
      label: tx("TMs & HMs"),
      entries: [],
      reserved: true,
    },
    {
      id: "berries",
      label: tx("BERRIES"),
      entries: [],
      reserved: true,
    },
  ];
}

export const BADGE_ORDER: readonly {
  id: StoryBadgeId;
  label: string;
}[] = [
  { id: "boulder", label: tx("Boulder") },
  { id: "cascade", label: tx("Cascade") },
  { id: "thunder", label: tx("Thunder") },
  { id: "rainbow", label: tx("Rainbow") },
  { id: "soul", label: tx("Soul") },
  { id: "marsh", label: tx("Marsh") },
  { id: "volcano", label: tx("Volcano") },
  { id: "earth", label: tx("Earth") },
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
  name: string;
  /** "IDNo." printed with five digits. */
  idNo: string;
  /** FireRed stars: Hall of Fame + every Kanto Pokémon caught (Mew excluded); Battle Tower/paintings do not exist here. */
  stars: number;
  /** Hall of Fame debut time "hhh:mm:ss" (card back), or null before the Champion is beaten. */
  hofDebut: string | null;
  pokemonTrades: number;
  /** The Pokédex line is only printed once the Pokédex was received. */
  hasPokedex: boolean;
};

export function formatHofDebut(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds));
  const h = Math.min(999, Math.floor(total / 3600));
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(3, " ")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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
  const champion = story.defeatedTrainerIds.some((id) =>
    id.startsWith("league-champion-blue-"),
  );

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
    champion,
    name: story.trainerName ?? "RED",
    idNo: String(story.trainerId ?? 0).padStart(5, "0"),
    stars: (champion ? 1 : 0) + (hasAllKantoMons(story) ? 1 : 0),
    hofDebut:
      champion && story.hofDebutSeconds !== undefined
        ? formatHofDebut(story.hofDebutSeconds)
        : null,
    pokemonTrades: story.pokemonTrades ?? 0,
    hasPokedex: hasPokedex(story),
  };
}

/** Reads / writes a party slot (0 = the lead, held apart from the captured ones). */
function partySlotPokemon(story: StoryState, index: number) {
  return index === 0 ? story.playerPokemon : story.capturedPokemon[index - 1];
}

export type MoveReorderResult = { accepted: boolean; story: StoryState };

/** Moves the move at `from` to `to` (the others shift), the way a drag in the Summary drops it. */
export function reorderPartyMoves(
  story: StoryState,
  partyIndex: number,
  from: number,
  to: number,
): MoveReorderResult {
  const pokemon = partySlotPokemon(story, partyIndex);
  const moves = pokemon?.activeMoves;
  if (
    !pokemon ||
    !moves ||
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= moves.length ||
    to >= moves.length
  ) {
    return { accepted: false, story };
  }
  const nextMoves = [...moves];
  const [moved] = nextMoves.splice(from, 1);
  nextMoves.splice(to, 0, moved);
  const next = { ...pokemon, activeMoves: nextMoves };
  return {
    accepted: true,
    story:
      partyIndex === 0
        ? { ...story, playerPokemon: next }
        : {
            ...story,
            capturedPokemon: story.capturedPokemon.map((entry, i) =>
              i === partyIndex - 1 ? ({ ...entry, activeMoves: nextMoves } as typeof entry) : entry,
            ),
          },
  };
}
