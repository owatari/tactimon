import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  createFollower,
  facingFromDelta,
  followerOnPlayerStep,
  followerPose,
  followerSpecies,
  followerVisible,
} from "../apps/client/lib/follower";
import { chooseStarter, normalizeStoryState } from "../apps/client/lib/story";

const TILE = 16;

describe("party follower", () => {
  it("trails the player by one tile and arrives together with the player", () => {
    // Player stands on tile (5,5) and starts walking east; the follower waits on (4,5).
    let f = createFollower(4 * TILE, 5 * TILE, "right");
    f = followerOnPlayerStep(f, { fromX: 5 * TILE, fromY: 5 * TILE, startedAt: 1000, duration: 200 });
    expect(followerPose(f, 1000).pose).toMatchObject({ x: 4 * TILE, y: 5 * TILE, moving: true, facing: "right" });
    expect(followerPose(f, 1100).pose.x).toBeCloseTo(4.5 * TILE);
    const done = followerPose(f, 1200);
    expect(done.pose).toMatchObject({ x: 5 * TILE, y: 5 * TILE, moving: false });
    expect(done.state.moving).toBe(false);
  });

  it("handles each player step once, so a held key chains steps without drifting", () => {
    let f = createFollower(0, 0);
    const step = { fromX: 16, fromY: 0, startedAt: 500, duration: 180 };
    f = followerOnPlayerStep(f, step);
    const again = followerOnPlayerStep(f, step);
    expect(again).toBe(f);
    f = followerPose(f, 700).state;
    f = followerOnPlayerStep(f, { fromX: 32, fromY: 0, startedAt: 700, duration: 180 });
    expect(followerPose(f, 880).pose).toMatchObject({ x: 32, y: 0 });
  });

  it("swaps places when the player walks back onto the follower", () => {
    let f = createFollower(4 * TILE, 5 * TILE);
    // Player at (5,5) steps west into the follower's tile: the follower slides into (5,5).
    f = followerOnPlayerStep(f, { fromX: 5 * TILE, fromY: 5 * TILE, startedAt: 10, duration: 100 });
    expect(followerPose(f, 110).pose).toMatchObject({ x: 5 * TILE, y: 5 * TILE });
  });

  it("faces the direction it moves and keeps its facing when idle", () => {
    expect(facingFromDelta(16, 0, "down")).toBe("right");
    expect(facingFromDelta(-16, 3, "down")).toBe("left");
    expect(facingFromDelta(0, -16, "down")).toBe("up");
    expect(facingFromDelta(0, 16, "up")).toBe("down");
    expect(facingFromDelta(0, 0, "left")).toBe("left");
    const f = followerOnPlayerStep(createFollower(0, 0, "left"), { fromX: 0, fromY: 0, startedAt: 1, duration: 100 });
    expect(f.moving).toBe(false);
    expect(f.facing).toBe("left");
  });

  it("follows the first healthy party member and hides when nobody can walk", () => {
    const base = chooseStarter("charmander");
    expect(followerSpecies(base)).toBe("charmander");
    const lead = { ...base.playerPokemon!, currentHp: 0 };
    const second = createPokemonProgression("pidgey", 5);
    const story = normalizeStoryState({ ...base, playerPokemon: lead, capturedPokemon: [second] } as never);
    expect(followerSpecies(story)).toBe("pidgey");
    const allFainted = normalizeStoryState({ ...story, capturedPokemon: [{ ...second, currentHp: 0 }] } as never);
    expect(followerSpecies(allFainted)).toBeNull();
    expect(followerSpecies({ playerPokemon: null, capturedPokemon: [] })).toBeNull();
  });

  it("is hidden while surfing, transitioning or in the starter scene", () => {
    const ok = { species: "charmander" as const, surfing: false, transitioning: false, starterScene: false };
    expect(followerVisible(ok)).toBe(true);
    expect(followerVisible({ ...ok, surfing: true })).toBe(false);
    expect(followerVisible({ ...ok, transitioning: true })).toBe(false);
    expect(followerVisible({ ...ok, starterScene: true })).toBe(false);
    expect(followerVisible({ ...ok, species: null })).toBe(false);
  });
});
