import type {
  MapLayout,
  TilesetAssetDefinition,
} from "@/lib/maps";

const PRIMARY_TILE_COUNT = 640;
const PRIMARY_METATILE_COUNT = 640;
const PRIMARY_PALETTE_COUNT = 7;

const METATILE_LAYER_NORMAL = 0;
const METATILE_LAYER_COVERED = 1;
const METATILE_LAYER_SPLIT = 2;

type LoadedTileset = {
  tiles: Uint8Array;
  palettes: Uint8Array;
  metatiles: Uint8Array;
  attributes: Uint8Array;
};

const byteCache = new Map<string, Promise<Uint8Array>>();

async function fetchBytes(url: string): Promise<Uint8Array> {
  let request = byteCache.get(url);

  if (!request) {
    request = fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    });
    byteCache.set(url, request);
  }

  return request;
}

async function loadTileset(
  definition: TilesetAssetDefinition,
): Promise<LoadedTileset> {
  const [tiles, palettes, metatiles, attributes] = await Promise.all([
    fetchBytes(definition.tilesUrl),
    fetchBytes(definition.palettesUrl),
    fetchBytes(definition.metatilesUrl),
    fetchBytes(definition.attributesUrl),
  ]);

  return { tiles, palettes, metatiles, attributes };
}

function readU16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function readPaletteColor(
  data: Uint8Array,
  paletteId: number,
  colorIndex: number,
): [number, number, number, number] {
  const offset = (paletteId * 16 + colorIndex) * 2;

  if (offset + 1 >= data.length) {
    return [255, 0, 255, 255];
  }

  const value = readU16(data, offset);
  const red = Math.round(((value & 0x1f) * 255) / 31);
  const green = Math.round((((value >> 5) & 0x1f) * 255) / 31);
  const blue = Math.round((((value >> 10) & 0x1f) * 255) / 31);

  return [red, green, blue, colorIndex === 0 ? 0 : 255];
}

function get4bppPixel(
  tiles: Uint8Array,
  tileId: number,
  x: number,
  y: number,
): number {
  const offset = tileId * 32 + y * 4 + Math.floor(x / 2);

  if (offset >= tiles.length) {
    return 0;
  }

  const packed = tiles[offset];
  return x % 2 === 0 ? packed & 0x0f : packed >> 4;
}

function layerTypeForMetatile(
  tileset: LoadedTileset,
  localMetatileId: number,
): number {
  const offset = localMetatileId * 4;

  if (offset + 3 >= tileset.attributes.length) {
    return METATILE_LAYER_COVERED;
  }

  const attributes = readU32(tileset.attributes, offset);
  return (attributes >>> 29) & 0x03;
}

function shouldDrawTopLayer(layerType: number): boolean {
  return (
    layerType === METATILE_LAYER_NORMAL ||
    layerType === METATILE_LAYER_SPLIT
  );
}

function drawTopMetatile(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  mapX: number,
  mapY: number,
  localMetatileId: number,
  metatileTileset: LoadedTileset,
  primary: LoadedTileset,
  secondary: LoadedTileset,
): void {
  const metatileOffset = localMetatileId * 16;

  if (metatileOffset + 15 >= metatileTileset.metatiles.length) {
    return;
  }

  for (let entryIndex = 4; entryIndex < 8; entryIndex += 1) {
    const value = readU16(
      metatileTileset.metatiles,
      metatileOffset + entryIndex * 2,
    );
    const tileId = value & 0x03ff;
    const xFlip = Boolean(value & 0x0400);
    const yFlip = Boolean(value & 0x0800);
    const paletteId = (value >> 12) & 0x0f;

    const tileSource =
      tileId < PRIMARY_TILE_COUNT ? primary : secondary;
    const localTileId =
      tileId < PRIMARY_TILE_COUNT
        ? tileId
        : tileId - PRIMARY_TILE_COUNT;

    const paletteSource =
      paletteId < PRIMARY_PALETTE_COUNT ? primary : secondary;

    const quadrant = entryIndex - 4;
    const tileX = (quadrant % 2) * 8;
    const tileY = Math.floor(quadrant / 2) * 8;

    for (let y = 0; y < 8; y += 1) {
      const sourceY = yFlip ? 7 - y : y;

      for (let x = 0; x < 8; x += 1) {
        const sourceX = xFlip ? 7 - x : x;
        const colorIndex = get4bppPixel(
          tileSource.tiles,
          localTileId,
          sourceX,
          sourceY,
        );

        if (colorIndex === 0) {
          continue;
        }

        const [red, green, blue, alpha] = readPaletteColor(
          paletteSource.palettes,
          paletteId,
          colorIndex,
        );

        const pixelX = mapX * 16 + tileX + x;
        const pixelY = mapY * 16 + tileY + y;
        const pixelOffset = (pixelY * imageWidth + pixelX) * 4;

        pixels[pixelOffset] = red;
        pixels[pixelOffset + 1] = green;
        pixels[pixelOffset + 2] = blue;
        pixels[pixelOffset + 3] = alpha;
      }
    }
  }
}

/**
 * Rebuilds FireRed's top BG layer into a transparent canvas.
 *
 * FireRed draws NORMAL and SPLIT metatile top layers above object sprites,
 * while COVERED metatiles keep their second layer below sprites. Drawing
 * this canvas after players/NPCs reproduces roofs, fences and similar
 * occlusion without using collision as a visual heuristic.
 */
export async function renderForegroundLayer(
  canvas: HTMLCanvasElement,
  layout: MapLayout,
  definitions: {
    primary: TilesetAssetDefinition;
    secondary: TilesetAssetDefinition;
  },
): Promise<void> {
  const [primary, secondary] = await Promise.all([
    loadTileset(definitions.primary),
    loadTileset(definitions.secondary),
  ]);

  const width = layout.width * 16;
  const height = layout.height * 16;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.imageSmoothingEnabled = false;

  const image = context.createImageData(width, height);
  const pixels = image.data;

  layout.cells.forEach((cell, index) => {
    const metatileId = cell.metatile;
    const isPrimary = metatileId < PRIMARY_METATILE_COUNT;
    const metatileTileset = isPrimary ? primary : secondary;
    const localMetatileId = isPrimary
      ? metatileId
      : metatileId - PRIMARY_METATILE_COUNT;

    const layerType = layerTypeForMetatile(
      metatileTileset,
      localMetatileId,
    );

    if (!shouldDrawTopLayer(layerType)) {
      return;
    }

    const mapX = index % layout.width;
    const mapY = Math.floor(index / layout.width);

    drawTopMetatile(
      pixels,
      width,
      mapX,
      mapY,
      localMetatileId,
      metatileTileset,
      primary,
      secondary,
    );
  });

  context.clearRect(0, 0, width, height);
  context.putImageData(image, 0, 0);
}
