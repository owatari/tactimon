import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createStarterProgression,
  createWildDuel,
  fireRedExperienceAtLevel,
  grantWildBattleProgress,
  normalizePokemonProgression,
} from "../packages/battle-engine/src";
import {
  applyStoryOverworldStep,
  chooseStarter,
  healStoryParty,
  normalizeStoryState,
} from "../apps/client/lib/story";

describe("persistent Poison status", () => {
  it("migrates old saves cleanly and preserves Poison through progression", () => {
    expect(
      normalizePokemonProgression({
        species: "pidgey",
        level: 3,
      }).status,
    ).toBeNull();

    const base = createStarterProgression("charmander");
    const reward = grantWildBattleProgress(
      {
        ...base,
        status: "poison",
        experience:
          fireRedExperienceAtLevel("charmander", 6) - 1,
      },
      {
        species: "pidgey",
        level: 2,
      },
    );

    expect(reward.progression.status).toBe("poison");
  });

  it("deals FireRed Poison damage at the end of the poisoned unit turn", () => {
    let state = createWildDuel({
      seed: 940,
      player: {
        species: "pidgey",
        level: 5,
        moves: ["tackle"],
        currentHp: 12,
        status: "poison",
      },
      wildSpecies: "caterpie",
      wildLevel: 4,
    });
    const player = state.units.find(
      (unit) => unit.side === "player",
    )!;
    const wild = state.units.find(
      (unit) => unit.side === "rival",
    )!;
    state = {
      ...state,
      activeUnitId: player.id,
      turnOrder: [player.id, wild.id],
      turnIndex: 0,
    };

    const beforeHp = player.hp;
    const poisonDamage = Math.max(
      1,
      Math.floor(player.maxHp / 8),
    );
    const result = applyDuelAction(state, {
      kind: "end-turn",
      unitId: player.id,
    });
    const after = result.state.units.find(
      (unit) => unit.id === player.id,
    )!;

    expect(result.accepted).toBe(true);
    expect(after.status).toBe("poison");
    expect(after.hp).toBe(
      Math.max(0, beforeHp - poisonDamage),
    );
  });

  it("lets Poison Sting inflict Poison while Poison species stay immune", () => {
    let poisoned = false;

    for (let seed = 1; seed <= 64; seed += 1) {
      let state = createWildDuel({
        seed,
        player: {
          species: "weedle",
          level: 5,
          moves: ["poison-sting"],
        },
        wildSpecies: "caterpie",
        wildLevel: 5,
      });
      const player = state.units.find(
        (unit) => unit.side === "player",
      )!;
      const wild = state.units.find(
        (unit) => unit.side === "rival",
      )!;
      player.position = { x: 2, y: 2 };
      wild.position = { x: 3, y: 2 };
      state = { ...state, activeUnitId: player.id };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "poison-sting",
        targetId: wild.id,
      });
      const after = result.state.units.find(
        (unit) => unit.id === wild.id,
      )!;

      if (after.status === "poison") {
        poisoned = true;
        if (result.presentation?.kind === "move") {
          expect(
            result.presentation.results[0].statusApplied,
          ).toBe("poison");
        }
        break;
      }
    }

    expect(poisoned).toBe(true);

    for (let seed = 1; seed <= 64; seed += 1) {
      let state = createWildDuel({
        seed,
        player: {
          species: "weedle",
          level: 5,
          moves: ["poison-sting"],
        },
        wildSpecies: "kakuna",
        wildLevel: 5,
      });
      const player = state.units.find(
        (unit) => unit.side === "player",
      )!;
      const wild = state.units.find(
        (unit) => unit.side === "rival",
      )!;
      player.position = { x: 2, y: 2 };
      wild.position = { x: 3, y: 2 };
      state = { ...state, activeUnitId: player.id };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "poison-sting",
        targetId: wild.id,
      });

      const immuneTarget = result.state.units.find(
        (unit) => unit.id === wild.id,
      )!;

      expect(immuneTarget.types).toEqual([
        "bug",
        "poison",
      ]);
      expect(immuneTarget.status).toBeNull();
    }
  });

  it("clears Poison when the party is healed", () => {
    const story = chooseStarter("charmander");
    const poisoned = {
      ...story,
      playerPokemon: story.playerPokemon
        ? {
            ...story.playerPokemon,
            status: "poison" as const,
          }
        : null,
    };

    expect(
      healStoryParty(poisoned).playerPokemon?.status,
    ).toBeNull();
  });
});


describe("FireRed field Poison", () => {
  it("ticks one HP on every fifth completed overworld step and can faint", () => {
    const base = chooseStarter("bulbasaur");
    let story = normalizeStoryState({
      ...base,
      playerPokemon: base.playerPokemon
        ? {
            ...base.playerPokemon,
            currentHp: 2,
            status: "poison" as const,
          }
        : null,
    });

    for (let step = 1; step <= 4; step += 1) {
      story = applyStoryOverworldStep(story);
      expect(
        story.playerPokemon?.currentHp,
      ).toBe(2);
    }

    story = applyStoryOverworldStep(story);
    expect(story.playerPokemon?.currentHp).toBe(1);
    expect(story.poisonStepCounter).toBe(0);

    for (let step = 1; step <= 5; step += 1) {
      story = applyStoryOverworldStep(story);
    }
    expect(story.playerPokemon?.currentHp).toBe(0);
  });
});
