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

import { autoCatchPriority, autoCatchTier } from "../src";

describe("Auto Catch priority: shiny on top, then the rare ones", () => {
  it("ranks shiny > rare > uncommon > common, deterministically", () => {
    const shinyCommon = { species: "rattata", shiny: true } as never;
    const rare = { species: "snorlax" } as never;
    const rarer = { species: "gyarados" } as never;
    const uncommon = { species: "kadabra" } as never;
    const common = { species: "pidgey" } as never;
    expect([shinyCommon, rare, uncommon, common].map((u) => autoCatchTier(u))).toEqual([4, 3, 1, 0]);
    expect(autoCatchPriority(shinyCommon)).toBeGreaterThan(autoCatchPriority(rare));
    expect(autoCatchPriority(rare)).toBeGreaterThan(autoCatchPriority(uncommon));
    expect(autoCatchPriority(uncommon)).toBeGreaterThan(autoCatchPriority(common));
    // Inside a tier the lower catch rate (rarer) comes first.
    expect(autoCatchPriority(rare)).toBeGreaterThan(autoCatchPriority(rarer));
    expect(autoCatchPriority(rare)).toBe(autoCatchPriority(rare));
  });

  /** A pack where the shiny and the rare one are NOT the easiest to catch. */
  function mixedPack(seed: number, party: Member[]) {
    const state = createWildDuel({
      seed, width: 12, height: 9, blocked: [], players: party.map(build), captureAllowed: true,
      items: { potion: 0, "poke-ball": 30, "great-ball": 10, "ultra-ball": 4, "master-ball": 1 },
      wildSpecies: "rattata", wildLevel: 5,
      wilds: [
        { species: "rattata", level: 5 },
        { species: "pidgey", level: 5, shiny: true },
        { species: "snorlax", level: 5 },
        { species: "weedle", level: 5 },
      ],
    } as never);
    const first = state.units.find((u) => u.side === "player")!;
    return { ...state, activeUnitId: first.id, turnIndex: state.turnOrder.indexOf(first.id) };
  }
  const targetOf = (step: { presentation?: { kind: string; targetIds?: string[] } } | undefined) =>
    step?.presentation && "targetIds" in step.presentation ? step.presentation.targetIds?.[0] : undefined;

  it("goes for the shiny first, even though the commons would be easier", () => {
    const base = mixedPack(21, [{ species: "bulbasaur", level: 20, moves: ["sleep-powder", "tackle"] }]);
    const shiny = base.units.find((u) => u.shiny)!;
    const actor = base.units.find((u) => u.side === "player")!;
    // Everything in reach: the shiny sits right next to the actor.
    const state = {
      ...base,
      units: base.units.map((u) =>
        u.id === actor.id ? { ...u, position: { x: 5, y: 4 }, ap: 10, maxAp: 10 }
        : u.id === shiny.id ? { ...u, position: { x: 6, y: 4 } }
        : u.side === "rival" ? { ...u, position: { x: 6, y: u.id.endsWith("rattata") ? 5 : 3 } } : u),
    };
    const step = firstStep(state);
    expect(targetOf(step)).toBe(shiny.id);
  });

  it("never lets a shiny be knocked out, even when the acting Pokémon is about to faint", () => {
    const wilds = [{ species: "rattata", level: 12, shiny: true }];
    const state = adjacent(
      wildDuel(31, [{ species: "pidgey", level: 8, moves: ["sleep-powder", "tackle"] }], wilds as never),
      (u) => (u.side === "player" ? { hp: 1 } : { hp: 2 }),
    );
    // Without a shiny the same position makes the normal AI finish the wild (see the survival test).
    const step = firstStep(state);
    const shiny = step.state.units.find((u) => u.shiny)!;
    // A caught Pokémon leaves the field with 0 HP but is not dead: the shiny is never defeated.
    expect(shiny.hp > 0 || shiny.captured === true).toBe(true);
    expect(used(step)).toMatch(/^ball:/);
  });

  it("over many battles: the shiny is caught (>= 95%), never killed and usually among the first caught", () => {
    const party: Member[] = [
      { species: "bulbasaur", level: 16, moves: ["sleep-powder", "vine-whip", "tackle"] },
      { species: "pikachu", level: 16, moves: ["thunder-wave", "thunder-shock", "quick-attack"] },
      { species: "charmander", level: 15, moves: ["ember", "scratch", "growl"] },
    ];
    let shinyCaught = 0, shinyKilled = 0, shinyEarly = 0, battles = 0, caught = 0, wilds = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      let state = mixedPack(seed, party);
      for (let step = 0; step < 2500 && state.status === "active"; step += 1) {
        const actor = getActiveDuelUnit(state);
        if (!actor) break;
        const turn = resolveSimpleAiTurnDetailed(state, actor.side, { useItems: false, autoCapture: actor.side === "player" });
        if (turn.steps.length === 0) break;
        state = turn.state;
      }
      battles += 1;
      wilds += 4;
      caught += state.captures.length;
      const shiny = state.units.find((u) => u.shiny)!;
      if (shiny.captured) {
        shinyCaught += 1;
        if (state.captures.findIndex((c) => c.shiny) <= 1) shinyEarly += 1;
      }
      if (shiny.hp <= 0 && !shiny.captured) shinyKilled += 1;
    }
    expect(shinyKilled).toBe(0);
    expect(shinyCaught / battles).toBeGreaterThanOrEqual(0.95);
    expect(shinyEarly / Math.max(1, shinyCaught)).toBeGreaterThan(0.6);
    expect(caught / wilds).toBeGreaterThan(0.8);
  });
});

