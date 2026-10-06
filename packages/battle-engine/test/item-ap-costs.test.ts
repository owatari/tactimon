import { describe, expect, it } from "vitest";
import {
  DUEL_ITEMS,
  ITEM_AP_COSTS,
  applyDuelAction,
  createTrainerDuel,
  createWildDuel,
  getActiveDuelUnit,
  itemApCost,
  type DuelItemId,
  type DuelState,
} from "../src";

describe("AP cost of items", () => {
  const costs = Object.entries(ITEM_AP_COSTS);

  it("prices every battle item, with Potion as the cheapest and Full Restore / Max Revive on top", () => {
    for (const id of Object.keys(DUEL_ITEMS)) {
      expect(ITEM_AP_COSTS, id).toHaveProperty(id);
    }
    const values = costs.map(([, cost]) => cost);
    expect(Math.min(...values)).toBe(4);
    expect(itemApCost("potion")).toBe(4);
    const max = Math.max(...values);
    expect(itemApCost("max-revive")).toBe(max);
    // Revive, Full Restore and Max Revive are the priciest items, above Max Potion and everything else.
    for (const id of ["revive", "full-restore", "max-revive"]) {
      expect(itemApCost(id), id).toBeGreaterThan(itemApCost("max-potion"));
    }
    expect(itemApCost("revive")).toBeLessThan(itemApCost("full-restore"));
    expect(itemApCost("full-restore")).toBeLessThan(itemApCost("max-revive"));
  });

  it("averages about 4-5 AP and grows with strength inside each family", () => {
    const average = costs.reduce((sum, [, cost]) => sum + cost, 0) / costs.length;
    expect(average).toBeGreaterThanOrEqual(4);
    expect(average).toBeLessThan(5.6);
    expect(itemApCost("potion")).toBeLessThanOrEqual(itemApCost("super-potion"));
    expect(itemApCost("super-potion")).toBeLessThanOrEqual(itemApCost("hyper-potion"));
    expect(itemApCost("hyper-potion")).toBeLessThan(itemApCost("max-potion"));
    expect(itemApCost("max-potion")).toBeLessThan(itemApCost("full-restore"));
    expect(itemApCost("poke-ball")).toBeLessThanOrEqual(itemApCost("master-ball"));
    expect(itemApCost("unknown-item")).toBe(4);
  });
});

function duel(items: Record<string, number>) {
  const state = createTrainerDuel({
    seed: 77,
    width: 9,
    height: 7,
    blocked: [],
    items,
    players: [
      { species: "bulbasaur", level: 20, moves: ["tackle"] },
      { species: "squirtle", level: 20, moves: ["tackle"] },
    ],
    rivals: [{ species: "rattata", level: 5, moves: ["tackle"] }],
    trainerName: "x",
  } as never);
  const [actor, ally] = state.units.filter((u) => u.side === "player");
  const withUnit = (id: string, patch: object, base: DuelState = state): DuelState => ({
    ...base,
    activeUnitId: actor.id,
    units: base.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
  });
  return { state, actor, ally, withUnit };
}

const use = (state: DuelState, itemId: DuelItemId, unitId: string, targetId: string) =>
  applyDuelAction(state, { kind: "use-item", unitId, itemId, targetId });

