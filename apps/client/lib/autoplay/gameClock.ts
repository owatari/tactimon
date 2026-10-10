import { useSyncExternalStore } from "react";

/** Speeds the Auto Player can run the game at. */
export const AUTO_SPEEDS = [1, 2, 4, 8, 16] as const;
export type AutoSpeed = (typeof AUTO_SPEEDS)[number];

export type GameClockState = {
  /** The Auto Player is on: the game is muted and runs at `speed`. */
  autoplay: boolean;
  speed: AutoSpeed;
};

let state: GameClockState = { autoplay: false, speed: 1 };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export function getGameClock(): GameClockState {
  return state;
}

export function setAutoplay(enabled: boolean): void {
  if (state.autoplay === enabled) return;
  state = { ...state, autoplay: enabled };
  emit();
}

export function setAutoSpeed(speed: AutoSpeed): void {
  if (state.speed === speed) return;
  state = { ...state, speed };
  emit();
}

/** Multiplier applied to world movement, battle animations and timers (1 when the Auto Player is off). */
export function timeScale(): number {
  return state.autoplay ? state.speed : 1;
}

/** Sound is forced off while the Auto Player runs. */
export function isGameMuted(): boolean {
  return state.autoplay;
}

let virtualNow = typeof performance === "undefined" ? 0 : performance.now();

/**
 * The game's own clock (ms). Everything in the overworld that used `performance.now()` reads this one,
 * so walking, NPC routes and animations all run faster together when the Auto Player speeds the game up.
 */
export function gameNow(): number {
  return virtualNow;
}

/** Advances the game clock by `ms` of game time (called once per physics step by the overworld loop). */
export function advanceGameClock(ms: number): number {
  virtualNow += ms;
  return virtualNow;
}

export function subscribeGameClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameClock(): GameClockState {
  return useSyncExternalStore(subscribeGameClock, getGameClock, getGameClock);
}

/**
 * Splits one frame of `deltaMs` (already multiplied by the speed) into steps no longer than `maxStep`,
 * so a 16× frame never makes the world jump several tiles in one physics step.
 */
export function splitFrame(deltaMs: number, maxStep = 50): number[] {
  if (!(deltaMs > 0)) return [];
  const count = Math.max(1, Math.ceil(deltaMs / maxStep));
  return Array.from({ length: count }, () => deltaMs / count);
}
