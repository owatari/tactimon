import {
  BUTTON_SCOPE_SELECTOR,
  KEY_FOR_ACTION,
  KEY_SCOPE_SELECTOR,
  NATIVE_CLICK_SELECTOR,
  actionForKey,
  actionForMouseButton,
  actionForWheel,
  isDirection,
  type InputAction,
} from "./actions";
import { GamepadTracker, type GamepadSnapshot } from "./gamepad";
import { pickSpatialTarget } from "./spatial";

/** Marker on the keyboard events the bridge creates, so nothing mistakes them for real key presses. */
export const BRIDGE_FLAG = "__inputBridge";

const WHEEL_THROTTLE_MS = 90;
const HOVER_STEP_LIMIT = 40;
const PRIORITY_GROUPS = ".battle-selection-dock, .battle-action-popover";
const FOCUSABLE = "button:not([disabled]), [tabindex='0']";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The overlay made of buttons that currently owns the screen (a results screen above the battle, say). */
export function activeButtonScope(doc: Document): HTMLElement | null {
  const scopes = [...doc.querySelectorAll<HTMLElement>(BUTTON_SCOPE_SELECTOR)].filter(isVisible);
  if (scopes.length === 0) return null;
  return scopes.find((scope) => !scope.classList.contains("battle-shell")) ?? scopes[0];
}

export function hasKeyScope(doc: Document): boolean {
  return doc.querySelector(KEY_SCOPE_SELECTOR) !== null;
}

/** Sends `action` to the page as the keyboard key every menu already understands. */
export function emitAction(
  win: Window,
  action: InputAction,
  phase: "down" | "up" = "down",
  repeat = false,
): void {
  const event = new (win as Window & typeof globalThis).KeyboardEvent(phase === "down" ? "keydown" : "keyup", {
    key: KEY_FOR_ACTION[action],
    bubbles: true,
    cancelable: true,
    repeat,
  });
  Object.defineProperty(event, BRIDGE_FLAG, { value: true });
  win.dispatchEvent(event);
}

