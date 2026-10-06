/**
 * Minimal GBA-style 2D renderer used to draw FireRed UI screens from ROM data:
 * 4 background layers (tilemaps over 4bpp tile memory), text windows with
 * ROM fonts, palettes in BGR555. Everything here is deterministic and
 * DOM-free: `render()` returns a 240x160 RGBA buffer.
 */
import { GBA_CHARMAP } from "./charmap.generated";

export const SCREEN_W = 240;
export const SCREEN_H = 160;

export type FontId = "normal" | "small";

export type GbaFont = {
  glyphW: number;
  glyphH: number;
  /** 512 glyphs (256 + extra symbols), glyphW*glyphH bytes each, pixel values 0..3. */
  glyphs: Uint8Array;
  widths: Uint8Array;
};

/** Per-font attributes from the FireRed font table. */
export const FONT_ATTRS: Record<FontId, { height: number; maxLetterHeight: number }> = {
  normal: { height: 14, maxLetterHeight: 14 },
  small: { height: 13, maxLetterHeight: 12 },
};

const APOSTROPHE = GBA_CHARMAP["\\'"] ?? 0xb4;

/** Keypad icons ({A_BUTTON}, ...): first tile in the keypad_icons sheet and width in px. Encoded as -(index + 1). */
export const KEYPAD_ICONS: Record<string, { index: number; tile: number; width: number }> = {
  A_BUTTON: { index: 0, tile: 0x0, width: 8 },
  B_BUTTON: { index: 1, tile: 0x1, width: 8 },
  L_BUTTON: { index: 2, tile: 0x2, width: 16 },
  R_BUTTON: { index: 3, tile: 0x4, width: 16 },
  START_BUTTON: { index: 4, tile: 0x6, width: 24 },
  SELECT_BUTTON: { index: 5, tile: 0x9, width: 24 },
  DPAD_UP: { index: 6, tile: 0xc, width: 8 },
  DPAD_DOWN: { index: 7, tile: 0xd, width: 8 },
  DPAD_LEFT: { index: 8, tile: 0xe, width: 8 },
  DPAD_RIGHT: { index: 9, tile: 0xf, width: 8 },
  DPAD_UPDOWN: { index: 10, tile: 0x20, width: 8 },
  DPAD_LEFTRIGHT: { index: 11, tile: 0x21, width: 8 },
  DPAD_NONE: { index: 12, tile: 0x22, width: 8 },
};
const KEYPAD_BY_INDEX = Object.values(KEYPAD_ICONS);

/** Extra-symbol glyphs ({NO} = F9 08 -> glyph 0x108). */
const EXTRA_SYMBOLS: Record<string, number> = { NO: 0x108, PLUS: 0x104 };

/**
 * Encode a display string into glyph ids (0..511) or keypad icons (negative).
 * Tokens: {A_BUTTON} {DPAD_UPDOWN} ... {NO}. Unknown characters become '?'.
 */
export function encodeGbaText(text: string): number[] {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch === "{") {
      const end = chars.indexOf("}", i);
      if (end > i) {
        const name = chars.slice(i + 1, end).join("");
        if (name in KEYPAD_ICONS) {
          out.push(-(KEYPAD_ICONS[name].index + 1));
          i = end;
          continue;
        }
        if (name in EXTRA_SYMBOLS) {
          out.push(EXTRA_SYMBOLS[name]);
          i = end;
          continue;
        }
      }
    }
    if (ch === "'") out.push(APOSTROPHE);
    else if (ch === "\n") out.push(0xfe);
    else if (ch in GBA_CHARMAP) out.push(GBA_CHARMAP[ch]);
    else if (/[A-Z]/.test(ch)) out.push(0xbb + ch.charCodeAt(0) - 65);
    else if (/[a-z]/.test(ch)) out.push(0xd5 + ch.charCodeAt(0) - 97);
    else if (/[0-9]/.test(ch)) out.push(0xa1 + ch.charCodeAt(0) - 48);
    else out.push(GBA_CHARMAP["?"] ?? 0xac);
  }
  return out;
}

