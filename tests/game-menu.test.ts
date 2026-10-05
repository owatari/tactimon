import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  buildBagPockets,
  buildTrainerCard,
  formatPlayTime,
  getStoryParty,
  reorderStoryParty,
} from "../apps/client/lib/gameMenu";
import {
  normalizeStoryState,
  type CapturedPokemon,
  type StoryState,
} from "../apps/client/lib/story";

function storyWithParty(): StoryState {
  const captured = [
    createPokemonProgression("rattata", 4),
    createPokemonProgression("pidgey", 5),
    createPokemonProgression("caterpie", 3),
  ] as CapturedPokemon[];

  return normalizeStoryState({
    starter: "bulbasaur",
    playerPokemon: createPokemonProgression("bulbasaur", 8),
    capturedPokemon: captured,
  });
}

describe("start menu party", () => {
  it("lists the lead plus captured Pokémon, capped at six", () => {
    const story = storyWithParty();
    expect(getStoryParty(story).map((p) => p.species)).toEqual([
      "bulbasaur",
      "rattata",
      "pidgey",
      "caterpie",
    ]);
  });

  it("swaps captured slots and keeps the lead locked", () => {
    const story = storyWithParty();
    const swapped = reorderStoryParty(story, 1, 3);
    expect(swapped.accepted).toBe(true);
    expect(getStoryParty(swapped.story).map((p) => p.species)).toEqual([
      "bulbasaur",
      "caterpie",
      "pidgey",
      "rattata",
    ]);
    expect(story.capturedPokemon[0].species).toBe("rattata");

    expect(reorderStoryParty(story, 0, 2)).toMatchObject({
      accepted: false,
      reason: "lead-locked",
    });
    expect(reorderStoryParty(story, 1, 9)).toMatchObject({
      accepted: false,
      reason: "out-of-range",
    });
    expect(reorderStoryParty(story, 2, 2)).toMatchObject({
      accepted: false,
      reason: "same-slot",
    });
  });
});

describe("start menu bag", () => {
  it("groups items by pocket and hides empty stacks", () => {
    const story = normalizeStoryState({
      starter: "bulbasaur",
      inventory: { potion: 2, "poke-ball": 5 },
      bagItems: { antidote: 3, "great-ball": 1, revive: 0 },
      keyItemIds: ["ss-ticket"],
      valuables: { nugget: 2 },
    });
    const pockets = Object.fromEntries(
      buildBagPockets(story).map((pocket) => [
        pocket.id,
        pocket.entries.map((entry) => `${entry.id}:${entry.quantity}`),
      ]),
    );

    expect(pockets.items).toEqual(["potion:2", "antidote:3", "nugget:2"]);
    expect(pockets.balls).toEqual(["poke-ball:5", "great-ball:1"]);
    expect(pockets.key).toEqual(["ss-ticket:null"]);
    expect(pockets.tms).toEqual([]);
  });

  it("keeps TMs and berries reserved for dungeon/raid systems", () => {
    const pockets = buildBagPockets(storyWithParty());
    expect(pockets.find((p) => p.id === "tms")?.reserved).toBe(true);
    expect(pockets.find((p) => p.id === "berries")?.reserved).toBe(true);
  });
});

describe("trainer card", () => {
  it("counts earned badges and formats play time", () => {
    const story = normalizeStoryState({
      starter: "bulbasaur",
      badgeIds: ["boulder", "cascade"],
      money: 1234,
      playTimeSeconds: 3 * 3600 + 7 * 60 + 59,
    });
    const card = buildTrainerCard(story);
    expect(card.badgeCount).toBe(2);
    expect(card.badges.filter((b) => b.earned).map((b) => b.id)).toEqual([
      "boulder",
      "cascade",
    ]);
    expect(card.money).toBe(1234);
    expect(card.playTime).toBe("3:07");
  });

  it("migrates saves without play time", () => {
    expect(normalizeStoryState({ starter: "bulbasaur" }).playTimeSeconds).toBe(0);
    expect(formatPlayTime(-5)).toBe("0:00");
  });
});
