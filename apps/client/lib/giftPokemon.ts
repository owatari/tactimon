import { localizedSpeciesName as speciesDisplayName } from "./i18n/names";
import { t } from "./i18n";
import {
  createPokemonProgression,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import {
  completeStoryPlayerEvent,
  hasStoryPlayerEvent,
  placeCapturedPokemon,
  type CapturedPokemon,
  type StoryState,
} from "./story";

export type GiftPokemonResult = {
  story: StoryState;
  granted: boolean;
  destination?: "party" | "storage";
  reason?: "already-received" | "storage-full";
};

export function hasReceivedGift(
  story: StoryState,
  giftId: string,
): boolean {
  return hasStoryPlayerEvent(story, "reward", `gift:${giftId}`);
}

/** One-shot gift Pokémon, remembered per player. */
export function grantGiftPokemon(
  story: StoryState,
  giftId: string,
  species: WildSpeciesId,
  level: number,
): GiftPokemonResult {
  if (hasReceivedGift(story, giftId)) {
    return { story, granted: false, reason: "already-received" };
  }

  const placed = placeCapturedPokemon(
    story,
    createPokemonProgression(species, level) as CapturedPokemon,
  );
  if (!placed.accepted) {
    return { story, granted: false, reason: "storage-full" };
  }

  return {
    granted: true,
    destination: placed.destination,
    story: completeStoryPlayerEvent(
      placed.story,
      "reward",
      `gift:${giftId}`,
    ),
  };
}

export function giftMessage(
  species: WildSpeciesId,
  destination: "party" | "storage" | undefined,
): string {
  const name = speciesDisplayName(species);
  return destination === "storage"
    ? t("You received {name}! It was sent to the PC.", { name })
    : t("You received {name}!", { name });
}

export const MAGIKARP_PRICE = 500;

/** Fossil revival at the Cinnabar Lab: Old Amber, Dome or Helix Fossil. */
export function fossilToRevive(
  story: StoryState,
): { giftId: string; species: WildSpeciesId } | null {
  const candidates: { giftId: string; species: WildSpeciesId; owned: boolean }[] =
    [
      {
        giftId: "revive-aerodactyl",
        species: "aerodactyl",
        owned: (story.keyItemIds ?? []).includes("old-amber"),
      },
      {
        giftId: "revive-kabuto",
        species: "kabuto",
        owned: story.mtMoonFossil === "dome",
      },
      {
        giftId: "revive-omanyte",
        species: "omanyte",
        owned: story.mtMoonFossil === "helix",
      },
    ];

  return (
    candidates.find(
      (candidate) =>
        candidate.owned && !hasReceivedGift(story, candidate.giftId),
    ) ?? null
  );
}
