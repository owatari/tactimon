import type { StoryState } from "./story";

/** FireRed Safari Zone rules: ₽500 buys 30 Safari Balls and 500 steps. */
export const SAFARI_FEE = 500;
export const SAFARI_STEPS = 500;
export const SAFARI_BALLS = 30;

export const SAFARI_ENTRANCE_MAP_ID = "fuchsia-city-safari-zone-entrance";

export function isSafariMap(mapId: string): boolean {
  return mapId.startsWith("safari-zone-");
}

export function isSafariActive(story: StoryState): boolean {
  return Boolean(story.safari);
}

export type SafariStartResult =
  | { ok: true; story: StoryState }
  | { ok: false; reason: "active" | "money" };

export function startSafari(story: StoryState): SafariStartResult {
  if (story.safari) return { ok: false, reason: "active" };
  if (story.money < SAFARI_FEE) return { ok: false, reason: "money" };

  const savedBalls = story.inventory["poke-ball"] ?? 0;
  return {
    ok: true,
    story: {
      ...story,
      money: story.money - SAFARI_FEE,
      inventory: { ...story.inventory, "poke-ball": SAFARI_BALLS },
      safari: { steps: SAFARI_STEPS, balls: SAFARI_BALLS, savedBalls },
    },
  };
}

/** Closes the game: leftover Safari Balls vanish and normal balls come back. */
export function endSafari(story: StoryState): StoryState {
  if (!story.safari) return story;
  return {
    ...story,
    inventory: {
      ...story.inventory,
      "poke-ball": story.safari.savedBalls,
    },
    safari: null,
  };
}

export type SafariStepResult = {
  story: StoryState;
  /** Why the game ended on this step (steps spent / no balls left). */
  ended: "steps" | "balls" | null;
};

/** One walked step inside the zone: counts down and mirrors the ball count. */
export function applySafariStep(
  story: StoryState,
  mapId: string,
): SafariStepResult {
  if (!story.safari || !isSafariMap(mapId)) {
    return { story, ended: null };
  }

  const steps = Math.max(0, story.safari.steps - 1);
  const balls = story.inventory["poke-ball"] ?? 0;
  const next: StoryState = {
    ...story,
    safari: { ...story.safari, steps, balls },
  };

  if (steps === 0) return { story: next, ended: "steps" };
  if (balls <= 0) return { story: next, ended: "balls" };
  return { story: next, ended: null };
}

/** Ball count changed by a battle (thrown balls): keep the session in sync. */
export function syncSafariBalls(story: StoryState): StoryState {
  if (!story.safari) return story;
  const balls = story.inventory["poke-ball"] ?? 0;
  return balls === story.safari.balls
    ? story
    : { ...story, safari: { ...story.safari, balls } };
}

export function safariOutOfBalls(story: StoryState): boolean {
  return Boolean(story.safari) && (story.inventory["poke-ball"] ?? 0) <= 0;
}

export function safariEndMessage(
  reason: "steps" | "balls" | "left",
): string {
  switch (reason) {
    case "steps":
      return "Ding-dong! Seu tempo acabou! Sua Safari Zone acabou.";
    case "balls":
      return "Ding-dong! Você ficou sem Safari Balls! Sua Safari Zone acabou.";
    default:
      return "Você saiu da Safari Zone. As Safari Balls restantes foram devolvidas.";
  }
}
