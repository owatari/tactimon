import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { isDarkMap } from "../apps/client/lib/darkCaves";
import { buildBagPockets } from "../apps/client/lib/gameMenu";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import {
  TOWN_MAP_ENTRIES,
  checkFlyDestination,
  hasVisitedTown,
  isTownMapLocation,
  registerTownVisit,
  townMapRows,
} from "../apps/client/lib/townMap";
import {
  grantStoryBadge,
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

function player(): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
  });
}

describe("Town Map", () => {
  it("every Fly destination is a real map", () => {
    for (const entry of TOWN_MAP_ENTRIES) {
      expect(WORLD_MAPS[entry.mapId], entry.mapId).toBeDefined();
    }
  });

  it("records visits once and only for towns", () => {
    const story = player();
    expect(hasVisitedTown(story, "pewter-city")).toBe(false);

    const visited = registerTownVisit(story, "pewter-city");
    expect(hasVisitedTown(visited, "pewter-city")).toBe(true);
    expect(registerTownVisit(visited, "pewter-city")).toBe(visited);
    expect(registerTownVisit(story, "route-1")).toBe(story);
    expect(isTownMapLocation("route-1")).toBe(false);
  });

  it("lists Pallet as home and marks visited towns", () => {
    const rows = townMapRows(registerTownVisit(player(), "cerulean-city"));
    expect(rows.find((row) => row.id === "pallet")?.visited).toBe(true);
    expect(rows.find((row) => row.id === "cerulean")?.visited).toBe(true);
    expect(rows.find((row) => row.id === "saffron")?.visited).toBe(false);
  });

  it("Fly needs the HM, the Thunder Badge and a visited destination", () => {
    let story = registerTownVisit(player(), "vermilion-city");
    expect(checkFlyDestination(story, "vermilion")).toMatchObject({
      ok: false,
      reason: "no-fly",
    });

    story = grantStoryFieldTechniqueOnce(story, "fly").story;
    story = grantStoryBadge(story, "thunder");
    expect(checkFlyDestination(story, "vermilion").ok).toBe(true);
    expect(checkFlyDestination(story, "saffron")).toMatchObject({
      ok: false,
      reason: "not-visited",
    });
    expect(checkFlyDestination(story, "nowhere")).toMatchObject({
      reason: "unknown",
    });
  });

  it("the Town Map key item opens the map screen from the Bag", () => {
    const story = grantStoryKeyItemOnce(player(), "town-map").story;
    const key = buildBagPockets(story).find((pocket) => pocket.id === "key")!;
    expect(key.entries.find((entry) => entry.id === "town-map")?.usable).toBe(
      true,
    );
  });
});

describe("dark caves", () => {
  it("only the Rock Tunnel needs Flash", () => {
    expect(isDarkMap("rock-tunnel-1f")).toBe(true);
    expect(isDarkMap("rock-tunnel-b-1f")).toBe(true);
    expect(isDarkMap("mt-moon-1f")).toBe(false);
    expect(WORLD_MAPS["rock-tunnel-1f"]).toBeDefined();
  });
});
