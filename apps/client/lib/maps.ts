import { GENERATED_WARPS } from "./generatedWarps";
import {
  POKEMON_CENTER_MAP_IDS,
  findHealLocation,
} from "./healLocations";
import type { StoryHealLocationId } from "./story";
import { QUEST_OPEN_CELLS } from "./questGates";
import {
  GENERATED_MAP_DEFINITIONS,
  GENERATED_MAP_SIZES,
  GENERATED_TILESETS,
} from "./generated/worldMaps";
import {
  WORLD_CONNECTIONS,
  WORLD_OPEN_CELLS,
  WORLD_WARPS,
} from "./generated/worldWarps";
export const TILE_SIZE = 16;
export const WORLD_ZOOM = 3;

export type Direction = "south" | "north" | "west" | "east";

export type MapCell = {
  raw: number;
  metatile: number;
  collision: number;
  elevation: number;
  /** FireRed metatile behavior, hydrated from the tileset attributes at runtime. */
  behavior?: number;
};

export type MapLayout = {
  index: number;
  id: string | null;
  name: string;
  width: number;
  height: number;
  primary_tileset: string;
  secondary_tileset: string;
  cells: MapCell[];
};

export type TilesetAssetDefinition = {
  tilesUrl: string;
  palettesUrl: string;
  metatilesUrl: string;
  attributesUrl: string;
};

export type WorldObject = {
  index: number;
  local_id: number;
  graphics_id: number;
  graphics_name: string | null;
  x: number;
  y: number;
  elevation: number;
  movement_type: number;
  flag_id: number;
  sprite_file: string | null;
  frame_width: number | null;
  frame_height: number | null;
  frame_count: number;
  /** ROM wander / patrol range (tiles around the home tile). */
  movement_range_x?: number;
  movement_range_y?: number;
  /** Set on the overworld's working copy: the ROM tile, since the NPC itself may have walked away. */
  homeX?: number;
  homeY?: number;
  /** Where the working copy was placed when the map (or the story) last changed. */
  placedX?: number;
  placedY?: number;
};

export type WorldMapData = {
  index: number;
  name: string;
  music: number | null;
  objects: WorldObject[];
  bg_events?: Array<{
    index: number;
    x: number;
    y: number;
    kind: number;
  }>;
  warps: Array<{
    index: number;
    x: number;
    y: number;
    warp_id: number;
    target_map: string | null;
  }>;
  connections: Array<{
    index: number;
    direction: string;
    offset: number;
    target_map: string | null;
    target_map_index: number | null;
  }>;
};

export type WorldMapDefinition = {
  id: string;
  label: string;
  layoutUrl: string;
  previewUrl: string;
  worldUrl: string | null;
  spawn: { x: number; y: number };
  fallbackMusicId: number;
  tilesets: {
    primary: TilesetAssetDefinition;
    secondary: TilesetAssetDefinition;
  };
};

export type WorldTransition = {
  mapId: string;
  spawn: { x: number; y: number };
};

const PRIMARY_METATILE_COUNT = 640;
const METATILE_BEHAVIOR_MASK = 0x1ff;
const MB_COUNTER = 0x80;
// FireRed surf-only water: MB_POND_WATER (0x10) .. MB_OCEAN_WATER (0x15).
// Puddles (0x16) and shallow water (0x17) stay walkable.
const WATER_BEHAVIOR_MIN = 0x10;
const WATER_BEHAVIOR_MAX = 0x15;
const JUMP_BEHAVIOR_BY_DIRECTION: Record<Direction, number> = {
  east: 0x38,
  west: 0x39,
  north: 0x3a,
  south: 0x3b,
};

const attributeCache = new Map<string, Promise<Uint8Array>>();

async function fetchAttributeBytes(url: string): Promise<Uint8Array> {
  let request = attributeCache.get(url);
  if (!request) {
    request = fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load metatile attributes ${url}: ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    });
    attributeCache.set(url, request);
  }
  return request;
}

function readU32(data: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 3 >= data.length) {
    return 0;
  }
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

export async function hydrateMapBehaviors(
  layout: MapLayout,
  definitions: {
    primary: TilesetAssetDefinition;
    secondary: TilesetAssetDefinition;
  },
): Promise<MapLayout> {
  const [primaryAttributes, secondaryAttributes] = await Promise.all([
    fetchAttributeBytes(definitions.primary.attributesUrl),
    fetchAttributeBytes(definitions.secondary.attributesUrl),
  ]);

  return {
    ...layout,
    cells: layout.cells.map((cell) => {
      const primary = cell.metatile < PRIMARY_METATILE_COUNT;
      const localMetatile = primary
        ? cell.metatile
        : cell.metatile - PRIMARY_METATILE_COUNT;
      const attributes = primary ? primaryAttributes : secondaryAttributes;
      const behavior =
        readU32(attributes, localMetatile * 4) & METATILE_BEHAVIOR_MASK;

      return { ...cell, behavior };
    }),
  };
}

export function getMapCell(
  layout: MapLayout | null,
  x: number,
  y: number,
): MapCell | null {
  if (!layout || x < 0 || y < 0 || x >= layout.width || y >= layout.height) {
    return null;
  }
  return layout.cells[y * layout.width + x] ?? null;
}

export function isCounterCell(
  layout: MapLayout | null,
  x: number,
  y: number,
): boolean {
  return getMapCell(layout, x, y)?.behavior === MB_COUNTER;
}

export function isWaterCell(
  layout: MapLayout | null,
  x: number,
  y: number,
): boolean {
  const behavior = getMapCell(layout, x, y)?.behavior;
  return (
    typeof behavior === "number" &&
    behavior >= WATER_BEHAVIOR_MIN &&
    behavior <= WATER_BEHAVIOR_MAX
  );
}

export function isLedgeCell(
  layout: MapLayout | null,
  x: number,
  y: number,
): boolean {
  const behavior = getMapCell(
    layout,
    x,
    y,
  )?.behavior;

  return Object.values(
    JUMP_BEHAVIOR_BY_DIRECTION,
  ).includes(behavior ?? -1);
}

export function isLedgeForDirection(
  layout: MapLayout | null,
  x: number,
  y: number,
  direction: Direction,
): boolean {
  return (
    getMapCell(layout, x, y)?.behavior ===
    JUMP_BEHAVIOR_BY_DIRECTION[direction]
  );
}

export type BattleSceneContext = {
  mapId: string;
  mapLabel: string;
  previewUrl: string;
  mapWidth: number;
  mapHeight: number;
  cropX: number;
  cropY: number;
  arenaWidth: number;
  arenaHeight: number;
  blocked: Array<{ x: number; y: number }>;
  seed: number;
};

const GENERAL_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/general/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/general/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/general/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/general/attributes.bin",
};

const PALLET_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/pallet-town/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/pallet-town/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/pallet-town/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/pallet-town/attributes.bin",
};

const VIRIDIAN_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/viridian-city/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/viridian-city/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/viridian-city/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/viridian-city/attributes.bin",
};

const PEWTER_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/pewter-city/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/pewter-city/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/pewter-city/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/pewter-city/attributes.bin",
};

const CERULEAN_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/cerulean-city/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/cerulean-city/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/cerulean-city/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/cerulean-city/attributes.bin",
};

const BUILDING_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/building/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/building/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/building/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/building/attributes.bin",
};

const SEA_COTTAGE_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/sea-cottage/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/sea-cottage/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/sea-cottage/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/sea-cottage/attributes.bin",
};

const BURGLED_HOUSE_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/burgled-house/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/burgled-house/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/burgled-house/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/burgled-house/attributes.bin",
};

const LAB_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/lab/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/lab/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/lab/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/lab/attributes.bin",
};

const MART_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/mart/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/mart/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/mart/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/mart/attributes.bin",
};

const PEWTER_GYM_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/pewter-gym/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/pewter-gym/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/pewter-gym/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/pewter-gym/attributes.bin",
};

const CERULEAN_GYM_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/cerulean-gym/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/cerulean-gym/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/cerulean-gym/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/cerulean-gym/attributes.bin",
};

const VERMILION_GYM_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/vermilion-gym/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/vermilion-gym/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/vermilion-gym/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/vermilion-gym/attributes.bin",
};

const POKEMON_CENTER_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/pokemon-center/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/pokemon-center/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/pokemon-center/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/pokemon-center/attributes.bin",
};

