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

  it("places canonical FireRed Cut trees on implemented maps", () => {
    const expected = {
      "route-2": [
        [16, 62],
        [15, 69],
        [11, 13],
        [18, 26],
        [6, 85],
      ],
      "viridian-city": [
        [11, 24],
        [18, 5],
      ],
      "pewter-city": [[30, 5]],
      "cerulean-city": [
        [26, 32],
        [50, 18],
      ],
      "vermilion-city": [[19, 24]],
      "route-25": [[30, 3]],
    } as const;

    for (const [mapId, positions] of Object.entries(expected)) {
      const trees = resolveScriptedWorldObjects(mapId)
        .filter((object) => object.request.kind === "script" && object.request.id === "cut");

      expect(
        trees.map((tree) => [tree.x, tree.y]),
      ).toEqual(expect.arrayContaining(positions));
    }
  });

  it("supports non-blocking future scripted events without a new runtime kind", () => {
    const base =
      resolveScriptedWorldObjects("vermilion-city")
        .find(
          (object) =>
            object.id === "vermilion-gym-cut-tree",
        )!;

    const futureSwitch = {
      ...base,
      id: "future-floor-switch",
      blocksMovement: false,
      request: {
        kind: "script" as const,
        id: "future-floor-switch",
      },
    };

    expect(futureSwitch.blocksMovement).toBe(false);
    expect(futureSwitch.request.kind).toBe("script");
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
