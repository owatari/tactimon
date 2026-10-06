/**
 * Battle-board layout for SpriteCollab (PMD) animation frames.
 *
 * Frames have animation-specific canvases that are mostly transparent, and
 * the Pokémon's ground point (shadow centre) sits a few pixels below the
 * frame centre. Size therefore comes from the *visible* idle body and every
 * animation of a species shares one source-pixel scale; position comes from
 * the ground point, never from the canvas edges.
 */

export type SpriteBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type SpriteAnimationMetrics = {
  frameWidth: number;
  frameHeight: number;
  /** Visible (opaque) bounds over all battle-facing frames. */
  bounds?: SpriteBounds | null;
  /** Ground point in frame pixels (unit origin + shadow). */
  groundX?: number;
  groundY?: number;
};

/** Where the ground point lands inside the tile (fraction from the top). */
export const SPRITE_GROUND_Y = 0.86;
/** Visible body size (px) that maps to exactly one tile. */
export const SPRITE_REFERENCE_PIXELS = 24;
/**
 * Bigger bodies grow sub-linearly so large species (Onix ~2.2 tiles) still
 * read as large without dwarfing the arena.
 */
export const SPRITE_SIZE_EXPONENT = 0.6;
/** Normal Pokémon visually fill at least one tile. */
export const SPRITE_MIN_TILES = 1;
/**
 * Every unit occupies exactly one tile, so the visible idle body never grows wider than the tile
 * (that is what made neighbours look like they shared a cell) and may rise only a little above it.
 */
export const SPRITE_MAX_WIDTH_TILES = 1;
export const SPRITE_MAX_HEIGHT_TILES = 1.4;

/** Visible idle body width / height in source pixels (legacy manifests: the frame minus its margin). */
export function spriteBodySize(
  idle: SpriteAnimationMetrics,
): { width: number; height: number } {
  if (idle.bounds) {
    return {
      width: Math.max(1, idle.bounds.right - idle.bounds.left),
      height: Math.max(1, idle.bounds.bottom - idle.bounds.top),
    };
  }
  return {
    width: Math.max(1, idle.frameWidth / 1.18),
    height: Math.max(1, idle.frameHeight / 1.18),
  };
}

/** Largest visible dimension of the idle body in source pixels. */
export function spriteBodyPixels(
  idle: SpriteAnimationMetrics,
): number {
  if (idle.bounds) {
    return Math.max(
      1,
      idle.bounds.right - idle.bounds.left,
      idle.bounds.bottom - idle.bounds.top,
    );
  }

  // Legacy manifests without bounds: SpriteCollab idle canvases carry ~15%
  // transparent margin.
  return Math.max(1, idle.frameWidth, idle.frameHeight) / 1.18;
}

/** Tiles covered by the largest visible dimension of the idle body. */
export function spriteTileSpan(
  idle: SpriteAnimationMetrics,
): number {
  const relative =
    spriteBodyPixels(idle) / SPRITE_REFERENCE_PIXELS;
  const wanted = Math.max(
    SPRITE_MIN_TILES,
    relative ** SPRITE_SIZE_EXPONENT,
  );
  // Never let the visible body leave its tile sideways or tower over it.
  const { width, height } = spriteBodySize(idle);
  const biggest = Math.max(width, height);
  const maxScale = Math.min(
    SPRITE_MAX_WIDTH_TILES / width,
    SPRITE_MAX_HEIGHT_TILES / height,
  );
  return Math.min(wanted, maxScale * biggest);
}

export type SpriteFrameLayout = {
  /** All values in tile units, relative to the tile's top-left corner. */
  width: number;
  height: number;
  left: number;
  top: number;
  /** Tiles per source pixel, shared by every animation of the species. */
  scale: number;
};

export function spriteFrameLayout(
  idle: SpriteAnimationMetrics,
  animation: SpriteAnimationMetrics,
): SpriteFrameLayout {
  const scale = spriteTileSpan(idle) / spriteBodyPixels(idle);
  const groundX =
    animation.groundX ?? animation.frameWidth / 2;
  const groundY =
    animation.groundY ?? animation.frameHeight / 2 + 4;

  return {
    width: animation.frameWidth * scale,
    height: animation.frameHeight * scale,
    left: 0.5 - groundX * scale,
    top: SPRITE_GROUND_Y - groundY * scale,
    scale,
  };
}
