import type { GbaFont, FontId } from "./engine";

/** Reads a file under gba-ui/ (browser: fetch from /game-assets/gba-ui, tests: filesystem). */
export type GbaByteLoader = (path: string) => Promise<Uint8Array>;

export const GBA_UI_BASE = "/game-assets/gba-ui/";

export const browserLoader: GbaByteLoader = async (path) => {
  const res = await fetch(GBA_UI_BASE + path);
  if (!res.ok) throw new Error(`GBA UI asset missing: ${path}`);
  return new Uint8Array(await res.arrayBuffer());
};

const cache = new Map<string, Promise<Uint8Array>>();

export function cachedLoader(inner: GbaByteLoader): GbaByteLoader {
  return (path) => {
    let hit = cache.get(path);
    if (!hit) {
      hit = inner(path);
      cache.set(path, hit);
    }
    return hit;
  };
}

export async function loadFont(load: GbaByteLoader, name: FontId): Promise<GbaFont> {
  const [glyphs, metaBytes] = await Promise.all([
    load(`fonts/${name}.bin`),
    load(`fonts/${name}.json`),
  ]);
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as {
    glyphW: number;
    glyphH: number;
    widths: number[];
  };
  return {
    glyphW: meta.glyphW,
    glyphH: meta.glyphH,
    glyphs,
    widths: Uint8Array.from(meta.widths),
  };
}
