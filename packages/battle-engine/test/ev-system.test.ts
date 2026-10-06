import { describe, expect, it } from "vitest";
import {
  type PokemonProgression,
  VITAMIN_EV_CAP,
  addEvs,
  calculateDuelPokemonMaxHp,
  createPokemonProgression,
  evYieldFor,
  grantRareCandy,
  grantTrainerBattleProgressToParty,
  grantVitamin,
  grantWildBattleProgress,
  grantWildBattlesProgressToParty,
  totalEv,
} from "../src";

describe("FireRed EV system", () => {
  it("reads the ROM EV yield of known species", () => {
    expect(evYieldFor("pidgey")).toEqual({ speed: 1 });
    expect(evYieldFor("pikachu")).toEqual({ speed: 2 });
    expect(evYieldFor("snorlax")).toEqual({ hp: 2 });
    expect(evYieldFor("mewtwo")).toEqual({ specialAttack: 3 });
    expect(evYieldFor("caterpie")).toEqual({ hp: 1 });
  });

  it("levelling up gives no EVs by itself (Rare Candy)", () => {
    const reward = grantRareCandy(createPokemonProgression("charmander", 10))!;
    expect(totalEv(reward.progression.evs)).toBe(0);
    expect(totalEv(reward.evGained)).toBe(0);
  });

  it("a defeated wild gives its yield; a captured one gives nothing", () => {
    const base = createPokemonProgression("charmander", 10);
    const defeated = grantWildBattleProgress(base, { species: "geodude", level: 8 });
    expect(defeated.evGained.defense).toBe(1);
    expect(defeated.progression.evs.defense).toBe(1);
    const captured = grantWildBattleProgress(base, { species: "geodude", level: 8, evYield: false }, 0.5);
    expect(totalEv(captured.evGained)).toBe(0);
  });

  it("every participant receives the full yield of every defeated foe", () => {
    const party = [createPokemonProgression("charmander", 10), createPokemonProgression("pidgey", 10)];
    const rewards = grantWildBattlesProgressToParty(party, [
      { species: "rattata", level: 5 },
      { species: "pidgey", level: 5 },
      { species: "geodude", level: 5, evYield: false },
    ]);
    for (const reward of rewards) {
      expect(reward.evGained).toMatchObject({ speed: 2, defense: 0 });
    }
    const trainer = grantTrainerBattleProgressToParty(party, [
      { species: "onix", level: 12 },
      { species: "geodude", level: 12 },
    ]);
    for (const reward of trainer) {
      expect(reward.evGained).toMatchObject({ defense: 2 });
    }
  });

  it("caps at 252 per stat and 510 in total", () => {
    const full = { hp: 252, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    const capped = addEvs(full, { attack: 3, defense: 5, speed: 5 });
    expect(capped.gained.attack).toBe(0);
    expect(capped.gained.defense).toBe(5);
    expect(capped.gained.speed).toBe(1); // 504 + 5 → 509, then the 510 ceiling stops the sixth point
    expect(totalEv(capped.evs)).toBeLessThanOrEqual(510);
    const nearTotal = addEvs({ hp: 252, attack: 252, defense: 4, specialAttack: 0, specialDefense: 0, speed: 0 }, { defense: 3, speed: 3 });
    expect(totalEv(nearTotal.evs)).toBe(510);
  });

  it("vitamins give +10 up to 100 EVs, raise HP Up's max HP, and then refuse", () => {
    let p: PokemonProgression = createPokemonProgression("squirtle", 20);
    const maxBefore = calculateDuelPokemonMaxHp(p);
    for (let i = 0; i < 10; i += 1) {
      const next = grantVitamin(p, "hp");
      expect(next).not.toBeNull();
      p = next!;
    }
    expect(p.evs.hp).toBe(VITAMIN_EV_CAP);
    expect(calculateDuelPokemonMaxHp(p)).toBeGreaterThan(maxBefore);
    expect(p.currentHp).toBe(calculateDuelPokemonMaxHp(p));
    expect(grantVitamin(p, "hp")).toBeNull();
    expect(grantVitamin(p, "attack")?.evs.attack).toBe(10);
  });

  it("old saves keep the EVs they already earned", () => {
    const old = createPokemonProgression("charmander", 30);
    old.evs = { hp: 30, attack: 12, defense: 0, specialAttack: 40, specialDefense: 0, speed: 24 };
    const reward = grantWildBattleProgress(old, { species: "pidgey", level: 5 });
    expect(reward.progression.evs).toMatchObject({ hp: 30, attack: 12, specialAttack: 40, speed: 25 });
  });
});
