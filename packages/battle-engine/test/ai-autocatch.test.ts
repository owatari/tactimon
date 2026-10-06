import { describe, expect, it } from "vitest";
import {
  DUEL_MOVES,
  applyDuelAction,
  createPokemonProgression,
  createWildDuel,
  fireRedCaptureChance,
  getActiveDuelUnit,
  resolveSimpleAiTurnDetailed,
  type DuelState,
} from "../src";

type Member = { species: string; level: number; moves: string[] };

function build(m: Member) {
  const p = createPokemonProgression(m.species as never, m.level);
  return { species: p.species, level: m.level, moves: m.moves, movePp: {}, currentHp: p.currentHp } as never;
}

function wildDuel(
  seed: number,
  party: Member[],
  wilds: { species: string; level: number }[],
  items: Record<string, number> = { potion: 0, "poke-ball": 8, "great-ball": 3 },
): DuelState {
  const state = createWildDuel({
    seed, width: 12, height: 9, blocked: [], players: party.map(build), captureAllowed: true, items,
    wildSpecies: wilds[0].species, wildLevel: wilds[0].level, wilds,
  } as never);
  const first = state.units.find((u) => u.side === "player")!;
  return { ...state, activeUnitId: first.id, turnIndex: state.turnOrder.indexOf(first.id) };
}

/** Puts the first player Pokémon next to the first wild one, with AP to spare. */
function adjacent(state: DuelState, patch: (u: DuelState["units"][number]) => object = () => ({})): DuelState {
  const wilds = state.units.filter((u) => u.side === "rival");
  const actor = state.units.find((u) => u.side === "player")!;
  return {
    ...state,
    units: state.units.map((u) => {
      if (u.id === actor.id) return { ...u, position: { x: 5, y: 4 }, ap: 10, maxAp: 10, ...patch(u) };
      if (u.id === wilds[0].id) return { ...u, position: { x: 6, y: 4 }, ...patch(u) };
      if (u.side === "rival") return { ...u, position: { x: 11, y: 8 - wilds.indexOf(u) } };
      return { ...u, position: { x: 0, y: wilds.length } };
    }),
  };
}

const firstStep = (state: DuelState) => resolveSimpleAiTurnDetailed(state, "player", { autoCapture: true, useItems: true }).steps[0];
const used = (step: { presentation?: { kind: string; moveId?: string; itemId?: string } } | undefined) =>
  step?.presentation?.kind === "move" ? `move:${step.presentation.moveId}` : step?.presentation?.kind === "capture" ? `ball:${step.presentation.itemId}` : step?.presentation?.kind ?? "none";

describe("Auto Catch AI", () => {
  it("inflicts a status on a healthy wild Pokémon before throwing anything", () => {
    const state = adjacent(wildDuel(7, [{ species: "bulbasaur", level: 20, moves: ["sleep-powder", "tackle"] }], [{ species: "pidgey", level: 5 }]));
    expect(used(firstStep(state))).toBe("move:sleep-powder");
  });

  it("weakens with a hit that cannot kill when no status move is available", () => {
    // Level 8 Squirtle against a level 12 Geodude: Tackle leaves it standing.
    const state = adjacent(wildDuel(8, [{ species: "squirtle", level: 8, moves: ["tackle"] }], [{ species: "geodude", level: 12 }]));
    const step = firstStep(state);
    expect(used(step)).toBe("move:tackle");
    if (step.presentation?.kind === "move") {
      const target = step.state.units.find((u) => u.side === "rival")!;
      expect(target.hp).toBeGreaterThan(0);
    }
  });

  it("never picks a move that could knock the target out: it throws the ball instead", () => {
    const state = adjacent(wildDuel(9, [{ species: "charmander", level: 45, moves: ["ember"] }], [{ species: "caterpie", level: 3 }]));
    expect(used(firstStep(state))).toMatch(/^ball:/);
  });

  it("throws immediately when the target is already weak", () => {
    const state = adjacent(wildDuel(10, [{ species: "bulbasaur", level: 20, moves: ["sleep-powder", "tackle"] }], [{ species: "rattata", level: 5 }]), (u) =>
      u.side === "rival" ? { hp: 1 } : {},
    );
    expect(used(firstStep(state))).toBe("ball:poke-ball");
  });

  it("uses the cheapest ball that is already good enough, and the Great Ball for harder targets", () => {
    const easy = adjacent(wildDuel(11, [{ species: "bulbasaur", level: 20, moves: ["tackle"] }], [{ species: "pidgey", level: 5 }]), (u) => (u.side === "rival" ? { hp: 1 } : {}));
    expect(used(firstStep(easy))).toBe("ball:poke-ball");
    const hard = adjacent(wildDuel(12, [{ species: "bulbasaur", level: 20, moves: ["tackle"] }], [{ species: "snorlax", level: 5 }]), (u) => (u.side === "rival" ? { hp: 1 } : {}));
    expect(used(firstStep(hard))).toBe("ball:great-ball");
  });

  it("survival first: when it is about to die it fights back instead of being gentle", () => {
    const state = adjacent(
      wildDuel(13, [{ species: "pidgey", level: 8, moves: ["sleep-powder", "tackle"] }], [{ species: "rattata", level: 10 }]),
      (u) => (u.side === "player" ? { hp: 1 } : { hp: 2 }),
    );
    const step = firstStep(state);
    // The wild could knock it out this round: no gentle status, no ball, it finishes the attacker.
    expect(used(step)).toBe("move:tackle");
    expect(step.state.units.find((u) => u.side === "rival")!.hp).toBe(0);
  });

  it("goes back to the normal fighting AI once the balls run out", () => {
    const state = adjacent(
      wildDuel(14, [{ species: "charmander", level: 30, moves: ["ember"] }], [{ species: "caterpie", level: 3 }], { potion: 0, "poke-ball": 0 }),
    );
    expect(used(firstStep(state))).toBe("move:ember");
  });

  it("spends AP wisely: status (3) then the ball (4) fit in one 7+ AP turn", () => {
    const state = adjacent(wildDuel(15, [{ species: "bulbasaur", level: 20, moves: ["sleep-powder"] }], [{ species: "pidgey", level: 5 }]), (u) => (u.side === "player" ? { ap: 7, maxAp: 7 } : {}));
    const turn = resolveSimpleAiTurnDetailed(state, "player", { autoCapture: true, useItems: true });
    const kinds = turn.steps.map((s) => s.presentation?.kind);
    expect(kinds[0]).toBe("move");
    const asleep = turn.steps[0].state.units.find((u) => u.side === "rival")?.status === "sleep";
    // Sleep Powder can miss: then it tries again; once asleep the ball follows.
    expect(kinds[1]).toBe(asleep ? "capture" : "move");
  });
});