const GENERIC_BUILDING_2_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/generic-building-2/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/generic-building-2/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/generic-building-2/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/generic-building-2/attributes.bin",
};

const GENERIC_BUILDING_1_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/generic-building-1/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/generic-building-1/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/generic-building-1/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/generic-building-1/attributes.bin",
};

const MUSEUM_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/museum/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/museum/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/museum/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/museum/attributes.bin",
};

const BIKE_SHOP_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/bike-shop/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/bike-shop/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/bike-shop/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/bike-shop/attributes.bin",
};

const SCHOOL_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/school/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/school/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/school/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/school/attributes.bin",
};

const FAN_CLUB_DAYCARE_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/fan-club-daycare/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/fan-club-daycare/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/fan-club-daycare/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/fan-club-daycare/attributes.bin",
};

const UNDERGROUND_PATH_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/underground-path/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/underground-path/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/underground-path/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/underground-path/attributes.bin",
};

const VERMILION_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/vermilion-city/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/vermilion-city/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/vermilion-city/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/vermilion-city/attributes.bin",
};

const SS_ANNE_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/ss-anne/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/ss-anne/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/ss-anne/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/ss-anne/attributes.bin",
};

const CAVE_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/cave/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/cave/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/cave/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/cave/attributes.bin",
};

const VIRIDIAN_FOREST_TILESET: TilesetAssetDefinition = {
  tilesUrl:
    "/game-assets/tilesets/viridian-forest/tiles.4bpp",
  palettesUrl:
    "/game-assets/tilesets/viridian-forest/palettes.gbapal",
  metatilesUrl:
    "/game-assets/tilesets/viridian-forest/metatiles.bin",
  attributesUrl:
    "/game-assets/tilesets/viridian-forest/attributes.bin",
};