export function bgr555ToRgba(c: number): number {
  const r = (c & 31) << 3;
  const g = ((c >> 5) & 31) << 3;
  const b = ((c >> 10) & 31) << 3;
  // ABGR little-endian packing for Uint32Array views over RGBA bytes.
  return (0xff << 24) | ((b | (b >> 5)) << 16) | ((g | (g >> 5)) << 8) | (r | (r >> 5));
}

export class GbaPalette {
  readonly colors = new Uint16Array(256);

  set(index: number, bgr555: number): void {
    this.colors[index & 255] = bgr555;
  }

  /** Load `bytes` (little-endian BGR555) starting at colour index `at`. */
  load(bytes: Uint8Array, at = 0): void {
    for (let i = 0; i + 1 < bytes.length && at + i / 2 < 256; i += 2) {
      this.colors[at + i / 2] = bytes[i] | (bytes[i + 1] << 8);
    }
  }
}

/** Decode 4bpp tile data into one byte per pixel, 64 bytes per tile. */
export function decode4bpp(data: Uint8Array): Uint8Array {
  const tiles = Math.floor(data.length / 32);
  const out = new Uint8Array(tiles * 64);
  for (let i = 0; i < tiles * 32; i += 1) {
    out[i * 2] = data[i] & 15;
    out[i * 2 + 1] = data[i] >> 4;
  }
  return out;
}

export type TilemapEntry = number; // tile | hflip<<10 | vflip<<11 | pal<<12

export class BgLayer {
  readonly map = new Uint16Array(32 * 32);
  /** Decoded tile memory (64 bytes per tile). Windows reference tiles by pixel buffer instead. */
  tiles = new Uint8Array(0);
  visible = true;

  loadTiles(data4bpp: Uint8Array, firstTile = 0): void {
    const decoded = decode4bpp(data4bpp);
    const need = firstTile * 64 + decoded.length;
    if (this.tiles.length < need) {
      const grown = new Uint8Array(need);
      grown.set(this.tiles);
      this.tiles = grown;
    }
    this.tiles.set(decoded, firstTile * 64);
  }

  fill(tile: number, x: number, y: number, w: number, h: number, pal: number): void {
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1)
        this.map[((y + j) & 31) * 32 + ((x + i) & 31)] = tile | (pal << 12);
  }

  /**
   * Copy a tilemap (u16 LE entries, `w` tiles per row) into the map at x,y.
   * `palOverride` forces every entry's palette bank (CopyToBgTilemapBufferRect_ChangePalette).
   */
  blitMap(bytes: Uint8Array, w: number, h: number, x: number, y: number, palOverride?: number): void {
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const o = (j * w + i) * 2;
        if (o + 1 >= bytes.length) return;
        const e = bytes[o] | (bytes[o + 1] << 8);
        const pal = palOverride === undefined ? e >> 12 : palOverride;
        this.map[((y + j) & 31) * 32 + ((x + i) & 31)] = (e & 0x0fff) | ((pal & 15) << 12);
      }
  }
}

export type WindowTemplate = {
  bg: number;
  left: number;
  top: number;
  width: number;
  height: number;
  paletteNum: number;
};

/** A text/bitmap window: a palette-index pixel buffer drawn over a background layer. */
export class GbaWindow {
  readonly px: number;
  readonly py: number;
  readonly pw: number;
  readonly ph: number;
  readonly pixels: Uint8Array;
  /** Palette bank per 8x8 tile (ListMenuWindowRect); defaults to the template's paletteNum. */
  readonly palMap: Uint8Array;
  /** RGBA bitmaps (mon pictures) composed over the window pixels. */
  readonly images: { x: number; y: number; w: number; h: number; data: Uint8ClampedArray }[] = [];
  active = true;

  constructor(readonly template: WindowTemplate) {
    this.px = template.left * 8;
    this.py = template.top * 8;
    this.pw = template.width * 8;
    this.ph = template.height * 8;
    this.pixels = new Uint8Array(this.pw * this.ph);
    this.palMap = new Uint8Array(template.width * template.height).fill(template.paletteNum);
  }

