import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createWildDuel,
  normalizePokemonProgression,
} from "../packages/battle-engine/src";
import {
  chooseStarter,
  healStoryParty,
} from "../apps/client/lib/story";

describe("FireRed paralysis", () => {
  it("lets Thunder Shock inflict paralysis with its secondary effect", () => {
    let paralyzed = false;

    for (let seed = 1; seed <= 128; seed += 1) {
      let state = createWildDuel({
        seed,
        player: {
          species: "pikachu",
          level: 5,
          moves: ["thunder-shock"],
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
      player.position = { x: 1, y: 2 };
      wild.position = { x: 3, y: 2 };
      state = { ...state, activeUnitId: player.id };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "thunder-shock",
        targetId: wild.id,
      });

      if (
        result.state.units.find(
          (unit) => unit.id === wild.id,
        )?.status === "paralysis"
      ) {
        paralyzed = true;
        break;
      }
    }

    expect(paralyzed).toBe(true);
  });

  it("reduces effective Speed to one quarter for initiative", () => {
    const healthy = createWildDuel({
      seed: 950,
      player: {
        species: "pikachu",
        level: 5,
        moves: ["thunder-shock"],
      },
      wildSpecies: "caterpie",
      wildLevel: 5,
    });
    const paralyzed = createWildDuel({
      seed: 950,
      player: {
        species: "pikachu",
        level: 5,
        moves: ["thunder-shock"],
        status: "paralysis",
      },
      wildSpecies: "caterpie",
      wildLevel: 5,
    });

    expect(
      healthy.units.find(
        (unit) => unit.id === healthy.turnOrder[0],
      )?.species,
    ).toBe("pikachu");
    expect(
      paralyzed.units.find(
        (unit) => unit.id === paralyzed.turnOrder[0],
      )?.species,
    ).toBe("caterpie");
  });

  it("can fully paralyze a Pokémon and consume its attack turn", () => {
    let blocked = false;

    for (let seed = 1; seed <= 128; seed += 1) {
      let state = createWildDuel({
        seed,
        player: {
          species: "pidgey",
          level: 5,
          moves: ["tackle"],
          status: "paralysis",
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
      state = {
        ...state,
        activeUnitId: player.id,
        turnOrder: [player.id, wild.id],
        turnIndex: 0,
      };
      const wildHp = wild.hp;

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "tackle",
        targetId: wild.id,
      });

      if (result.reason === "fully-paralyzed") {
        blocked = true;
        expect(
          result.state.units.find(
            (unit) => unit.id === wild.id,
          )?.hp,
        ).toBe(wildHp);
        expect(result.state.activeUnitId).toBe(wild.id);
        break;
      }
    }

    expect(blocked).toBe(true);
  });

  it("persists paralysis in saves and clears it on a full heal", () => {
    expect(
      normalizePokemonProgression({
        species: "pikachu",
        level: 5,
        status: "paralysis",
      }).status,
    ).toBe("paralysis");

    const story = chooseStarter("charmander");
    const paralyzed = {
      ...story,
      playerPokemon: story.playerPokemon
        ? {
            ...story.playerPokemon,
            status: "paralysis" as const,
          }
        : null,
    };

    expect(
      healStoryParty(paralyzed).playerPokemon?.status,
    ).toBeNull();
  });
});