export const WORLD_MAPS: Record<string, WorldMapDefinition> = {
  "pallet-town": {
    id: "pallet-town",
    label: "Pallet Town",
    layoutUrl: "/game-assets/maps/pallet-town/layout.json",
    previewUrl: "/game-assets/maps/pallet-town/preview.png",
    worldUrl: "/game-assets/maps/pallet-town/world.json",
    spawn: { x: 12, y: 17 },
    fallbackMusicId: 300,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: PALLET_TILESET,
    },
  },
  "route-1": {
    id: "route-1",
    label: "Route 1",
    layoutUrl: "/game-assets/maps/route-1/layout.json",
    previewUrl: "/game-assets/maps/route-1/preview.png",
    worldUrl: "/game-assets/maps/route-1/world.json",
    spawn: { x: 12, y: 37 },
    fallbackMusicId: 291,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: PALLET_TILESET,
    },
  },
  "route-2": {
    id: "route-2",
    label: "Route 2",
    layoutUrl: "/game-assets/maps/route-2/layout.json",
    previewUrl: "/game-assets/maps/route-2/preview.png",
    worldUrl: "/game-assets/maps/route-2/world.json",
    spawn: { x: 9, y: 79 },
    fallbackMusicId: 291,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VIRIDIAN_TILESET,
    },
  },
  "pewter-city": {
    id: "pewter-city",
    label: "Pewter City",
    layoutUrl: "/game-assets/maps/pewter-city/layout.json",
    previewUrl: "/game-assets/maps/pewter-city/preview.png",
    worldUrl: "/game-assets/maps/pewter-city/world.json",
    spawn: { x: 21, y: 39 },
    fallbackMusicId: 314,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: PEWTER_TILESET,
    },
  },
  "route-3": {
    id: "route-3",
    label: "Route 3",
    layoutUrl: "/game-assets/maps/route-3/layout.json",
    previewUrl: "/game-assets/maps/route-3/preview.png",
    worldUrl: "/game-assets/maps/route-3/world.json",
    spawn: { x: 0, y: 10 },
    fallbackMusicId: 293,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: PEWTER_TILESET,
    },
  },
  "route-4": {
    id: "route-4",
    label: "Route 4",
    layoutUrl: "/game-assets/maps/route-4/layout.json",
    previewUrl: "/game-assets/maps/route-4/preview.png",
    worldUrl: "/game-assets/maps/route-4/world.json",
    spawn: { x: 11, y: 19 },
    fallbackMusicId: 293,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: CERULEAN_TILESET,
    },
  },
  "cerulean-city": {
    id: "cerulean-city",
    label: "Cerulean City",
    layoutUrl: "/game-assets/maps/cerulean-city/layout.json",
    previewUrl: "/game-assets/maps/cerulean-city/preview.png",
    worldUrl: "/game-assets/maps/cerulean-city/world.json",
    spawn: { x: 0, y: 13 },
    fallbackMusicId: 308,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: CERULEAN_TILESET,
    },
  },
  "route-24": {
    id: "route-24",
    label: "Route 24",
    layoutUrl: "/game-assets/maps/route-24/layout.json",
    previewUrl: "/game-assets/maps/route-24/preview.png",
    worldUrl: "/game-assets/maps/route-24/world.json",
    spawn: { x: 11, y: 39 },
    fallbackMusicId: 292,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: CERULEAN_TILESET,
    },
  },
  "route-25": {
    id: "route-25",
    label: "Route 25",
    layoutUrl: "/game-assets/maps/route-25/layout.json",
    previewUrl: "/game-assets/maps/route-25/preview.png",
    worldUrl: "/game-assets/maps/route-25/world.json",
    spawn: { x: 0, y: 10 },
    fallbackMusicId: 292,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: CERULEAN_TILESET,
    },
  },
  "sea-cottage": {
    id: "sea-cottage",
    label: "Sea Cottage",
    layoutUrl: "/game-assets/maps/sea-cottage/layout.json",
    previewUrl: "/game-assets/maps/sea-cottage/preview.png",
    worldUrl: "/game-assets/maps/sea-cottage/world.json",
    spawn: { x: 7, y: 8 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: SEA_COTTAGE_TILESET,
    },
  },
  "cerulean-house2": {
    id: "cerulean-house2",
    label: "Burgled House",
    layoutUrl: "/game-assets/maps/cerulean-house2/layout.json",
    previewUrl: "/game-assets/maps/cerulean-house2/preview.png",
    worldUrl: "/game-assets/maps/cerulean-house2/world.json",
    spawn: { x: 3, y: 6 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: BURGLED_HOUSE_TILESET,
    },
  },
  "route-5": {
    id: "route-5",
    label: "Route 5",
    layoutUrl: "/game-assets/maps/route-5/layout.json",
    previewUrl: "/game-assets/maps/route-5/preview.png",
    worldUrl: "/game-assets/maps/route-5/world.json",
    spawn: { x: 24, y: 0 },
    fallbackMusicId: 293,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: CERULEAN_TILESET,
    },
  },
  "underground-path-north-entrance": {
    id: "underground-path-north-entrance",
    label: "Underground Path",
    layoutUrl:
      "/game-assets/maps/underground-path-north-entrance/layout.json",
    previewUrl:
      "/game-assets/maps/underground-path-north-entrance/preview.png",
    worldUrl: "/game-assets/maps/underground-path-north-entrance/world.json",
    spawn: { x: 6, y: 7 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "underground-path-tunnel": {
    id: "underground-path-tunnel",
    label: "Underground Path",
    layoutUrl:
      "/game-assets/maps/underground-path-tunnel/layout.json",
    previewUrl:
      "/game-assets/maps/underground-path-tunnel/preview.png",
    worldUrl: "/game-assets/maps/underground-path-tunnel/world.json",
    spawn: { x: 4, y: 4 },
    fallbackMusicId: 291,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: UNDERGROUND_PATH_TILESET,
    },
  },
  "underground-path-south-entrance": {
    id: "underground-path-south-entrance",
    label: "Underground Path",
    layoutUrl:
      "/game-assets/maps/underground-path-south-entrance/layout.json",
    previewUrl:
      "/game-assets/maps/underground-path-south-entrance/preview.png",
    worldUrl: "/game-assets/maps/underground-path-south-entrance/world.json",
    spawn: { x: 6, y: 7 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "route-6": {
    id: "route-6",
    label: "Route 6",
    layoutUrl: "/game-assets/maps/route-6/layout.json",
    previewUrl: "/game-assets/maps/route-6/preview.png",
    worldUrl: "/game-assets/maps/route-6/world.json",
    spawn: { x: 19, y: 14 },
    fallbackMusicId: 293,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VERMILION_TILESET,
    },
  },
  "vermilion-city": {
    id: "vermilion-city",
    label: "Vermilion City",
    layoutUrl: "/game-assets/maps/vermilion-city/layout.json",
    previewUrl: "/game-assets/maps/vermilion-city/preview.png",
    worldUrl: "/game-assets/maps/vermilion-city/world.json",
    spawn: { x: 24, y: 0 },
    fallbackMusicId: 313,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VERMILION_TILESET,
    },
  },
  "ss-anne-exterior": {
    id: "ss-anne-exterior",
    label: "S.S. Anne",
    layoutUrl: "/game-assets/maps/ss-anne-exterior/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-exterior/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-exterior/world.json",
    spawn: { x: 32, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VERMILION_TILESET,
    },
  },
  "ss-anne-1f-corridor": {
    id: "ss-anne-1f-corridor",
    label: "S.S. Anne 1F",
    layoutUrl: "/game-assets/maps/ss-anne-1f-corridor/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-corridor/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-corridor/world.json",
    spawn: { x: 19, y: 1 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-corridor": {
    id: "ss-anne-2f-corridor",
    label: "S.S. Anne 2F",
    layoutUrl: "/game-assets/maps/ss-anne-2f-corridor/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-corridor/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-corridor/world.json",
    spawn: { x: 2, y: 3 },
    fallbackMusicId: 304,
    tilesets: { primary: GENERAL_TILESET, secondary: SS_ANNE_TILESET },
  },
  "ss-anne-3f-corridor": {
    id: "ss-anne-3f-corridor",
    label: "S.S. Anne 3F",
    layoutUrl: "/game-assets/maps/ss-anne-3f-corridor/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-3f-corridor/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-3f-corridor/world.json",
    spawn: { x: 18, y: 3 },
    fallbackMusicId: 304,
    tilesets: { primary: GENERAL_TILESET, secondary: SS_ANNE_TILESET },
  },
  "ss-anne-deck": {
    id: "ss-anne-deck",
    label: "S.S. Anne Deck",
    layoutUrl: "/game-assets/maps/ss-anne-deck/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-deck/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-deck/world.json",
    spawn: { x: 16, y: 10 },
    fallbackMusicId: 304,
    tilesets: { primary: GENERAL_TILESET, secondary: SS_ANNE_TILESET },
  },
  "ss-anne-captains-office": {
    id: "ss-anne-captains-office",
    label: "S.S. Anne Captain's Office",
    layoutUrl: "/game-assets/maps/ss-anne-captains-office/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-captains-office/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-captains-office/world.json",
    spawn: { x: 3, y: 6 },
    fallbackMusicId: 304,
    tilesets: { primary: GENERAL_TILESET, secondary: SS_ANNE_TILESET },
  },
  "vermilion-pokemon-center": {
    id: "vermilion-pokemon-center",
    label: "Vermilion Pokémon Center",
    layoutUrl: "/game-assets/maps/vermilion-pokemon-center/layout.json",
    previewUrl: "/game-assets/maps/vermilion-pokemon-center/preview.png",
    worldUrl: "/game-assets/maps/vermilion-pokemon-center/world.json",
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
    },
  },
  "vermilion-mart": {
    id: "vermilion-mart",
    label: "Vermilion Poké Mart",
    layoutUrl: "/game-assets/maps/vermilion-mart/layout.json",
    previewUrl: "/game-assets/maps/vermilion-mart/preview.png",
    worldUrl: "/game-assets/maps/vermilion-mart/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MART_TILESET,
    },
  },
  "vermilion-gym": {
    id: "vermilion-gym",
    label: "Vermilion Gym",
    layoutUrl: "/game-assets/maps/vermilion-gym/layout.json",
    previewUrl: "/game-assets/maps/vermilion-gym/preview.png",
    worldUrl: "/game-assets/maps/vermilion-gym/world.json",
    spawn: { x: 5, y: 18 },
    fallbackMusicId: 275,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: VERMILION_GYM_TILESET,
    },
  },
  "cerulean-pokemon-center": {
    id: "cerulean-pokemon-center",
    label: "Cerulean Pokémon Center",
    layoutUrl: "/game-assets/maps/cerulean-pokemon-center/layout.json",
    previewUrl: "/game-assets/maps/cerulean-pokemon-center/preview.png",
    worldUrl: "/game-assets/maps/cerulean-pokemon-center/world.json",
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
    },
  },
  "cerulean-mart": {
    id: "cerulean-mart",
    label: "Cerulean Poké Mart",
    layoutUrl: "/game-assets/maps/cerulean-mart/layout.json",
    previewUrl: "/game-assets/maps/cerulean-mart/preview.png",
    worldUrl: "/game-assets/maps/cerulean-mart/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MART_TILESET,
    },
  },
  "cerulean-gym": {
    id: "cerulean-gym",
    label: "Cerulean Gym",
    layoutUrl: "/game-assets/maps/cerulean-gym/layout.json",
    previewUrl: "/game-assets/maps/cerulean-gym/preview.png",
    worldUrl: "/game-assets/maps/cerulean-gym/world.json",
    spawn: { x: 8, y: 17 },
    fallbackMusicId: 275,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: CERULEAN_GYM_TILESET,
    },
  },
  "route-4-pokemon-center": {
    id: "route-4-pokemon-center",
    label: "Route 4 Pokémon Center",
    layoutUrl:
      "/game-assets/maps/route-4-pokemon-center/layout.json",
    previewUrl:
      "/game-assets/maps/route-4-pokemon-center/preview.png",
    worldUrl: "/game-assets/maps/route-4-pokemon-center/world.json",
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
    },
  },
  "mt-moon-1f": {
    id: "mt-moon-1f",
    label: "Mt. Moon 1F",
    layoutUrl: "/game-assets/maps/mt-moon-1f/layout.json",
    previewUrl: "/game-assets/maps/mt-moon-1f/preview.png",
    worldUrl: "/game-assets/maps/mt-moon-1f/world.json",
    spawn: { x: 18, y: 37 },
    fallbackMusicId: 288,
    tilesets: { primary: GENERAL_TILESET, secondary: CAVE_TILESET },
  },
  "mt-moon-b1f": {
    id: "mt-moon-b1f",
    label: "Mt. Moon B1F",
    layoutUrl: "/game-assets/maps/mt-moon-b1f/layout.json",
    previewUrl: "/game-assets/maps/mt-moon-b1f/preview.png",
    worldUrl: "/game-assets/maps/mt-moon-b1f/world.json",
    spawn: { x: 3, y: 3 },
    fallbackMusicId: 288,
    tilesets: { primary: GENERAL_TILESET, secondary: CAVE_TILESET },
  },
  "mt-moon-b2f": {
    id: "mt-moon-b2f",
    label: "Mt. Moon B2F",
    layoutUrl: "/game-assets/maps/mt-moon-b2f/layout.json",
    previewUrl: "/game-assets/maps/mt-moon-b2f/preview.png",
    worldUrl: "/game-assets/maps/mt-moon-b2f/world.json",
    spawn: { x: 25, y: 21 },
    fallbackMusicId: 288,
    tilesets: { primary: GENERAL_TILESET, secondary: CAVE_TILESET },
  },
  "pallet-players-house-1f": {
    id: "pallet-players-house-1f",
    label: "Player's House 1F",
    layoutUrl: "/game-assets/maps/pallet-players-house-1f/layout.json",
    previewUrl: "/game-assets/maps/pallet-players-house-1f/preview.png",
    worldUrl: "/game-assets/maps/pallet-players-house-1f/world.json",
    spawn: { x: 4, y: 7 },
    fallbackMusicId: 300,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "pallet-players-house-2f": {
    id: "pallet-players-house-2f",
    label: "Player's House 2F",
    layoutUrl: "/game-assets/maps/pallet-players-house-2f/layout.json",
    previewUrl: "/game-assets/maps/pallet-players-house-2f/preview.png",
    worldUrl: "/game-assets/maps/pallet-players-house-2f/world.json",
    spawn: { x: 10, y: 3 },
    fallbackMusicId: 300,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "pallet-rivals-house": {
    id: "pallet-rivals-house",
    label: "Rival's House",
    layoutUrl: "/game-assets/maps/pallet-rivals-house/layout.json",
    previewUrl: "/game-assets/maps/pallet-rivals-house/preview.png",
    worldUrl: "/game-assets/maps/pallet-rivals-house/world.json",
    spawn: { x: 4, y: 7 },
    fallbackMusicId: 300,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "viridian-house": {
    id: "viridian-house",
    label: "Viridian House",
    layoutUrl: "/game-assets/maps/viridian-house/layout.json",
    previewUrl: "/game-assets/maps/viridian-house/preview.png",
    worldUrl: "/game-assets/maps/viridian-house/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "viridian-school": {
    id: "viridian-school",
    label: "Viridian School",
    layoutUrl: "/game-assets/maps/viridian-school/layout.json",
    previewUrl: "/game-assets/maps/viridian-school/preview.png",
    worldUrl: "/game-assets/maps/viridian-school/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: SCHOOL_TILESET,
    },
  },
  "pewter-museum-1f": {
    id: "pewter-museum-1f",
    label: "Pewter Museum 1F",
    layoutUrl: "/game-assets/maps/pewter-museum-1f/layout.json",
    previewUrl: "/game-assets/maps/pewter-museum-1f/preview.png",
    worldUrl: "/game-assets/maps/pewter-museum-1f/world.json",
    spawn: { x: 14, y: 8 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MUSEUM_TILESET,
    },
  },
  "pewter-museum-2f": {
    id: "pewter-museum-2f",
    label: "Pewter Museum 2F",
    layoutUrl: "/game-assets/maps/pewter-museum-2f/layout.json",
    previewUrl: "/game-assets/maps/pewter-museum-2f/preview.png",
    worldUrl: "/game-assets/maps/pewter-museum-2f/world.json",
    spawn: { x: 11, y: 7 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MUSEUM_TILESET,
    },
  },
  "pewter-house-1": {
    id: "pewter-house-1",
    label: "Pewter House",
    layoutUrl: "/game-assets/maps/pewter-house-1/layout.json",
    previewUrl: "/game-assets/maps/pewter-house-1/preview.png",
    worldUrl: "/game-assets/maps/pewter-house-1/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "pewter-house-2": {
    id: "pewter-house-2",
    label: "Pewter House",
    layoutUrl: "/game-assets/maps/pewter-house-2/layout.json",
    previewUrl: "/game-assets/maps/pewter-house-2/preview.png",
    worldUrl: "/game-assets/maps/pewter-house-2/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "cerulean-house-1": {
    id: "cerulean-house-1",
    label: "Cerulean House",
    layoutUrl: "/game-assets/maps/cerulean-house-1/layout.json",
    previewUrl: "/game-assets/maps/cerulean-house-1/preview.png",
    worldUrl: "/game-assets/maps/cerulean-house-1/world.json",
    spawn: { x: 3, y: 7 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "cerulean-house-3": {
    id: "cerulean-house-3",
    label: "Cerulean House",
    layoutUrl: "/game-assets/maps/cerulean-house-3/layout.json",
    previewUrl: "/game-assets/maps/cerulean-house-3/preview.png",
    worldUrl: "/game-assets/maps/cerulean-house-3/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "cerulean-bike-shop": {
    id: "cerulean-bike-shop",
    label: "Cerulean Bike Shop",
    layoutUrl: "/game-assets/maps/cerulean-bike-shop/layout.json",
    previewUrl: "/game-assets/maps/cerulean-bike-shop/preview.png",
    worldUrl: "/game-assets/maps/cerulean-bike-shop/world.json",
    spawn: { x: 5, y: 7 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: BIKE_SHOP_TILESET,
    },
  },
  "cerulean-house-4": {
    id: "cerulean-house-4",
    label: "Cerulean House",
    layoutUrl: "/game-assets/maps/cerulean-house-4/layout.json",
    previewUrl: "/game-assets/maps/cerulean-house-4/preview.png",
    worldUrl: "/game-assets/maps/cerulean-house-4/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "cerulean-house-5": {
    id: "cerulean-house-5",
    label: "Cerulean House",
    layoutUrl: "/game-assets/maps/cerulean-house-5/layout.json",
    previewUrl: "/game-assets/maps/cerulean-house-5/preview.png",
    worldUrl: "/game-assets/maps/cerulean-house-5/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "vermilion-house-1": {
    id: "vermilion-house-1",
    label: "Vermilion House",
    layoutUrl: "/game-assets/maps/vermilion-house-1/layout.json",
    previewUrl: "/game-assets/maps/vermilion-house-1/preview.png",
    worldUrl: "/game-assets/maps/vermilion-house-1/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 308,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "vermilion-pokemon-fan-club": {
    id: "vermilion-pokemon-fan-club",
    label: "Pokémon Fan Club",
    layoutUrl: "/game-assets/maps/vermilion-pokemon-fan-club/layout.json",
    previewUrl: "/game-assets/maps/vermilion-pokemon-fan-club/preview.png",
    worldUrl: "/game-assets/maps/vermilion-pokemon-fan-club/world.json",
    spawn: { x: 5, y: 9 },
    fallbackMusicId: 313,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: FAN_CLUB_DAYCARE_TILESET,
    },
  },
  "vermilion-house-2": {
    id: "vermilion-house-2",
    label: "Vermilion House",
    layoutUrl: "/game-assets/maps/vermilion-house-2/layout.json",
    previewUrl: "/game-assets/maps/vermilion-house-2/preview.png",
    worldUrl: "/game-assets/maps/vermilion-house-2/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 313,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "vermilion-house-3": {
    id: "vermilion-house-3",
    label: "Vermilion House",
    layoutUrl: "/game-assets/maps/vermilion-house-3/layout.json",
    previewUrl: "/game-assets/maps/vermilion-house-3/preview.png",
    worldUrl: "/game-assets/maps/vermilion-house-3/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 313,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_1_TILESET,
    },
  },
  "route-2-house": {
    id: "route-2-house",
    label: "Route 2 House",
    layoutUrl: "/game-assets/maps/route-2-house/layout.json",
    previewUrl: "/game-assets/maps/route-2-house/preview.png",
    worldUrl: "/game-assets/maps/route-2-house/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "route-5-day-care": {
    id: "route-5-day-care",
    label: "Pokémon Day Care",
    layoutUrl: "/game-assets/maps/route-5-day-care/layout.json",
    previewUrl: "/game-assets/maps/route-5-day-care/preview.png",
    worldUrl: "/game-assets/maps/route-5-day-care/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: FAN_CLUB_DAYCARE_TILESET,
    },
  },
  "ss-anne-kitchen": {
    id: "ss-anne-kitchen",
    label: "S.S. Anne Kitchen",
    layoutUrl: "/game-assets/maps/ss-anne-kitchen/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-kitchen/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-kitchen/world.json",
    spawn: { x: 7, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-corridor": {
    id: "ss-anne-b1f-corridor",
    label: "S.S. Anne B1F Corridor",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-corridor/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-corridor/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-corridor/world.json",
    spawn: { x: 19, y: 4 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-1": {
    id: "ss-anne-1f-room-1",
    label: "S.S. Anne 1F Room 1",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-1/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-1/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-1/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-2": {
    id: "ss-anne-1f-room-2",
    label: "S.S. Anne 1F Room 2",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-2/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-2/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-2/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-3": {
    id: "ss-anne-1f-room-3",
    label: "S.S. Anne 1F Room 3",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-3/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-3/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-3/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-4": {
    id: "ss-anne-1f-room-4",
    label: "S.S. Anne 1F Room 4",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-4/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-4/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-4/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-5": {
    id: "ss-anne-1f-room-5",
    label: "S.S. Anne 1F Room 5",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-5/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-5/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-5/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-6": {
    id: "ss-anne-1f-room-6",
    label: "S.S. Anne 1F Room 6",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-6/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-6/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-6/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-1f-room-7": {
    id: "ss-anne-1f-room-7",
    label: "S.S. Anne 1F Room 7",
    layoutUrl: "/game-assets/maps/ss-anne-1f-room-7/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-1f-room-7/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-1f-room-7/world.json",
    spawn: { x: 2, y: 2 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-1": {
    id: "ss-anne-2f-room-1",
    label: "S.S. Anne 2F Room 1",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-1/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-1/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-1/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-2": {
    id: "ss-anne-2f-room-2",
    label: "S.S. Anne 2F Room 2",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-2/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-2/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-2/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-3": {
    id: "ss-anne-2f-room-3",
    label: "S.S. Anne 2F Room 3",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-3/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-3/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-3/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-4": {
    id: "ss-anne-2f-room-4",
    label: "S.S. Anne 2F Room 4",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-4/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-4/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-4/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-5": {
    id: "ss-anne-2f-room-5",
    label: "S.S. Anne 2F Room 5",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-5/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-5/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-5/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-2f-room-6": {
    id: "ss-anne-2f-room-6",
    label: "S.S. Anne 2F Room 6",
    layoutUrl: "/game-assets/maps/ss-anne-2f-room-6/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-2f-room-6/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-2f-room-6/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-room-1": {
    id: "ss-anne-b1f-room-1",
    label: "S.S. Anne B1F Room 1",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-room-1/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-room-1/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-room-1/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-room-2": {
    id: "ss-anne-b1f-room-2",
    label: "S.S. Anne B1F Room 2",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-room-2/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-room-2/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-room-2/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-room-3": {
    id: "ss-anne-b1f-room-3",
    label: "S.S. Anne B1F Room 3",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-room-3/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-room-3/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-room-3/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-room-4": {
    id: "ss-anne-b1f-room-4",
    label: "S.S. Anne B1F Room 4",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-room-4/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-room-4/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-room-4/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "ss-anne-b1f-room-5": {
    id: "ss-anne-b1f-room-5",
    label: "S.S. Anne B1F Room 5",
    layoutUrl: "/game-assets/maps/ss-anne-b1f-room-5/layout.json",
    previewUrl: "/game-assets/maps/ss-anne-b1f-room-5/preview.png",
    worldUrl: "/game-assets/maps/ss-anne-b1f-room-5/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 304,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: SS_ANNE_TILESET,
    },
  },
  "pewter-mart": {
    id: "pewter-mart",
    label: "Pewter Poké Mart",
    layoutUrl: "/game-assets/maps/pewter-mart/layout.json",
    previewUrl: "/game-assets/maps/pewter-mart/preview.png",
    worldUrl: "/game-assets/maps/pewter-mart/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MART_TILESET,
    },
  },
  "pewter-pokemon-center": {
    id: "pewter-pokemon-center",
    label: "Pewter Pokémon Center",
    layoutUrl: "/game-assets/maps/pewter-pokemon-center/layout.json",
    previewUrl: "/game-assets/maps/pewter-pokemon-center/preview.png",
    worldUrl: "/game-assets/maps/pewter-pokemon-center/world.json",
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
    },
  },
  "pewter-gym": {
    id: "pewter-gym",
    label: "Pewter Gym",
    layoutUrl: "/game-assets/maps/pewter-gym/layout.json",
    previewUrl: "/game-assets/maps/pewter-gym/preview.png",
    worldUrl: "/game-assets/maps/pewter-gym/world.json",
    spawn: { x: 6, y: 13 },
    fallbackMusicId: 275,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: PEWTER_GYM_TILESET,
    },
  },
  "route-22": {
    id: "route-22",
    label: "Route 22",
    layoutUrl: "/game-assets/maps/route-22/layout.json",
    previewUrl: "/game-assets/maps/route-22/preview.png",
    worldUrl: "/game-assets/maps/route-22/world.json",
    spawn: { x: 47, y: 6 },
    fallbackMusicId: 293,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VIRIDIAN_TILESET,
    },
  },
  "route-2-forest-south-entrance": {
    id: "route-2-forest-south-entrance",
    label: "Viridian Forest South Gate",
    layoutUrl:
      "/game-assets/maps/route-2-forest-south-entrance/layout.json",
    previewUrl:
      "/game-assets/maps/route-2-forest-south-entrance/preview.png",
    worldUrl: "/game-assets/maps/route-2-forest-south-entrance/world.json",
    spawn: { x: 7, y: 9 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "viridian-forest": {
    id: "viridian-forest",
    label: "Viridian Forest",
    layoutUrl: "/game-assets/maps/viridian-forest/layout.json",
    previewUrl: "/game-assets/maps/viridian-forest/preview.png",
    worldUrl: "/game-assets/maps/viridian-forest/world.json",
    spawn: { x: 29, y: 61 },
    fallbackMusicId: 287,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VIRIDIAN_FOREST_TILESET,
    },
  },
  "route-2-forest-north-entrance": {
    id: "route-2-forest-north-entrance",
    label: "Viridian Forest North Gate",
    layoutUrl:
      "/game-assets/maps/route-2-forest-north-entrance/layout.json",
    previewUrl:
      "/game-assets/maps/route-2-forest-north-entrance/preview.png",
    worldUrl: "/game-assets/maps/route-2-forest-north-entrance/world.json",
    spawn: { x: 7, y: 9 },
    fallbackMusicId: 314,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: GENERIC_BUILDING_2_TILESET,
    },
  },
  "viridian-city": {
    id: "viridian-city",
    label: "Viridian City",
    layoutUrl: "/game-assets/maps/viridian-city/layout.json",
    previewUrl: "/game-assets/maps/viridian-city/preview.png",
    worldUrl: "/game-assets/maps/viridian-city/world.json",
    spawn: { x: 23, y: 39 },
    fallbackMusicId: 314,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: VIRIDIAN_TILESET,
    },
  },
  "oak-lab": {
    id: "oak-lab",
    label: "Professor Oak's Lab",
    layoutUrl: "/game-assets/maps/oak-lab/layout.json",
    previewUrl: "/game-assets/maps/oak-lab/preview.png",
    worldUrl: "/game-assets/maps/oak-lab/world.json",
    spawn: { x: 6, y: 11 },
    fallbackMusicId: 301,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: LAB_TILESET,
    },
  },
  "viridian-mart": {
    id: "viridian-mart",
    label: "Viridian Poké Mart",
    layoutUrl: "/game-assets/maps/viridian-mart/layout.json",
    previewUrl: "/game-assets/maps/viridian-mart/preview.png",
    worldUrl: "/game-assets/maps/viridian-mart/world.json",
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MART_TILESET,
    },
  },
  "viridian-pokemon-center": {
    id: "viridian-pokemon-center",
    label: "Viridian Pokémon Center",
    layoutUrl:
      "/game-assets/maps/viridian-pokemon-center/layout.json",
    previewUrl:
      "/game-assets/maps/viridian-pokemon-center/preview.png",
    worldUrl: "/game-assets/maps/viridian-pokemon-center/world.json",
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
    },
  },
};