  /** Set the palette bank for a tile rectangle (relative to the window). */
  setPalRect(x: number, y: number, w: number, h: number, pal: number): void {
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const tx = x + i;
        const ty = y + j;
        if (tx < this.template.width && ty < this.template.height) this.palMap[ty * this.template.width + tx] = pal;
      }
  }

  /**
   * BlitBitmapRectToWindow: copy a w*h pixel rectangle out of a tile sheet
   * (`sheetTilesWide` tiles per row, starting at `startTile`), colour key 0.
   */
  blitBitmap(
    decoded: Uint8Array,
    sheetTilesWide: number,
    startTile: number,
    w: number,
    h: number,
    dx: number,
    dy: number,
  ): void {
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const tile = startTile + (y >> 3) * sheetTilesWide + (x >> 3);
        const v = decoded[tile * 64 + (y & 7) * 8 + (x & 7)];
        if (v) this.setPixel(dx + x, dy + y, v);
      }
  }

  fill(value: number): void {
    this.pixels.fill(value);
  }

  setPixel(x: number, y: number, v: number): void {
    if (x >= 0 && y >= 0 && x < this.pw && y < this.ph) this.pixels[y * this.pw + x] = v;
  }

  /** Blit a 4bpp tile sheet (decoded) region into the window, colour key 0 (transparent). */
  blitTiles(
    decoded: Uint8Array,
    sheetTilesWide: number,
    srcTileX: number,
    srcTileY: number,
    tilesW: number,
    tilesH: number,
    dx: number,
    dy: number,
    palOffset = 0,
  ): void {
    for (let ty = 0; ty < tilesH; ty += 1)
      for (let tx = 0; tx < tilesW; tx += 1) {
        const tile = (srcTileY + ty) * sheetTilesWide + srcTileX + tx;
        for (let y = 0; y < 8; y += 1)
          for (let x = 0; x < 8; x += 1) {
            const v = decoded[tile * 64 + y * 8 + x];
            if (v) this.setPixel(dx + tx * 8 + x, dy + ty * 8 + y, v + palOffset);
          }
      }
  }
}

export type TextColors = { bg: number; fg: number; shadow: number };

export class GbaScreen {
  readonly palette = new GbaPalette();
  readonly bgs = [new BgLayer(), new BgLayer(), new BgLayer(), new BgLayer()];
  readonly windows: GbaWindow[] = [];
  /** Extra draw calls composed above all layers (sprites), in order. */
  readonly overlays: ((buf: Uint32Array) => void)[] = [];
  fonts: Partial<Record<FontId, GbaFont>> = {};
  /** Decoded keypad_icons sheet (128 px wide = 16 tiles per row). */
  keypad: Uint8Array = new Uint8Array(0);
  backdrop = 0;

  addWindow(t: WindowTemplate): GbaWindow {
    const w = new GbaWindow(t);
    this.windows.push(w);
    return w;
  }

  removeWindow(w: GbaWindow): void {
    const i = this.windows.indexOf(w);
    if (i >= 0) this.windows.splice(i, 1);
  }

  stringWidth(font: FontId, text: string, letterSpacing = 0): number {
    const f = this.fonts[font];
    if (!f) return 0;
    let width = 0;
    for (const code of encodeGbaText(text))
      width += (code < 0 ? KEYPAD_BY_INDEX[-code - 1].width : f.widths[code]) + letterSpacing;
    return width;
  }

