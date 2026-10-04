import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  createStarterProgression,
  experienceForNextLevel,
  experienceProgress,
  experienceRewardForWild,
  fireRedExperienceAtLevel,
  grantWildBattleProgress,
  grantWildBattleProgressToParty,
  normalizePokemonProgression,
  resolveMoveLearning,
} from "../src/progression";

describe("pokemon progression", () => {
  it("uses FireRed Medium Slow cumulative EXP for Kanto starters", () => {
    expect(fireRedExperienceAtLevel("bulbasaur", 1)).toBe(0);
    expect(fireRedExperienceAtLevel("bulbasaur", 5)).toBe(135);
    expect(fireRedExperienceAtLevel("charmander", 6)).toBe(179);
    expect(fireRedExperienceAtLevel("squirtle", 10)).toBe(560);
    expect(fireRedExperienceAtLevel("squirtle", 100)).toBe(1_059_860);

    expect(experienceForNextLevel(5, "charmander")).toBe(44);
    expect(experienceForNextLevel(10, "charmander")).toBe(182);
  });

  it("uses each captured species' FireRed growth rate", () => {
    expect(fireRedExperienceAtLevel("pidgey", 5)).toBe(135);
    expect(fireRedExperienceAtLevel("rattata", 5)).toBe(125);
    expect(experienceForNextLevel(5, "rattata")).toBe(91);

    const rattata = createPokemonProgression("rattata", 5);
    expect(rattata.experience).toBe(125);
    expect(rattata.activeMoves).toEqual(["tackle", "tail-whip"]);
  });

  it("splits wild EXP across every deployed party member", () => {
    const rewards = grantWildBattleProgressToParty(
      [
        createStarterProgression("bulbasaur"),
        createPokemonProgression("rattata", 5),
      ],
      {
        species: "pidgey",
        level: 5,
      },
    );

    expect(rewards).toHaveLength(2);
    expect(rewards[0].xpGained).toBe(19);
    expect(rewards[1].xpGained).toBe(19);
    expect(rewards[0].progression.experience).toBe(154);
    expect(rewards[1].progression.experience).toBe(144);
  });

  it("also splits partial capture XP across the deployed party", () => {
    const rewards = grantWildBattleProgressToParty(
      [
        createStarterProgression("bulbasaur"),
        createPokemonProgression("pidgey", 5),
      ],
      {
        species: "pidgey",
        level: 5,
      },
      0.5,
    );

    expect(rewards.map((reward) => reward.xpGained)).toEqual([9, 9]);
  });

  it("normalizes a captured Pokémon into persistent progression", () => {
    const pidgey = normalizePokemonProgression({
      species: "pidgey",
      level: 3,
    });

    expect(pidgey.experience).toBe(
      fireRedExperienceAtLevel("pidgey", 3),
    );
    expect(pidgey.activeMoves).toEqual(["tackle"]);
    expect(pidgey.evs.speed).toBe(0);
  });

  it("uses Generation III base EXP yields for Route 1 wild Pokémon", () => {
    expect(experienceRewardForWild("pidgey", 3)).toBe(23);
    expect(experienceRewardForWild("pidgey", 5)).toBe(39);
    expect(experienceRewardForWild("rattata", 3)).toBe(24);
    expect(experienceRewardForWild("rattata", 4)).toBe(32);
  });

  it("applies partial XP rewards from failed capture attempts", () => {
    const progression = createStarterProgression("bulbasaur");
    const reward = grantWildBattleProgress(
      progression,
      {
        species: "pidgey",
        level: 5,
      },
      0.5,
    );

    expect(reward.xpGained).toBe(19);
    expect(reward.progression.experience).toBe(154);
  });

  it("starts a level 5 starter at the FireRed cumulative EXP threshold", () => {
    const progression = createStarterProgression("charmander");
    const xp = experienceProgress(progression);

    expect(progression.experience).toBe(135);
    expect(xp.current).toBe(0);
    expect(xp.required).toBe(44);
  });

  it("gains levels and EV from repeated Route 1 wild victories", () => {
    let progression = createStarterProgression("charmander");

    const first = grantWildBattleProgress(progression, {
      species: "pidgey",
      level: 5,
    });
    progression = first.progression;

    expect(first.xpGained).toBe(39);
    expect(first.newLevel).toBe(5);

    const second = grantWildBattleProgress(progression, {
      species: "rattata",
      level: 4,
    });
    progression = second.progression;

    expect(second.xpGained).toBe(32);
    expect(second.newLevel).toBe(6);
    expect(
      Object.values(second.evGained).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBe(6);

    const third = grantWildBattleProgress(progression, {
      species: "pidgey",
      level: 3,
    });
    progression = third.progression;

    const fourth = grantWildBattleProgress(progression, {
      species: "rattata",
      level: 4,
    });

    expect(fourth.newLevel).toBe(7);
    expect(fourth.autoLearnedMoves).toEqual(["ember"]);
    expect(fourth.progression.activeMoves).toContain("ember");
  });

  it("migrates prototype per-level EXP into cumulative FireRed EXP", () => {
    const migrated = normalizePokemonProgression({
      ...createStarterProgression("bulbasaur"),
      level: 5,
      experience: 20,
    });

    expect(migrated.experience).toBe(142);
    expect(experienceProgress(migrated).current).toBe(7);
  });

  it("queues a replacement choice instead of changing four active moves", () => {
    const progression = {
      ...createStarterProgression("bulbasaur"),
      level: 10,
      experience:
        fireRedExperienceAtLevel("bulbasaur", 11) - 1,
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
      {
        species: "pidgey",
        level: 2,
      },
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
      experience: fireRedExperienceAtLevel("squirtle", 11),
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
});
