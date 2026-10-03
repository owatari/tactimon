import { describe, expect, it } from "vitest";
import {
  createStarterProgression,
  experienceForNextLevel,
  grantWildBattleProgress,
  resolveMoveLearning,
} from "../src/progression";

describe("pokemon progression", () => {
  it("gains levels and EV from wild victories", () => {
    let progression = createStarterProgression("charmander");

    const first = grantWildBattleProgress(progression, 4);
    progression = first.progression;

    expect(first.xpGained).toBe(128);
    expect(first.newLevel).toBe(6);
    expect(
      Object.values(first.evGained).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBe(6);

    const second = grantWildBattleProgress(progression, 4);

    expect(second.newLevel).toBe(7);
    expect(second.autoLearnedMoves).toEqual(["ember"]);
    expect(second.progression.activeMoves).toContain("ember");
  });

  it("queues a replacement choice instead of changing four active moves", () => {
    const progression = {
      ...createStarterProgression("bulbasaur"),
      level: 10,
      experience: 0,
      activeMoves: [
        "tackle",
        "growl",
        "vine-whip",
        "razor-leaf",
      ] as const,
    };

    const reward = grantWildBattleProgress(
      {
        ...progression,
        activeMoves: [...progression.activeMoves],
      },
      7,
    );

    expect(reward.newLevel).toBe(11);
    expect(reward.pendingMoves).toEqual(["seed-bomb"]);
    expect(reward.progression.activeMoves).toEqual([
      "tackle",
      "growl",
      "vine-whip",
      "razor-leaf",
    ]);
  });

  it("replaces only the selected slot when learning a pending move", () => {
    const progression = {
      ...createStarterProgression("squirtle"),
      level: 11,
      activeMoves: [
        "tackle",
        "tail-whip",
        "water-gun",
        "bite",
      ] as const,
    };

    const next = resolveMoveLearning(
      {
        ...progression,
        activeMoves: [...progression.activeMoves],
      },
      "aqua-jet",
      1,
    );

    expect(next.activeMoves).toEqual([
      "tackle",
      "aqua-jet",
      "water-gun",
      "bite",
    ]);
  });

  it("can decline a new move without changing the active set", () => {
    const progression = createStarterProgression("bulbasaur");
    progression.activeMoves = [
      "tackle",
      "growl",
      "vine-whip",
      "razor-leaf",
    ];

    const next = resolveMoveLearning(
      progression,
      "seed-bomb",
      null,
    );

    expect(next.activeMoves).toEqual(progression.activeMoves);
  });

  it("uses a predictable next-level XP curve", () => {
    expect(experienceForNextLevel(5)).toBe(115);
    expect(experienceForNextLevel(10)).toBe(190);
  });
});
