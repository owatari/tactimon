import { describe, expect, it } from "vitest";
import {
  SS_ANNE_RIVAL_TRAINER_ID,
  isSsAnneRivalTriggerAt,
  ssAnneRivalEncounter,
  ssAnneRivalParty,
} from "../apps/client/lib/trainers";

describe("S.S. Anne rival", () => {
  it("uses the three canonical 2F trigger tiles until Blue is beaten", () => {
    for (const x of [30, 31, 32]) {
      expect(
        isSsAnneRivalTriggerAt(
          "ss-anne-2f-corridor",
          x,
          6,
          [],
        ),
      ).toBe(true);
    }

    expect(
      isSsAnneRivalTriggerAt(
        "ss-anne-2f-corridor",
        30,
        5,
        [],
      ),
    ).toBe(false);
    expect(
      isSsAnneRivalTriggerAt(
        "ss-anne-2f-corridor",
        31,
        6,
        [SS_ANNE_RIVAL_TRAINER_ID],
      ),
    ).toBe(false);
  });

  it("builds the FireRed party from the rival starter", () => {
    expect(
      ssAnneRivalParty("squirtle"),
    ).toEqual([
      {
        species: "pidgeotto",
        level: 19,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "raticate",
        level: 16,
        moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
      },
      {
        species: "kadabra",
        level: 18,
        moves: ["teleport", "kinesis", "confusion", "disable"],
      },
      {
        species: "wartortle",
        level: 20,
        moves: ["bubble", "withdraw", "water-gun", "bite"],
      },
    ]);

    expect(
      ssAnneRivalParty("bulbasaur")?.[3],
    ).toMatchObject({
      species: "ivysaur",
      level: 20,
    });
    expect(
      ssAnneRivalParty("charmander")?.[3],
    ).toMatchObject({
      species: "charmeleon",
      level: 20,
    });
  });

  it("uses FireRed's Rival Late prize factor", () => {
    expect(
      ssAnneRivalEncounter("charmander"),
    ).toMatchObject({
      id: SS_ANNE_RIVAL_TRAINER_ID,
      name: "Blue",
      rewardMoney: 720,
    });
  });
});
