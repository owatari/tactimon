import { describe, expect, it } from "vitest";
import {
  NATURE_IDS,
  calculateDuelPokemonStats,
  calculateOtherStat,
  createPokemonProgression,
  createWildDuel,
  isNatureId,
  naturePercent,
  natureEffect,
  normalizeIvs,
  normalizePokemonProgression,
  rollPersonality,
} from "../src";

describe("natures", () => {
  it("has 25 natures: five neutral, twenty with one stat up and one down", () => {
    expect(NATURE_IDS).toHaveLength(25);
    const neutral = NATURE_IDS.filter((n) => natureEffect(n).up === null);
    expect(neutral).toEqual(["hardy", "docile", "serious", "bashful", "quirky"]);
  });

  it("matches the FireRed table for known natures", () => {
    expect(natureEffect("adamant")).toEqual({ up: "attack", down: "specialAttack" });
    expect(natureEffect("timid")).toEqual({ up: "speed", down: "attack" });
    expect(natureEffect("modest")).toEqual({ up: "specialAttack", down: "attack" });
    expect(natureEffect("bold")).toEqual({ up: "defense", down: "attack" });
    expect(natureEffect("careful")).toEqual({ up: "specialDefense", down: "specialAttack" });
    expect(natureEffect("jolly")).toEqual({ up: "speed", down: "specialAttack" });
  });

  it("applies +10% / -10% with integer rounding and never touches HP", () => {
    expect(naturePercent("adamant", "attack")).toBe(110);
    expect(naturePercent("adamant", "specialAttack")).toBe(90);
    expect(naturePercent("adamant", "speed")).toBe(100);
    expect(naturePercent(undefined, "attack")).toBe(100);
    expect(calculateOtherStat({ base: 80, iv: 15, ev: 0, level: 50, nature: 1.1 })).toBe(
      Math.floor((Math.floor(((2 * 80 + 15) * 50) / 100) + 5) * 110 / 100),
    );
    expect(calculateOtherStat({ base: 80, iv: 15, ev: 0, level: 50, nature: 0.9 })).toBe(
      Math.floor((Math.floor(((2 * 80 + 15) * 50) / 100) + 5) * 90 / 100),
    );
  });
});

describe("IVs", () => {
  it("normalizes to 0-31 integers and rejects incomplete spreads", () => {
    expect(normalizeIvs({ hp: 40, attack: -3, defense: 7.9, specialAttack: 0, specialDefense: 31, speed: 15 })).toEqual({
      hp: 31, attack: 0, defense: 7, specialAttack: 0, specialDefense: 31, speed: 15,
    });
    expect(normalizeIvs({ hp: 1 })).toBeUndefined();
    expect(normalizeIvs(undefined)).toBeUndefined();
  });

  it("rolls every IV in range and every nature eventually", () => {
    let i = 0;
    const random = () => ((i += 1) * 0.6180339887) % 1;
    const seen = new Set<string>();
    for (let n = 0; n < 400; n += 1) {
      const p = rollPersonality(random);
      expect(isNatureId(p.nature)).toBe(true);
      seen.add(p.nature);
      for (const value of Object.values(p.ivs)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(31);
      }
    }
    expect(seen.size).toBe(25);
    expect(rollPersonality(() => 0.999999).ivs.hp).toBe(31);
  });
});

describe("stats with personality", () => {
  it("uses the stored IVs and nature; missing ones keep the old IV 15 / neutral behaviour", () => {
    const base = calculateDuelPokemonStats({ species: "charmander", level: 30 });
    const same = calculateDuelPokemonStats({ species: "charmander", level: 30, ivs: undefined, nature: undefined });
    expect(same).toEqual(base);
    const perfect = calculateDuelPokemonStats({
      species: "charmander",
      level: 30,
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      nature: "adamant",
    });
    expect(perfect.attack).toBeGreaterThan(base.attack);
    expect(perfect.specialAttack).toBeLessThan(calculateDuelPokemonStats({
      species: "charmander",
      level: 30,
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    }).specialAttack);
    expect(perfect.hp).toBeGreaterThan(base.hp);
  });

  it("progression keeps valid personality, drops garbage, and survives a copy", () => {
    const p = createPokemonProgression("pikachu", 10, rollPersonality(() => 0.5));
    const copy = normalizePokemonProgression(JSON.parse(JSON.stringify(p)));
    expect(copy.nature).toBe(p.nature);
    expect(copy.ivs).toEqual(p.ivs);
    const broken = normalizePokemonProgression({ ...p, nature: "nope", ivs: { hp: 1 } } as never);
    expect(broken.nature).toBeUndefined();
    expect(broken.ivs).toBeUndefined();
    expect(normalizePokemonProgression(createPokemonProgression("pikachu", 10)).nature).toBeUndefined();
  });

  it("wild units get a seeded personality that the capture result carries", () => {
    const mk = (seed: number) =>
      createWildDuel({
        seed, width: 9, height: 7, blocked: [],
        players: [{ species: "charmander", level: 5, moves: ["scratch"] }],
        wildSpecies: "rattata", wildLevel: 4,
        wilds: [{ species: "rattata", level: 4 }, { species: "pidgey", level: 4 }],
      } as never);
    const a = mk(7);
    const b = mk(7);
    const wilds = (s: ReturnType<typeof mk>) => s.units.filter((u) => u.side === "rival");
    expect(wilds(a).map((u) => [u.nature, u.ivs])).toEqual(wilds(b).map((u) => [u.nature, u.ivs]));
    expect(wilds(a)[0].nature).toBeDefined();
    expect(wilds(a)[0].ivs).toBeDefined();
    const allSame = [1, 2, 3, 4, 5, 6].map((s) => wilds(mk(s))[0].nature);
    expect(new Set(allSame).size).toBeGreaterThan(1);
  });
});

describe("nicknames", () => {
  it("normalizes to at most 10 visible characters and drops empty/control input", async () => {
    const { normalizeNickname, MAX_NICKNAME_LENGTH } = await import("../src");
    expect(MAX_NICKNAME_LENGTH).toBe(10);
    expect(normalizeNickname("  Sparky  ")).toBe("Sparky");
    expect(normalizeNickname("ABCDEFGHIJKLMNOP")).toBe("ABCDEFGHIJ");
    expect(normalizeNickname("a\u0000b\nc")).toBe("abc");
    expect(normalizeNickname("   ")).toBeUndefined();
    expect(normalizeNickname(42)).toBeUndefined();
  });

  it("is kept by progression normalization and shown on battle units", () => {
    const p = { ...createPokemonProgression("pikachu", 10), nickname: "Zap" };
    expect(normalizePokemonProgression(p).nickname).toBe("Zap");
    expect(normalizePokemonProgression({ ...p, nickname: "" }).nickname).toBeUndefined();
    const duel = createWildDuel({
      seed: 3, width: 9, height: 7, blocked: [],
      players: [{ species: "pikachu", level: 10, moves: ["thunder-shock"], nickname: "Zap" }],
      wildSpecies: "rattata", wildLevel: 4,
    } as never);
    expect(duel.units.find((u) => u.side === "player")?.nickname).toBe("Zap");
  });
});
