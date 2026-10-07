/**
 * Input actions shared by keyboard, mouse and gamepad.
 *
 * Every menu understands the keyboard (arrows + Enter / Escape and friends). Mouse and gamepad are
 * translated into those same keys by the input bridge, so a menu only has to be written once and
 * behaves identically with any device. This module is pure (no DOM) so it can be unit tested.
 */
export type InputAction = "up" | "down" | "left" | "right" | "confirm" | "back";

/** The canonical key each action is sent as. */
export const KEY_FOR_ACTION: Readonly<Record<InputAction, string>> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  confirm: "Enter",
  back: "Escape",
};

/** Same sets the menus use (see StartMenu): WASD / arrows move, Enter Space Z E confirm, Esc X Backspace Tab M go back. */
export function actionForKey(key: string): InputAction | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return "up";
    case "arrowdown":
    case "s":
      return "down";
    case "arrowleft":
    case "a":
      return "left";
    case "arrowright":
    case "d":
      return "right";
    case "enter":
    case " ":
    case "z":
    case "e":
      return "confirm";
    case "escape":
    case "x":
    case "backspace":
    case "tab":
    case "m":
      return "back";
    default:
      return null;
  }
}

/** Left button confirms, right button goes back; the middle button does nothing. */
export function actionForMouseButton(button: number): InputAction | null {
  if (button === 0) return "confirm";
  if (button === 2) return "back";
  return null;
}

/** Scrolling a menu with the wheel moves the cursor. */
export function actionForWheel(deltaY: number): InputAction | null {
  if (deltaY > 0) return "down";
  if (deltaY < 0) return "up";
  return null;
}

/** Standard-mapping Gamepad buttons: D-pad 12-15, A = 0 confirm, B = 1 back, Start = 9 back (opens the menu). */
export const GAMEPAD_BUTTON_ACTION: Readonly<Record<number, InputAction>> = {
  0: "confirm",
  1: "back",
  9: "back",
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

export const GAMEPAD_STICK_THRESHOLD = 0.55;

export const DIRECTION_ACTIONS: readonly InputAction[] = ["up", "down", "left", "right"];

export function isDirection(action: InputAction): boolean {
  return DIRECTION_ACTIONS.includes(action);
}

/** Overlays whose own code listens to the keyboard: the bridge only has to send them keys. */
export const KEY_SCOPE_SELECTOR = ".start-menu-overlay, .capture-summary-overlay, .dialogue-panel";
/** Overlays made of buttons: the bridge moves the focus between the buttons and clicks the focused one. */
export const BUTTON_SCOPE_SELECTOR =
  ".battle-shell, .battle-results-overlay, .story-overlay, .mart-overlay, .pokemon-evolution-overlay";
/** Elements that react to a click by themselves: the bridge must not add a confirm on top. */
export const NATIVE_CLICK_SELECTOR =
  "button, a, input, select, textarea, label, summary, [role=button], [role=menuitem], [data-input-native]";
