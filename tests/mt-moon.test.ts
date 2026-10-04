import { describe, expect, it } from "vitest";
import { resolveWarpTransitionAt, WORLD_MAPS } from "../apps/client/lib/maps";
import { LAND_ENCOUNTERS, resolveLandEncounter } from "../apps/client/lib/wildEncounters";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";

describe("Mt. Moon", () => {
  it("registers all three extracted cave floors", () => {
    expect(WORLD_MAPS["mt-moon-1f"]).toMatchObject({ label: "Mt. Moon 1F", fallbackMusicId: 288 });
    expect(WORLD_MAPS["mt-moon-b1f"]).toMatchObject({ label: "Mt. Moon B1F", fallbackMusicId: 288 });
    expect(WORLD_MAPS["mt-moon-b2f"]).toMatchObject({ label: "Mt. Moon B2F", fallbackMusicId: 288 });
  });

  it("connects Route 4 to both canonical cave exits", () => {
    expect(resolveWarpTransitionAt("route-4", 19, 5)).toEqual({
      mapId: "mt-moon-1f", spawn: { x: 18, y: 37 },
    });
    expect(resolveWarpTransitionAt("mt-moon-1f", 18, 37)).toEqual({
      mapId: "route-4", spawn: { x: 19, y: 5 },
    });
    expect(resolveWarpTransitionAt("mt-moon-b1f", 45, 4)).toEqual({
      mapId: "route-4", spawn: { x: 32, y: 5 },
    });
  });

  it("preserves representative 1F/B1F/B2F stairs", () => {
    expect(resolveWarpTransitionAt("mt-moon-1f", 5, 6)).toEqual({
      mapId: "mt-moon-b1f", spawn: { x: 3, y: 3 },
    });
    expect(resolveWarpTransitionAt("mt-moon-b1f", 22, 18)).toEqual({
      mapId: "mt-moon-b2f", spawn: { x: 25, y: 21 },
    });
    expect(resolveWarpTransitionAt("mt-moon-b2f", 5, 10)).toEqual({
      mapId: "mt-moon-b1f", spawn: { x: 39, y: 4 },
    });
  });

  it("uses cave terrain and canonical encounter rates", () => {
    expect(LAND_ENCOUNTERS["mt-moon-1f"]).toMatchObject({ encounterRate: 7, terrain: "cave" });
    expect(LAND_ENCOUNTERS["mt-moon-b1f"]).toMatchObject({ encounterRate: 5, terrain: "cave" });
    expect(LAND_ENCOUNTERS["mt-moon-b2f"]).toMatchObject({ encounterRate: 7, terrain: "cave" });
    expect(resolveLandEncounter("mt-moon-1f", 85)).toEqual({ species: "paras", level: 8 });
    expect(resolveLandEncounter("mt-moon-1f", 99)).toEqual({ species: "clefairy", level: 8 });
    expect(resolveLandEncounter("mt-moon-b1f", 0)).toEqual({ species: "paras", level: 7 });
    expect(resolveLandEncounter("mt-moon-b2f", 99)).toEqual({ species: "clefairy", level: 12 });
  });
  it("places all canonical B2F Rocket and fossil trainers", () => {
    const trainers = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "mt-moon-b2f",
    );

    expect(trainers).toHaveLength(5);
    expect(
      trainers.map((trainer) => [
        trainer.id,
        trainer.preferredPosition,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["mtmoon-rocket-grunt-1", { x: 12, y: 20 }],
        ["mtmoon-rocket-grunt-2", { x: 18, y: 27 }],
        ["mtmoon-rocket-grunt-3", { x: 35, y: 12 }],
        ["mtmoon-rocket-grunt-4", { x: 37, y: 21 }],
        ["mtmoon-miguel", { x: 13, y: 11 }],
      ]),
    );

    expect(
      trainers.find((trainer) => trainer.id === "mtmoon-rocket-grunt-2")?.party,
    ).toHaveLength(3);
    expect(
      trainers.find((trainer) => trainer.id === "mtmoon-miguel")?.party.map(
        (pokemon) => pokemon.species,
      ),
    ).toEqual(["grimer", "voltorb", "koffing"]);
  });

  it("places the supported canonical 1F trainers at ROM coordinates", () => {
    // Trainer content that needs Magnemite/Voltorb and Oddish/Bellsprout
    // is intentionally added when those species enter the engine.
    const trainers = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "mt-moon-1f",
    );
    expect(trainers.map((trainer) => trainer.id)).toEqual(
      expect.arrayContaining([
        "mtmoon-iris",
        "mtmoon-robby",
        "mtmoon-kent",
        "mtmoon-josh",
        "mtmoon-marcos",
      ]),
    );
    expect(trainers.find((trainer) => trainer.id === "mtmoon-josh")?.party).toHaveLength(3);
    expect(trainers.find((trainer) => trainer.id === "mtmoon-marcos")?.party).toHaveLength(3);
  });
});
