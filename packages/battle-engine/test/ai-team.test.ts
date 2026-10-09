import { describe, expect, it } from "vitest";
import {
  createTrainerDuel,
  defaultMovesForSpecies,
  planTeamTurn,
  resolveSimpleAiTurnDetailed,
  type DuelMoveId,
  type DuelSpeciesId,
} from "../src/duel";

const COVERAGE: Partial<Record<DuelSpeciesId, DuelMoveId[]>> = {
  squirtle: ["water-gun", "tackle"],
  bulbasaur: ["vine-whip", "tackle"],
  charmander: ["ember", "scratch"],
};

const mon = (species: DuelSpeciesId, level = 10) => ({
  species,
  level,
  moves: COVERAGE[species] ?? defaultMovesForSpecies(species),
});

function scenario(rivals: DuelSpeciesId[], players: DuelSpeciesId[], seed = 5) {
  return createTrainerDuel({
    seed,
    width: 13,
    height: 9,
    players: players.map((s) => mon(s)),
    rivals: rivals.map((s) => mon(s)),
  });
}

describe("team-level planning", () => {
  it("assigns each member to the foe it covers with super effective hits", () => {
    const state = scenario(["squirtle", "bulbasaur"], ["charmander", "squirtle"]);
    const plan = planTeamTurn(state, "rival");
    const id = (side: string, species: string) =>
      state.units.find((u) => u.side === side && u.species === species)!.id;
    expect(plan.byUnit.get(id("rival", "squirtle"))!.targetId).toBe(id("player", "charmander"));
    expect(plan.byUnit.get(id("rival", "bulbasaur"))!.targetId).toBe(id("player", "squirtle"));
    for (const entry of plan.assignments) expect(entry.typeEffectiveness).toBeGreaterThan(1);
  });

  it("does not stack two attackers on a foe one of them already defeats", () => {
    let state = scenario(["squirtle", "squirtle"], ["charmander", "rattata"]);
    const weak = state.units.find((u) => u.species === "charmander")!;
    state = {
      ...state,
      units: state.units.map((u) => (u.id === weak.id ? { ...u, hp: 1 } : u)),
    };
    const plan = planTeamTurn(state, "rival");
    const onWeak = plan.assignments.filter((a) => a.targetId === weak.id);
    expect(onWeak).toHaveLength(1);
    expect(plan.assignments).toHaveLength(2);
  });

  it("is deterministic and covers every living member", () => {
    const state = scenario(["squirtle", "bulbasaur", "pidgey"], ["charmander", "geodude", "rattata"]);
    const a = planTeamTurn(state, "rival");
    const b = planTeamTurn(state, "rival");
    expect(b.assignments).toEqual(a.assignments);
    expect(a.assignments).toHaveLength(3);
  });

  it("the AI turn still runs with planning on and off", () => {
    const state = scenario(["squirtle", "bulbasaur"], ["charmander", "geodude"]);
    const active = state.units.find((u) => u.id === state.activeUnitId)!;
    for (const teamPlanning of [true, false]) {
      const turn = resolveSimpleAiTurnDetailed(state, active.side, { teamPlanning });
      expect(turn.state).toBeDefined();
    }
  });
});

describe("team planning versus one-at-a-time choice", () => {
  // Same teams on both sides; one side plans as a team, the other picks alone. Sides are swapped
  // every other seed so placement or turn order cannot decide the result.
  it("wins at least as often as the old choice and never stalls", async () => {
    const { createPokemonProgression, getActiveDuelUnit } = await import("../src");
    const build = (species: string, level: number) => {
      const p = createPokemonProgression(species as never, level);
      return { species: p.species, level, moves: p.activeMoves, movePp: { ...p.movePp }, currentHp: p.currentHp } as never;
    };
    const roster = ["charmander", "squirtle", "bulbasaur", "pidgey", "geodude", "pikachu"];
    let teamWins = 0;
    let soloWins = 0;
    for (let seed = 1; seed <= 80; seed += 1) {
      const names = roster.slice(0, 3 + (seed % 4));
      const level = 14 + (seed % 10);
      const planningSide = seed % 2 === 0 ? "player" : "rival";
      let state = createTrainerDuel({
        seed, width: 13, height: 9, blocked: [],
        players: names.map((s) => build(s, level)),
        rivals: [...names].reverse().map((s) => build(s, level)),
        items: {}, trainerName: "x",
      } as never);
      for (let step = 0; step < 1500 && state.status === "active"; step += 1) {
        const actor = getActiveDuelUnit(state)!;
        const turn = resolveSimpleAiTurnDetailed(state, actor.side, { teamPlanning: actor.side === planningSide });
                state = turn.state;
      }
      // Out of damaging PP, a Pokémon burns its status PP and then Struggles: no battle may idle forever.
      expect(state.status, `seed ${seed} never finished`).toBe("finished");
      if (state.winner === planningSide) teamWins += 1;
      else if (state.winner) soloWins += 1;
    }
    console.log(`team plan wins ${teamWins} vs one-at-a-time ${soloWins}`);
    expect(teamWins).toBeGreaterThanOrEqual(soloWins);
  }, 60_000);
});
