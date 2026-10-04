import {
  calculateDuelPokemonMaxHp,
  DUEL_MOVES,
} from "../src/duel";
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


describe("persistent move PP", () => {
  it("migrates old saves without PP to full PP", () => {
    const migrated = normalizePokemonProgression({
      species: "pikachu",
      level: 5,
      activeMoves: ["thunder-shock", "growl"],
    });

    expect(migrated.movePp["thunder-shock"]).toBe(
      DUEL_MOVES["thunder-shock"].maxPp,
    );
    expect(migrated.movePp.growl).toBe(
      DUEL_MOVES.growl.maxPp,
    );
  });

  it("preserves spent PP while normalizing progression", () => {
    const migrated = normalizePokemonProgression({
      species: "bulbasaur",
      level: 5,
      activeMoves: ["tackle", "growl"],
      movePp: { tackle: 3, growl: 0 },
    });

    expect(migrated.movePp.tackle).toBe(3);
    expect(migrated.movePp.growl).toBe(0);
  });

  it("gives a newly learned move full PP", () => {
    const progression = createStarterProgression("bulbasaur");
    progression.activeMoves = [
      "tackle",
      "growl",
      "vine-whip",
      "razor-leaf",
    ];
    progression.movePp.tackle = 1;

    const next = resolveMoveLearning(
      progression,
      "seed-bomb",
      1,
    );

    expect(next.movePp["seed-bomb"]).toBe(
      DUEL_MOVES["seed-bomb"].maxPp,
    );
    expect(next.movePp.tackle).toBe(1);
  });
});


describe("Route 3 species progression", () => {
  it("uses FireRed growth groups and base EXP for the new encounters", () => {
    expect(
      fireRedExperienceAtLevel("jigglypuff", 5),
    ).toBe(100);
    expect(
      fireRedExperienceAtLevel("nidoran-f", 5),
    ).toBe(135);
    expect(
      fireRedExperienceAtLevel("nidoran-m", 5),
    ).toBe(135);
    expect(
      fireRedExperienceAtLevel("ekans", 5),
    ).toBe(125);

    expect(
      experienceRewardForWild("jigglypuff", 5),
    ).toBe(54);
    expect(
      experienceRewardForWild("nidoran-f", 6),
    ).toBe(50);
    expect(
      experienceRewardForWild("nidoran-m", 6),
    ).toBe(51);
  });

  it("creates the Route 3 species with playable early moves", () => {
    expect(
      createPokemonProgression("nidoran-f", 6).activeMoves,
    ).toEqual(["scratch", "growl"]);
    expect(
      createPokemonProgression("nidoran-m", 6).activeMoves,
    ).toEqual(["peck", "leer"]);
    expect(
      createPokemonProgression("ekans", 11).activeMoves,
    ).toEqual(["bind", "leer", "poison-sting"]);
    expect(
      createPokemonProgression("jigglypuff", 5).activeMoves,
    ).toEqual(["pound", "defense-curl"]);
  });
});


describe("Mt. Moon species progression", () => {
  it("uses FireRed growth and base EXP for cave encounters", () => {
    expect(fireRedExperienceAtLevel("zubat", 8)).toBe(512);
    expect(fireRedExperienceAtLevel("paras", 8)).toBe(512);
    expect(fireRedExperienceAtLevel("clefairy", 8)).toBe(409);
    expect(experienceRewardForWild("zubat", 8)).toBe(61);
    expect(experienceRewardForWild("paras", 8)).toBe(80);
    expect(experienceRewardForWild("clefairy", 8)).toBe(77);
  });

  it("creates playable early cave movesets", () => {
    expect(createPokemonProgression("zubat", 8).activeMoves).toEqual(["astonish"]);
    expect(createPokemonProgression("paras", 8).activeMoves).toEqual([
      "scratch",
      "stun-spore",
    ]);
    expect(createPokemonProgression("clefairy", 8).activeMoves).toEqual(["pound", "growl"]);
  });
});


