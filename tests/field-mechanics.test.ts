import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  resetBoulders,
  resolveBoulderPosition,
  resolveBoulderPush,
  setBoulderPosition,
} from "../apps/client/lib/boulders";
import {
  canStoryUseFlash,
  canStoryUseFly,
  canStoryUseStrength,
} from "../apps/client/lib/fieldTechniques";
import {
  resolveBlockedPlayerTileGate,
} from "../apps/client/lib/playerWorldGates";
import {
  silphDoorEventId,
  staticEncounterEventId,
} from "../apps/client/lib/questEvents";
import { SILPH_DOORS } from "../apps/client/lib/generated/worldObstacles";
import { isWorldOpenCell } from "../apps/client/lib/maps";
import {
  resolveScriptedWorldObjects,
  strengthBoulderId,
} from "../apps/client/lib/scriptedWorldObjects";
import { STATIC_WORLD_ENCOUNTERS } from "../apps/client/lib/staticEncounters";
import {
  completeStoryPlayerEvent,
  grantStoryBadge,
  grantStoryKeyItemOnce,
  hasStoryFieldTechnique,
  hasStoryKeyItem,
  hasStoryPlayerEvent,
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

const talk = (
  story: StoryState,
  id: string,
  context?: Record<string, string>,
) =>
  runDialogueInteraction(story, { kind: "script", id, context });

function started(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
  });
}

describe("field HM gifts", () => {
  it("Route 16 woman gives Fly once", () => {
    const first = talk(started(), "route16-fly-woman");
    expect(hasStoryFieldTechnique(first.story, "fly")).toBe(true);
    expect(canStoryUseFly(first.story)).toBe(false);
    const withBadge = grantStoryBadge(first.story, "thunder");
    expect(canStoryUseFly(withBadge)).toBe(true);
    expect(talk(first.story, "route16-fly-woman").story.fieldTechniqueIds).toEqual(["fly"]);
  });

  it("the Route 2 aide needs 10 caught species for Flash", () => {
    const refused = talk(started(), "route2-flash-aide");
    expect(hasStoryFieldTechnique(refused.story, "flash")).toBe(false);

    const base = started();
    const species = [
      "pidgey",
      "rattata",
      "caterpie",
      "weedle",
      "spearow",
      "ekans",
      "sandshrew",
      "mankey",
      "oddish",
      "pikachu",
      "geodude",
    ] as const;
    const rich = normalizeStoryState({
      ...base,
      capturedPokemon: species.slice(0, 4).map((id) => ({
        ...createPokemonProgression(id, 5),
        species: id,
      })),
      boxedPokemon: species.slice(4).map((id) => ({
        ...createPokemonProgression(id, 5),
        species: id,
      })),
    } as never);
    const accepted = talk(rich, "route2-flash-aide");
    expect(hasStoryFieldTechnique(accepted.story, "flash")).toBe(true);
    expect(canStoryUseFlash(accepted.story)).toBe(false);
  });

  it("the Warden trades Gold Teeth for Strength", () => {
    const without = talk(started(), "fuchsia-warden");
    expect(hasStoryFieldTechnique(without.story, "strength")).toBe(false);

    const withTeeth = grantStoryKeyItemOnce(started(), "gold-teeth").story;
    const gift = talk(withTeeth, "fuchsia-warden");
    expect(hasStoryFieldTechnique(gift.story, "strength")).toBe(true);
    // spent: gone from the Bag (the pickup flag stays set)
    expect(gift.story.keyItemIds).not.toContain("gold-teeth");
    expect(canStoryUseStrength(grantStoryBadge(gift.story, "rainbow"))).toBe(true);
  });
});