describe("Auto Catch rarity follows how rarely a Pokémon appears in the area", () => {
  // Viridian Forest (FireRed): Caterpie 40%, Weedle 40%, Kakuna 10%, Metapod 5%, Pikachu 5%.
  const forest = (species: string, appearanceRate: number) => ({ species, appearanceRate }) as never;

  it("Viridian Forest: Pikachu first, then Metapod, then Kakuna, then Weedle and Caterpie", async () => {
    const { autoCatchPriority: priority, autoCatchTier: tier } = await import("../src");
    const pack = [forest("caterpie", 0.4), forest("weedle", 0.4), forest("kakuna", 0.1), forest("metapod", 0.05), forest("pikachu", 0.05)];
    const order = [...pack].sort((a, b) => priority(b) - priority(a)).map((u: { species: string }) => u.species);
    expect(order.slice(0, 3)).toEqual(["pikachu", "metapod", "kakuna"]);
    expect(order.slice(3).sort()).toEqual(["caterpie", "weedle"]);
    expect(tier(forest("pikachu", 0.05))).toBeGreaterThan(tier(forest("metapod", 0.05)));
    expect(tier(forest("metapod", 0.05))).toBeGreaterThan(tier(forest("kakuna", 0.1)));
    expect(tier(forest("kakuna", 0.1))).toBeGreaterThan(tier(forest("weedle", 0.4)));
  });

  it("the same species is rarer where it appears less, and legendaries/shinies stay on top", async () => {
    const { autoCatchTier: tier } = await import("../src");
    expect(tier(forest("rattata", 0.03))).toBeGreaterThan(tier(forest("rattata", 0.5)));
    expect(tier({ species: "mewtwo" } as never)).toBe(3);
    expect(tier({ species: "rattata", shiny: true } as never)).toBe(4);
  });

  it("the AI works the rarest of the pack first, using the area data it was given", () => {
    const state = createWildDuel({
      seed: 41, width: 12, height: 9, blocked: [], captureAllowed: true,
      players: [{ species: "bulbasaur", level: 20, moves: ["sleep-powder", "tackle"] }].map(build),
      items: { potion: 0, "poke-ball": 20, "great-ball": 5 },
      wildSpecies: "caterpie", wildLevel: 4,
      wilds: [
        { species: "caterpie", level: 4, appearanceRate: 0.4 },
        { species: "weedle", level: 4, appearanceRate: 0.4 },
        { species: "pikachu", level: 3, appearanceRate: 0.05 },
      ],
    } as never);
    const player = state.units.find((u) => u.side === "player")!;
    const pika = state.units.find((u) => u.species === "pikachu")!;
    const ready = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((u) =>
        u.id === player.id ? { ...u, position: { x: 5, y: 4 }, ap: 10, maxAp: 10 }
        : u.id === pika.id ? { ...u, position: { x: 6, y: 4 } }
        : u.side === "rival" ? { ...u, position: { x: 6, y: u.species === "weedle" ? 5 : 3 } } : u),
    };
    const step = resolveSimpleAiTurnDetailed(ready, "player", { autoCapture: true }).steps[0];
    expect(step.presentation && "targetIds" in step.presentation ? step.presentation.targetIds[0] : null).toBe(pika.id);
  });
});
