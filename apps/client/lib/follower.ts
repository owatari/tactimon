import type { DuelSpeciesId } from "@tactimon/battle-engine";
import type { StoryState } from "./story";

/** Overworld partner (HeartGold/SoulSilver style): the lead Pokémon trails the player by one tile. */
export type FollowerFacing = "up" | "down" | "left" | "right";

export type FollowerState = {
  /** Pixel position (same space as `RuntimePlayer.visualX/Y`). */
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  duration: number;
  moving: boolean;
  facing: FollowerFacing;
  /** `stepStartedAt` of the last player step already handled. */
  seenStepAt: number;
};

export type FollowerPose = {
  x: number;
  y: number;
  moving: boolean;
  facing: FollowerFacing;
};

export function createFollower(x: number, y: number, facing: FollowerFacing = "down"): FollowerState {
  return {
    x, y, fromX: x, fromY: y, toX: x, toY: y,
    startedAt: 0, duration: 1, moving: false, facing, seenStepAt: -1,
  };
}

export function facingFromDelta(dx: number, dy: number, fallback: FollowerFacing): FollowerFacing {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  if (dy !== 0) return dy > 0 ? "down" : "up";
  return fallback;
}

/**
 * The player starts a step: the follower slides into the tile the player is leaving, over the same
 * duration, so it is always exactly one step behind (and swaps places when the player turns back).
 */
export function followerOnPlayerStep(
  follower: FollowerState,
  step: { fromX: number; fromY: number; startedAt: number; duration: number },
): FollowerState {
  if (step.startedAt === follower.seenStepAt) return follower;
  const dx = step.fromX - follower.x;
  const dy = step.fromY - follower.y;
  return {
    ...follower,
    fromX: follower.x,
    fromY: follower.y,
    toX: step.fromX,
    toY: step.fromY,
    startedAt: step.startedAt,
    duration: Math.max(1, step.duration),
    moving: dx !== 0 || dy !== 0,
    facing: facingFromDelta(dx, dy, follower.facing),
    seenStepAt: step.startedAt,
  };
}

/** Pose at `now`; also returns the settled state once the slide is over. */
export function followerPose(follower: FollowerState, now: number): { state: FollowerState; pose: FollowerPose } {
  if (!follower.moving) {
    return { state: follower, pose: { x: follower.x, y: follower.y, moving: false, facing: follower.facing } };
  }
  const progress = Math.max(0, Math.min(1, (now - follower.startedAt) / follower.duration));
  const x = follower.fromX + (follower.toX - follower.fromX) * progress;
  const y = follower.fromY + (follower.toY - follower.fromY) * progress;
  if (progress >= 1) {
    const settled: FollowerState = { ...follower, x: follower.toX, y: follower.toY, moving: false };
    return { state: settled, pose: { x: settled.x, y: settled.y, moving: false, facing: settled.facing } };
  }
  return { state: { ...follower, x, y }, pose: { x, y, moving: true, facing: follower.facing } };
}

/** First party member that can walk (HeartGold: the lead; a fainted lead hands over to the next). */
export function followerSpecies(story: Pick<StoryState, "playerPokemon" | "capturedPokemon">): DuelSpeciesId | null {
  for (const pokemon of [story.playerPokemon, ...story.capturedPokemon]) {
    if (pokemon && pokemon.currentHp > 0) return pokemon.species;
  }
  return null;
}

/** Hidden while surfing, in the starter scene and when nobody in the party can walk. */
export function followerVisible(input: {
  species: DuelSpeciesId | null;
  surfing: boolean;
  transitioning: boolean;
  starterScene: boolean;
}): boolean {
  return input.species !== null && !input.surfing && !input.transitioning && !input.starterScene;
}
