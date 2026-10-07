import type { InputAction } from "./actions";

export type SpatialRect = { left: number; top: number; right: number; bottom: number };

const center = (r: SpatialRect) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

/**
 * Index of the rectangle to focus when pressing `direction` from `from` (-1 = nothing focused yet:
 * the first one in reading order). The pick is the closest in the pressed direction, penalising
 * sideways drift, and wraps to the far side when nothing lies ahead.
 */
export function pickSpatialTarget(rects: readonly SpatialRect[], from: number, direction: InputAction): number {
  if (rects.length === 0) return -1;
  if (from < 0 || from >= rects.length) {
    const order = rects.map((r, i) => ({ i, r })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    return order[0].i;
  }
  const origin = center(rects[from]);
  const forward = (dx: number, dy: number) =>
    direction === "up" ? -dy : direction === "down" ? dy : direction === "left" ? -dx : dx;
  const sideways = (dx: number, dy: number) =>
    direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);

  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    if (index === from) return;
    const c = center(rect);
    const dx = c.x - origin.x;
    const dy = c.y - origin.y;
    const ahead = forward(dx, dy);
    if (ahead <= 1) return;
    const score = ahead + sideways(dx, dy) * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  if (best >= 0) return best;

  // Nothing ahead: wrap to the farthest one on the opposite side (same row / column first).
  let wrap = -1;
  let wrapScore = Number.NEGATIVE_INFINITY;
  rects.forEach((rect, index) => {
    if (index === from) return;
    const c = center(rect);
    const dx = c.x - origin.x;
    const dy = c.y - origin.y;
    const behind = -forward(dx, dy);
    const score = behind - sideways(dx, dy) * 2.5;
    if (score > wrapScore) {
      wrapScore = score;
      wrap = index;
    }
  });
  return wrap >= 0 ? wrap : from;
}
