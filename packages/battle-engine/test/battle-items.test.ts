import { describe, expect, it } from "vitest";
import {
  applyDuelAction,
  createStarterDuel,
  createWildDuel,
  DUEL_ITEMS,
} from "../src/duel";

function starter() {
  const state = createStarterDuel("bulbasaur", {
    seed: 42,
    width: 7,
    height: 5,
    items: { "super-potion": 1, antidote: 1, "parlyz-heal": 1 },
  });
  const player = state.units.find((unit) => unit.side === "player")!;
  return { state, player };
}

describe("extra battle items", () => {
  it("heals with a Super Potion", () => {
    const { state, player } = starter();
    expect(DUEL_ITEMS["super-potion"]).toMatchObject({ kind: "heal", heal: 50 });
    const hurt = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id ? { ...unit, hp: 1 } : unit,
      ),
    };
    const result = applyDuelAction(hurt, {
      kind: "use-item",
      unitId: player.id,
      itemId: "super-potion",
      targetId: player.id,
    });
    expect(result.accepted).toBe(true);
    expect(result.state.items["super-potion"]).toBe(0);
    const healed = result.state.units.find((unit) => unit.id === player.id)!;
    expect(healed.hp).toBeGreaterThan(1);
  });

  it("cures only the matching status and keeps the item otherwise", () => {
    const { state, player } = starter();
    const poisoned = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === player.id ? { ...unit, status: "poison" as const } : unit,
      ),
    };

    const wrong = applyDuelAction(poisoned, {
      kind: "use-item",
      unitId: player.id,
      itemId: "parlyz-heal",
      targetId: player.id,
    });
    expect(wrong.accepted).toBe(false);
    expect(wrong.reason).toBe("target-no-status");

    const right = applyDuelAction(poisoned, {
      kind: "use-item",
      unitId: player.id,
      itemId: "antidote",
      targetId: player.id,
    });
    expect(right.accepted).toBe(true);
    expect(right.state.items.antidote).toBe(0);
    expect(right.state.units.find((unit) => unit.id === player.id)!.status).toBeNull();
  });

  it("captures with a Great Ball", () => {
    let state = createWildDuel({
      seed: 1,
      player: { species: "bulbasaur", level: 5, moves: ["tackle", "growl"] },
      wildSpecies: "pidgey",
      wildLevel: 3,
      items: { "great-ball": 2 },
    });
    const player = state.units.find((unit) => unit.side === "player")!;
    const wild = state.units.find((unit) => unit.side === "rival")!;
    state = {
      ...state,
      activeUnitId: player.id,
      units: state.units.map((unit) =>
        unit.id === wild.id ? { ...unit, hp: 1 } : unit,
      ),
    };
    const result = applyDuelAction(state, {
      kind: "use-item",
      unitId: player.id,
      itemId: "great-ball",
      targetId: wild.id,
    });
    expect(result.accepted).toBe(true);
    expect(result.state.items["great-ball"]).toBe(1);
    expect(result.presentation?.kind).toBe("capture");
  });
});
