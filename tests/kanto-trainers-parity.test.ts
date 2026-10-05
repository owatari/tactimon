import { describe, expect, it } from "vitest";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";
import { DUEL_MOVES } from "../packages/battle-engine/src";

describe("Kanto trainers", () => {
  it("keeps unique ids on known maps with legal moves", () => {
    const ids = OVERWORLD_TRAINERS.map((trainer) => trainer.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const trainer of OVERWORLD_TRAINERS) {
      expect(Object.keys(WORLD_MAPS), trainer.id).toContain(trainer.mapId);
      for (const mon of trainer.party) {
        for (const move of mon.moves ?? []) {
          expect(DUEL_MOVES, `${trainer.id}:${mon.species}`).toHaveProperty(move);
        }
      }
    }
  });

  it("places the S.S. Anne, Mt. Moon and Pewter Gym trainers from FireRed", () => {
    const count = (mapId: string) =>
      OVERWORLD_TRAINERS.filter((trainer) => trainer.mapId === mapId).length;
    expect(count("ss-anne-deck")).toBe(2);
    expect(count("ss-anne-b1f-room-4")).toBe(2);
    expect(count("mt-moon-1f")).toBe(7);
    expect(count("pewter-gym")).toBe(2);
  });
});