describe("Mt. Moon trainer species", () => {
  it("uses FireRed stats progression inputs for Rocket and Miguel species", () => {
    expect(createPokemonProgression("sandshrew", 11).activeMoves).toEqual([
      "scratch",
      "defense-curl",
    ]);
    expect(createPokemonProgression("grimer", 12).activeMoves).toEqual([
      "pound",
      "harden",
    ]);
    expect(createPokemonProgression("voltorb", 12).activeMoves).toEqual([
      "tackle",
    ]);
    expect(createPokemonProgression("koffing", 12).activeMoves).toEqual([
      "tackle",
    ]);

    expect(experienceRewardForTrainer("sandshrew", 11, 1)).toBe(219);
    expect(experienceRewardForTrainer("grimer", 12, 1)).toBe(231);
    expect(experienceRewardForTrainer("voltorb", 12, 1)).toBe(264);
    expect(experienceRewardForTrainer("koffing", 12, 1)).toBe(292);
  });
});


describe("Route 4 Crissy species", () => {
  it("supports Parasect with FireRed growth, EXP, PP and usable powder moves", () => {
    expect(fireRedExperienceAtLevel("parasect", 31)).toBe(29_791);
    expect(experienceRewardForTrainer("parasect", 31, 1)).toBe(849);

    expect(createPokemonProgression("paras", 31).activeMoves).toEqual([
      "scratch",
      "stun-spore",
      "poison-powder",
    ]);
    expect(createPokemonProgression("parasect", 31).activeMoves).toEqual([
      "scratch",
      "stun-spore",
      "poison-powder",
    ]);

    expect(DUEL_MOVES["stun-spore"]).toMatchObject({
      maxPp: 30,
      minRange: 1,
      secondaryStatus: "paralysis",
      secondaryEffectChance: 75,
    });
    expect(DUEL_MOVES["poison-powder"]).toMatchObject({
      maxPp: 35,
      minRange: 1,
      secondaryStatus: "poison",
      secondaryEffectChance: 75,
    });
  });
});


describe("Cerulean Gym trainer species", () => {
  it("uses FireRed growth groups and trainer EXP yields", () => {
    expect(fireRedExperienceAtLevel("horsea", 16)).toBe(4_096);
    expect(fireRedExperienceAtLevel("shellder", 16)).toBe(5_120);
    expect(fireRedExperienceAtLevel("goldeen", 19)).toBe(6_859);
    expect(fireRedExperienceAtLevel("staryu", 18)).toBe(7_290);
    expect(fireRedExperienceAtLevel("starmie", 21)).toBe(11_576);

    expect(experienceRewardForTrainer("horsea", 16, 1)).toBe(283);
    expect(experienceRewardForTrainer("shellder", 16, 1)).toBe(331);
    expect(experienceRewardForTrainer("goldeen", 19, 1)).toBe(451);
    expect(experienceRewardForTrainer("staryu", 18, 1)).toBe(408);
    expect(experienceRewardForTrainer("starmie", 21, 1)).toBe(931);
  });

  it("creates playable FireRed-derived move sets", () => {
    expect(createPokemonProgression("horsea", 16).activeMoves).toEqual([
      "bubble",
      "leer",
    ]);
    expect(createPokemonProgression("shellder", 16).activeMoves).toEqual([
      "tackle",
      "icicle-spear",
    ]);
    expect(createPokemonProgression("goldeen", 19).activeMoves).toEqual([
      "peck",
      "tail-whip",
      "horn-attack",
    ]);
    expect(createPokemonProgression("starmie", 21).activeMoves).toEqual([
      "water-gun",
      "rapid-spin",
      "recover",
      "swift",
    ]);
  });
});