describe("Auto Catch statistics", () => {
  const SPECIES = ["rattata", "pidgey", "caterpie", "weedle", "pikachu", "geodude", "zubat", "oddish", "mankey", "machop"];
  const PARTY: Member[] = [
    { species: "bulbasaur", level: 14, moves: ["sleep-powder", "vine-whip", "tackle"] },
    { species: "charmander", level: 14, moves: ["ember", "scratch", "growl"] },
    { species: "squirtle", level: 14, moves: ["water-gun", "tackle", "bubble"] },
    { species: "pidgey", level: 12, moves: ["quick-attack", "gust", "sand-attack"] },
    { species: "pikachu", level: 12, moves: ["thunder-wave", "thunder-shock", "quick-attack"] },
    { species: "rattata", level: 12, moves: ["tackle", "tail-whip", "quick-attack"] },
  ];

  function play(seed: number) {
    const partySize = 1 + (seed % 6);
    // Real packs scale with the party (task 019): at most two wild Pokémon per party member.
    const packSize = 1 + (seed % (2 * partySize));
    const wilds = Array.from({ length: packSize }, (_, i) => ({ species: SPECIES[(seed + i) % SPECIES.length], level: 4 + ((seed + i) % 6) }));
    let state = wildDuel(seed, PARTY.slice(0, partySize), wilds, { potion: 0, "poke-ball": 30, "great-ball": 10 });
    for (let step = 0; step < 2500 && state.status === "active"; step += 1) {
      const actor = getActiveDuelUnit(state);
      if (!actor) return { ok: false, why: "no actor", wilds: packSize, caught: 0, killed: 0, ownFaints: 0 };
      const turn = resolveSimpleAiTurnDetailed(state, actor.side, { useItems: false, autoCapture: actor.side === "player" });
      if (turn.steps.length === 0) return { ok: false, why: `${actor.side} ${actor.species} no progress`, wilds: packSize, caught: 0, killed: 0, ownFaints: 0 };
      state = turn.state;
    }
    const rivals = state.units.filter((u) => u.side === "rival");
    return {
      ok: state.status === "finished",
      why: "unfinished",
      wilds: packSize,
      caught: state.captures.length,
      killed: rivals.filter((u) => u.hp <= 0 && !u.captured).length,
      ownFaints: state.units.filter((u) => u.side === "player" && u.hp <= 0).length,
    };
  }

  it("captures most of the pack without stalling, and rarely kills what it could catch", () => {
    let wilds = 0, caught = 0, killed = 0;
    const problems: string[] = [];
    for (let seed = 1; seed <= 120; seed += 1) {
      const result = play(seed);
      if (!result.ok) problems.push(`seed ${seed}: ${result.why}`);
      wilds += result.wilds;
      caught += result.caught;
      killed += result.killed;
    }
    expect(problems).toEqual([]);
    // Baseline (task 029): ~90% caught, ~4% killed (only when a Pokémon was about to faint).
    expect(caught / wilds).toBeGreaterThan(0.85);
    expect(killed / wilds).toBeLessThan(0.08);
  });
});

describe("capture odds helper stays consistent with the AI's choices", () => {
  it("a sleeping, weakened target is the best case for a Poké Ball", () => {
    const plain = fireRedCaptureChance({ catchRate: 45, ballModifier: 1, statusModifier: 1, hp: 30, maxHp: 30 });
    const best = fireRedCaptureChance({ catchRate: 45, ballModifier: 1, statusModifier: 2, hp: 3, maxHp: 30 });
    expect(best).toBeGreaterThan(plain * 3);
    expect(DUEL_MOVES["sleep-powder"].secondaryStatus).toBe("sleep");
    expect(applyDuelAction).toBeTypeOf("function");
  });
});
