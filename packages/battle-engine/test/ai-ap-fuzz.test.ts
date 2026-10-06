import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  createTrainerDuel,
  createWildDuel,
  getActiveDuelUnit,
  resolveSimpleAiTurnDetailed,
  type DuelState,
} from "../src";

function build(species: string, level: number) {
  const p = createPokemonProgression(species as never, level);
  return { species: p.species, level, moves: p.activeMoves, movePp: { ...p.movePp }, currentHp: p.currentHp } as never;
}

/** Plays a whole battle with the AI on both sides; fails on any stall. */
function autoplay(initial: DuelState, options: { autoCapture?: boolean } = {}) {
  let state = initial;
  for (let step = 0; step < 1500 && state.status === "active"; step += 1) {
    const actor = getActiveDuelUnit(state);
    if (!actor) return { state, ok: false, why: "no active unit" };
    const turn = resolveSimpleAiTurnDetailed(state, actor.side, {
      useItems: true,
      autoCapture: actor.side === "player" && options.autoCapture === true,
    });
    if (turn.steps.length === 0) return { state, ok: false, why: `${actor.side} ${actor.species} made no progress (ap ${actor.ap}/${actor.maxAp})` };
    state = turn.state;
  }
  return { state, ok: state.status === "finished", why: "did not finish" };
}

describe("tactical AI under the shared AP pool", () => {
  it("finishes trainer battles of every size without stalling", () => {
    const stalls: string[] = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const players = ["charmander", "pidgey", "rattata", "snorlax", "blastoise", "alakazam"].slice(0, 2 + (seed % 5)).map((s) => build(s, 12 + (seed % 20)));
      const rivals = ["geodude", "onix", "machop", "rhyhorn", "pikachu", "gyarados"].slice(0, 1 + (seed % 6)).map((s) => build(s, 10 + (seed % 25)));
      const result = autoplay(createTrainerDuel({ seed, width: 13, height: 9, blocked: [], players, rivals, items: {}, trainerName: "x" } as never));
      if (!result.ok) stalls.push(`seed ${seed}: ${result.why}`);
    }
    expect(stalls).toEqual([]);
  });

  it("finishes wild packs, with and without Auto Catch, and counts every capture", () => {
    const stalls: string[] = [];
    let caught = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const players = ["charmander", "pidgey", "rattata"].slice(0, 1 + (seed % 3)).map((s) => build(s, 8));
      const wilds = [
        { species: "rattata", level: 4 }, { species: "pidgey", level: 5 }, { species: "caterpie", level: 4 },
        { species: "weedle", level: 3 }, { species: "pikachu", level: 5 },
      ].slice(0, 1 + (seed % 5));
      const state = createWildDuel({
        seed, width: 14, height: 9, blocked: [], players, captureAllowed: true,
        items: { potion: 0, "poke-ball": 6 }, wildSpecies: "rattata", wildLevel: 4, wilds,
      } as never);
      const result = autoplay(state, { autoCapture: seed % 2 === 0 });
      if (!result.ok) stalls.push(`seed ${seed}: ${result.why}`);
      caught += result.state.captures.length;
      const rivalsLeft = result.state.units.filter((u) => u.side === "rival" && u.hp > 0).length;
      if (result.state.status === "finished" && result.state.winner === "player") expect(rivalsLeft).toBe(0);
    }
    expect(stalls).toEqual([]);
    expect(caught).toBeGreaterThan(0);
  });
});
