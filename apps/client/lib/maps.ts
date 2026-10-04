export const TILE_SIZE = 16;
export const WORLD_ZOOM = 3;

export type Direction = "south" | "north" | "west" | "east";

export type MapCell = {
  raw: number;
  metatile: number;
  collision: number;
  elevation: number;
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
};

export type WorldMapData = {
  index: number;
  name: string;
  music: number | null;
  objects: WorldObject[];
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

const BUILDING_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/building/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/building/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/building/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/building/attributes.bin",
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
    worldUrl: null,
    spawn: { x: 4, y: 6 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: MART_TILESET,
    },
  },
};

export const PLAYER_SPRITE = {
  url: "/game-assets/overworld/red-normal.png",
  frameWidth: 16,
  frameHeight: 32,
  columns: 6,
  sheetWidth: 96,
  sheetHeight: 128,
};

export const DIRECTION_DELTA: Record<
  Direction,
  { x: number; y: number }
> = {
  south: { x: 0, y: 1 },
  north: { x: 0, y: -1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export function resolveWorldTransition(
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

  return null;
}

/**
 * Supported door warps for the first story slice.
 *
 * The semantic extractor now exports every ROM warp. Once the full map
 * registry is generated for the client this fallback table can be replaced
 * by target_map + target warp lookup without changing the movement engine.
 */
export function resolveWarpTransitionAt(
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

  return null;
}
