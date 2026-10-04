import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createTrainerDuel,
  createWildDuel,
  normalizePokemonProgression,
} from "../packages/battle-engine/src";
import {
  chooseStarter,
  healStoryParty,
} from "../apps/client/lib/story";

function scratchDamage(
  status: "burn" | null,
): number {
  let state = createWildDuel({
    seed: 971,
    player: {
      species: "charmander",
      level: 7,
      moves: ["scratch"],
      status,
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
    moveId: "scratch",
    targetId: wild.id,
  });

  if (result.presentation?.kind !== "move") {
    throw new Error("Expected move presentation.");
  }

  return result.presentation.results[0].damage;
}

describe("FireRed Burn", () => {
  it("lets Ember inflict Burn with its 10% secondary effect", () => {
    let burned = false;

    for (let seed = 1; seed <= 160; seed += 1) {
      let state = createTrainerDuel({
        seed,
        players: [
          {
            species: "charmander",
            level: 7,
            moves: ["ember"],
          },
        ],
        rivals: [
          {
            species: "squirtle",
            level: 7,
            moves: ["tackle"],
          },
        ],
      });
      const player = state.units.find(
        (unit) => unit.side === "player",
      )!;
      const rival = state.units.find(
        (unit) => unit.side === "rival",
      )!;
      player.position = { x: 1, y: 2 };
      rival.position = { x: 3, y: 2 };
      state = { ...state, activeUnitId: player.id };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "ember",
        targetId: rival.id,
      });
      const after = result.state.units.find(
        (unit) => unit.id === rival.id,
      )!;

      if (after.status === "burn") {
        burned = true;
        if (result.presentation?.kind === "move") {
          expect(
            result.presentation.results[0].statusApplied,
          ).toBe("burn");
        }
        break;
      }
    }

    expect(burned).toBe(true);
  });

  it("keeps Fire-type Pokémon immune to Burn", () => {
    for (let seed = 1; seed <= 160; seed += 1) {
      let state = createTrainerDuel({
        seed,
        players: [
          {
            species: "charmander",
            level: 7,
            moves: ["ember"],
          },
        ],
        rivals: [
          {
            species: "charmander",
            level: 7,
            moves: ["scratch"],
          },
        ],
      });
      const player = state.units.find(
        (unit) => unit.side === "player",
      )!;
      const rival = state.units.find(
        (unit) => unit.side === "rival",
      )!;
      player.position = { x: 1, y: 2 };
      rival.position = { x: 3, y: 2 };
      state = { ...state, activeUnitId: player.id };

      const result = applyDuelAction(state, {
        kind: "use-move",
        unitId: player.id,
        moveId: "ember",
        targetId: rival.id,
      });

      expect(
        result.state.units.find(
          (unit) => unit.id === rival.id,
        )?.status,
      ).toBeNull();
    }
  });

  it("deals one eighth max HP at the end of a burned unit turn", () => {
    let state = createWildDuel({
      seed: 970,
      player: {
        species: "pidgey",
        level: 5,
        moves: ["tackle"],
        status: "burn",
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
    state = {
      ...state,
      activeUnitId: player.id,
      turnOrder: [player.id, wild.id],
      turnIndex: 0,
    };

    const beforeHp = player.hp;
    const burnDamage = Math.max(
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

    expect(after.status).toBe("burn");
    expect(after.hp).toBe(
      Math.max(0, beforeHp - burnDamage),
    );
  });

  it("halves physical damage", () => {
    const healthyDamage = scratchDamage(null);
    const burnedDamage = scratchDamage("burn");

    expect(burnedDamage).toBe(
      Math.max(1, Math.floor(healthyDamage / 2)),
    );
  });

  it("persists Burn in saves and clears it on a full heal", () => {
    expect(
      normalizePokemonProgression({
        species: "pidgey",
        level: 5,
        status: "burn",
      }).status,
    ).toBe("burn");

    const story = chooseStarter("squirtle");
    const burned = {
      ...story,
      playerPokemon: story.playerPokemon
        ? {
            ...story.playerPokemon,
            status: "burn" as const,
          }
        : null,
    };

    expect(
      healStoryParty(burned).playerPokemon?.status,
    ).toBeNull();
  });
});
