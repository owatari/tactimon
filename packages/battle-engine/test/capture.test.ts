import { describe, expect, it } from "vitest";
import { CAPTURE_EXP_BONUS, fireRedCaptureChance, getCaptureEligibility, resolveCaptureRoll } from "../src/capture";
import type { BattleUnit, EncounterRules } from "../src/types";

const rules: EncounterRules = { capturePolicy: "allowed", captureHpThresholdRatio: 1 };
const wild = (currentHp: number): BattleUnit => ({ id: "wild-1", ownerId: null, wild: true, boss: false, currentHp, maxHp: 100, speed: 50, position: { x: 0, y: 0 }, captureAttempted: false });

describe("capture eligibility", () => {
  it("allows any living wild target at any HP and after earlier attempts", () => {
    expect(getCaptureEligibility(wild(100), rules).allowed).toBe(true);
    expect(getCaptureEligibility(wild(51), rules).allowed).toBe(true);
    const tried = wild(30);
    tried.captureAttempted = true;
    expect(getCaptureEligibility(tried, rules).allowed).toBe(true);
  });
  it("rejects bosses, fainted and non-wild targets and forbidden encounters", () => {
    const boss = wild(5);
    boss.boss = true;
    expect(getCaptureEligibility(boss, rules).reason).toBe("target-is-boss");
    expect(getCaptureEligibility(wild(0), rules).reason).toBe("target-fainted");
    const owned = wild(5);
    owned.wild = false;
    expect(getCaptureEligibility(owned, rules).reason).toBe("target-not-wild");
    expect(getCaptureEligibility(wild(5), { ...rules, capturePolicy: "forbidden" }).reason).toBe("encounter-forbids-capture");
  });
});

describe("Generation III catch odds", () => {
  const base = { catchRate: 45, ballModifier: 1, statusModifier: 1, maxHp: 100 };
  it("a lower HP catches better, and status, a better ball and an easier species help", () => {
    const full = fireRedCaptureChance({ ...base, hp: 100 });
    const half = fireRedCaptureChance({ ...base, hp: 50 });
    const low = fireRedCaptureChance({ ...base, hp: 5 });
    expect(low).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(full);
    expect(fireRedCaptureChance({ ...base, hp: 50, statusModifier: 2 })).toBeGreaterThan(half);
    expect(fireRedCaptureChance({ ...base, hp: 50, ballModifier: 2 })).toBeGreaterThan(half);
    expect(fireRedCaptureChance({ ...base, hp: 50, catchRate: 255, statusModifier: 2 })).toBe(1);
  });
  it("a Master Ball never fails and a roll below the chance succeeds", () => {
    expect(fireRedCaptureChance({ ...base, hp: 100, ballModifier: 255 })).toBe(1);
    expect(resolveCaptureRoll(0.2, 0.5)).toEqual({ success: true });
    expect(resolveCaptureRoll(0.9, 0.5)).toEqual({ success: false });
  });
  it("capturing is worth the knock-out EXP plus 20%", () => {
    expect(CAPTURE_EXP_BONUS).toBe(1.2);
  });
});

describe("catch rates", () => {
  it("every Kanto species has a finite ROM catch rate (37 used to be uncatchable)", async () => {
    const { ROM_CATCH_RATE } = await import("../src/generated/evYield");
    const { catchRateFor } = await import("../src");
    expect(Object.keys(ROM_CATCH_RATE)).toHaveLength(151);
    for (const id of ["machop", "onix", "growlithe", "bellsprout", "ponyta", "slowpoke", "shellder", "rhyhorn", "gyarados", "charmander"]) {
      const rate = catchRateFor(id);
      expect(Number.isFinite(rate), id).toBe(true);
      expect(rate, id).toBeGreaterThanOrEqual(3);
      expect(fireRedCaptureChance({ catchRate: rate, ballModifier: 1, statusModifier: 1, hp: 5, maxHp: 50 }), id).toBeGreaterThan(0);
    }
    expect(catchRateFor("machop")).toBe(180);
    expect(catchRateFor("not-a-species")).toBe(45);
    expect(fireRedCaptureChance({ catchRate: Number.NaN, ballModifier: 1, statusModifier: 1, hp: 5, maxHp: 50 })).toBeGreaterThan(0);
  });
});