describe("Cerulean rival species", () => {
  it("uses FireRed growth and EXP for Pidgeotto and Abra", () => {
    expect(fireRedExperienceAtLevel("pidgeotto", 17)).toBe(3_120);
    expect(fireRedExperienceAtLevel("abra", 16)).toBe(2_535);
    expect(experienceRewardForTrainer("pidgeotto", 17, 1)).toBe(411);
    expect(experienceRewardForTrainer("abra", 16, 1)).toBe(249);
  });

  it("creates their canonical early move sets", () => {
    expect(createPokemonProgression("pidgeotto", 17).activeMoves).toEqual([
      "tackle",
      "sand-attack",
      "gust",
      "quick-attack",
    ]);
    expect(createPokemonProgression("abra", 16).activeMoves).toEqual([
      "teleport",
    ]);
  });
});


describe("Route 24 species progression", () => {
  it("uses FireRed growth and EXP inputs for Oddish and Bellsprout", () => {
    expect(fireRedExperienceAtLevel("oddish", 12)).toBe(973);
    expect(fireRedExperienceAtLevel("bellsprout", 12)).toBe(973);
    expect(experienceRewardForTrainer("oddish", 12, 1)).toBe(199);
    expect(experienceRewardForTrainer("bellsprout", 12, 1)).toBe(216);
  });

  it("creates their early playable move sets", () => {
    expect(createPokemonProgression("oddish", 12).activeMoves).toEqual([
      "absorb",
      "sweet-scent",
    ]);
    expect(createPokemonProgression("bellsprout", 12).activeMoves).toEqual([
      "vine-whip",
      "growth",
      "wrap",
    ]);
  });
});


describe("Route 25 trainer species", () => {
  it("uses FireRed growth groups and base EXP for Machop and Slowpoke", () => {
    expect(fireRedExperienceAtLevel("machop", 15)).toBe(2_035);
    expect(fireRedExperienceAtLevel("slowpoke", 17)).toBe(4_913);
    expect(experienceRewardForTrainer("machop", 15, 1)).toBe(282);
    expect(experienceRewardForTrainer("slowpoke", 17, 1)).toBe(360);
  });

  it("creates playable Route 25 trainer move sets", () => {
    expect(createPokemonProgression("machop", 15).activeMoves).toEqual([
      "low-kick",
      "leer",
      "focus-energy",
      "karate-chop",
    ]);
    expect(createPokemonProgression("slowpoke", 17).activeMoves).toEqual([
      "tackle",
      "growl",
      "water-gun",
      "confusion",
    ]);
  });
});


describe("Cerulean Rocket and Route 5 species", () => {
  it("uses FireRed progression inputs for Drowzee and Meowth", () => {
    expect(fireRedExperienceAtLevel("drowzee", 17)).toBe(4_913);
    expect(fireRedExperienceAtLevel("meowth", 10)).toBe(1_000);
    expect(experienceRewardForTrainer("drowzee", 17, 1)).toBe(370);
    expect(experienceRewardForWild("meowth", 10)).toBe(98);
  });

  it("creates the relevant FireRed move sets", () => {
    expect(createPokemonProgression("drowzee", 17).activeMoves).toEqual([
      "hypnosis",
      "disable",
      "confusion",
      "headbutt",
    ]);
    expect(createPokemonProgression("meowth", 10).activeMoves).toEqual([
      "scratch",
      "growl",
      "bite",
    ]);
  });
});


describe("Route 6 trainer species", () => {
  it("uses FireRed progression inputs for Butterfree and Raticate", () => {
    expect(fireRedExperienceAtLevel("butterfree", 20)).toBe(8_000);
    expect(fireRedExperienceAtLevel("raticate", 16)).toBe(4_096);
    expect(experienceRewardForTrainer("butterfree", 20, 1)).toBe(685);
    expect(experienceRewardForTrainer("raticate", 16, 1)).toBe(397);
  });

  it("creates their FireRed trainer move sets", () => {
    expect(createPokemonProgression("butterfree", 20).activeMoves).toEqual([
      "poison-powder",
      "stun-spore",
      "sleep-powder",
      "supersonic",
    ]);
    expect(createPokemonProgression("raticate", 16).activeMoves).toEqual([
      "tackle",
      "tail-whip",
      "quick-attack",
      "hyper-fang",
    ]);
  });
});