for (const generated of Object.values(
  GENERATED_MAP_DEFINITIONS,
)) {
  if (WORLD_MAPS[generated.id]) continue;
  WORLD_MAPS[generated.id] = {
    id: generated.id,
    label: generated.label,
    layoutUrl: generated.layoutUrl,
    previewUrl: generated.previewUrl,
    worldUrl: generated.worldUrl,
    spawn: generated.spawn,
    fallbackMusicId: generated.fallbackMusicId,
    tilesets: {
      primary: GENERATED_TILESETS[generated.primary],
      secondary: GENERATED_TILESETS[generated.secondary],
    },
  };
}

export const PLAYER_SPRITE = {
  url: "/game-assets/overworld/red-normal.png",
  frameWidth: 16,
  frameHeight: 32,
  columns: 6,
  sheetWidth: 96,
  sheetHeight: 128,
};

/** Where a new game begins: the player's bedroom (FireRed's new-game warp, 2F of the house in Pallet Town). */
export const NEW_GAME_START = {
  mapId: "pallet-players-house-2f",
  x: 6,
  y: 6,
} as const;

export const DIRECTION_DELTA: Record<
  Direction,
  { x: number; y: number }
> = {
  south: { x: 0, y: 1 },
  north: { x: 0, y: -1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

/** Border crossings generated from the ROM map connections. */
function resolveGeneratedConnection(
  mapId: string,
  x: number,
  y: number,
  direction: Direction,
): WorldTransition | null {
  const size = GENERATED_MAP_SIZES[mapId];
  if (!size) return null;

  for (const connection of WORLD_CONNECTIONS[mapId] ?? []) {
    if (connection.direction !== direction) continue;
    const target = GENERATED_MAP_SIZES[connection.target];
    if (!target) continue;

    if (direction === "north" || direction === "south") {
      if (y !== (direction === "north" ? 0 : size[1] - 1)) continue;
      const tx = x - connection.offset;
      if (tx < 0 || tx >= target[0]) continue;
      return {
        mapId: connection.target,
        spawn: { x: tx, y: direction === "north" ? target[1] - 1 : 0 },
      };
    }

    if (x !== (direction === "west" ? 0 : size[0] - 1)) continue;
    const ty = y - connection.offset;
    if (ty < 0 || ty >= target[1]) continue;
    return {
      mapId: connection.target,
      spawn: { x: direction === "west" ? target[0] - 1 : 0, y: ty },
    };
  }

  return null;
}

export function resolveWorldTransition(
  mapId: string,
  x: number,
  y: number,
  direction: Direction,
): WorldTransition | null {
  return (
    resolveHandWrittenTransition(mapId, x, y, direction) ??
    resolveGeneratedConnection(mapId, x, y, direction)
  );
}

function resolveHandWrittenTransition(
  mapId: string,
  x: number,
  y: number,
  direction: Direction,
): WorldTransition | null {
  if (
    mapId === "pallet-town" &&
    direction === "north" &&
    y === 0 &&
    x >= 12 &&
    x <= 13
  ) {
    return {
      mapId: "route-1",
      spawn: { x, y: 37 },
    };
  }

  if (
    mapId === "route-1" &&
    direction === "south" &&
    y >= 37 &&
    x >= 12 &&
    x <= 13
  ) {
    return {
      mapId: "pallet-town",
      spawn: { x, y: 0 },
    };
  }

  if (
    mapId === "route-1" &&
    direction === "north" &&
    y === 0 &&
    x >= 10 &&
    x <= 13
  ) {
    return {
      mapId: "viridian-city",
      spawn: { x: x + 12, y: 39 },
    };
  }

  if (
    mapId === "viridian-city" &&
    direction === "south" &&
    y === 39 &&
    x >= 22 &&
    x <= 25
  ) {
    return {
      mapId: "route-1",
      spawn: { x: x - 12, y: 0 },
    };
  }

  if (
    mapId === "viridian-city" &&
    direction === "north" &&
    y === 0 &&
    x >= 19 &&
    x <= 23
  ) {
    return {
      mapId: "route-2",
      spawn: { x: x - 12, y: 79 },
    };
  }

  if (
    mapId === "route-2" &&
    direction === "south" &&
    y === 79 &&
    x >= 7 &&
    x <= 11
  ) {
    return {
      mapId: "viridian-city",
      spawn: { x: x + 12, y: 0 },
    };
  }

  if (
    mapId === "route-2" &&
    direction === "north" &&
    y === 0 &&
    x >= 8 &&
    x <= 11
  ) {
    return {
      mapId: "pewter-city",
      spawn: { x: x + 12, y: 39 },
    };
  }

  if (
    mapId === "pewter-city" &&
    direction === "south" &&
    y === 39 &&
    x >= 20 &&
    x <= 23
  ) {
    return {
      mapId: "route-2",
      spawn: { x: x - 12, y: 0 },
    };
  }

  if (
    mapId === "route-3" &&
    direction === "north" &&
    y === 0 &&
    x >= 68 &&
    x <= 75
  ) {
    return {
      mapId: "route-4",
      spawn: { x: x - 60, y: 19 },
    };
  }

  if (
    mapId === "route-4" &&
    direction === "south" &&
    y === 19 &&
    x >= 8 &&
    x <= 15
  ) {
    return {
      mapId: "route-3",
      spawn: { x: x + 60, y: 0 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    direction === "north" &&
    y === 0 &&
    x >= 12 &&
    x <= 35
  ) {
    return {
      mapId: "route-24",
      spawn: { x: x - 12, y: 39 },
    };
  }

  if (
    mapId === "route-24" &&
    direction === "south" &&
    y === 39 &&
    x >= 0 &&
    x <= 23
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: x + 12, y: 0 },
    };
  }

  if (
    mapId === "route-24" &&
    direction === "east" &&
    x === 23 &&
    y >= 0 &&
    y <= 19
  ) {
    return {
      mapId: "route-25",
      spawn: { x: 0, y },
    };
  }

  if (
    mapId === "route-25" &&
    direction === "west" &&
    x === 0 &&
    y >= 0 &&
    y <= 19
  ) {
    return {
      mapId: "route-24",
      spawn: { x: 23, y },
    };
  }

  if (
    mapId === "cerulean-city" &&
    direction === "south" &&
    y === 39 &&
    x >= 0 &&
    x <= 47
  ) {
    return {
      mapId: "route-5",
      spawn: { x, y: 0 },
    };
  }

  if (
    mapId === "route-5" &&
    direction === "north" &&
    y === 0 &&
    x >= 0 &&
    x <= 47
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x, y: 39 },
    };
  }

  if (
    mapId === "route-6" &&
    direction === "south" &&
    y === 39 &&
    x >= 0 &&
    x <= 23
  ) {
    return {
      mapId: "vermilion-city",
      spawn: { x: x + 12, y: 0 },
    };
  }

  if (
    mapId === "vermilion-city" &&
    direction === "north" &&
    y === 0 &&
    x >= 12 &&
    x <= 35
  ) {
    return {
      mapId: "route-6",
      spawn: { x: x - 12, y: 39 },
    };
  }

  if (
    mapId === "route-4" &&
    direction === "east" &&
    x === 107 &&
    y >= 0 &&
    y <= 19
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 0, y: y + 10 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    direction === "west" &&
    x === 0 &&
    y >= 10 &&
    y <= 29
  ) {
    return {
      mapId: "route-4",
      spawn: { x: 107, y: y - 10 },
    };
  }

  if (
    mapId === "pewter-city" &&
    direction === "east" &&
    x === 47 &&
    y >= 20 &&
    y <= 23
  ) {
    return {
      mapId: "route-3",
      spawn: { x: 0, y: y - 11 },
    };
  }

  if (
    mapId === "route-3" &&
    direction === "west" &&
    x === 0 &&
    y >= 9 &&
    y <= 12
  ) {
    return {
      mapId: "pewter-city",
      spawn: { x: 47, y: y + 11 },
    };
  }

  if (
    mapId === "viridian-city" &&
    direction === "west" &&
    x === 0 &&
    y >= 16 &&
    y <= 19
  ) {
    return {
      mapId: "route-22",
      spawn: { x: 47, y: y - 10 },
    };
  }

  if (
    mapId === "route-22" &&
    direction === "east" &&
    x === 47 &&
    y >= 6 &&
    y <= 9
  ) {
    return {
      mapId: "viridian-city",
      spawn: { x: 0, y: y + 10 },
    };
  }

  return null;
}

