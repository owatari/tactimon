import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  hasStoryKeyItem,
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

const talk = (story: StoryState, id: string) =>
  runDialogueInteraction(story, { kind: "script", id });

function started(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: {
      ...createPokemonProgression("bulbasaur", 8),
      currentHp: 1,
    },
  });
}

describe("Kanto gift events", () => {
  it("Mom heals the party", () => {
    const result = talk(started(), "pallet-mom");
    expect(result.story.playerPokemon!.currentHp).toBeGreaterThan(1);
  });

  it("Daisy gives the Town Map once", () => {
    const first = talk(started(), "pallet-daisy");
    expect(hasStoryKeyItem(first.story, "town-map")).toBe(true);
    const again = talk(first.story, "pallet-daisy");
    expect(again.story.keyItemIds?.filter((id) => id === "town-map")).toHaveLength(1);
  });

  it("the Museum scientist gives the Old Amber once", () => {
    const first = talk(started(), "museum-old-amber");
    expect(hasStoryKeyItem(first.story, "old-amber")).toBe(true);
    expect(talk(first.story, "museum-old-amber").story).toBe(first.story);
  });

  it("Fan Club voucher becomes a Bicycle at the Bike Shop", () => {
    const voucher = talk(started(), "fan-club-chairman").story;
    expect(hasStoryKeyItem(voucher, "bike-voucher")).toBe(true);

    const poor = talk(started(), "bike-shop-clerk");
    expect(hasStoryKeyItem(poor.story, "bicycle")).toBe(false);

    const bike = talk(voucher, "bike-shop-clerk").story;
    expect(hasStoryKeyItem(bike, "bicycle")).toBe(true);
    expect(bike.keyItemIds).not.toContain("bike-voucher");
    // The voucher gift stays recorded, so the chairman never re-issues it.
    expect(talk(bike, "fan-club-chairman").story.keyItemIds).not.toContain("bike-voucher");
  });

  it("keeps new key items across a save round trip", () => {
    const bike = talk(talk(started(), "fan-club-chairman").story, "bike-shop-clerk").story;
    const reloaded = normalizeStoryState(JSON.parse(JSON.stringify(bike)));
    expect(hasStoryKeyItem(reloaded, "bicycle")).toBe(true);
  });
});

describe("Surf", () => {
  it("is granted once at the Safari Secret House and needs the Soul Badge", async () => {
    const { canStoryUseSurf } = await import("../apps/client/lib/story");
    const first = talk(started(), "safari-secret-house-surf");
    expect(first.story.fieldTechniqueIds).toContain("surf");
    expect(canStoryUseSurf(first.story)).toBe(false);
    expect(
      canStoryUseSurf({ ...first.story, badgeIds: ["soul"] }),
    ).toBe(true);
    const again = talk(first.story, "safari-secret-house-surf");
    expect(again.story.fieldTechniqueIds?.filter((id) => id === "surf")).toHaveLength(1);
  });
});

describe("gift Pokémon events", () => {
  it("gives Lapras once and stores it in the party", () => {
    const first = talk(started(), "silph-lapras-gift");
    expect(first.story.capturedPokemon.map((p) => p.species)).toContain("lapras");
    const again = talk(first.story, "silph-lapras-gift");
    expect(again.story.capturedPokemon.filter((p) => p.species === "lapras")).toHaveLength(1);
  });

  it("revives the Mt. Moon fossil and the Old Amber at the Cinnabar Lab", () => {
    const withFossil = { ...started(), mtMoonFossil: "helix" as const };
    const omanyte = talk(withFossil, "cinnabar-fossil-revive");
    expect(omanyte.story.capturedPokemon.map((p) => p.species)).toContain("omanyte");
    const amber = talk(talk(omanyte.story, "museum-old-amber").story, "cinnabar-fossil-revive");
    expect(amber.story.capturedPokemon.map((p) => p.species)).toContain("aerodactyl");
    const nothing = talk(amber.story, "cinnabar-fossil-revive");
    expect(nothing.story.capturedPokemon).toHaveLength(amber.story.capturedPokemon.length);
  });

  it("sells Magikarp for ₽500 after a confirming second talk", () => {
    const poor = { ...started(), money: 100 };
    const offer = talk(poor, "magikarp-salesman");
    expect(offer.story.money).toBe(100);
    expect(talk(offer.story, "magikarp-salesman").story.capturedPokemon).toHaveLength(0);

    const rich = { ...started(), money: 2000 };
    const offered = talk(rich, "magikarp-salesman").story;
    expect(offered.capturedPokemon).toHaveLength(0);
    const bought = talk(offered, "magikarp-salesman").story;
    expect(bought.money).toBe(1500);
    expect(bought.capturedPokemon.map((p) => p.species)).toContain("magikarp");
    expect(talk(bought, "magikarp-salesman").story.money).toBe(1500);
  });
});
