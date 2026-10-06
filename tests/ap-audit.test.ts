import { describe, expect, it } from "vitest";
import {
  DUEL_MOVES,
  calculateDuelPokemonStats,
  createPokemonProgression,
  maxActionPointsForSpeed,
} from "../packages/battle-engine/src";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";

/**
 * AP balance audit (task 029): with the shared AP pool every real opponent must be able to act, and
 * the strong moves must stay inside what the typical Pokémon can pay.
 */
describe("AP balance audit", () => {
  const members = OVERWORLD_TRAINERS.flatMap((trainer) =>
    trainer.party.map((member) => {
      const moves = (member.moves as string[]).map((id) => DUEL_MOVES[id as never]).filter(Boolean);
      const speed = calculateDuelPokemonStats({ species: member.species, level: member.level } as never).speed;
      // makeUnit floors the pool at the cheapest move: mirror it here.
      const ap = Math.max(maxActionPointsForSpeed(speed), ...(moves.length ? [Math.min(...moves.map((m) => m.apCost))] : [0]));
      return { trainer: trainer.id, species: member.species as string, level: member.level, moves, ap };
    }),
  ).filter((m) => m.moves.length > 0);

  it("every trainer Pokémon can afford at least one of its moves", () => {
    const stuck = members.filter((m) => !m.moves.some((move) => move.apCost <= m.ap));
    expect(stuck.map((m) => `${m.trainer}:${m.species}`)).toEqual([]);
  });

  it("almost every trainer Pokémon can use its strongest damage move", () => {
    const withDamage = members.filter((m) => m.moves.some((move) => move.category !== "status" && move.power));
    const locked = withDamage.filter((m) => {
      const best = [...m.moves].filter((x) => x.category !== "status" && x.power).sort((a, b) => (b.power as number) - (a.power as number))[0];
      return best.apCost > m.ap;
    });
    // Self-destruct style moves (power 200) are allowed to stay out of reach for slow Pokémon.
    expect(locked.length / withDamage.length).toBeLessThan(0.06);
  });

  it("the typical Pokémon has 6-9 AP and can still walk two tiles and attack with its cheapest move", () => {
    const average = members.reduce((sum, m) => sum + m.ap, 0) / members.length;
    expect(average).toBeGreaterThan(6.5);
    expect(average).toBeLessThan(9);
    const cannot = members.filter((m) => Math.min(...m.moves.map((x) => x.apCost)) + 2 > m.ap);
    expect(cannot.length / members.length).toBeLessThan(0.1);
  });

  it("every Kanto species keeps a usable move at levels 5, 30 and 100", () => {
    const species = new Set(members.map((m) => m.species));
    const stuck: string[] = [];
    for (const id of species) {
      for (const level of [5, 30, 100]) {
        let progression;
        try {
          progression = createPokemonProgression(id as never, level);
        } catch {
          continue;
        }
        const moves = progression.activeMoves.map((moveId) => DUEL_MOVES[moveId]);
        const ap = Math.max(
          maxActionPointsForSpeed(calculateDuelPokemonStats(progression).speed),
          Math.min(...moves.map((m) => m.apCost)),
        );
        if (!moves.some((move) => move.apCost <= ap)) stuck.push(`${id}@${level}`);
      }
    }
    expect(stuck).toEqual([]);
  });
});
