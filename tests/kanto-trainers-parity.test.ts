import { describe, expect, it } from "vitest";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";
import { DUEL_MOVES } from "../packages/battle-engine/src";

describe("Kanto trainers", () => {
  it("keeps unique ids on known maps with legal moves", () => {
    const ids = OVERWORLD_TRAINERS.map((trainer) => trainer.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const trainer of OVERWORLD_TRAINERS) {
      expect(Object.keys(WORLD_MAPS), trainer.id).toContain(trainer.mapId);
      for (const mon of trainer.party) {
        for (const move of mon.moves ?? []) {
          expect(DUEL_MOVES, `${trainer.id}:${mon.species}`).toHaveProperty(move);
        }
      }
    }
  });

  it("places the S.S. Anne, Mt. Moon and Pewter Gym trainers from FireRed", () => {
    const count = (mapId: string) =>
      OVERWORLD_TRAINERS.filter((trainer) => trainer.mapId === mapId).length;
    expect(count("ss-anne-deck")).toBe(2);
    expect(count("ss-anne-b1f-room-4")).toBe(2);
    expect(count("mt-moon-1f")).toBe(7);
    expect(count("pewter-gym")).toBe(2);
  });
});

describe("generated Kanto trainers", () => {
  it("awards every remaining badge from its gym leader", () => {
    const badges = new Map(
      OVERWORLD_TRAINERS.filter((t) => t.badgeId).map((t) => [t.badgeId, t.id]),
    );
    for (const badge of ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"]) {
      expect(badges.has(badge as never), badge).toBe(true);
    }
    expect(badges.get("earth" as never)).toBe("viridian-city-gym-giovanni");
  });

  it("covers the Elite Four rooms and Victory Road", () => {
    const maps = new Set(OVERWORLD_TRAINERS.map((t) => t.mapId));
    for (const id of [
      "pokemon-league-loreleis-room",
      "pokemon-league-lances-room",
      "victory-road-1f",
      "silph-co-5f",
      "pokemon-tower-6f",
      "rocket-hideout-b-1f",
    ]) {
      expect(maps.has(id), id).toBe(true);
    }
  });
});

describe("Champion and League gates", () => {
  it("shows only the Champion variant that matches the rival's starter", async () => {
    const { resolvePlayerOverworldTrainers } = await import("../apps/client/lib/trainers");
    const { normalizeStoryState } = await import("../apps/client/lib/story");
    const story = normalizeStoryState({ starter: "bulbasaur" });
    expect(story.rivalStarter).toBe("charmander");
    const layout = { width: 12, height: 12, cells: Array.from({ length: 144 }, () => ({ raw: 0, metatile: 1, collision: 0, elevation: 0 })) } as never;
    const visible = resolvePlayerOverworldTrainers("pokemon-league-champions-room", layout, [], story);
    expect(visible.map((t) => t.id)).toEqual(["league-champion-blue-charmander"]);
    expect(visible[0].party).toHaveLength(6);
    expect(visible[0].party.map((p) => p.species)).toContain("charizard");
  });

  it("keeps each League door locked until its member is beaten", async () => {
    const { resolveBlockedPlayerTileGate } = await import("../apps/client/lib/playerWorldGates");
    const { normalizeStoryState, completeStoryPlayerEvent } = await import("../apps/client/lib/story");
    const story = normalizeStoryState({ starter: "bulbasaur" });
    expect(resolveBlockedPlayerTileGate(story, "pokemon-league-loreleis-room", 6, 2)?.id).toBe("gate:pokemon-league-loreleis-room-exit");
    const beaten = completeStoryPlayerEvent(story, "trainer", "pokemon-league-loreleis-room-lorelei");
    expect(resolveBlockedPlayerTileGate(beaten, "pokemon-league-loreleis-room", 6, 2)).toBeNull();
  });
});
