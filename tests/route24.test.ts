import { describe, expect, it } from "vitest";
import {
  OVERWORLD_TRAINERS,
  ROUTE24_NUGGET_REWARD_ID,
  ROUTE24_ROCKET_TRAINER_ID,
  trainerPrizeMoney,
} from "../apps/client/lib/trainers";
import {
  collectStoryValuable,
  DEFAULT_STORY_STATE,
  normalizeStoryState,
} from "../apps/client/lib/story";
import {
  LAND_ENCOUNTERS,
  resolveLandEncounter,
} from "../apps/client/lib/wildEncounters";

describe("Route 24", () => {
  it("matches FireRed's 21 percent land encounter table", () => {
    expect(
      LAND_ENCOUNTERS["route-24"].encounterRate,
    ).toBe(21);

    expect(resolveLandEncounter("route-24", 0)).toEqual({
      species: "weedle",
      level: 7,
    });
    expect(resolveLandEncounter("route-24", 40)).toEqual({
      species: "pidgey",
      level: 11,
    });
    expect(resolveLandEncounter("route-24", 50)).toEqual({
      species: "oddish",
      level: 12,
    });
    expect(resolveLandEncounter("route-24", 70)).toEqual({
      species: "abra",
      level: 10,
    });
    expect(resolveLandEncounter("route-24", 94)).toEqual({
      species: "abra",
      level: 8,
    });
    expect(resolveLandEncounter("route-24", 99)).toEqual({
      species: "abra",
      level: 12,
    });
  });

  it("places the five Nugget Bridge trainers plus Shane", () => {
    const route24 = OVERWORLD_TRAINERS.filter(
      (trainer) => trainer.mapId === "route-24",
    );

    expect(route24).toHaveLength(7);
    expect(
      route24.map((trainer) => [
        trainer.id,
        trainer.preferredPosition,
        trainer.facing,
        trainer.sightRange,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["route24-cale", { x: 12, y: 31 }, "west", 2],
        ["route24-ali", { x: 10, y: 28 }, "east", 2],
        ["route24-timmy", { x: 12, y: 25 }, "west", 2],
        ["route24-reli", { x: 10, y: 22 }, "east", 2],
        ["route24-ethan", { x: 12, y: 19 }, "west", 2],
        ["route24-shane", { x: 5, y: 21 }, "north", 5],
        [ROUTE24_ROCKET_TRAINER_ID, { x: 12, y: 15 }, "west", 2],
      ]),
    );
  });

  it("uses the canonical Route 24 party levels", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(
      byId.get("route24-cale")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["caterpie", 10],
      ["weedle", 10],
      ["metapod", 10],
      ["kakuna", 10],
    ]);
    expect(
      byId.get("route24-ali")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["pidgey", 12],
      ["oddish", 12],
      ["bellsprout", 12],
    ]);
    expect(
      byId.get("route24-reli")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["nidoran-m", 16],
      ["nidoran-f", 16],
    ]);
    expect(
      byId.get("route24-ethan")?.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([["mankey", 18]]);
  });

  it("models the Mystery Trainer as FireRed's Grunt 6", () => {
    const rocket = OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.id === ROUTE24_ROCKET_TRAINER_ID,
    )!;

    expect(
      rocket.party.map(
        (pokemon) => [pokemon.species, pokemon.level],
      ),
    ).toEqual([
      ["ekans", 15],
      ["zubat", 15],
    ]);
    expect(
      trainerPrizeMoney(
        rocket.party,
        rocket.moneyMultiplier,
      ),
    ).toBe(480);
  });

  it("persists the Nugget prize exactly once", () => {
    const first = collectStoryValuable(
      DEFAULT_STORY_STATE,
      ROUTE24_NUGGET_REWARD_ID,
      "nugget",
    );

    expect(first.accepted).toBe(true);
    expect(first.story.valuables?.nugget).toBe(1);
    expect(
      first.story.collectedItemIds,
    ).toContain(ROUTE24_NUGGET_REWARD_ID);

    const second = collectStoryValuable(
      first.story,
      ROUTE24_NUGGET_REWARD_ID,
      "nugget",
    );
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("already-collected");
    expect(second.story.valuables?.nugget).toBe(1);

    expect(
      normalizeStoryState(first.story).valuables?.nugget,
    ).toBe(1);
  });

  it("uses FireRed trainer-class prize factors", () => {
    const byId = new Map(
      OVERWORLD_TRAINERS.map(
        (trainer) => [trainer.id, trainer],
      ),
    );

    expect(
      trainerPrizeMoney(
        byId.get("route24-cale")!.party,
        byId.get("route24-cale")!.moneyMultiplier,
      ),
    ).toBe(120);
    expect(
      trainerPrizeMoney(
        byId.get("route24-ali")!.party,
        byId.get("route24-ali")!.moneyMultiplier,
      ),
    ).toBe(192);
    expect(
      trainerPrizeMoney(
        byId.get("route24-timmy")!.party,
        byId.get("route24-timmy")!.moneyMultiplier,
      ),
    ).toBe(224);
    expect(
      trainerPrizeMoney(
        byId.get("route24-reli")!.party,
        byId.get("route24-reli")!.moneyMultiplier,
      ),
    ).toBe(256);
    expect(
      trainerPrizeMoney(
        byId.get("route24-ethan")!.party,
        byId.get("route24-ethan")!.moneyMultiplier,
      ),
    ).toBe(360);
    expect(
      trainerPrizeMoney(
        byId.get("route24-shane")!.party,
        byId.get("route24-shane")!.moneyMultiplier,
      ),
    ).toBe(280);
  });
});