describe("new battle items", () => {
  it("Max Potion heals everything for 6 AP", () => {
    const { actor, withUnit } = duel({ potion: 0, "poke-ball": 0, "max-potion": 1 });
    const hurt = withUnit(actor.id, { hp: 1, ap: 10, maxAp: 10 });
    const result = use(hurt, "max-potion", actor.id, actor.id);
    expect(result.accepted).toBe(true);
    const after = result.state.units.find((u) => u.id === actor.id)!;
    expect(after.hp).toBe(after.maxHp);
    expect(after.ap).toBe(10 - 6);
    expect(result.state.items["max-potion"]).toBe(0);
  });

  it("Full Restore heals and cures for 8 AP, and refuses a healthy Pokémon", () => {
    const { actor, withUnit } = duel({ potion: 0, "poke-ball": 0, "full-restore": 2 });
    const sick = withUnit(actor.id, { hp: 5, status: "poison", ap: 10, maxAp: 10 });
    const result = use(sick, "full-restore", actor.id, actor.id);
    expect(result.accepted).toBe(true);
    const after = result.state.units.find((u) => u.id === actor.id)!;
    expect(after.hp).toBe(after.maxHp);
    expect(after.status).toBeNull();
    expect(after.ap).toBe(10 - 8);
    const healthy = withUnit(actor.id, { ap: 10, maxAp: 10 });
    expect(use(healthy, "full-restore", actor.id, actor.id).reason).toBe("target-full-hp");
  });

  it("Full Heal cures any status for 5 AP", () => {
    const { actor, withUnit } = duel({ potion: 0, "poke-ball": 0, "full-heal": 1 });
    const burned = withUnit(actor.id, { status: "burn", ap: 8, maxAp: 8 });
    const result = use(burned, "full-heal", actor.id, actor.id);
    expect(result.accepted).toBe(true);
    expect(result.state.units.find((u) => u.id === actor.id)!.status).toBeNull();
    expect(result.state.units.find((u) => u.id === actor.id)!.ap).toBe(8 - 5);
  });

  it("Revive brings a fainted ally back with half HP, on a free tile, without letting it act this turn", () => {
    const { actor, ally, withUnit } = duel({ potion: 0, "poke-ball": 0, revive: 1 });
    let state = withUnit(ally.id, { hp: 0 });
    state = withUnit(actor.id, { ap: 9, maxAp: 9 }, state);
    const result = use(state, "revive", actor.id, ally.id);
    expect(result.accepted).toBe(true);
    const back = result.state.units.find((u) => u.id === ally.id)!;
    expect(back.hp).toBe(Math.ceil(back.maxHp / 2));
    expect(back.status).toBeNull();
    expect(back.ap).toBe(0);
    const spots = result.state.units.filter((u) => u.hp > 0).map((u) => `${u.position.x},${u.position.y}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(result.state.units.find((u) => u.id === actor.id)!.ap).toBe(9 - 7);
  });

  it("Max Revive restores full HP; a healthy target, a foe or too little AP are refused", () => {
    const { state: base, actor, ally, withUnit } = duel({ potion: 0, "poke-ball": 0, "max-revive": 1, revive: 1 });
    let state = withUnit(ally.id, { hp: 0 });
    state = withUnit(actor.id, { ap: 10, maxAp: 10 }, state);
    const full = use(state, "max-revive", actor.id, ally.id);
    expect(full.accepted).toBe(true);
    const back = full.state.units.find((u) => u.id === ally.id)!;
    expect(back.hp).toBe(back.maxHp);
    expect(full.state.units.find((u) => u.id === actor.id)!.ap).toBe(10 - 9);

    expect(use(withUnit(actor.id, { ap: 9, maxAp: 9 }, base), "revive", actor.id, ally.id).reason).toBe("target-not-fainted");
    const foe = base.units.find((u) => u.side === "rival")!;
    expect(use(withUnit(actor.id, { ap: 9, maxAp: 9 }, base), "revive", actor.id, foe.id).accepted).toBe(false);
    const poor = withUnit(actor.id, { ap: 8, maxAp: 8 }, withUnit(ally.id, { hp: 0 }));
    expect(use(poor, "max-revive", actor.id, ally.id).reason).toBe("not-enough-ap");
  });

  it("every ball spends its own AP cost on a throw", () => {
    const state = createWildDuel({
      seed: 5, width: 9, height: 7, blocked: [], captureAllowed: true,
      items: { potion: 0, "poke-ball": 2, "master-ball": 1 },
      players: [{ species: "bulbasaur", level: 20, moves: ["tackle"] }],
      wildSpecies: "rattata", wildLevel: 3,
    } as never);
    const player = state.units.find((u) => u.side === "player")!;
    const wild = state.units.find((u) => u.side === "rival")!;
    const ready = { ...state, activeUnitId: player.id, units: state.units.map((u) => (u.id === player.id ? { ...u, ap: 12, maxAp: 12 } : u)) };
    const poke = use(ready, "poke-ball", player.id, wild.id);
    expect(poke.state.units.find((u) => u.id === player.id)!.ap).toBe(12 - itemApCost("poke-ball"));
    const master = use(ready, "master-ball", player.id, wild.id);
    expect(master.state.units.find((u) => u.id === player.id)!.ap).toBe(12 - itemApCost("master-ball"));
  });
});

describe("Pokémon that arrive fainted", () => {
  it("start off the board, never get a turn, and a Revive brings them back into the fight", () => {
    const state = createWildDuel({
      seed: 91, width: 9, height: 7, blocked: [], captureAllowed: false,
      items: { potion: 0, "poke-ball": 0, revive: 1 },
      players: [
        { species: "bulbasaur", level: 20, moves: ["tackle"], currentHp: 0 },
        { species: "squirtle", level: 20, moves: ["tackle"] },
      ],
      wildSpecies: "rattata", wildLevel: 3,
    } as never);
    const dead = state.units.find((u) => u.species === "bulbasaur")!;
    const alive = state.units.find((u) => u.species === "squirtle")!;
    expect(dead.hp).toBe(0);
    // The first turn belongs to a living unit; the fainted one is skipped for good.
    expect(getActiveDuelUnit(state)!.hp).toBeGreaterThan(0);
    expect(state.status).toBe("active");

    const ready = { ...state, activeUnitId: alive.id, units: state.units.map((u) => (u.id === alive.id ? { ...u, ap: 10, maxAp: 10 } : u)) };
    const revived = applyDuelAction(ready, { kind: "use-item", unitId: alive.id, itemId: "revive", targetId: dead.id });
    expect(revived.accepted).toBe(true);
    const back = revived.state.units.find((u) => u.id === dead.id)!;
    expect(back.hp).toBeGreaterThan(0);
    // It is part of the turn order again for the next round.
    expect(revived.state.turnOrder).toContain(dead.id);
  });

  it("a team that is entirely fainted but for one unit still loses only when that unit falls", () => {
    const state = createWildDuel({
      seed: 92, width: 9, height: 7, blocked: [], captureAllowed: false,
      players: [
        { species: "bulbasaur", level: 20, moves: ["tackle"], currentHp: 0 },
        { species: "squirtle", level: 20, moves: ["tackle"], currentHp: 0 },
        { species: "charmander", level: 20, moves: ["scratch"] },
      ],
      wildSpecies: "rattata", wildLevel: 3,
    } as never);
    expect(state.status).toBe("active");
    expect(state.units.filter((u) => u.side === "player" && u.hp > 0)).toHaveLength(1);
    expect(getActiveDuelUnit(state)!.species === "charmander" || getActiveDuelUnit(state)!.side === "rival").toBe(true);
  });
});
