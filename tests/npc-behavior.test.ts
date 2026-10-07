import { describe, expect, it } from "vitest";
import {
  NpcEngine,
  UNIMPLEMENTED_MOVEMENT_TYPES,
  behaviorFor,
  facingBetween,
  implementedMovementTypes,
  initialFacing,
  npcFrame,
  pathToAdjacent,
  pickApproachStart,
  spotsPlayer,
} from "../apps/client/lib/npcBehavior";

/** Movement types present on the extracted Kanto maps (counted from the ROM world data). */
const ROM_MOVEMENT_TYPES = [1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 37, 40, 41, 45, 47, 50, 51, 52, 76, 80];

function seeded(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("movement types", () => {
  it("every type used on Kanto maps is either implemented or knowingly static", () => {
    const known = new Set([...implementedMovementTypes(), ...UNIMPLEMENTED_MOVEMENT_TYPES]);
    for (const type of ROM_MOVEMENT_TYPES) expect(known.has(type), `type ${type}`).toBe(true);
  });

  it("static types face the way their name says", () => {
    expect(initialFacing(7)).toBe("north");
    expect(initialFacing(8)).toBe("south");
    expect(initialFacing(9)).toBe("west");
    expect(initialFacing(10)).toBe("east");
    expect(behaviorFor(999)).toEqual({ kind: "static", facing: null });
  });

  it("uses the walking frames of the sheet and mirrors east", () => {
    expect(npcFrame("south", false, 0)).toBe(0);
    expect(npcFrame("north", false, 0)).toBe(1);
    expect(npcFrame("west", false, 0)).toBe(2);
    expect(npcFrame("south", true, 0)).toBe(3);
    expect(npcFrame("south", true, 1)).toBe(4);
    expect(facingBetween({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe("east");
    expect(facingBetween({ x: 0, y: 0 }, { x: -1, y: -4 })).toBe("north");
  });
});

describe("trainer sight", () => {
  const open = () => false;
  it("spots a player in the faced direction within range and returns the distance", () => {
    expect(spotsPlayer({ trainer: { x: 5, y: 5 }, facing: "east", range: 4, player: { x: 8, y: 5 }, blocksSight: open })).toBe(3);
    expect(spotsPlayer({ trainer: { x: 5, y: 5 }, facing: "east", range: 2, player: { x: 8, y: 5 }, blocksSight: open })).toBeNull();
  });

  it("does not see behind itself, sideways, or through walls", () => {
    expect(spotsPlayer({ trainer: { x: 5, y: 5 }, facing: "east", range: 5, player: { x: 3, y: 5 }, blocksSight: open })).toBeNull();
    expect(spotsPlayer({ trainer: { x: 5, y: 5 }, facing: "east", range: 5, player: { x: 7, y: 6 }, blocksSight: open })).toBeNull();
    expect(
      spotsPlayer({ trainer: { x: 5, y: 5 }, facing: "south", range: 5, player: { x: 5, y: 9 }, blocksSight: (x, y) => x === 5 && y === 7 }),
    ).toBeNull();
  });
});

describe("walking to the player", () => {
  const free = (blocked: string[] = []) => (x: number, y: number) =>
    x >= 0 && y >= 0 && x < 12 && y < 12 && !blocked.includes(`${x},${y}`);

  it("walks straight until it stands next to the player", () => {
    const route = pathToAdjacent({ from: { x: 2, y: 5 }, target: { x: 7, y: 5 }, isFree: free() })!;
    expect(route).toEqual([{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }]);
  });

  it("returns an empty route when already adjacent and null when boxed in", () => {
    expect(pathToAdjacent({ from: { x: 6, y: 5 }, target: { x: 7, y: 5 }, isFree: free() })).toEqual([]);
    const wall = ["3,5", "1,5", "2,4", "2,6"];
    expect(pathToAdjacent({ from: { x: 2, y: 5 }, target: { x: 7, y: 5 }, isFree: free(wall) })).toBeNull();
  });

  it("goes around an obstacle and never steps on the player", () => {
    const route = pathToAdjacent({ from: { x: 2, y: 5 }, target: { x: 7, y: 5 }, isFree: free(["4,5", "5,5"]) })!;
    expect(route.length).toBeGreaterThan(4);
    expect(route.some((tile) => tile.x === 7 && tile.y === 5)).toBe(false);
    const last = route[route.length - 1];
    expect(Math.abs(last.x - 7) + Math.abs(last.y - 5)).toBe(1);
  });

  it("a rival that comes to the player starts about five steps away", () => {
    const start = pickApproachStart({ player: { x: 6, y: 6 }, isFree: free() })!;
    expect(Math.abs(start.x - 6) + Math.abs(start.y - 6)).toBeGreaterThanOrEqual(4);
  });
});

describe("NPC engine", () => {
  const always = () => true;

  it("looks around: the facing changes over time", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.1, 0.9, 0.4, 0.7]) });
    engine.setNpcs([{ key: "a", x: 3, y: 3, movementType: 1 }], 0);
    const seen = new Set<string>();
    for (let t = 0; t < 60000; t += 100) {
      engine.update(t);
      seen.add(engine.facing("a")!);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("static NPCs never move or turn", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.5]) });
    engine.setNpcs([{ key: "a", x: 3, y: 3, movementType: 9 }], 0);
    for (let t = 0; t < 30000; t += 100) engine.update(t);
    expect(engine.tile("a")).toEqual({ x: 3, y: 3 });
    expect(engine.facing("a")).toBe("west");
  });

  it("wanders inside its range, claims the destination tile and respects obstacles", () => {
    const engine = new NpcEngine({ isFree: (x, y) => !(x === 4 && y === 3), random: seeded([0.05, 0.6, 0.3, 0.95, 0.45, 0.8]) });
    engine.setNpcs([{ key: "a", x: 3, y: 3, movementType: 2, rangeX: 1, rangeY: 1 }], 0);
    let moved = false;
    for (let t = 0; t < 120000; t += 50) {
      engine.update(t);
      const tile = engine.tile("a")!;
      if (tile.x !== 3 || tile.y !== 3) moved = true;
      expect(Math.abs(tile.x - 3)).toBeLessThanOrEqual(1);
      expect(Math.abs(tile.y - 3)).toBeLessThanOrEqual(1);
      expect(tile.x === 4 && tile.y === 3).toBe(false);
    }
    expect(moved).toBe(true);
  });

  it("vertical wanderers stay on their column", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.2, 0.7, 0.9, 0.1, 0.5]) });
    engine.setNpcs([{ key: "a", x: 3, y: 3, movementType: 3, rangeX: 0, rangeY: 2 }], 0);
    for (let t = 0; t < 120000; t += 50) {
      engine.update(t);
      expect(engine.tile("a")!.x).toBe(3);
    }
  });

  it("patrols back and forth along its axis", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.5]) });
    engine.setNpcs([{ key: "a", x: 3, y: 3, movementType: 27, rangeX: 2, rangeY: 0 }], 0);
    const xs = new Set<number>();
    for (let t = 0; t < 60000; t += 50) {
      engine.update(t);
      xs.add(engine.tile("a")!.x);
    }
    expect(Math.min(...xs)).toBe(1);
    expect(Math.max(...xs)).toBe(5);
  });

  it("a scripted walk goes tile by tile, faces the way it walks and calls back when done", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.5]) });
    engine.setNpcs([{ key: "t", x: 2, y: 5, movementType: 10, facing: "east" }], 0);
    let done = 0;
    engine.scriptWalk("t", [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }], 200, 0, () => (done += 1));
    const frames: number[] = [];
    for (let t = 0; t <= 1000; t += 20) {
      engine.update(t);
      frames.push(engine.poses(t)[0].frame);
    }
    expect(engine.tile("t")).toEqual({ x: 5, y: 5 });
    expect(done).toBe(1);
    expect(engine.facing("t")).toBe("east");
    expect(frames.some((frame) => frame >= 7)).toBe(true);
  });

  it("an NPC mid-script ignores its normal behaviour and keeps its place across map refreshes", () => {
    const engine = new NpcEngine({ isFree: always, random: seeded([0.5]) });
    engine.setNpcs([{ key: "t", x: 2, y: 5, movementType: 1 }], 0);
    engine.scriptWalk("t", [{ x: 3, y: 5 }], 200, 0);
    engine.update(0);
    engine.update(500);
    engine.setNpcs([{ key: "t", x: 2, y: 5, movementType: 1 }], 600);
    expect(engine.tile("t")).toEqual({ x: 3, y: 5 });
  });
});
