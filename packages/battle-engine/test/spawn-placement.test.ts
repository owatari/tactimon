import { describe, expect, it } from "vitest";
import {
  createWildDuel,
  manhattanDistance,
  type DuelPoint,
  type DuelPokemonBuild,
} from "../src";

const playerParty: DuelPokemonBuild[] = [
  { species: "charmander", level: 5, moves: ["scratch", "growl"] },
  { species: "pidgey", level: 4, moves: ["tackle", "growl"] },
  { species: "rattata", level: 4, moves: ["tackle", "tail-whip"] },
  { species: "mankey", level: 5, moves: ["scratch", "leer"] },
  { species: "weedle", level: 4, moves: ["poison-sting", "string-shot"] },
  { species: "caterpie", level: 4, moves: ["tackle", "string-shot"] },
];

const wilds = [
  { species: "pidgey" as const, level: 3 },
  { species: "rattata" as const, level: 3 },
  { species: "weedle" as const, level: 3 },
  { species: "caterpie" as const, level: 3 },
  { species: "pidgey" as const, level: 2 },
  { species: "rattata" as const, level: 2 },
  { species: "weedle" as const, level: 2 },
  { species: "caterpie" as const, level: 2 },
  { species: "pidgey" as const, level: 3 },
  { species: "rattata" as const, level: 3 },
];

function key(point: DuelPoint) {
  return `${point.x},${point.y}`;
}

function hasPath(
  start: DuelPoint,
  end: DuelPoint,
  width: number,
  height: number,
  blocked: readonly DuelPoint[],
) {
  const blockedKeys = new Set(blocked.map(key));
  const seen = new Set([key(start)]);
  const queue = [start];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (key(current) === key(end)) return true;
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const nextKey = key(next);
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= width ||
        next.y >= height ||
        blockedKeys.has(nextKey) ||
        seen.has(nextKey)
      ) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }

  return false;
}