  /** AddTextPrinterParameterized4 equivalent (instant). Returns the end x. */
  print(
    win: GbaWindow,
    font: FontId,
    text: string,
    x: number,
    y: number,
    colors: TextColors,
    letterSpacing = 0,
    lineSpacing = 0,
    minLetterSpacing = 0,
  ): number {
    const f = this.fonts[font];
    if (!f) return x;
    const attrs = FONT_ATTRS[font];
    let cx = x;
    let cy = y;
    const rows = attrs.height;
    for (const code of encodeGbaText(text)) {
      if (code === 0xfe) {
        cx = x;
        cy += attrs.maxLetterHeight + lineSpacing;
        continue;
      }
      if (code < 0) {
        const icon = KEYPAD_BY_INDEX[-code - 1];
        win.blitBitmap(this.keypad, 16, icon.tile, icon.width, 12, cx, cy);
        cx += icon.width + letterSpacing;
        continue;
      }
      const gw = f.widths[code];
      const base = code * f.glyphW * f.glyphH;
      for (let gy = 0; gy < rows; gy += 1)
        for (let gx = 0; gx < Math.min(gw, f.glyphW); gx += 1) {
          const p = f.glyphs[base + gy * f.glyphW + gx];
          const v = p === 1 ? colors.fg : p === 2 ? colors.shadow : colors.bg;
          if (v !== 0) win.setPixel(cx + gx, cy + gy, v);
        }
      // EXT_CTRL_CODE_MIN_LETTER_SPACING: advance at least `min` pixels and skip the extra spacing.
      cx += minLetterSpacing > 0 ? Math.max(gw, minLetterSpacing) : gw + letterSpacing;
    }
    return cx;
  }

  /** Render to an RGBA buffer (Uint32Array view over 240x160 pixels). */
  render(): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(new ArrayBuffer(SCREEN_W * SCREEN_H * 4));
    const buf = new Uint32Array(out.buffer);
    const lut = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) lut[i] = bgr555ToRgba(this.palette.colors[i]);
    buf.fill(lut[this.backdrop]);

    // Priority: bg3 at the back ... bg0 in front.
    for (let b = 3; b >= 0; b -= 1) {
      const layer = this.bgs[b];
      if (!layer.visible) continue;
      const wins = this.windows.filter((w) => w.template.bg === b && w.active);
      for (let cy = 0; cy < 20; cy += 1)
        for (let cx = 0; cx < 30; cx += 1) {
          const covered = wins.some(
            (w) => cx * 8 >= w.px && cx * 8 < w.px + w.pw && cy * 8 >= w.py && cy * 8 < w.py + w.ph,
          );
          if (covered) continue;
          const e = layer.map[cy * 32 + cx];
          const tile = e & 0x3ff;
          const hflip = (e >> 10) & 1;
          const vflip = (e >> 11) & 1;
          const bank = (e >> 12) & 15;
          if ((tile + 1) * 64 > layer.tiles.length) continue;
          for (let y = 0; y < 8; y += 1)
            for (let x = 0; x < 8; x += 1) {
              const sx = hflip ? 7 - x : x;
              const sy = vflip ? 7 - y : y;
              const v = layer.tiles[tile * 64 + sy * 8 + sx];
              if (v) buf[(cy * 8 + y) * SCREEN_W + cx * 8 + x] = lut[bank * 16 + v];
            }
        }
      for (const w of wins) {
        // (pixels first, images last; see below)
        for (let y = 0; y < w.ph; y += 1)
          for (let x = 0; x < w.pw; x += 1) {
            const v = w.pixels[y * w.pw + x];
            const sx = w.px + x;
            const sy = w.py + y;
            if (v && sx < SCREEN_W && sy < SCREEN_H) {
              const bank = w.palMap[(y >> 3) * w.template.width + (x >> 3)] * 16;
              buf[sy * SCREEN_W + sx] = lut[(bank + v) & 255];
            }
          }
        for (const img of w.images) {
          for (let y = 0; y < img.h; y += 1)
            for (let x = 0; x < img.w; x += 1) {
              const o = (y * img.w + x) * 4;
              if (img.data[o + 3] < 128) continue;
              const sx = w.px + img.x + x;
              const sy = w.py + img.y + y;
              if (sx >= 0 && sy >= 0 && sx < SCREEN_W && sy < SCREEN_H) {
                buf[sy * SCREEN_W + sx] =
                  (0xff << 24) | (img.data[o + 2] << 16) | (img.data[o + 1] << 8) | img.data[o];
              }
            }
        }
      }
    }
    for (const o of this.overlays) o(buf);
    return out;
  }
}
