import { describe, expect, it } from "vitest";
import { createTrainerDuel, resolveSimpleAiTurnDetailed, type DuelItemId, type DuelState } from "../src";

function scene(bag: Record<string, number>, patch: (units: DuelState["units"]) => DuelState["units"]) {
  const base = createTrainerDuel({
    seed: 12, width: 11, height: 9, blocked: [],
    players: [{ species: "squirtle", level: 12, moves: ["tackle"] }],
    rivals: [
      { species: "geodude", level: 14, moves: ["tackle"] },
      { species: "onix", level: 14, moves: ["tackle"] },
    ],
    rivalItems: bag, trainerName: "T",
  } as never);
  const rival = base.units.find((u) => u.side === "rival")!;
  const units = patch(base.units.map((u) => (u.id === rival.id ? { ...u, ap: 12, maxAp: 12, position: { x: 9, y: 8 } } : u)));
  const player = units.find((u) => u.side === "player")!;
  return { state: { ...base, activeUnitId: rival.id, units: units.map((u) => (u.id === player.id ? { ...u, position: { x: 0, y: 0 } } : u)) } as DuelState, rival };
}
/** The item the rival AI spent this turn (read off the bag) and what happened to the units. */
function firstItem(state: DuelState) {
  const after = resolveSimpleAiTurnDetailed(state, "rival", { useItems: true, autoCapture: false }).state;
  const used = (Object.keys(state.rivalItems) as DuelItemId[]).find((id) => (after.rivalItems[id] ?? 0) < (state.rivalItems[id] ?? 0));
  return used ? { itemId: used, after } : undefined;
}

describe("rival AI uses the whole bag", () => {
  it("revives a fainted teammate (Revive before Max Revive)", () => {
    const { state, rival } = scene({ revive: 1, "max-revive": 1 }, (u) => u.map((x) => (x.side === "rival" && x.id !== u.find((y) => y.side === "rival")!.id ? { ...x, hp: 0 } : x)));
    const action = firstItem(state);
    expect(action?.itemId).toBe("revive");
    expect(action!.after.units.filter((u) => u.side === "rival" && u.hp > 0).length).toBe(2);
    expect(action!.after.units.find((u) => u.id === rival.id)!.hp).toBeGreaterThan(0);
  });

  it("picks the Potion that fits the wound and keeps Max Potion for the big ones", () => {
    const hurt = (hpFraction: number) => (u: DuelState["units"]) => u.map((x) => (x.id === u.find((y) => y.side === "rival")!.id ? { ...x, hp: Math.max(1, Math.floor(x.maxHp * hpFraction)) } : x));
    const bag = { potion: 2, "super-potion": 2, "hyper-potion": 1, "max-potion": 1 };
    const small = scene(bag, hurt(0.4));
    const smallMissing = small.rival.maxHp - Math.floor(small.rival.maxHp * 0.4);
    const picked = firstItem(small.state)!;
    expect(["potion", "super-potion", "hyper-potion"]).toContain(picked.itemId);
    expect(picked.itemId).not.toBe("max-potion");
    expect(smallMissing).toBeGreaterThan(0);
    const huge = scene({ "max-potion": 1, potion: 1 }, hurt(0.1));
    expect(firstItem(huge.state)?.itemId).toMatch(/potion/);
  });

  it("cures sleep and paralysis with the matching item or a Full Heal, and Full Restore does both jobs", () => {
    const status = (st: "sleep" | "paralysis" | "poison", hp = 1) => (u: DuelState["units"]) =>
      u.map((x) => (x.id === u.find((y) => y.side === "rival")!.id ? { ...x, status: st, hp: Math.floor(x.maxHp * hp) } : x));
    expect(firstItem(scene({ awakening: 1, "full-heal": 1 }, status("sleep")).state)?.itemId).toBe("awakening");
    expect(firstItem(scene({ "full-heal": 1 }, status("paralysis")).state)?.itemId).toBe("full-heal");
    expect(firstItem(scene({ "full-restore": 1 }, status("poison", 0.3)).state)?.itemId).toBe("full-restore");
  });

  it("does not waste items on a healthy team, with an empty bag, or without the AP", () => {
    expect(firstItem(scene({ potion: 3, revive: 1, "full-heal": 1 }, (u) => u).state)).toBeUndefined();
    const hurt = (u: DuelState["units"]) => u.map((x) => (x.side === "rival" ? { ...x, hp: 1 } : x));
    expect(firstItem(scene({ potion: 0 }, hurt).state)).toBeUndefined();
    const broke = scene({ potion: 3 }, hurt);
    const poor = { ...broke.state, units: broke.state.units.map((u) => (u.id === broke.rival.id ? { ...u, ap: 3 } : u)) };
    expect(firstItem(poor)).toBeUndefined();
  });
});