/**
 * Supported door warps for the first story slice.
 *
 * The semantic extractor now exports every ROM warp. Once the full map
 * registry is generated for the client this fallback table can be replaced
 * by target_map + target warp lookup without changing the movement engine.
 */
export type WhiteOutRespawn = {
  mapId: string;
  spawn: { x: number; y: number };
};

/**
 * A respawn request is a one-shot command. Effects re-run on remounts and
 * Fast Refresh, so a request must only move the player when its id has not
 * been applied yet.
 */
export function shouldApplyRespawnRequest(
  request: { id: number } | null,
  lastAppliedId: number | null,
): boolean {
  return request !== null && request.id !== lastAppliedId;
}

export function resolveWhiteOutRespawn(
  healLocationId: StoryHealLocationId,
): WhiteOutRespawn {
  const heal = findHealLocation(healLocationId);
  if (heal) {
    return {
      mapId: heal.centerMapId,
      spawn: { x: 7, y: 7 },
    };
  }

  // FireRed's Pallet heal location is (6, 8). The player's
  // house interior is not in this slice yet, so respawn outside.
  return {
    mapId: "pallet-town",
    spawn: { x: 6, y: 8 },
  };
}

export function isVictoryRoadLeagueGateAt(
  mapId: string,
  x: number,
  y: number,
): boolean {
  // FireRed Route 22 warps 0/1 enter the first League gate.
  // The route itself is useful early; Victory Road remains late-game.
  return (
    mapId === "route-22" &&
    y === 5 &&
    (x === 8 || x === 9)
  );
}

