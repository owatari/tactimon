import { describe, expect, it } from "vitest";
import {
  DUEL_ITEMS,
  DUEL_MOVES,
  applyDuelAction,
  createTrainerDuel,
  type DuelMoveId,
  type DuelState,
} from "../src";

function duelWith(moveId: DuelMoveId, playerLevel = 30, rivalSpecies: "onix" | "pikachu" = "pikachu") {
  let state = createTrainerDuel({
    seed: 4242,
    players: [{ species: "rhyhorn", level: playerLevel, moves: [moveId] }],
    rivals: [{ species: rivalSpecies, level: 40, moves: ["quick-attack"] }],
  });
  const player = state.units.find((unit) => unit.side === "player")!;
  const rival = state.units.find((unit) => unit.side === "rival")!;
  player.position = { x: 2, y: 2 };
  rival.position = { x: 3, y: 2 };
  // Expensive moves (Explosion, Hyper Beam…) need a bigger AP pool than the default 6.
  player.ap = player.maxAp = 12;
  state = { ...state, activeUnitId: player.id };
  return { state, player, rival };
}

function use(state: DuelState, moveId: DuelMoveId) {
  const player = state.units.find((unit) => unit.side === "player")!;
  const rival = state.units.find((unit) => unit.side === "rival")!;
  const result = applyDuelAction(state, {
    kind: "use-move",
    unitId: player.id,
    moveId,
    targetId: rival.id,
  });
  expect(result.accepted).toBe(true);
  if (result.presentation?.kind !== "move") {
    throw new Error("Expected move presentation");
  }
  return result;
}

describe("generated Kanto moves with special effects", () => {
  it("includes the extra moves in the engine table", () => {
    for (const id of [
      "seismic-toss",
      "night-shade",
      "dragon-rage",
      "double-kick",
      "explosion",
      "double-edge",
      "earthquake",
      "hyper-beam",
    ] as const) {
      expect(DUEL_MOVES[id as DuelMoveId], id).toBeDefined();
    }
  });

  it("Seismic Toss deals damage equal to the user's level", () => {
    const { state } = duelWith("seismic-toss" as DuelMoveId, 33);
    const result = use(state, "seismic-toss" as DuelMoveId);
    if (result.presentation?.kind !== "move") return;
    expect(result.presentation.results[0].damage).toBe(33);
  });

  it("Dragon Rage always deals 40 damage", () => {
    const { state } = duelWith("dragon-rage" as DuelMoveId, 12);
    const result = use(state, "dragon-rage" as DuelMoveId);
    if (result.presentation?.kind !== "move") return;
    expect(result.presentation.results[0].damage).toBe(40);
  });

  it("Double Kick hits exactly twice", () => {
    const { state } = duelWith("double-kick" as DuelMoveId, 30);
    const result = use(state, "double-kick" as DuelMoveId);
    if (result.presentation?.kind !== "move") return;
    expect(result.presentation.results[0].hitCount).toBe(2);
  });

  it("Explosion makes the user faint", () => {
    const { state, player } = duelWith("explosion" as DuelMoveId, 30);
    const result = use(state, "explosion" as DuelMoveId);
    expect(
      result.state.units.find((unit) => unit.id === player.id)!.hp,
    ).toBe(0);
  });

  it("Double-Edge hurts the user with recoil", () => {
    const { state, player } = duelWith("double-edge" as DuelMoveId, 30);
    const before = state.units.find((unit) => unit.id === player.id)!.hp;
    const result = use(state, "double-edge" as DuelMoveId);
    const after = result.state.units.find((unit) => unit.id === player.id)!.hp;
    expect(after).toBeLessThan(before);
  });

  it("Earthquake and Hyper Beam are plain damage moves", () => {
    for (const id of ["earthquake", "hyper-beam"] as const) {
      const { state } = duelWith(id as DuelMoveId, 40);
      const result = use(state, id as DuelMoveId);
      if (result.presentation?.kind !== "move") continue;
      expect(result.presentation.results[0].damage).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Ultra Ball and Master Ball", () => {
  it("a Master Ball never fails and an Ultra Ball beats a Great Ball", async () => {
    const { fireRedCaptureChance } = await import("../src/capture");
    const base = { catchRate: 3, statusModifier: 1, hp: 40, maxHp: 100 };
    expect(fireRedCaptureChance({ ...base, ballModifier: 255 })).toBe(1);
    expect(DUEL_ITEMS["ultra-ball"].kind).toBe("capture");
    expect(
      fireRedCaptureChance({ ...base, ballModifier: 2 }),
    ).toBeGreaterThan(fireRedCaptureChance({ ...base, ballModifier: 1.5 }));
  });
});