describe("captureChanceFor (the hover odds)", () => {
  it("equals the chance a throw rolls against, and is null for targets that cannot be caught", async () => {
    const { createWildDuel, captureChanceFor, applyDuelAction, createTrainerDuel } = await import("../src");
    let checked = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const state = createWildDuel({
        seed, width: 9, height: 7, blocked: [], captureAllowed: true,
        items: { potion: 0, "poke-ball": 3, "great-ball": 2, "ultra-ball": 1 },
        players: [{ species: "bulbasaur", level: 20, moves: ["tackle"] }],
        wildSpecies: ["rattata", "snorlax", "machop", "pidgey"][seed % 4] as never, wildLevel: 3 + (seed % 7),
      } as never);
      const player = state.units.find((u) => u.side === "player")!;
      const wild = state.units.find((u) => u.side === "rival")!;
      const hurt = { ...state, activeUnitId: player.id, units: state.units.map((u) => u.id === wild.id ? { ...u, hp: Math.max(1, Math.floor(u.maxHp * ((seed % 9) + 1) / 10)), status: seed % 3 === 0 ? "sleep" as const : null } : { ...u, ap: 12, maxAp: 12 }) };
      for (const ball of ["poke-ball", "great-ball", "ultra-ball"] as const) {
        const chance = captureChanceFor(hurt, wild.id, ball)!;
        expect(chance).toBeGreaterThan(0);
        expect(chance).toBeLessThanOrEqual(1);
        const result = applyDuelAction(hurt, { kind: "use-item", unitId: player.id, itemId: ball, targetId: wild.id });
        expect(result.accepted).toBe(true);
        expect(result.presentation?.kind === "capture" ? result.presentation.chance : -1).toBeCloseTo(chance, 10);
        checked += 1;
      }
    }
    expect(checked).toBe(180);
    const trainer = createTrainerDuel({ seed: 1, players: [{ species: "bulbasaur", level: 5, moves: ["tackle"] }], rivals: [{ species: "rattata", level: 5, moves: ["tackle"] }] } as never);
    const foe = trainer.units.find((u) => u.side === "rival")!;
    expect(captureChanceFor(trainer, foe.id, "poke-ball")).toBeNull();
    expect(captureChanceFor(trainer, "nobody", "poke-ball")).toBeNull();
    expect(captureChanceFor(trainer, foe.id, "potion")).toBeNull();
  });
});

describe("Premier Ball", () => {
  it("catches exactly like a Poké Ball, costs 4 AP and is a usable battle item", async () => {
    const { createWildDuel, captureChanceFor, applyDuelAction, DUEL_ITEMS, itemApCost } = await import("../src");
    expect(DUEL_ITEMS["premier-ball"].ballModifier).toBe(DUEL_ITEMS["poke-ball"].ballModifier);
    expect(itemApCost("premier-ball")).toBe(itemApCost("poke-ball"));
    const state = createWildDuel({
      seed: 3, width: 9, height: 7, blocked: [], captureAllowed: true,
      items: { potion: 0, "poke-ball": 2, "premier-ball": 2 },
      players: [{ species: "bulbasaur", level: 20, moves: ["tackle"] }],
      wildSpecies: "rattata", wildLevel: 4,
    } as never);
    const player = state.units.find((u) => u.side === "player")!;
    const wild = state.units.find((u) => u.side === "rival")!;
    const ready = { ...state, activeUnitId: player.id, units: state.units.map((u) => (u.id === player.id ? { ...u, ap: 12, maxAp: 12 } : u)) };
    expect(captureChanceFor(ready, wild.id, "premier-ball")).toBe(captureChanceFor(ready, wild.id, "poke-ball"));
    const thrown = applyDuelAction(ready, { kind: "use-item", unitId: player.id, itemId: "premier-ball", targetId: wild.id });
    expect(thrown.accepted).toBe(true);
    expect(thrown.state.items["premier-ball"]).toBe(1);
  });
});
