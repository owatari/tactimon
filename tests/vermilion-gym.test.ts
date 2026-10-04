import { describe, expect, it } from "vitest";
import {
  resolveWarpTransitionAt,
  WORLD_MAPS,
} from "../apps/client/lib/maps";
import {
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";
import {
  OVERWORLD_TRAINERS,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";
import {
  resolveOverworldDialogues,
} from "../apps/client/lib/overworldDialogues";
import {
  resolveScriptedWorldObjects,
} from "../apps/client/lib/scriptedWorldObjects";
import {
  interactWithVermilionGymTrashCan,
  isVermilionGymBeamWalkable,
  isVermilionGymLocksOpen,
  VERMILION_GYM_TRASH_CANS,
} from "../apps/client/lib/vermilionGym";

describe("Vermilion Gym progression", () => {
  it("registers the extracted Gym and canonical city warp", () => {
    expect(WORLD_MAPS["vermilion-gym"]).toMatchObject({
      label: "Vermilion Gym",
      spawn: { x: 5, y: 18 },
      fallbackMusicId: 275,
      layoutUrl: "/game-assets/maps/vermilion-gym/layout.json",
      previewUrl: "/game-assets/maps/vermilion-gym/preview.png",
      tilesets: {
        secondary: {
          tilesUrl:
            "/game-assets/tilesets/vermilion-gym/tiles.4bpp",
        },
      },
    });

    expect(
      resolveWarpTransitionAt("vermilion-city", 14, 25),
    ).toEqual({
      mapId: "vermilion-gym",
      spawn: { x: 5, y: 18 },
    });
    expect(
      resolveWarpTransitionAt("vermilion-gym", 5, 19),
    ).toEqual({
      mapId: "vermilion-city",
      spawn: { x: 14, y: 26 },
    });
  });

  it("defines the three Gym trainers and Lt. Surge at FireRed positions", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(byId.get("vermilion-baily")).toMatchObject({
      mapId: "vermilion-gym",
      preferredPosition: { x: 2, y: 11 },
      sightRange: 3,
      moneyMultiplier: 12,
    });
    expect(byId.get("vermilion-dwayne")).toMatchObject({
      mapId: "vermilion-gym",
      preferredPosition: { x: 8, y: 13 },
      sightRange: 3,
      moneyMultiplier: 8,
    });
    expect(byId.get("vermilion-tucker")).toMatchObject({
      mapId: "vermilion-gym",
      preferredPosition: { x: 7, y: 8 },
      sightRange: 3,
      moneyMultiplier: 18,
    });
    expect(byId.get("vermilion-lt-surge")).toMatchObject({
      mapId: "vermilion-gym",
      preferredPosition: { x: 5, y: 2 },
      sightRange: 0,
      moneyMultiplier: 25,
      badgeId: "thunder",
    });
  });

  it("uses canonical parties and FireRed prize multipliers", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );
    const baily = byId.get("vermilion-baily")!;
    const dwayne = byId.get("vermilion-dwayne")!;
    const tucker = byId.get("vermilion-tucker")!;
    const surge = byId.get("vermilion-lt-surge")!;

    expect(
      baily.party.map((pokemon) => [
        pokemon.species,
        pokemon.level,
      ]),
    ).toEqual([
      ["voltorb", 21],
      ["magnemite", 21],
    ]);
    expect(
      dwayne.party.map((pokemon) => [
        pokemon.species,
        pokemon.level,
      ]),
    ).toEqual([
      ["pikachu", 21],
      ["pikachu", 21],
    ]);
    expect(
      tucker.party.map((pokemon) => [
        pokemon.species,
        pokemon.level,
      ]),
    ).toEqual([["pikachu", 23]]);
    expect(surge.party).toEqual([
      {
        species: "voltorb",
        level: 21,
        moves: [
          "sonic-boom",
          "tackle",
          "screech",
          "shock-wave",
        ],
      },
      {
        species: "pikachu",
        level: 18,
        moves: [
          "quick-attack",
          "thunder-wave",
          "double-team",
          "shock-wave",
        ],
      },
      {
        species: "raichu",
        level: 24,
        moves: [
          "quick-attack",
          "thunder-wave",
          "double-team",
          "shock-wave",
        ],
      },
    ]);

    expect(
      trainerPrizeMoney(
        baily.party,
        baily.moneyMultiplier,
      ),
    ).toBe(1008);
    expect(
      trainerPrizeMoney(
        dwayne.party,
        dwayne.moneyMultiplier,
      ),
    ).toBe(672);
    expect(
      trainerPrizeMoney(
        tucker.party,
        tucker.moneyMultiplier,
      ),
    ).toBe(1656);
    expect(
      trainerPrizeMoney(
        surge.party,
        surge.moneyMultiplier,
      ),
    ).toBe(2400);
  });

  it("persists Thunder Badge and exposes the Gym Guide", () => {
    expect(
      normalizeStoryState({
        ...DEFAULT_STORY_STATE,
        badgeIds: ["boulder", "cascade", "thunder"],
      }).badgeIds,
    ).toEqual(["boulder", "cascade", "thunder"]);

    expect(
      resolveOverworldDialogues("vermilion-gym"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vermilion-gym-guy",
          x: 4,
          y: 17,
        }),
      ]),
    );
  });

  it("registers all 15 trash cans as invisible non-blocking script targets", () => {
    const trash =
      resolveScriptedWorldObjects("vermilion-gym")
        .filter((object) =>
          object.id.startsWith("vermilion-gym-trash-"),
        );

    expect(trash).toHaveLength(15);
    expect(
      trash.every(
        (object) =>
          object.blocksMovement === false &&
          object.renderSprite === false &&
          object.request.kind === "script" &&
          object.request.id ===
            "vermilion-gym-trash-can",
      ),
    ).toBe(true);
  });

  it("keeps the double-lock puzzle private to each player", () => {
    const playerA = normalizeStoryState({
      ...DEFAULT_STORY_STATE,
      starter: "bulbasaur",
      rivalStarter: "charmander",
    });
    const playerB = normalizeStoryState({
      ...DEFAULT_STORY_STATE,
      starter: "squirtle",
      rivalStarter: "bulbasaur",
    });

    let firstSwitchStory = playerA;
    let firstSwitchId: string | null = null;

    for (const can of VERMILION_GYM_TRASH_CANS) {
      const result =
        interactWithVermilionGymTrashCan(
          playerA,
          can.id,
        );
      if (result.message.includes("primeira trava")) {
        firstSwitchStory = result.story;
        firstSwitchId = can.id;
        break;
      }
    }

    expect(firstSwitchId).not.toBeNull();

    const first = VERMILION_GYM_TRASH_CANS.find(
      (can) => can.id === firstSwitchId,
    )!;
    const adjacent = VERMILION_GYM_TRASH_CANS.filter(
      (can) =>
        Math.abs(can.x - first.x) +
          Math.abs(can.y - first.y) ===
        2,
    );

    const unlocked = adjacent
      .map((can) =>
        interactWithVermilionGymTrashCan(
          firstSwitchStory,
          can.id,
        ),
      )
      .find((result) =>
        isVermilionGymLocksOpen(result.story),
      );

    expect(unlocked).toBeDefined();
    expect(
      isVermilionGymBeamWalkable(
        unlocked!.story,
        "vermilion-gym",
        5,
        6,
      ),
    ).toBe(true);
    expect(
      isVermilionGymBeamWalkable(
        playerB,
        "vermilion-gym",
        5,
        6,
      ),
    ).toBe(false);
    expect(
      isVermilionGymBeamWalkable(
        unlocked!.story,
        "cerulean-gym",
        5,
        6,
      ),
    ).toBe(false);
    expect(isVermilionGymLocksOpen(playerB)).toBe(
      false,
    );
  });
});
