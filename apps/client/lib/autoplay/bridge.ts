import type { Dir, PlanExit, PlanObject } from "./planner";

/** What the Auto Player can see of the overworld right now. */
export type OverworldSnapshot = {
  mapId: string;
  width: number;
  height: number;
  x: number;
  y: number;
  facing: Dir;
  moving: boolean;
  /** A map transition (fade) is running. */
  transitioning: boolean;
  /** A menu, battle or other overlay owns the screen. */
  paused: boolean;
  cutscene: boolean;
  dialogue: { choices: string[] } | null;
  surfing: boolean;
  walkable: (x: number, y: number) => boolean;
  /** Wild Pokémon can appear on this cell (tall grass, cave floor, water while surfing). */
  isEncounter: (x: number, y: number) => boolean;
  /** A shop / nurse counter tile. */
  isCounter: (x: number, y: number) => boolean;
  objects: PlanObject[];
  exits: PlanExit[];
};

/** Registered by `OverworldGame`: the only door through which the bot touches the world. */
export type OverworldControl = {
  snapshot(): OverworldSnapshot | null;
  /** Holds one direction (the player keeps walking while it is held); null releases every key. */
  hold(dir: Dir | null): void;
  /** Turns the player without taking a step. */
  face(dir: Dir): void;
  interact(): void;
  /** Advances the open dialogue by one page; false when none is open. */
  advanceDialogue(): boolean;
  chooseDialogue(index: number): void;
};

let control: OverworldControl | null = null;
const stepHooks = new Set<() => void>();

export function registerOverworldControl(next: OverworldControl): () => void {
  control = next;
  return () => {
    if (control === next) control = null;
  };
}

export function getOverworldControl(): OverworldControl | null {
  return control;
}

/** Called by the overworld loop before every physics step, so the bot can turn exactly on tile boundaries. */
export function onOverworldStep(hook: () => void): () => void {
  stepHooks.add(hook);
  return () => stepHooks.delete(hook);
}

export function runOverworldStepHooks(): void {
  for (const hook of stepHooks) hook();
}
