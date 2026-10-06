import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPRITE_GROUND_Y,
  SPRITE_MAX_HEIGHT_TILES,
  SPRITE_MAX_WIDTH_TILES,
  spriteFrameLayout,
  spriteTileSpan,
  type SpriteAnimationMetrics,
} from "../apps/client/lib/spriteLayout";

// Real SpriteCollab measurements (idle + attack, battle-facing rows).
const zubatIdle: SpriteAnimationMetrics = {
  frameWidth: 32,
  frameHeight: 56,
  bounds: { left: 6, top: 5, right: 27, bottom: 34 },
  groundX: 16,
  groundY: 32,
};
const parasIdle: SpriteAnimationMetrics = {
  frameWidth: 24,
  frameHeight: 24,
  bounds: { left: 1, top: 2, right: 23, bottom: 21 },
  groundX: 12,
  groundY: 16,
};
const onixIdle: SpriteAnimationMetrics = {
  frameWidth: 96,
  frameHeight: 104,
  bounds: { left: 2, top: 4, right: 94, bottom: 57 },
  groundX: 48,
  groundY: 56,
};
const onixAttack: SpriteAnimationMetrics = {
  frameWidth: 128,
  frameHeight: 152,
  bounds: { left: 0, top: 28, right: 128, bottom: 81 },
  groundX: 64,
  groundY: 80,
};

function visibleBodyTiles(
  idle: SpriteAnimationMetrics,
  animation: SpriteAnimationMetrics,
) {
  const layout = spriteFrameLayout(idle, animation);
  const b = animation.bounds!;
  return {
    width: (b.right - b.left) * layout.scale,
    height: (b.bottom - b.top) * layout.scale,
    bottom: layout.top + b.bottom * layout.scale,
    centerX: layout.left + ((b.left + b.right) / 2) * layout.scale,
  };
}

describe("battle sprite layout", () => {
  it("makes small species such as Paras and Zubat fill at least one tile", () => {
    for (const idle of [parasIdle, zubatIdle]) {
      const body = visibleBodyTiles(idle, idle);
      expect(Math.max(body.width, body.height)).toBeGreaterThanOrEqual(0.99);
    }
  });

  it("keeps even Onix inside its own tile (one tile wide, at most 1.4 tall)", () => {
    const body = visibleBodyTiles(onixIdle, onixIdle);
    expect(body.width).toBeLessThanOrEqual(SPRITE_MAX_WIDTH_TILES + 1e-9);
    expect(body.height).toBeLessThanOrEqual(SPRITE_MAX_HEIGHT_TILES + 1e-9);
    expect(spriteTileSpan(onixIdle)).toBeCloseTo(1, 6);
  });

  it("limits tall bodies by height and centres the body horizontally on the tile", () => {
    const tall: SpriteAnimationMetrics = {
      frameWidth: 40, frameHeight: 72,
      bounds: { left: 12, top: 4, right: 28, bottom: 52 },
      groundX: 20, groundY: 50,
    };
    const body = visibleBodyTiles(tall, tall);
    expect(body.height).toBeCloseTo(SPRITE_MAX_HEIGHT_TILES, 6);
    expect(body.width).toBeLessThan(SPRITE_MAX_WIDTH_TILES);
    expect(Math.abs(body.centerX - 0.5)).toBeLessThan(0.05);
  });

  it("anchors the ground point on the tile, not the canvas bottom", () => {
    for (const [idle, animation] of [
      [onixIdle, onixIdle],
      [onixIdle, onixAttack],
      [parasIdle, parasIdle],
    ] as const) {
      const layout = spriteFrameLayout(idle, animation);
      const groundTop =
        layout.top + animation.groundY! * layout.scale;
      const groundLeft =
        layout.left + animation.groundX! * layout.scale;
      expect(groundTop).toBeCloseTo(SPRITE_GROUND_Y, 6);
      expect(groundLeft).toBeCloseTo(0.5, 6);
    }
    // Onix's feet sit near the tile ground line instead of floating.
    const onix = visibleBodyTiles(onixIdle, onixIdle);
    expect(Math.abs(onix.bottom - SPRITE_GROUND_Y)).toBeLessThan(0.1);
  });

  it("uses one source-pixel scale for every animation of a species", () => {
    expect(spriteFrameLayout(onixIdle, onixAttack).scale).toBe(
      spriteFrameLayout(onixIdle, onixIdle).scale,
    );
  });
});

const manifestPath = resolve(
  __dirname,
  "../apps/client/public/game-assets/pokemon-sprites/manifest.json",
);

describe.skipIf(!existsSync(manifestPath))(
  "runtime sprite manifest audit (local assets)",
  () => {
    it("has visible bounds and a PMD ground point for every battle animation", () => {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        species: Record<
          string,
          { animations: Record<string, SpriteAnimationMetrics> }
        >;
      };
      for (const [species, entry] of Object.entries(manifest.species)) {
        const idle = entry.animations.idle;
        expect(idle?.bounds, species).toBeTruthy();
        const body = visibleBodyTiles(idle, idle);
        expect(Math.max(body.width, body.height), species).toBeGreaterThanOrEqual(0.99);
        // Footprint invariant: no species spills sideways into the neighbouring tile.
        expect(body.width, `${species} width`).toBeLessThanOrEqual(SPRITE_MAX_WIDTH_TILES + 1e-6);
        expect(body.height, `${species} height`).toBeLessThanOrEqual(SPRITE_MAX_HEIGHT_TILES + 1e-6);
        for (const [name, animation] of Object.entries(entry.animations)) {
          expect(animation.bounds, `${species}/${name}`).toBeTruthy();
          const dy = animation.groundY! - animation.frameHeight / 2;
          expect(Math.abs(dy - 4), `${species}/${name}`).toBeLessThanOrEqual(2);
        }
      }
    });
  },
);