export function isSsAnneBoardingWarpAt(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "vermilion-city" &&
    y === 34 &&
    x >= 22 &&
    x <= 24
  );
}

export function isPokemonStoragePcAt(
  mapId: string,
  x: number,
  y: number,
): boolean {
  // FireRed's MB_PC metatile in LAYOUT_POKEMON_CENTER_1F.
  return (
    POKEMON_CENTER_MAP_IDS.includes(mapId) &&
    x === 11 &&
    y === 1
  );
}

export function resolveWarpTransitionAt(
  mapId: string,
  x: number,
  y: number,
): WorldTransition | null {
  return (
    resolveHandWrittenWarpAt(mapId, x, y) ??
    GENERATED_WARPS[`${mapId}:${x},${y}`] ??
    resolveWorldWarpAt(mapId, x, y)
  );
}

function resolveWorldWarpAt(
  mapId: string,
  x: number,
  y: number,
): WorldTransition | null {
  const warp = WORLD_WARPS[`${mapId}:${x},${y}`];

  return warp
    ? { mapId: warp[0], spawn: { x: warp[1], y: warp[2] } }
    : null;
}

function resolveHandWrittenWarpAt(
  mapId: string,
  x: number,
  y: number,
): WorldTransition | null {
  if (
    mapId === "pallet-town" &&
    x === 16 &&
    y === 13
  ) {
    return {
      mapId: "oak-lab",
      spawn: { x: 6, y: 11 },
    };
  }

  if (
    mapId === "oak-lab" &&
    y === 12 &&
    x >= 5 &&
    x <= 7
  ) {
    return {
      mapId: "pallet-town",
      spawn: { x: 16, y: 14 },
    };
  }

  if (mapId === "route-4" && x === 19 && y === 5) {
    return { mapId: "mt-moon-1f", spawn: { x: 18, y: 37 } };
  }
  if (mapId === "mt-moon-1f" && x === 18 && y === 37) {
    return { mapId: "route-4", spawn: { x: 19, y: 5 } };
  }
  if (mapId === "route-4" && x === 32 && y === 5) {
    return { mapId: "mt-moon-b1f", spawn: { x: 45, y: 4 } };
  }
  if (mapId === "mt-moon-b1f" && x === 45 && y === 4) {
    return { mapId: "route-4", spawn: { x: 32, y: 5 } };
  }
  if (mapId === "mt-moon-1f" && x === 5 && y === 6) {
    return { mapId: "mt-moon-b1f", spawn: { x: 3, y: 3 } };
  }
  if (mapId === "mt-moon-b1f" && x === 3 && y === 3) {
    return { mapId: "mt-moon-1f", spawn: { x: 5, y: 6 } };
  }
  if (mapId === "mt-moon-1f" && x === 19 && y === 14) {
    return { mapId: "mt-moon-b1f", spawn: { x: 25, y: 4 } };
  }
  if (mapId === "mt-moon-b1f" && x === 25 && y === 4) {
    return { mapId: "mt-moon-1f", spawn: { x: 19, y: 14 } };
  }
  if (mapId === "mt-moon-1f" && x === 31 && y === 16) {
    return { mapId: "mt-moon-b1f", spawn: { x: 43, y: 21 } };
  }
  if (mapId === "mt-moon-b1f" && x === 43 && y === 21) {
    return { mapId: "mt-moon-1f", spawn: { x: 31, y: 16 } };
  }
  if (mapId === "mt-moon-b1f" && x === 22 && y === 18) {
    return { mapId: "mt-moon-b2f", spawn: { x: 25, y: 21 } };
  }
  if (mapId === "mt-moon-b2f" && x === 25 && y === 21) {
    return { mapId: "mt-moon-b1f", spawn: { x: 22, y: 18 } };
  }
  if (mapId === "mt-moon-b1f" && x === 17 && y === 5) {
    return { mapId: "mt-moon-b2f", spawn: { x: 31, y: 11 } };
  }
  if (mapId === "mt-moon-b2f" && x === 31 && y === 11) {
    return { mapId: "mt-moon-b1f", spawn: { x: 17, y: 5 } };
  }
  if (mapId === "mt-moon-b1f" && x === 26 && y === 36) {
    return { mapId: "mt-moon-b2f", spawn: { x: 17, y: 31 } };
  }
  if (mapId === "mt-moon-b2f" && x === 17 && y === 31) {
    return { mapId: "mt-moon-b1f", spawn: { x: 26, y: 36 } };
  }
  if (mapId === "mt-moon-b1f" && x === 39 && y === 4) {
    return { mapId: "mt-moon-b2f", spawn: { x: 5, y: 10 } };
  }
  if (mapId === "mt-moon-b2f" && x === 5 && y === 10) {
    return { mapId: "mt-moon-b1f", spawn: { x: 39, y: 4 } };
  }

  if (
    mapId === "route-5" &&
    x === 31 &&
    y === 31
  ) {
    return {
      mapId: "underground-path-north-entrance",
      spawn: { x: 6, y: 7 },
    };
  }

  if (
    mapId === "underground-path-north-entrance" &&
    y === 8 &&
    x >= 5 &&
    x <= 7
  ) {
    return {
      mapId: "route-5",
      spawn: { x: 31, y: 30 },
    };
  }

  if (
    mapId === "underground-path-north-entrance" &&
    x === 7 &&
    y === 4
  ) {
    return {
      mapId: "underground-path-tunnel",
      spawn: { x: 4, y: 4 },
    };
  }

  if (
    mapId === "underground-path-tunnel" &&
    x === 4 &&
    y === 3
  ) {
    return {
      mapId: "underground-path-north-entrance",
      spawn: { x: 7, y: 5 },
    };
  }

  if (
    mapId === "underground-path-tunnel" &&
    x === 3 &&
    y === 60
  ) {
    return {
      mapId: "underground-path-south-entrance",
      spawn: { x: 7, y: 5 },
    };
  }

  if (
    mapId === "underground-path-south-entrance" &&
    x === 7 &&
    y === 4
  ) {
    return {
      mapId: "underground-path-tunnel",
      spawn: { x: 3, y: 59 },
    };
  }

  if (
    mapId === "underground-path-south-entrance" &&
    y === 8 &&
    x >= 5 &&
    x <= 7
  ) {
    return {
      mapId: "route-6",
      spawn: { x: 19, y: 14 },
    };
  }

  if (
    mapId === "route-6" &&
    x === 19 &&
    y === 13
  ) {
    return {
      mapId: "underground-path-south-entrance",
      spawn: { x: 6, y: 7 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    x === 30 &&
    y === 11
  ) {
    return {
      mapId: "cerulean-house2",
      spawn: { x: 3, y: 6 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    x === 31 &&
    (y === 8 || y === 9)
  ) {
    return {
      mapId: "cerulean-house2",
      spawn: { x: 4, y: 2 },
    };
  }

  if (
    mapId === "cerulean-house2" &&
    y === 7 &&
    x >= 2 &&
    x <= 4
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 30, y: 12 },
    };
  }

  if (
    mapId === "cerulean-house2" &&
    x === 4 &&
    y === 1
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 31, y: 8 },
    };
  }

  if (
    mapId === "route-25" &&
    x === 51 &&
    y === 4
  ) {
    return {
      mapId: "sea-cottage",
      spawn: { x: 7, y: 8 },
    };
  }

  if (
    mapId === "sea-cottage" &&
    y === 9 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "route-25",
      spawn: { x: 51, y: 5 },
    };
  }

  if (isSsAnneBoardingWarpAt(mapId, x, y)) {
    return {
      mapId: "ss-anne-exterior",
      spawn: { x: 32, y: 6 },
    };
  }

  if (
    mapId === "ss-anne-exterior" &&
    y === 5 &&
    x >= 31 &&
    x <= 33
  ) {
    return {
      mapId: "vermilion-city",
      spawn: { x: x - 9, y: 33 },
    };
  }

  if (
    mapId === "ss-anne-exterior" &&
    x === 32 &&
    y === 14
  ) {
    return {
      mapId: "ss-anne-1f-corridor",
      spawn: { x: 19, y: 1 },
    };
  }

  if (
    mapId === "ss-anne-exterior" &&
    x === 33 &&
    y === 15
  ) {
    return {
      mapId: "ss-anne-1f-corridor",
      spawn: { x: 20, y: 0 },
    };
  }

  if (
    mapId === "ss-anne-1f-corridor" &&
    x === 19 &&
    y === 1
  ) {
    return {
      mapId: "ss-anne-exterior",
      spawn: { x: 32, y: 14 },
    };
  }

  if (
    mapId === "ss-anne-1f-corridor" &&
    x === 20 &&
    y === 0
  ) {
    return {
      mapId: "ss-anne-exterior",
      spawn: { x: 33, y: 15 },
    };
  }

  if (mapId === "ss-anne-1f-corridor" && x === 3 && y === 8) {
    return { mapId: "ss-anne-2f-corridor", spawn: { x: 2, y: 3 } };
  }
  if (mapId === "ss-anne-2f-corridor" && x === 2 && y === 2) {
    return { mapId: "ss-anne-1f-corridor", spawn: { x: 3, y: 9 } };
  }
  if (mapId === "ss-anne-2f-corridor" && x === 3 && y === 12) {
    return { mapId: "ss-anne-3f-corridor", spawn: { x: 18, y: 3 } };
  }
  if (mapId === "ss-anne-3f-corridor" && x === 18 && y === 2) {
    return { mapId: "ss-anne-2f-corridor", spawn: { x: 3, y: 11 } };
  }
  if (
    mapId === "ss-anne-3f-corridor" &&
    ((x === 1 && y === 4) || (x === 0 && y === 5))
  ) {
    return { mapId: "ss-anne-deck", spawn: { x: 16, y: 10 } };
  }
  if (
    mapId === "ss-anne-deck" &&
    x === 16 &&
    (y === 8 || y === 9)
  ) {
    return { mapId: "ss-anne-3f-corridor", spawn: { x: 1, y: 5 } };
  }

  if (
    mapId === "ss-anne-2f-corridor" &&
    x === 30 &&
    y === 2
  ) {
    return {
      mapId: "ss-anne-captains-office",
      spawn: { x: 3, y: 6 },
    };
  }

  if (
    mapId === "ss-anne-captains-office" &&
    x === 3 &&
    y === 7
  ) {
    return {
      mapId: "ss-anne-2f-corridor",
      spawn: { x: 29, y: 2 },
    };
  }

  if (
    mapId === "vermilion-city" &&
    x === 15 &&
    y === 6
  ) {
    return {
      mapId: "vermilion-pokemon-center",
      spawn: { x: 7, y: 7 },
    };
  }

  if (
    mapId === "vermilion-pokemon-center" &&
    y === 8 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "vermilion-city",
      spawn: { x: 15, y: 7 },
    };
  }

  if (
    mapId === "vermilion-city" &&
    x === 29 &&
    y === 17
  ) {
    return {
      mapId: "vermilion-mart",
      spawn: { x: 4, y: 6 },
    };
  }

  if (
    mapId === "vermilion-mart" &&
    y === 7 &&
    x >= 3 &&
    x <= 5
  ) {
    return {
      mapId: "vermilion-city",
      spawn: { x: 29, y: 18 },
    };
  }

  if (
    mapId === "vermilion-city" &&
    x === 14 &&
    y === 25
  ) {
    return {
      mapId: "vermilion-gym",
      spawn: { x: 5, y: 18 },
    };
  }

  if (
    mapId === "vermilion-gym" &&
    y === 19 &&
    x >= 4 &&
    x <= 6
  ) {
    return {
      mapId: "vermilion-city",
      spawn: { x: 14, y: 26 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    x === 31 &&
    y === 21
  ) {
    return {
      mapId: "cerulean-gym",
      spawn: { x: 8, y: 17 },
    };
  }

  if (
    mapId === "cerulean-gym" &&
    y === 18 &&
    x >= 7 &&
    x <= 9
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 31, y: 22 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    x === 22 &&
    y === 19
  ) {
    return {
      mapId: "cerulean-pokemon-center",
      spawn: { x: 7, y: 7 },
    };
  }

  if (
    mapId === "cerulean-pokemon-center" &&
    y === 8 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 22, y: 20 },
    };
  }

  if (
    mapId === "cerulean-city" &&
    x === 29 &&
    y === 28
  ) {
    return {
      mapId: "cerulean-mart",
      spawn: { x: 4, y: 6 },
    };
  }

  if (
    mapId === "cerulean-mart" &&
    y === 7 &&
    x >= 3 &&
    x <= 5
  ) {
    return {
      mapId: "cerulean-city",
      spawn: { x: 29, y: 29 },
    };
  }

  if (
    mapId === "route-4" &&
    x === 12 &&
    y === 5
  ) {
    return {
      mapId: "route-4-pokemon-center",
      spawn: { x: 7, y: 7 },
    };
  }

  if (
    mapId === "route-4-pokemon-center" &&
    y === 8 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "route-4",
      spawn: { x: 12, y: 6 },
    };
  }

  if (
    mapId === "pewter-city" &&
    x === 17 &&
    y === 25
  ) {
    return {
      mapId: "pewter-pokemon-center",
      spawn: { x: 7, y: 7 },
    };
  }

  if (
    mapId === "pewter-pokemon-center" &&
    y === 8 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "pewter-city",
      spawn: { x: 17, y: 26 },
    };
  }

  if (
    mapId === "pewter-city" &&
    x === 28 &&
    y === 18
  ) {
    return {
      mapId: "pewter-mart",
      spawn: { x: 4, y: 6 },
    };
  }

  if (
    mapId === "pewter-mart" &&
    y === 7 &&
    x >= 3 &&
    x <= 5
  ) {
    return {
      mapId: "pewter-city",
      spawn: { x: 28, y: 19 },
    };
  }

  if (
    mapId === "pewter-city" &&
    x === 15 &&
    y === 16
  ) {
    return {
      mapId: "pewter-gym",
      spawn: { x: 6, y: 13 },
    };
  }

  if (
    mapId === "pewter-gym" &&
    y === 14 &&
    x >= 5 &&
    x <= 7
  ) {
    return {
      mapId: "pewter-city",
      spawn: { x: 15, y: 17 },
    };
  }

  if (
    mapId === "viridian-city" &&
    x === 26 &&
    y === 26
  ) {
    return {
      mapId: "viridian-pokemon-center",
      spawn: { x: 7, y: 7 },
    };
  }

  if (
    mapId === "viridian-pokemon-center" &&
    y === 8 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "viridian-city",
      spawn: { x: 26, y: 27 },
    };
  }

  if (
    mapId === "viridian-city" &&
    x === 36 &&
    y === 19
  ) {
    return {
      mapId: "viridian-mart",
      spawn: { x: 4, y: 6 },
    };
  }

  if (
    mapId === "viridian-mart" &&
    y === 7 &&
    x >= 3 &&
    x <= 5
  ) {
    return {
      mapId: "viridian-city",
      spawn: { x: 36, y: 20 },
    };
  }

  if (
    mapId === "route-2" &&
    y === 51 &&
    (x === 5 || x === 6)
  ) {
    return {
      mapId: "route-2-forest-south-entrance",
      spawn: { x: 7, y: 9 },
    };
  }

  if (
    mapId === "route-2-forest-south-entrance" &&
    y === 10 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "route-2",
      spawn: { x: 6, y: 52 },
    };
  }

  if (
    mapId === "route-2-forest-south-entrance" &&
    x === 7 &&
    y === 1
  ) {
    return {
      mapId: "viridian-forest",
      spawn: { x: 29, y: 61 },
    };
  }

  if (
    mapId === "viridian-forest" &&
    y === 62 &&
    x >= 28 &&
    x <= 30
  ) {
    return {
      mapId: "route-2-forest-south-entrance",
      spawn: { x: 7, y: 2 },
    };
  }

  if (
    mapId === "viridian-forest" &&
    y === 9 &&
    x >= 4 &&
    x <= 6
  ) {
    return {
      mapId: "route-2-forest-north-entrance",
      spawn: { x: 7, y: 9 },
    };
  }

  if (
    mapId === "route-2-forest-north-entrance" &&
    y === 10 &&
    x >= 6 &&
    x <= 8
  ) {
    return {
      mapId: "viridian-forest",
      spawn: { x: 5, y: 10 },
    };
  }

  if (
    mapId === "route-2-forest-north-entrance" &&
    x === 7 &&
    y === 1
  ) {
    return {
      mapId: "route-2",
      spawn: { x: 6, y: 12 },
    };
  }

  if (
    mapId === "route-2" &&
    y === 13 &&
    (x === 5 || x === 6)
  ) {
    return {
      mapId: "route-2-forest-north-entrance",
      spawn: { x: 7, y: 2 },
    };
  }

  return null;
}

/** True for door cells that open when the player arrives (League rooms). */
export function isWorldOpenCell(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    (WORLD_OPEN_CELLS[mapId] ?? []).some(
      (cell) => cell[0] === x && cell[1] === y,
    ) ||
    (QUEST_OPEN_CELLS[mapId] ?? []).some(
      (cell) => cell[0] === x && cell[1] === y,
    )
  );
}
