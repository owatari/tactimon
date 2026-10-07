import { describe, expect, it } from "vitest";
import {
  KEY_FOR_ACTION,
  actionForKey,
  actionForMouseButton,
  actionForWheel,
} from "../apps/client/lib/input/actions";
import {
  GAMEPAD_REPEAT_DELAY_MS,
  GamepadTracker,
  heldActions,
} from "../apps/client/lib/input/gamepad";
import { pickSpatialTarget } from "../apps/client/lib/input/spatial";

describe("input actions", () => {
  it("keyboard keys map to the same actions the menus use", () => {
    expect(actionForKey("ArrowUp")).toBe("up");
    expect(actionForKey("s")).toBe("down");
    expect(actionForKey("Enter")).toBe("confirm");
    expect(actionForKey(" ")).toBe("confirm");
    expect(actionForKey("Escape")).toBe("back");
    expect(actionForKey("Backspace")).toBe("back");
    expect(actionForKey("r")).toBe("cycle");
    expect(actionForKey("F5")).toBeNull();
  });

  it("every action round-trips through its canonical key", () => {
    for (const [action, key] of Object.entries(KEY_FOR_ACTION)) {
      expect(actionForKey(key)).toBe(action);
    }
  });

  it("left click confirms, right click goes back, wheel moves the cursor", () => {
    expect(actionForMouseButton(0)).toBe("confirm");
    expect(actionForMouseButton(2)).toBe("back");
    expect(actionForMouseButton(1)).toBeNull();
    expect(actionForWheel(120)).toBe("down");
    expect(actionForWheel(-120)).toBe("up");
    expect(actionForWheel(0)).toBeNull();
  });
});

describe("gamepad tracker", () => {
  const pad = (pressed: number[] = [], axes: number[] = [0, 0]) => ({
    buttons: Array.from({ length: 16 }, (_, i) => pressed.includes(i)),
    axes,
  });

  it("maps D-pad, A, B, Start and the left stick", () => {
    expect([...heldActions(pad([0]))]).toEqual(["confirm"]);
    expect([...heldActions(pad([1, 9]))]).toEqual(["back"]);
    // R1 / RB cycles walk and run (and the bike later), like the R key.
    expect([...heldActions(pad([5]))]).toEqual(["cycle"]);
    expect([...heldActions(pad([12, 15]))].sort()).toEqual(["right", "up"]);
    expect([...heldActions(pad([], [-0.9, 0]))]).toEqual(["left"]);
    expect([...heldActions(pad([], [0.2, 0.3]))]).toEqual([]);
  });

  it("emits down once, repeats a held direction after the delay and releases it", () => {
    const tracker = new GamepadTracker();
    expect(tracker.update([pad([13])], 0)).toEqual([{ action: "down", phase: "down" }]);
    expect(tracker.update([pad([13])], 100)).toEqual([]);
    expect(tracker.update([pad([13])], GAMEPAD_REPEAT_DELAY_MS + 5)).toEqual([{ action: "down", phase: "repeat" }]);
    expect(tracker.update([pad([13])], GAMEPAD_REPEAT_DELAY_MS + 20)).toEqual([]);
    expect(tracker.update([pad()], 1000)).toEqual([{ action: "down", phase: "up" }]);
  });

  it("confirm, back and cycle never auto-repeat", () => {
    const tracker = new GamepadTracker();
    tracker.update([pad([0, 5])], 0);
    expect(tracker.update([pad([0, 5])], 2000)).toEqual([]);
  });
});

describe("spatial focus", () => {
  // A 2 x 2 grid of buttons plus a wide one below.
  const rects = [
    { left: 0, top: 0, right: 40, bottom: 20 },
    { left: 50, top: 0, right: 90, bottom: 20 },
    { left: 0, top: 30, right: 40, bottom: 50 },
    { left: 50, top: 30, right: 90, bottom: 50 },
    { left: 0, top: 60, right: 90, bottom: 80 },
  ];

  it("starts on the first button in reading order", () => {
    expect(pickSpatialTarget(rects, -1, "down")).toBe(0);
  });

  it("moves to the neighbour in the pressed direction", () => {
    expect(pickSpatialTarget(rects, 0, "right")).toBe(1);
    expect(pickSpatialTarget(rects, 0, "down")).toBe(2);
    expect(pickSpatialTarget(rects, 3, "left")).toBe(2);
    expect(pickSpatialTarget(rects, 3, "up")).toBe(1);
    expect(pickSpatialTarget(rects, 3, "down")).toBe(4);
  });

  it("wraps around when nothing lies ahead", () => {
    expect(pickSpatialTarget(rects, 4, "down")).toBe(0);
    expect(pickSpatialTarget(rects, 1, "right")).toBe(0);
  });

  it("handles an empty list", () => {
    expect(pickSpatialTarget([], 0, "up")).toBe(-1);
  });
});
