import {
  createPokemonProgression,
  speciesDisplayName,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import {
  completeStoryPlayerEvent,
  hasStoryPlayerEvent,
  type CapturedPokemon,
  type StoryState,
} from "./story";

/**
 * FireRed in-game trades (gIngameTrades, ROM 0x26CF8C). The NPC hands over
 * `give` for the player's `want`; the new Pokémon keeps the traded level.
 */

export type InGameTrade = {
  id: string;
  mapId: string;
  x: number;
  y: number;
  speaker: string;
  /** Engine species id of the Pokémon the NPC asks for (may be evolved). */
  want: string;
  give: WildSpeciesId;
};

export const IN_GAME_TRADES: readonly InGameTrade[] = [
  { id: "mr-mime", mapId: "route-2-house", x: 4, y: 5, speaker: "Cientista", want: "abra", give: "mr-mime" },
  { id: "jynx", mapId: "cerulean-house-3", x: 2, y: 2, speaker: "Senhor", want: "poliwhirl", give: "jynx" },
  { id: "nidoran-f", mapId: "underground-path-north-entrance", x: 5, y: 6, speaker: "Menina", want: "nidoran-m", give: "nidoran-f" },
  { id: "farfetchd", mapId: "vermilion-house-2", x: 4, y: 4, speaker: "Menina", want: "spearow", give: "farfetchd" },
  { id: "nidorina", mapId: "route-11-east-entrance-2f", x: 7, y: 3, speaker: "Jovem", want: "nidorino", give: "nidorina" },
  { id: "lickitung", mapId: "route-18-east-entrance-2f", x: 5, y: 3, speaker: "Garoto", want: "golduck", give: "lickitung" },
  { id: "electrode", mapId: "cinnabar-island-pokemon-lab-lounge", x: 5, y: 3, speaker: "Cientista", want: "raichu", give: "electrode" },
  { id: "tangela", mapId: "cinnabar-island-pokemon-lab-lounge", x: 10, y: 5, speaker: "Mulher", want: "venonat", give: "tangela" },
  { id: "seel", mapId: "cinnabar-island-pokemon-lab-research-room", x: 5, y: 4, speaker: "Maníaco", want: "ponyta", give: "seel" },
];

export function findInGameTrade(tradeId: string): InGameTrade | null {
  return IN_GAME_TRADES.find((trade) => trade.id === tradeId) ?? null;
}

export function tradeEventId(tradeId: string): string {
  return `trade:${tradeId}`;
}

export function hasCompletedTrade(
  story: StoryState,
  tradeId: string,
): boolean {
  return hasStoryPlayerEvent(story, "reward", tradeEventId(tradeId));
}

/** Party members (slots 2–6) of the species the NPC asks for. */
export function tradeCandidates(
  story: StoryState,
  trade: InGameTrade,
): { captureIndex: number; pokemon: CapturedPokemon }[] {
  return story.capturedPokemon
    .map((pokemon, captureIndex) => ({ captureIndex, pokemon }))
    .filter(({ pokemon }) => String(pokemon.species) === trade.want);
}

export type TradeResult =
  | {
      ok: true;
      story: StoryState;
      gave: string;
      received: string;
      level: number;
    }
  | {
      ok: false;
      reason: "unknown" | "done" | "invalid-pokemon";
    };

export function performTrade(
  story: StoryState,
  tradeId: string,
  captureIndex: number,
): TradeResult {
  const trade = findInGameTrade(tradeId);
  if (!trade) return { ok: false, reason: "unknown" };
  if (hasCompletedTrade(story, tradeId)) {
    return { ok: false, reason: "done" };
  }

  const offered = story.capturedPokemon[captureIndex];
  if (!offered || String(offered.species) !== trade.want) {
    return { ok: false, reason: "invalid-pokemon" };
  }

  const received = {
    ...createPokemonProgression(trade.give, offered.level),
    species: trade.give,
  } as CapturedPokemon;

  const capturedPokemon = story.capturedPokemon.map((pokemon, index) =>
    index === captureIndex ? received : pokemon,
  );

  return {
    ok: true,
    gave: speciesDisplayName(trade.want as WildSpeciesId),
    received: speciesDisplayName(trade.give),
    level: offered.level,
    story: completeStoryPlayerEvent(
      { ...story, capturedPokemon },
      "reward",
      tradeEventId(tradeId),
    ),
  };
}