describe("key item NPCs", () => {
  it.each([
    ["vermilion-old-rod-guru", "old-rod"],
    ["fuchsia-good-rod-guru", "good-rod"],
    ["route12-super-rod-guru", "super-rod"],
    ["celadon-coin-case-man", "coin-case"],
    ["celadon-tea-woman", "tea"],
    ["lavender-fuji-house", "poke-flute"],
  ] as const)("%s gives %s once", (script, item) => {
    const first = talk(started(), script);
    expect(hasStoryKeyItem(first.story, item)).toBe(true);
    const again = talk(first.story, script);
    expect(
      again.story.keyItemIds?.filter((id) => id === item),
    ).toHaveLength(1);
  });

  it("key item balls hand over the item and disappear", () => {
    const result = talk(started(), "key-item-ball", {
      keyItemId: "card-key",
    });
    expect(hasStoryKeyItem(result.story, "card-key")).toBe(true);
    const ball = resolveScriptedWorldObjects("silph-co-5f").find(
      (object) => object.id === "silph-co-5f-key-card-key",
    );
    expect(ball?.visibleWhen).toMatchObject({
      namespace: "key-item",
      id: "card-key",
      completed: false,
    });
  });

  it("old saves keep working with the new key items", () => {
    const loaded = normalizeStoryState({
      keyItemIds: ["tea", "not-a-real-item", "bicycle"] as never,
      fieldTechniqueIds: ["strength", "teleport", "cut"] as never,
    });
    expect(loaded.keyItemIds).toEqual(["tea", "bicycle"]);
    expect(loaded.fieldTechniqueIds).toEqual(["strength", "cut"]);
  });
});

describe("Saffron guards", () => {
  const gateAt = (story: StoryState) =>
    resolveBlockedPlayerTileGate(story, "route-5-south-entrance", 4, 5);

  it("block the gatehouse until the Tea is delivered", () => {
    const story = started();
    expect(gateAt(story)?.blockedRequest).toMatchObject({
      kind: "script",
      id: "saffron-guard",
    });

    const refused = talk(story, "saffron-guard");
    expect(gateAt(refused.story)).not.toBeNull();

    const withTea = grantStoryKeyItemOnce(story, "tea").story;
    const opened = talk(withTea, "saffron-guard");
    expect(gateAt(opened.story)).toBeNull();
    // every gatehouse opens together
    expect(
      resolveBlockedPlayerTileGate(opened.story, "route-8-west-entrance", 6, 5),
    ).toBeNull();
  });
});

describe("Pokémon Tower ghost and Cinnabar gym", () => {
  it("blocks the stairs until the ghost is cleared", () => {
    const story = started();
    const gate = resolveBlockedPlayerTileGate(story, "pokemon-tower-6f", 11, 15);
    expect(gate?.wildBattle).toMatchObject({
      species: "marowak",
      requiresKeyItem: "silph-scope",
    });

    const cleared = completeStoryPlayerEvent(
      story,
      "story",
      staticEncounterEventId(gate!.wildBattle!.staticId),
    );
    expect(
      resolveBlockedPlayerTileGate(cleared, "pokemon-tower-6f", 11, 15),
    ).toBeNull();
  });

  it("the Cinnabar gym door needs the Secret Key", () => {
    const story = started();
    expect(
      resolveBlockedPlayerTileGate(story, "cinnabar-island", 20, 4),
    ).not.toBeNull();
    expect(
      resolveBlockedPlayerTileGate(
        grantStoryKeyItemOnce(story, "secret-key").story,
        "cinnabar-island",
        20,
        4,
      ),
    ).toBeNull();
  });
});

describe("Silph Co. Card Key doors", () => {
  const door = SILPH_DOORS[0];
  const [x, y] = door.cells[0];

  it("are walkable cells guarded by a tile gate", () => {
    expect(isWorldOpenCell(door.mapId, x, y)).toBe(true);
    expect(
      resolveBlockedPlayerTileGate(started(), door.mapId, x, y),
    ).not.toBeNull();
  });

  it("need the Card Key and stay open afterwards", () => {
    const locked = talk(started(), "silph-card-door", { doorId: door.id });
    expect(
      hasStoryPlayerEvent(locked.story, "story", silphDoorEventId(door.id)),
    ).toBe(false);

    const withKey = grantStoryKeyItemOnce(started(), "card-key").story;
    const opened = talk(withKey, "silph-card-door", { doorId: door.id });
    expect(
      resolveBlockedPlayerTileGate(opened.story, door.mapId, x, y),
    ).toBeNull();
  });
});

describe("Strength boulders", () => {
  it("push one tile when free, remembered per player", () => {
    const id = strengthBoulderId("victory-road-1f", 7, 18);
    const boulder = resolveScriptedWorldObjects("victory-road-1f").find(
      (object) => object.id === id,
    );
    expect(boulder?.pushable).toBe(true);

    const story = started();
    const home = { x: 7, y: 18 };
    expect(resolveBoulderPosition(story, id, home)).toEqual(home);

    const target = resolveBoulderPush(home, { x: 1, y: 0 }, () => true);
    expect(target).toEqual({ x: 8, y: 18 });
    expect(resolveBoulderPush(home, { x: 1, y: 0 }, () => false)).toBeNull();

    const moved = setBoulderPosition(story, id, target!);
    expect(resolveBoulderPosition(moved, id, home)).toEqual(target);
    expect(
      resolveBoulderPosition(resetBoulders(moved, [id]), id, home),
    ).toEqual(home);
  });
});

