import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_STATE,
  chooseStarter,
  storyIsKnockedOut,
} from "../apps/client/lib/story";

describe("field transitions guard", () => {
  it("does not block a new save with no Pokémon (Oak Lab walk-in)", () => {
    expect(storyIsKnockedOut(DEFAULT_STORY_STATE)).toBe(false);
  });

  it("does not block a healthy party", () => {
    expect(storyIsKnockedOut(chooseStarter("charmander"))).toBe(false);
  });

  it("blocks only when every owned Pokémon has fainted", () => {
    const story = chooseStarter("charmander");
    const fainted = {
      ...story,
      playerPokemon: { ...story.playerPokemon!, currentHp: 0 },
    };
    expect(storyIsKnockedOut(fainted)).toBe(true);
  });
});
