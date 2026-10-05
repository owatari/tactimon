import { describe, expect, it } from "vitest";
import {
  GYM_LEADER_PARTY_SIZE,
  OVERWORLD_TRAINERS,
} from "../apps/client/lib/trainers";

const leaders = OVERWORLD_TRAINERS.filter(
  (trainer) => trainer.badgeId && trainer.mapId.endsWith("-gym"),
);

describe("gym leader parties", () => {
  it("covers all eight Kanto gym leaders", () => {
    expect(new Set(leaders.map((l) => l.badgeId)).size).toBe(8);
  });

  it("always fields six Pokémon", () => {
    for (const leader of leaders) {
      expect(leader.party, leader.id).toHaveLength(GYM_LEADER_PARTY_SIZE);
    }
  });

  it("keeps added members inside the original level range", () => {
    const original: Record<string, [number, number]> = {
      "pewter-brock": [12, 14],
      "cerulean-misty": [18, 21],
      "vermilion-lt-surge": [18, 24],
      "celadon-city-gym-erika": [24, 29],
      "fuchsia-city-gym-koga": [37, 43],
      "cinnabar-island-gym-blaine": [40, 47],
      "saffron-city-gym-sabrina": [37, 43],
      "viridian-city-gym-giovanni": [42, 50],
    };
    for (const leader of leaders) {
      const [min, max] = original[leader.id];
      for (const member of leader.party) {
        expect(member.level, leader.id).toBeGreaterThanOrEqual(min);
        expect(member.level, leader.id).toBeLessThanOrEqual(max);
        expect(member.moves.length).toBeGreaterThan(0);
      }
    }
  });

  it("leaves regular trainers untouched", () => {
    const regular = OVERWORLD_TRAINERS.filter((t) => !t.badgeId);
    expect(regular.length).toBeGreaterThan(100);
    expect(
      regular.some((t) => t.party.length === GYM_LEADER_PARTY_SIZE && t.mapId.endsWith("-gym") && /Leader/.test(t.name)),
    ).toBe(false);
  });
});
