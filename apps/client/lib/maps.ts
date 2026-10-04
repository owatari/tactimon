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

const PEWTER_TILESET: TilesetAssetDefinition = {
  tilesUrl: "/game-assets/tilesets/pewter-city/tiles.4bpp",
  palettesUrl: "/game-assets/tilesets/pewter-city/palettes.gbapal",
  metatilesUrl: "/game-assets/tilesets/pewter-city/metatiles.bin",
  attributesUrl: "/game-assets/tilesets/pewter-city/attributes.bin",
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
    worldUrl: null,
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
    worldUrl: null,
    spawn: { x: 21, y: 39 },
    fallbackMusicId: 314,
    tilesets: {
      primary: GENERAL_TILESET,
      secondary: PEWTER_TILESET,
    },
  },
  "route-22": {
    id: "route-22",
    label: "Route 22",
    layoutUrl: "/game-assets/maps/route-22/layout.json",
    previewUrl: "/game-assets/maps/route-22/preview.png",
    worldUrl: null,
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
    worldUrl: null,
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
    worldUrl: null,
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
    worldUrl: null,
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
    worldUrl: null,
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
    worldUrl: null,
    spawn: { x: 7, y: 7 },
    fallbackMusicId: 303,
    tilesets: {
      primary: BUILDING_TILESET,
      secondary: POKEMON_CENTER_TILESET,
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

export function resolveWhiteOutRespawn(
  healLocationId: "pallet-town" | "viridian-city",
): WhiteOutRespawn {
  if (healLocationId === "viridian-city") {
    return {
      mapId: "viridian-pokemon-center",
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

export function isPokemonStoragePcAt(
  mapId: string,
  x: number,
  y: number,
): boolean {
  // FireRed's MB_PC metatile in LAYOUT_POKEMON_CENTER_1F.
  return (
    mapId === "viridian-pokemon-center" &&
    x === 11 &&
    y === 1
  );
}

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
