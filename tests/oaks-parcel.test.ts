import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import { menuEntriesFor } from "../apps/client/lib/gameMenu";
import {
  hasPokedex,
  hasStoryKeyItem,
  normalizeStoryState,
} from "../apps/client/lib/story";

const fresh = () =>
  normalizeStoryState({
    starter: "charmander",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("charmander", 5),
  });

describe("Oak's Parcel quest gates the Pokédex", () => {
  it("starts without a Pokédex and hides it from the Start menu", () => {
    const story = fresh();
    expect(hasPokedex(story)).toBe(false);
    expect(menuEntriesFor(story).map((e) => e.id)).not.toContain("pokedex");
  });

  it("the Viridian clerk gives the parcel once; Oak trades it for the Pokédex", () => {
    let story = fresh();
    const clerk = runDialogueInteraction(story, { kind: "script", id: "viridian-mart-parcel" });
    story = clerk.story;
    expect(hasStoryKeyItem(story, "oaks-parcel")).toBe(true);
    expect(clerk.presentation.pages.length).toBe(2);

    const oak = runDialogueInteraction(story, { kind: "script", id: "lab-oak" });
    story = oak.story;
    expect(story.keyItemIds).not.toContain("oaks-parcel");
    expect(hasPokedex(story)).toBe(true);
    expect(menuEntriesFor(story).map((e) => e.id)).toContain("pokedex");

    // The clerk no longer hands out a second parcel.
    const again = runDialogueInteraction(story, { kind: "script", id: "viridian-mart-parcel" });
    expect(again.story.keyItemIds).not.toContain("oaks-parcel");
  });

  it("Oak without a parcel keeps his usual dialogue", () => {
    const story = fresh();
    const oak = runDialogueInteraction(story, { kind: "script", id: "lab-oak" });
    expect(hasPokedex(oak.story)).toBe(false);
  });

  it("old saves that already progressed keep the Pokédex", () => {
    const story = normalizeStoryState({ ...fresh(), badgeIds: ["boulder"] });
    expect(hasPokedex(story)).toBe(true);
  });
});