describe("static encounters", () => {
  it("places Snorlax, Zapdos and Articuno until they are beaten", () => {
    const species = STATIC_WORLD_ENCOUNTERS.map((entry) => entry.species);
    expect(species).toEqual(
      expect.arrayContaining(["snorlax", "zapdos", "articuno"]),
    );

    const snorlax = STATIC_WORLD_ENCOUNTERS.find(
      (entry) => entry.mapId === "route-12",
    )!;
    expect(snorlax.requiresKeyItem).toBe("poke-flute");
    const object = resolveScriptedWorldObjects("route-12").find(
      (entry) => entry.id === snorlax.id,
    );
    expect(object?.wildBattle?.staticId).toBe(snorlax.id);

    const text = (story: StoryState) =>
      talk(story, "static-pokemon", { staticId: snorlax.id }).presentation
        .pages[0].text;
    expect(text(started())).toContain("dorme");
    expect(
      text(grantStoryKeyItemOnce(started(), "poke-flute").story),
    ).toContain("Poké Flute");
  });
});

describe("generated cut trees", () => {
  it("cover the new mainland maps without duplicating hand-placed ones", () => {
    const celadon = resolveScriptedWorldObjects("celadon-city").filter(
      (object) => object.label === "Cut Tree",
    );
    expect(celadon.length).toBeGreaterThan(0);

    for (const mapId of ["viridian-city", "route-2", "vermilion-city"]) {
      const tiles = resolveScriptedWorldObjects(mapId)
        .filter((object) => object.label === "Cut Tree")
        .map((object) => `${object.x},${object.y}`);
      expect(new Set(tiles).size).toBe(tiles.length);
    }
  });
});

describe("Pokémon Mansion statue switches", () => {
  it("toggle the barriers between the two states", async () => {
    const { MANSION_BARRIERS } = await import(
      "../apps/client/lib/generated/worldObstacles"
    );
    const openInA = MANSION_BARRIERS.find((cell) => cell.openIn === "a")!;
    const openInB = MANSION_BARRIERS.find((cell) => cell.openIn === "b")!;
    const gateFor = (story: StoryState, cell: typeof openInA) =>
      resolveBlockedPlayerTileGate(story, cell.mapId, cell.x, cell.y);

    const initial = started();
    expect(gateFor(initial, openInA)).toBeNull();
    expect(gateFor(initial, openInB)).not.toBeNull();

    const pressed = talk(initial, "mansion-switch-press").story;
    expect(gateFor(pressed, openInA)).not.toBeNull();
    expect(gateFor(pressed, openInB)).toBeNull();

    const back = talk(pressed, "mansion-switch-press").story;
    expect(gateFor(back, openInA)).toBeNull();

    const prompt = talk(initial, "mansion-switch");
    expect(prompt.presentation.pages[0].choices).toHaveLength(2);
    expect(isWorldOpenCell(openInA.mapId, openInA.x, openInA.y)).toBe(true);
  });
});

describe("Cerulean Cave and Mewtwo", () => {
  it("opens only for the Champion", () => {
    const gate = (story: StoryState) =>
      resolveBlockedPlayerTileGate(story, "cerulean-city", 1, 12);
    expect(gate(started())).not.toBeNull();
    expect(
      gate(
        completeStoryPlayerEvent(
          started(),
          "trainer",
          "league-champion-blue-squirtle",
        ),
      ),
    ).toBeNull();
  });

  it("places Mewtwo at the bottom of the cave with a matching sprite sheet", () => {
    const mewtwo = STATIC_WORLD_ENCOUNTERS.find(
      (entry) => entry.species === "mewtwo",
    );
    expect(mewtwo?.mapId).toBe("cerulean-cave-b-1f");
    expect(mewtwo?.level).toBe(70);
    const object = resolveScriptedWorldObjects("cerulean-cave-b-1f").find(
      (entry) => entry.id === mewtwo?.id,
    );
    expect(object?.sheetWidth).toBe(96);
    expect(object?.wildBattle).toBeUndefined();
  });
});

