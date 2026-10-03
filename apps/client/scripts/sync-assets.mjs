import { access, copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const sourceRoot = resolve(
  repoRoot,
  "local-assets/extracted/firered/assets",
);
const publicRoot = resolve(
  repoRoot,
  "apps/client/public/game-assets",
);

const files = [
  [
    "maps/layouts/077_pallettown_layout/layout.json",
    "maps/pallet-town/layout.json",
  ],
  [
    "maps/layouts/077_pallettown_layout/preview.png",
    "maps/pallet-town/preview.png",
  ],
  [
    "maps/layouts/088_route1_layout/layout.json",
    "maps/route-1/layout.json",
  ],
  [
    "maps/layouts/088_route1_layout/preview.png",
    "maps/route-1/preview.png",
  ],
  [
    "maps/layouts/078_viridiancity_layout/layout.json",
    "maps/viridian-city/layout.json",
  ],
  [
    "maps/layouts/078_viridiancity_layout/preview.png",
    "maps/viridian-city/preview.png",
  ],
  ["overworld/000_red_normal.png", "overworld/red-normal.png"],

  ["tilesets/00_general/tiles.4bpp", "tilesets/general/tiles.4bpp"],
  [
    "tilesets/00_general/palettes.gbapal",
    "tilesets/general/palettes.gbapal",
  ],
  [
    "tilesets/00_general/metatiles.bin",
    "tilesets/general/metatiles.bin",
  ],
  [
    "tilesets/00_general/attributes.bin",
    "tilesets/general/attributes.bin",
  ],

  [
    "tilesets/01_pallettown/tiles.4bpp",
    "tilesets/pallet-town/tiles.4bpp",
  ],
  [
    "tilesets/01_pallettown/palettes.gbapal",
    "tilesets/pallet-town/palettes.gbapal",
  ],
  [
    "tilesets/01_pallettown/metatiles.bin",
    "tilesets/pallet-town/metatiles.bin",
  ],
  [
    "tilesets/01_pallettown/attributes.bin",
    "tilesets/pallet-town/attributes.bin",
  ],

  [
    "tilesets/02_viridiancity/tiles.4bpp",
    "tilesets/viridian-city/tiles.4bpp",
  ],
  [
    "tilesets/02_viridiancity/palettes.gbapal",
    "tilesets/viridian-city/palettes.gbapal",
  ],
  [
    "tilesets/02_viridiancity/metatiles.bin",
    "tilesets/viridian-city/metatiles.bin",
  ],
  [
    "tilesets/02_viridiancity/attributes.bin",
    "tilesets/viridian-city/attributes.bin",
  ],
];

const optionalFiles = [
  [
    "maps/world/188_pallettown/world.json",
    "maps/pallet-town/world.json",
  ],
  [
    "maps/world/207_route1/world.json",
    "maps/route-1/world.json",
  ],
  [
    "maps/world/189_viridiancity/world.json",
    "maps/viridian-city/world.json",
  ],
];

await rm(publicRoot, { recursive: true, force: true });

for (const [source, destination] of files) {
  const from = resolve(sourceRoot, source);
  const to = resolve(publicRoot, destination);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`synced ${source} -> ${destination}`);
}

const overworldSource = resolve(sourceRoot, "overworld");
const overworldDestination = resolve(publicRoot, "overworld");
await cp(overworldSource, overworldDestination, { recursive: true });

for (const [source, destination] of optionalFiles) {
  const from = resolve(sourceRoot, source);
  const to = resolve(publicRoot, destination);

  try {
    await access(from);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    console.log(`synced ${source} -> ${destination}`);
  } catch {
    console.warn(
      `optional world data missing: ${source} (run convert_world.py --maps)`,
    );
  }
}

console.log("Tactimon client assets synced.");
