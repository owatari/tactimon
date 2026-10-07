import {
  GAMEPAD_BUTTON_ACTION,
  GAMEPAD_STICK_THRESHOLD,
  isDirection,
  type InputAction,
} from "./actions";

export type GamepadEvent = { action: InputAction; phase: "down" | "up" | "repeat" };

export const GAMEPAD_REPEAT_DELAY_MS = 350;
export const GAMEPAD_REPEAT_INTERVAL_MS = 110;

export type GamepadSnapshot = { buttons: readonly boolean[]; axes: readonly number[] };

/** Actions currently held on a pad: mapped buttons plus the left stick as a D-pad. */
export function heldActions(snapshot: GamepadSnapshot): Set<InputAction> {
  const held = new Set<InputAction>();
  snapshot.buttons.forEach((pressed, index) => {
    const action = GAMEPAD_BUTTON_ACTION[index];
    if (pressed && action) held.add(action);
  });
  const [x = 0, y = 0] = snapshot.axes;
  if (x <= -GAMEPAD_STICK_THRESHOLD) held.add("left");
  if (x >= GAMEPAD_STICK_THRESHOLD) held.add("right");
  if (y <= -GAMEPAD_STICK_THRESHOLD) held.add("up");
  if (y >= GAMEPAD_STICK_THRESHOLD) held.add("down");
  return held;
}

/**
 * Turns polled pad states into key-like events: "down" when an action starts, "repeat" while a
 * direction stays held (after a delay), "up" when released. Pure, so the timing is testable.
 */
export class GamepadTracker {
  private pressedAt = new Map<InputAction, number>();
  private lastRepeat = new Map<InputAction, number>();

  update(snapshots: readonly GamepadSnapshot[], now: number): GamepadEvent[] {
    const held = new Set<InputAction>();
    for (const snapshot of snapshots) for (const action of heldActions(snapshot)) held.add(action);
    const events: GamepadEvent[] = [];

    for (const action of held) {
      if (!this.pressedAt.has(action)) {
        this.pressedAt.set(action, now);
        this.lastRepeat.set(action, now);
        events.push({ action, phase: "down" });
      } else if (isDirection(action)) {
        const since = now - (this.pressedAt.get(action) ?? now);
        const last = this.lastRepeat.get(action) ?? now;
        if (since >= GAMEPAD_REPEAT_DELAY_MS && now - last >= GAMEPAD_REPEAT_INTERVAL_MS) {
          this.lastRepeat.set(action, now);
          events.push({ action, phase: "repeat" });
        }
      }
    }
    for (const action of [...this.pressedAt.keys()]) {
      if (!held.has(action)) {
        this.pressedAt.delete(action);
        this.lastRepeat.delete(action);
        events.push({ action, phase: "up" });
      }
    }
    return events;
  }
}