/** Moves the focus between the buttons of an overlay in the pressed direction. */
export function moveFocus(scope: HTMLElement, direction: InputAction): void {
  const doc = scope.ownerDocument;
  // An open sub menu (action list, item / move dock) owns the arrows before the rest of the screen.
  const group = [...scope.querySelectorAll<HTMLElement>(PRIORITY_GROUPS)].find(isVisible) ?? scope;
  const items = [...group.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);
  if (items.length === 0) return;
  const rects = items.map((item) => {
    const r = item.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
  const current = items.indexOf(doc.activeElement as HTMLElement);
  const next = pickSpatialTarget(rects, current, direction);
  if (next >= 0) {
    items[next].focus({ preventScroll: false });
    items[next].scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }
}

function clickBack(doc: Document): boolean {
  const back = [...doc.querySelectorAll<HTMLElement>("[data-input-back]")].find(
    (el) => isVisible(el) && !(el as HTMLButtonElement).disabled,
  );
  if (!back) return false;
  back.click();
  return true;
}

/**
 * Makes every menu usable with keyboard, mouse and gamepad alike:
 * - left click on a menu (not on a button) = confirm, right click = back, wheel = up / down;
 * - hovering a row of a `[data-nav]` list selects it;
 * - overlays made of buttons get arrow-key focus movement, confirm = click, back = `[data-input-back]`;
 * - gamepad: D-pad / left stick = arrows, A = confirm, B / Start = back.
 * Returns the cleanup function.
 */
export function installInputBridge(win: Window = window): () => void {
  const doc = win.document;
  let lastWheel = 0;
  let raf = 0;
  const tracker = new GamepadTracker();
  const cleanups: Array<() => void> = [];
  const on = <K extends keyof WindowEventMap>(
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) => {
    win.addEventListener(type, handler as EventListener, options);
    cleanups.push(() => win.removeEventListener(type, handler as EventListener, options));
  };

  // Right click = back. Some pages cancel the pointer events (which also hides the mouse ones), so it
  // is read from pointerdown and, as a fallback, from contextmenu (whichever comes first wins).
  let lastBack = -1000;
  const goBack = (target: EventTarget | null): boolean => {
    if (isTypingTarget(target)) return false;
    const now = Date.now();
    if (now - lastBack < 80) return true;
    lastBack = now;
    if (clickBack(doc)) return true;
    if (hasKeyScope(doc)) {
      emitAction(win, "back");
      emitAction(win, "back", "up");
      return true;
    }
    return false;
  };
  on("pointerdown", (event) => {
    if (actionForMouseButton(event.button) === "back") goBack(event.target);
  });
  // The browser menu never opens over the game.
  on("contextmenu", (event) => {
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
    goBack(event.target);
  });

  on("click", (event) => {
    if (actionForMouseButton(event.button) !== "confirm") return;
    const target = event.target as HTMLElement | null;
    if (!target || !target.closest) return;
    if (!target.closest(KEY_SCOPE_SELECTOR)) return;
    if (target.closest(NATIVE_CLICK_SELECTOR)) return;
    emitAction(win, "confirm");
    emitAction(win, "confirm", "up");
  });

  on(
    "wheel",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.closest || !target.closest(KEY_SCOPE_SELECTOR)) return;
      const action = actionForWheel(event.deltaY);
      if (!action) return;
      const now = Date.now();
      if (now - lastWheel < WHEEL_THROTTLE_MS) return;
      lastWheel = now;
      event.preventDefault();
      emitAction(win, action);
      emitAction(win, action, "up");
    },
    { passive: false },
  );

  // Hovering a row of a list selects it: the cursor is walked there with the same arrow keys.
  on("mouseover", (event) => {
    const target = event.target as HTMLElement | null;
    const list = target?.closest?.<HTMLElement>("[data-nav]");
    if (!target || !list || !list.closest(KEY_SCOPE_SELECTOR)) return;
    const rows = [...list.children] as HTMLElement[];
    const hovered = rows.findIndex((row) => row === target || row.contains(target));
    const selected = rows.findIndex((row) => row.classList.contains("selected"));
    if (hovered < 0 || selected < 0 || hovered === selected) return;
    const horizontal = list.dataset.nav === "horizontal";
    const forward: InputAction = horizontal ? "right" : "down";
    const backward: InputAction = horizontal ? "left" : "up";
    const steps = Math.min(HOVER_STEP_LIMIT, Math.abs(hovered - selected));
    const action = hovered > selected ? forward : backward;
    let sent = 0;
    const step = () => {
      if (sent >= steps) return;
      sent += 1;
      emitAction(win, action);
      emitAction(win, action, "up");
      win.setTimeout(step, 0);
    };
    step();
  });

  // Overlays made of buttons: arrows move the focus, confirm clicks it, back clicks the back button.
  on("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target) || hasKeyScope(doc)) return;
    const scope = activeButtonScope(doc);
    if (!scope) return;
    const action = actionForKey(event.key);
    if (!action) return;
    if (isDirection(action)) {
      event.preventDefault();
      moveFocus(scope, action);
    } else if (action === "confirm") {
      // A real Enter / Space already clicks the focused button; only the bridge's own key needs help.
      if (!event.isTrusted) {
        const active = doc.activeElement as HTMLElement | null;
        if (active && scope.contains(active) && active.tagName === "BUTTON") active.click();
      }
    } else if (action === "back" && clickBack(doc)) {
      event.preventDefault();
    }
  });

  // Gamepad: polled every frame and sent through the same keys.
  const poll = () => {
    const pads = typeof navigator.getGamepads === "function" ? [...navigator.getGamepads()] : [];
    const snapshots: GamepadSnapshot[] = pads
      .filter((pad): pad is Gamepad => Boolean(pad))
      .map((pad) => ({ buttons: pad.buttons.map((button) => button.pressed), axes: [...pad.axes] }));
    for (const { action, phase } of tracker.update(snapshots, performance.now())) {
      if (phase === "up") emitAction(win, action, "up");
      else emitAction(win, action, "down", phase === "repeat");
    }
    raf = win.requestAnimationFrame(poll);
  };
  raf = win.requestAnimationFrame(poll);
  cleanups.push(() => win.cancelAnimationFrame(raf));

  return () => cleanups.forEach((cleanup) => cleanup());
}
