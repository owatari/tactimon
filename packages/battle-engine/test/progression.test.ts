import { calculateDuelPokemonMaxHp } from "../src/duel";
import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  createStarterProgression,
  experienceForNextLevel,
  experienceProgress,
  experienceRewardForTrainer,
  experienceRewardForWild,
  fireRedExperienceAtLevel,
  grantTrainerBattleProgressToParty,
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

  it("applies FireRed trainer EXP after participant division", () => {
    expect(
      experienceRewardForTrainer(
        "charmander",
        5,
        1,
      ),
    ).toBe(69);
    expect(
      experienceRewardForTrainer(
        "pidgey",
        4,
        2,
      ),
    ).toBe(22);
    expect(
      experienceRewardForTrainer(
        "rattata",
        4,
        2,
      ),
    ).toBe(24);
  });

  it("rewards every deployed party member for each defeated trainer Pokémon", () => {
    const rewards =
      grantTrainerBattleProgressToParty(
        [
          createStarterProgression("bulbasaur"),
          createPokemonProgression("rattata", 5),
        ],
        [
          {
            species: "pidgey",
            level: 4,
          },
          {
            species: "rattata",
            level: 4,
          },
        ],
      );

    expect(rewards).toHaveLength(2);
    expect(
      rewards.map((reward) => reward.xpGained),
    ).toEqual([46, 46]);
    expect(rewards[0].newLevel).toBe(6);
    expect(rewards[1].newLevel).toBe(5);
  });

  it("awards trainer EXP for a defeated rival starter", () => {
    const [reward] =
      grantTrainerBattleProgressToParty(
        [
          createStarterProgression("bulbasaur"),
        ],
        [
          {
            species: "charmander",
            level: 5,
          },
        ],
      );

    expect(reward.xpGained).toBe(69);
    expect(reward.newLevel).toBe(6);
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


describe("persistent progression health", () => {
  it("migrates old saves without HP to full health", () => {
    const migrated = normalizePokemonProgression({
      species: "pidgey",
      level: 3,
    });

    expect(migrated.currentHp).toBe(
      calculateDuelPokemonMaxHp(migrated),
    );
  });

  it("preserves damage when a Pokémon levels up", () => {
    const base = createStarterProgression("charmander");
    const oldMaxHp = calculateDuelPokemonMaxHp(base);
    const damaged = {
      ...base,
      experience:
        fireRedExperienceAtLevel("charmander", 6) - 1,
      currentHp: oldMaxHp - 5,
    };

    const reward = grantWildBattleProgress(
      damaged,
      {
        species: "pidgey",
        level: 2,
      },
    );
    const newMaxHp = calculateDuelPokemonMaxHp(
      reward.progression,
    );

    expect(reward.newLevel).toBe(6);
    expect(reward.progression.currentHp).toBe(
      newMaxHp - 5,
    );
  });
});


describe("Route 2 species progression", () => {
  it("uses Medium Fast growth and FireRed moves for Caterpie", () => {
    const caterpie = createPokemonProgression("caterpie", 4);
    expect(caterpie.experience).toBe(64);
    expect(caterpie.activeMoves).toEqual([
      "tackle",
      "string-shot",
    ]);
  });

  it("uses FireRed moves for Weedle", () => {
    const weedle = createPokemonProgression("weedle", 4);
    expect(weedle.experience).toBe(64);
    expect(weedle.activeMoves).toEqual([
      "poison-sting",
      "string-shot",
    ]);
  });

  it("uses Generation III base EXP yields for the Route 2 bugs", () => {
    expect(experienceRewardForWild("caterpie", 4)).toBe(30);
    expect(experienceRewardForWild("weedle", 4)).toBe(29);
  });
});


describe("Route 22 species progression", () => {
  it("uses FireRed Medium Fast growth and initial moves", () => {
    const spearow = createPokemonProgression("spearow", 5);
    const mankey = createPokemonProgression("mankey", 5);

    expect(spearow.experience).toBe(125);
    expect(spearow.activeMoves).toEqual(["peck", "growl"]);
    expect(mankey.experience).toBe(125);
    expect(mankey.activeMoves).toEqual(["scratch", "leer"]);
  });

  it("uses Generation III base EXP yields", () => {
    expect(experienceRewardForWild("spearow", 5)).toBe(41);
    expect(experienceRewardForWild("mankey", 5)).toBe(52);
  });
});


describe("Viridian Forest species progression", () => {
  it("uses FireRed starting moves for the forest encounters", () => {
    expect(
      createPokemonProgression("metapod", 5).activeMoves,
    ).toEqual(["harden"]);
    expect(
      createPokemonProgression("kakuna", 5).activeMoves,
    ).toEqual(["harden"]);
    expect(
      createPokemonProgression("pikachu", 5).activeMoves,
    ).toEqual(["thunder-shock", "growl"]);
  });

  it("uses Generation III base EXP yields", () => {
    expect(experienceRewardForWild("metapod", 5)).toBe(51);
    expect(experienceRewardForWild("kakuna", 5)).toBe(50);
    expect(experienceRewardForWild("pikachu", 5)).toBe(58);
  });
});
