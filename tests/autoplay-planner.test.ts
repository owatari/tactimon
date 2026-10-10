import { describe, expect, it } from "vitest";
import {
  createMemory,
  findPath,
  markExitUsed,
  markInteracted,
  nextAction,
  observeStory,
  type PlanWorld,
} from "../apps/client/lib/autoplay/planner";

/** '#' wall, '.' floor, 'N' npc tile (blocked), 'E' floor next to an exit. */
function world(rows: string[], at: [number, number], extra: Partial<PlanWorld> = {}): PlanWorld {
  const height = rows.length;
  const width = rows[0].length;
  return {
    mapId: "test",
    width,
    height,
    x: at[0],
    y: at[1],
    facing: "south",
    walkable: (x, y) => rows[y]?.[x] === "." || rows[y]?.[x] === "E",
    objects: [],
    exits: [],
    ...extra,
  };
}

describe("findPath", () => {
  it("finds the shortest walk around walls and reports unreachable goals", () => {
    const w = world(["....", ".##.", "...."], [0, 0]);
    const path = findPath(w, (x, y) => x === 3 && y === 2)!;
    expect(path.length).toBe(5);
    expect(path.at(-1)).toMatchObject({ x: 3, y: 2 });
    expect(findPath(world([".#.", ".#."], [0, 0]), (x) => x === 2)).toBeNull();
    expect(findPath(w, (x, y) => x === 0 && y === 0)).toEqual([]);
  });
});

describe("nextAction", () => {
  it("talks to the nearest NPC first: walk, face, interact, then never again this epoch", () => {
    const rows = ["......", "..N...", "......"];
    const w = world(rows, [0, 0], { objects: [{ id: "npc", kind: "dialogue", x: 2, y: 1 }] });
    const memory = createMemory();
    const first = nextAction(w, memory);
    expect(first).toMatchObject({ kind: "move" });

    // standing left of the NPC but facing south: turn first, then talk
    const beside = { ...w, x: 1, y: 1, facing: "south" as const };
    expect(nextAction(beside, memory)).toMatchObject({ kind: "face", dir: "east" });
    expect(nextAction({ ...beside, facing: "east" }, memory)).toMatchObject({ kind: "interact", objectId: "npc" });

    markInteracted(memory, "test", "npc");
    expect(nextAction({ ...beside, facing: "east" }, memory).kind).not.toBe("interact");
  });

  it("talks across a counter", () => {
    const rows = ["...", "...", "..."];
    const w = world(rows, [1, 2], {
      facing: "north",
      objects: [{ id: "clerk", kind: "mart-clerk", x: 1, y: 0 }],
      walkable: (x, y) => !(y === 1 && x === 1) && x >= 0 && x < 3 && y >= 0 && y < 3 && !(x === 1 && y === 0),
    });
    expect(nextAction(w, createMemory())).toMatchObject({ kind: "interact", objectId: "clerk" });
  });

  it("walks to the far side of a counter to reach the nurse behind it", () => {
    const rows = ["#####", "..N..", "ccccc", "....."];
    const w = world(rows, [0, 3], {
      objects: [{ id: "nurse", kind: "dialogue", x: 2, y: 1 }],
      walkable: (x, y) => rows[y]?.[x] === "." ,
      isCounter: (x, y) => rows[y]?.[x] === "c",
    });
    const memory = createMemory();
    expect(nextAction(w, memory)).toMatchObject({ kind: "move" });
    // standing right below the counter, facing it: the nurse is two tiles away and still reachable
    const there = { ...w, x: 2, y: 3, facing: "north" as const };
    expect(nextAction(there, memory)).toMatchObject({ kind: "interact", objectId: "nurse" });
  });

  it("leaves through the least used exit, preferring maps it has not seen", () => {
    const rows = ["E...E"];
    const exits = [
      { x: 0, y: 0, dir: "west" as const, to: "left" },
      { x: 4, y: 0, dir: "east" as const, to: "right" },
    ];
    const memory = createMemory();
    memory.visitedMaps.add("left");
    const w = world(rows, [2, 0], { exits });
    const action = nextAction(w, memory);
    expect(action).toMatchObject({ kind: "move", dir: "east" });
    expect(nextAction({ ...w, x: 4 }, memory)).toMatchObject({ kind: "leave", exit: { to: "right" } });

    // both seen: the one used less wins
    memory.visitedMaps.add("right");
    markExitUsed(memory, "test", exits[1]);
    markExitUsed(memory, "test", exits[1]);
    markExitUsed(memory, "test", exits[0]);
    expect(nextAction(w, memory)).toMatchObject({ kind: "move", dir: "west" });
  });

  it("talks to everyone again when the story moves on", () => {
    const w = world(["..N"], [1, 0], { facing: "east", objects: [{ id: "npc", kind: "dialogue", x: 2, y: 0 }] });
    const memory = createMemory();
    observeStory(memory, "a");
    markInteracted(memory, "test", "npc");
    expect(nextAction(w, memory).kind).toBe("idle");
    observeStory(memory, "a");
    expect(nextAction(w, memory).kind).toBe("idle");
    observeStory(memory, "b");
    expect(nextAction(w, memory)).toMatchObject({ kind: "interact", objectId: "npc" });
  });

  it("reports idle when nothing is reachable", () => {
    const w = world(["..#.E"], [0, 0], { exits: [{ x: 4, y: 0, dir: "east", to: "far" }] });
    expect(nextAction(w, createMemory())).toMatchObject({ kind: "idle" });
  });
});