describe("Silph Co. president and ball items", () => {
  it("hands over the Master Ball once Giovanni is beaten", () => {
    const before = talk(started(), "silph-president");
    expect(before.story.bagItems?.["master-ball"]).toBeUndefined();

    const beaten = completeStoryPlayerEvent(
      started(),
      "trainer",
      "silph-co-11f-giovanni",
    );
    const reward = talk(beaten, "silph-president");
    expect(reward.story.bagItems?.["master-ball"]).toBe(1);
    expect(talk(reward.story, "silph-president").story.bagItems?.["master-ball"]).toBe(1);
  });

  it("brings the Master Ball and Ultra Ball into battle", async () => {
    const { toBattleInventory } = await import("../apps/client/lib/itemUse");
    const story = {
      ...started(),
      bagItems: { "master-ball": 1, "ultra-ball": 2 },
    } as StoryState;
    const inventory = toBattleInventory(story);
    expect(inventory["master-ball"]).toBe(1);
    expect(inventory["ultra-ball"]).toBe(2);
  });
});

describe("Cinnabar Gym quiz", () => {
  it("opens the door only for the right answer", async () => {
    const { CINNABAR_QUIZ } = await import(
      "../apps/client/lib/generated/worldObstacles"
    );
    const { cinnabarDoorEventId, CINNABAR_QUIZ_QUESTIONS } = await import(
      "../apps/client/lib/cinnabarQuiz"
    );
    const quiz = CINNABAR_QUIZ[0];
    const [dx, dy] = quiz.door[0];
    const gate = (story: StoryState) =>
      resolveBlockedPlayerTileGate(story, quiz.mapId, dx, dy);
    expect(gate(started())).not.toBeNull();
    expect(isWorldOpenCell(quiz.mapId, dx, dy)).toBe(true);

    const right = CINNABAR_QUIZ_QUESTIONS[quiz.id].answer;
    const wrong = talk(started(), "cinnabar-quiz-answer", {
      quizId: quiz.id,
      answer: !right,
    } as never);
    expect(gate(wrong.story)).not.toBeNull();

    const correct = talk(started(), "cinnabar-quiz-answer", {
      quizId: quiz.id,
      answer: right,
    } as never);
    expect(gate(correct.story)).toBeNull();
    expect(
      hasStoryPlayerEvent(correct.story, "story", cinnabarDoorEventId(quiz.id)),
    ).toBe(true);

    const prompt = talk(started(), "cinnabar-quiz", { quizId: quiz.id } as never);
    expect(prompt.presentation.pages[0].choices).toHaveLength(2);
  });
});

describe("Rocket Hideout elevator", () => {
  it("needs the Lift Key and then offers the other floors", () => {
    const gate = resolveBlockedPlayerTileGate(
      started(),
      "rocket-hideout-b-1f",
      24,
      25,
    );
    expect(gate?.blockedRequest).toMatchObject({
      kind: "script",
      id: "rocket-elevator",
    });

    const locked = talk(started(), "rocket-elevator", { floor: "b1f" });
    expect(locked.presentation.pages[0].choices).toBeUndefined();

    const withKey = grantStoryKeyItemOnce(started(), "lift-key").story;
    const menu = talk(withKey, "rocket-elevator", { floor: "b1f" });
    const labels = menu.presentation.pages[0].choices!.map((c) => c.label);
    expect(labels).toEqual(["B2F", "B4F", "Ficar"]);
    expect(menu.presentation.pages[0].choices![1].request).toMatchObject({
      kind: "warp",
      mapId: "rocket-hideout-b-4f",
    });
  });
});

describe("legendary raids", () => {
  it("never start a solo battle; they announce the future MMO raid", () => {
    const raids = STATIC_WORLD_ENCOUNTERS.filter((entry) => entry.raid);
    expect(raids.map((entry) => entry.species).sort()).toEqual([
      "articuno",
      "mewtwo",
      "zapdos",
    ]);
    for (const raid of raids) {
      const object = resolveScriptedWorldObjects(raid.mapId).find(
        (entry) => entry.id === raid.id,
      );
      expect(object?.wildBattle).toBeUndefined();
      const text = talk(started(), "static-pokemon", { staticId: raid.id })
        .presentation.pages[0].text;
      expect(text).toContain("Raid");
    }
    // Snorlax stays a normal battle.
    expect(
      STATIC_WORLD_ENCOUNTERS.find((entry) => entry.species === "snorlax")?.raid,
    ).toBe(false);
  });
});
