import { describe, expect, it } from "vitest";
import {
  completeStoryPlayerEvent,
  DEFAULT_STORY_STATE,
  normalizeStoryState,
  setStoryPlayerChoice,
} from "../apps/client/lib/story";
import {
  projectPlayerWorldDefinitions,
} from "../apps/client/lib/playerWorldProjection";
import {
  resolveScriptedWorldObjects,
} from "../apps/client/lib/scriptedWorldObjects";

describe("scripted world object registry", () => {
  it("models pickups as player-projected script objects", () => {
    const definitions =
      resolveScriptedWorldObjects("viridian-city");
    const pickup = definitions.find(
      (object) =>
        object.id === "viridian-city-potion",
    );

    expect(pickup?.request).toMatchObject({
      kind: "script",
      id: "pickup",
    });

    const playerA = completeStoryPlayerEvent(
      normalizeStoryState(DEFAULT_STORY_STATE),
      "pickup",
      "viridian-city-potion",
    );
    const playerB = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );

    expect(
      projectPlayerWorldDefinitions(
        definitions,
        playerA,
      ).some(
        (object) =>
          object.id === "viridian-city-potion",
      ),
    ).toBe(false);
    expect(
      projectPlayerWorldDefinitions(
        definitions,
        playerB,
      ).some(
        (object) =>
          object.id === "viridian-city-potion",
      ),
    ).toBe(true);
  });

  it("projects Bill's two forms from each player's private choice", () => {
    const definitions =
      resolveScriptedWorldObjects("sea-cottage");
    const initial = normalizeStoryState(
      DEFAULT_STORY_STATE,
    );
    const helped = setStoryPlayerChoice(
      initial,
      "bill-stage",
      "helped",
    );

    expect(
      projectPlayerWorldDefinitions(
        definitions,
        initial,
      ).map((object) => object.id),
    ).toContain("sea-cottage-bill-clefairy");
    expect(
      projectPlayerWorldDefinitions(
        definitions,
        helped,
      ).map((object) => object.id),
    ).toContain("sea-cottage-bill");
  });

  it("uses generic script requests for fossils, Cut and Captain", () => {
    const fossil =
      resolveScriptedWorldObjects("mt-moon-b2f")[0];
    const cut =
      resolveScriptedWorldObjects("vermilion-city")
        .find(
          (object) =>
            object.id === "vermilion-gym-cut-tree",
        );
    const captain =
      resolveScriptedWorldObjects(
        "ss-anne-captains-office",
      )[0];

    expect(fossil?.request).toMatchObject({
      kind: "script",
      id: "fossil",
    });
    expect(cut?.request).toMatchObject({
      kind: "script",
      id: "cut",
    });
    expect(captain?.request).toMatchObject({
      kind: "script",
      id: "ss-anne-captain",
    });
  });
});
