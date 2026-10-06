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

  it("fields exactly the requested team of each leader, in order", () => {
    const expected: Record<string, string[]> = {
      "pewter-brock": ["geodude", "geodude", "rhyhorn", "onix"],
      "cerulean-misty": ["staryu", "starmie", "goldeen", "seaking", "psyduck"],
      "vermilion-lt-surge": ["voltorb", "electrode", "magnemite", "magneton", "pikachu", "raichu"],
      "celadon-city-gym-erika": ["tangela", "vileplume", "victreebel", "ivysaur", "exeggutor"],
      "fuchsia-city-gym-koga": ["koffing", "koffing", "weezing", "muk", "arbok", "tentacruel"],
      "saffron-city-gym-sabrina": ["kadabra", "alakazam", "mr-mime", "golduck", "venomoth", "jynx"],
      "cinnabar-island-gym-blaine": ["growlithe", "ponyta", "rapidash", "arcanine", "magmar", "flareon"],
      "viridian-city-gym-giovanni": ["rhyhorn", "dugtrio", "nidoqueen", "nidoking", "rhyhorn", "rhydon"],
    };
    for (const leader of leaders) {
      expect(leader.party.map((m) => m.species), leader.id).toEqual(expected[leader.id]);
      expect(leader.party.length).toBeLessThanOrEqual(GYM_LEADER_PARTY_SIZE);
    }
  });

  it("keeps every member inside the leader's original level range and with moves", () => {
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
        expect(member.moves.length, `${leader.id} ${member.species}`).toBeGreaterThan(0);
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
