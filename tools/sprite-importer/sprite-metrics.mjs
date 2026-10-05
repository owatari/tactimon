// Visible-bounds metrics for SpriteCollab (PMD) sheets, dependency-free.
//
// PMD frames place the Pokémon's ground point at the frame centre (its shadow
// is drawn a few pixels below it). Canvas sizes differ per animation and are
// mostly transparent, so the runtime must scale by the *visible* body and
// anchor by the shadow — never by the canvas box.
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = "89504e470d0a1a0a";

/** Decodes 8-bit RGBA / RGB / grey / palette PNGs (non-interlaced). */
export function decodePng(buffer) {
  if (buffer.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error("not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(
      `unsupported PNG (bitDepth ${bitDepth}, interlace ${interlace})`,
    );
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(
      y * (stride + 1) + 1,
      (y + 1) * (stride + 1),
    );
    const current = pixels.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value +=
          pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      current[x] = value & 0xff;
    }
    previous = current;
  }

  const alphaAt = (x, y) => {
    const index = y * stride + x * channels;
    if (colorType === 6) return pixels[index + 3];
    if (colorType === 4) return pixels[index + 1];
    if (colorType === 3) {
      return transparency && pixels[index] < transparency.length
        ? transparency[pixels[index]]
        : 255;
    }
    return 255;
  };

  return { width, height, alphaAt, palette };
}

export async function readPng(path) {
  return decodePng(await readFile(path));
}

/** Opaque-pixel bounding box of one frame, or null when empty. */
export function frameBounds(png, frameWidth, frameHeight, column, row) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const x0 = column * frameWidth;
  const y0 = row * frameHeight;

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      if (png.alphaAt(x0 + x, y0 + y) > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  return left === Infinity
    ? null
    : { left, top, right: right + 1, bottom: bottom + 1 };
}

function unionBounds(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

// Battle units only face left/right; measure those rows (PMD row order:
// down, down-right, right, up-right, up, up-left, left, down-left).
export const BATTLE_DIRECTION_ROWS = [2, 6];

/**
 * Union of visible bounds over all frames of the battle-facing rows plus the
 * ground point in frame pixel coordinates: the frame centre horizontally
 * (the shadow follows attack lunges, the unit origin does not) and the median
 * shadow centre vertically.
 */
export function measureAnimation(
  animPng,
  shadowPng,
  { frameWidth, frameHeight, frames },
  rows = BATTLE_DIRECTION_ROWS,
) {
  let bounds = null;
  const groundYs = [];

  for (const row of rows) {
    for (let column = 0; column < frames; column += 1) {
      bounds = unionBounds(
        bounds,
        frameBounds(animPng, frameWidth, frameHeight, column, row),
      );
      const shadow = shadowPng
        ? frameBounds(shadowPng, frameWidth, frameHeight, column, row)
        : null;
      if (shadow) {
        groundYs.push((shadow.top + shadow.bottom) / 2);
      }
    }
  }

  const median = (values, fallback) => {
    if (values.length === 0) return fallback;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  return {
    bounds,
    groundX: frameWidth / 2,
    groundY: median(groundYs, frameHeight / 2 + 4),
  };
}