describe("battle team spawn placement", () => {
  it("places a 6x10 encounter on unique connected cells with tactical separation", () => {
    const state = createWildDuel({
      seed: 20261004,
      width: 13,
      height: 7,
      blocked: [],
      players: playerParty,
      wilds,
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const occupied = state.units.map((unit) => key(unit.position));
    expect(new Set(occupied).size).toBe(16);

    const players = state.units.filter((unit) => unit.side === "player");
    const rivals = state.units.filter((unit) => unit.side === "rival");
    expect(players).toHaveLength(6);
    expect(rivals).toHaveLength(10);
    expect(hasPath(players[0].position, rivals[0].position, 13, 7, state.blocked)).toBe(true);

    const anchorDistance = manhattanDistance(players[0].position, rivals[0].position);
    expect(anchorDistance).toBeGreaterThanOrEqual(3);
    expect(anchorDistance).toBeLessThanOrEqual(8);
  });

  it("keeps spawns inside the largest navigable region and out of isolated islands", () => {
    const blocked: DuelPoint[] = [];
    for (let y = 0; y < 7; y += 1) blocked.push({ x: 5, y });
    blocked.splice(blocked.findIndex((p) => p.x === 5 && p.y === 3), 1);

    // Isolate the far-right 2x2 corner from the main region.
    blocked.push({ x: 9, y: 4 }, { x: 9, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 5 });

    const state = createWildDuel({
      seed: 44,
      width: 10,
      height: 7,
      blocked,
      players: playerParty.slice(0, 3),
      wilds: wilds.slice(0, 4),
      wildSpecies: "pidgey",
      wildLevel: 3,
    });

    const blockedKeys = new Set(blocked.map(key));
    for (const unit of state.units) {
      expect(blockedKeys.has(key(unit.position))).toBe(false);
    }
    const players = state.units.filter((unit) => unit.side === "player");
    const rivals = state.units.filter((unit) => unit.side === "rival");
    expect(hasPath(players[0].position, rivals[0].position, 10, 7, blocked)).toBe(true);
  });

  it("handles a narrow corridor without trapping either side", () => {
    const blocked: DuelPoint[] = [];
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 11; x += 1) {
        if (y !== 2) blocked.push({ x, y });
      }
    }

    const state = createWildDuel({
      seed: 90,
      width: 11,
      height: 5,
      blocked,
      players: playerParty.slice(0, 1),
      wilds: wilds.slice(0, 1),
      wildSpecies: "rattata",
      wildLevel: 3,
    });
    const [player, rival] = [
      state.units.find((unit) => unit.side === "player")!,
      state.units.find((unit) => unit.side === "rival")!,
    ];

    expect(hasPath(player.position, rival.position, 11, 5, blocked)).toBe(true);
    expect(manhattanDistance(player.position, rival.position)).toBeGreaterThanOrEqual(3);
    expect(manhattanDistance(player.position, rival.position)).toBeLessThanOrEqual(8);
  });

  it("keeps 6x10 deployments sided, connected and close across seeds and obstacle layouts", () => {
    const width = 17;
    const height = 9;
    for (let seed = 1; seed <= 40; seed += 1) {
      // Deterministic scattered rocks plus a pond in the middle-top.
      const blocked: DuelPoint[] = [];
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const rock = (x * 7 + y * 13 + seed * 5) % 23 === 0;
          const pond = x >= 7 && x <= 9 && y <= 2;
          if (rock || pond) blocked.push({ x, y });
        }
      }

      const state = createWildDuel({
        seed,
        width,
        height,
        blocked,
        players: playerParty,
        wilds,
        wildSpecies: "pidgey",
        wildLevel: 3,
      });
      const blockedKeys = new Set(blocked.map(key));
      const occupied = state.units.map((unit) => key(unit.position));
      expect(new Set(occupied).size).toBe(16);
      expect(occupied.some((cell) => blockedKeys.has(cell))).toBe(false);

      const players = state.units.filter((unit) => unit.side === "player");
      const rivals = state.units.filter((unit) => unit.side === "rival");
      expect(Math.max(...players.map((unit) => unit.position.x))).toBeLessThan(width / 2);
      expect(Math.min(...rivals.map((unit) => unit.position.x))).toBeGreaterThan(width / 2);
      for (const unit of [...players, ...rivals]) {
        expect(hasPath(players[0].position, unit.position, width, height, blocked)).toBe(true);
      }

      const closest = Math.min(
        ...players.flatMap((ally) =>
          rivals.map((enemy) => manhattanDistance(ally.position, enemy.position)),
        ),
      );
      expect(closest).toBeGreaterThanOrEqual(2);
      expect(closest).toBeLessThanOrEqual(7);
    }
  });

  it("prefers the open side of the arena over a cramped pocket", () => {
    // Left third is a maze of pillars; the open meadow is to the right.
    const blocked: DuelPoint[] = [];
    for (let y = 0; y < 9; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if ((x + y) % 2 === 0) blocked.push({ x, y });
      }
    }
    const state = createWildDuel({
      seed: 7,
      width: 17,
      height: 9,
      blocked,
      players: playerParty.slice(0, 3),
      wilds: wilds.slice(0, 3),
      wildSpecies: "pidgey",
      wildLevel: 3,
    });
    const playerAnchor = state.units.find((unit) => unit.side === "player")!;
    expect(playerAnchor.position.x).toBeGreaterThanOrEqual(4);
  });

  it("never spawns on cells supplied as blocked terrain such as water", () => {
    const water: DuelPoint[] = [
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 },
    ];
    const state = createWildDuel({
      seed: 12,
      width: 12,
      height: 7,
      blocked: water,
      players: playerParty.slice(0, 2),
      wilds: wilds.slice(0, 3),
      wildSpecies: "pidgey",
      wildLevel: 3,
    });
    const waterKeys = new Set(water.map(key));
    expect(state.units.every((unit) => !waterKeys.has(key(unit.position)))).toBe(true);
  });
});
