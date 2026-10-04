import {
  access,
  copyFile,
  cp,
  mkdir,
  rm,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRuntimeSpriteAssets,
  findSpriteCollabRoot,
} from "../../../tools/sprite-importer/build-runtime-assets.mjs";

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
    "maps/layouts/089_route2_layout/layout.json",
    "maps/route-2/layout.json",
  ],
  [
    "maps/layouts/089_route2_layout/preview.png",
    "maps/route-2/preview.png",
  ],
  [
    "maps/layouts/079_pewtercity_layout/layout.json",
    "maps/pewter-city/layout.json",
  ],
  [
    "maps/layouts/079_pewtercity_layout/preview.png",
    "maps/pewter-city/preview.png",
  ],
  [
    "maps/layouts/090_route3_layout/layout.json",
    "maps/route-3/layout.json",
  ],
  [
    "maps/layouts/090_route3_layout/preview.png",
    "maps/route-3/preview.png",
  ],
  [
    "maps/layouts/091_route4_layout/layout.json",
    "maps/route-4/layout.json",
  ],
  [
    "maps/layouts/091_route4_layout/preview.png",
    "maps/route-4/preview.png",
  ],
  [
    "maps/layouts/080_ceruleancity_layout/layout.json",
    "maps/cerulean-city/layout.json",
  ],
  [
    "maps/layouts/080_ceruleancity_layout/preview.png",
    "maps/cerulean-city/preview.png",
  ],
  [
    "maps/layouts/111_route24_layout/layout.json",
    "maps/route-24/layout.json",
  ],
  [
    "maps/layouts/111_route24_layout/preview.png",
    "maps/route-24/preview.png",
  ],
  [
    "maps/layouts/112_route25_layout/layout.json",
    "maps/route-25/layout.json",
  ],
  [
    "maps/layouts/112_route25_layout/preview.png",
    "maps/route-25/preview.png",
  ],
  [
    "maps/layouts/168_route25_seacottage_layout/layout.json",
    "maps/sea-cottage/layout.json",
  ],
  [
    "maps/layouts/168_route25_seacottage_layout/preview.png",
    "maps/sea-cottage/preview.png",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/layout.json",
    "maps/cerulean-pokemon-center/layout.json",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/preview.png",
    "maps/cerulean-pokemon-center/preview.png",
  ],
  [
    "maps/layouts/009_mart_layout/layout.json",
    "maps/cerulean-mart/layout.json",
  ],
  [
    "maps/layouts/009_mart_layout/preview.png",
    "maps/cerulean-mart/preview.png",
  ],
  [
    "maps/layouts/011_ceruleancity_gym_layout/layout.json",
    "maps/cerulean-gym/layout.json",
  ],
  [
    "maps/layouts/011_ceruleancity_gym_layout/preview.png",
    "maps/cerulean-gym/preview.png",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/layout.json",
    "maps/route-4-pokemon-center/layout.json",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/preview.png",
    "maps/route-4-pokemon-center/preview.png",
  ],
  ["maps/layouts/113_mtmoon_1f_layout/layout.json", "maps/mt-moon-1f/layout.json"],
  ["maps/layouts/113_mtmoon_1f_layout/preview.png", "maps/mt-moon-1f/preview.png"],
  ["maps/layouts/114_mtmoon_b1f_layout/layout.json", "maps/mt-moon-b1f/layout.json"],
  ["maps/layouts/114_mtmoon_b1f_layout/preview.png", "maps/mt-moon-b1f/preview.png"],
  ["maps/layouts/115_mtmoon_b2f_layout/layout.json", "maps/mt-moon-b2f/layout.json"],
  ["maps/layouts/115_mtmoon_b2f_layout/preview.png", "maps/mt-moon-b2f/preview.png"],
  [
    "maps/layouts/009_mart_layout/layout.json",
    "maps/pewter-mart/layout.json",
  ],
  [
    "maps/layouts/009_mart_layout/preview.png",
    "maps/pewter-mart/preview.png",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/layout.json",
    "maps/pewter-pokemon-center/layout.json",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/preview.png",
    "maps/pewter-pokemon-center/preview.png",
  ],
  [
    "maps/layouts/027_pewtercity_gym_layout/layout.json",
    "maps/pewter-gym/layout.json",
  ],
  [
    "maps/layouts/027_pewtercity_gym_layout/preview.png",
    "maps/pewter-gym/preview.png",
  ],
  [
    "maps/layouts/109_route22_layout/layout.json",
    "maps/route-22/layout.json",
  ],
  [
    "maps/layouts/109_route22_layout/preview.png",
    "maps/route-22/preview.png",
  ],
  [
    "maps/layouts/220_route2_entrance_layout/layout.json",
    "maps/route-2-forest-south-entrance/layout.json",
  ],
  [
    "maps/layouts/220_route2_entrance_layout/preview.png",
    "maps/route-2-forest-south-entrance/preview.png",
  ],
  [
    "maps/layouts/116_viridianforest_layout/layout.json",
    "maps/viridian-forest/layout.json",
  ],
  [
    "maps/layouts/116_viridianforest_layout/preview.png",
    "maps/viridian-forest/preview.png",
  ],
  [
    "maps/layouts/220_route2_entrance_layout/layout.json",
    "maps/route-2-forest-north-entrance/layout.json",
  ],
  [
    "maps/layouts/220_route2_entrance_layout/preview.png",
    "maps/route-2-forest-north-entrance/preview.png",
  ],
  [
    "maps/layouts/078_viridiancity_layout/layout.json",
    "maps/viridian-city/layout.json",
  ],
  [
    "maps/layouts/078_viridiancity_layout/preview.png",
    "maps/viridian-city/preview.png",
  ],
  [
    "maps/layouts/004_pallettown_professoroakslab_layout/layout.json",
    "maps/oak-lab/layout.json",
  ],
  [
    "maps/layouts/004_pallettown_professoroakslab_layout/preview.png",
    "maps/oak-lab/preview.png",
  ],
  [
    "maps/layouts/009_mart_layout/layout.json",
    "maps/viridian-mart/layout.json",
  ],
  [
    "maps/layouts/009_mart_layout/preview.png",
    "maps/viridian-mart/preview.png",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/layout.json",
    "maps/viridian-pokemon-center/layout.json",
  ],
  [
    "maps/layouts/007_pokemoncenter_1f_layout/preview.png",
    "maps/viridian-pokemon-center/preview.png",
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

  [
    "tilesets/03_pewtercity/tiles.4bpp",
    "tilesets/pewter-city/tiles.4bpp",
  ],
  [
    "tilesets/03_pewtercity/palettes.gbapal",
    "tilesets/pewter-city/palettes.gbapal",
  ],
  [
    "tilesets/03_pewtercity/metatiles.bin",
    "tilesets/pewter-city/metatiles.bin",
  ],
  [
    "tilesets/03_pewtercity/attributes.bin",
    "tilesets/pewter-city/attributes.bin",
  ],

  [
    "tilesets/04_ceruleancity/tiles.4bpp",
    "tilesets/cerulean-city/tiles.4bpp",
  ],
  [
    "tilesets/04_ceruleancity/palettes.gbapal",
    "tilesets/cerulean-city/palettes.gbapal",
  ],
  [
    "tilesets/04_ceruleancity/metatiles.bin",
    "tilesets/cerulean-city/metatiles.bin",
  ],
  [
    "tilesets/04_ceruleancity/attributes.bin",
    "tilesets/cerulean-city/attributes.bin",
  ],

  [
    "tilesets/26_pewtergym/tiles.4bpp",
    "tilesets/pewter-gym/tiles.4bpp",
  ],
  [
    "tilesets/26_pewtergym/palettes.gbapal",
    "tilesets/pewter-gym/palettes.gbapal",
  ],
  [
    "tilesets/26_pewtergym/metatiles.bin",
    "tilesets/pewter-gym/metatiles.bin",
  ],
  [
    "tilesets/26_pewtergym/attributes.bin",
    "tilesets/pewter-gym/attributes.bin",
  ],

  [
    "tilesets/27_ceruleangym/tiles.4bpp",
    "tilesets/cerulean-gym/tiles.4bpp",
  ],
  [
    "tilesets/27_ceruleangym/palettes.gbapal",
    "tilesets/cerulean-gym/palettes.gbapal",
  ],
  [
    "tilesets/27_ceruleangym/metatiles.bin",
    "tilesets/cerulean-gym/metatiles.bin",
  ],
  [
    "tilesets/27_ceruleangym/attributes.bin",
    "tilesets/cerulean-gym/attributes.bin",
  ],

  [
    "tilesets/44_seacottage/tiles.4bpp",
    "tilesets/sea-cottage/tiles.4bpp",
  ],
  [
    "tilesets/44_seacottage/palettes.gbapal",
    "tilesets/sea-cottage/palettes.gbapal",
  ],
  [
    "tilesets/44_seacottage/metatiles.bin",
    "tilesets/sea-cottage/metatiles.bin",
  ],
  [
    "tilesets/44_seacottage/attributes.bin",
    "tilesets/sea-cottage/attributes.bin",
  ],

  ["tilesets/12_building/tiles.4bpp", "tilesets/building/tiles.4bpp"],
  [
    "tilesets/12_building/palettes.gbapal",
    "tilesets/building/palettes.gbapal",
  ],
  [
    "tilesets/12_building/metatiles.bin",
    "tilesets/building/metatiles.bin",
  ],
  [
    "tilesets/12_building/attributes.bin",
    "tilesets/building/attributes.bin",
  ],

  ["tilesets/21_lab/tiles.4bpp", "tilesets/lab/tiles.4bpp"],
  [
    "tilesets/21_lab/palettes.gbapal",
    "tilesets/lab/palettes.gbapal",
  ],
  [
    "tilesets/21_lab/metatiles.bin",
    "tilesets/lab/metatiles.bin",
  ],
  [
    "tilesets/21_lab/attributes.bin",
    "tilesets/lab/attributes.bin",
  ],

  ["tilesets/13_mart/tiles.4bpp", "tilesets/mart/tiles.4bpp"],
  [
    "tilesets/13_mart/palettes.gbapal",
    "tilesets/mart/palettes.gbapal",
  ],
  [
    "tilesets/13_mart/metatiles.bin",
    "tilesets/mart/metatiles.bin",
  ],
  [
    "tilesets/13_mart/attributes.bin",
    "tilesets/mart/attributes.bin",
  ],

  [
    "tilesets/14_pokemoncenter/tiles.4bpp",
    "tilesets/pokemon-center/tiles.4bpp",
  ],
  [
    "tilesets/14_pokemoncenter/palettes.gbapal",
    "tilesets/pokemon-center/palettes.gbapal",
  ],
  [
    "tilesets/14_pokemoncenter/metatiles.bin",
    "tilesets/pokemon-center/metatiles.bin",
  ],
  [
    "tilesets/14_pokemoncenter/attributes.bin",
    "tilesets/pokemon-center/attributes.bin",
  ],

  [
    "tilesets/42_genericbuilding2/tiles.4bpp",
    "tilesets/generic-building-2/tiles.4bpp",
  ],
  [
    "tilesets/42_genericbuilding2/palettes.gbapal",
    "tilesets/generic-building-2/palettes.gbapal",
  ],
  [
    "tilesets/42_genericbuilding2/metatiles.bin",
    "tilesets/generic-building-2/metatiles.bin",
  ],
  [
    "tilesets/42_genericbuilding2/attributes.bin",
    "tilesets/generic-building-2/attributes.bin",
  ],

  ["tilesets/15_cave/tiles.4bpp", "tilesets/cave/tiles.4bpp"],
  ["tilesets/15_cave/palettes.gbapal", "tilesets/cave/palettes.gbapal"],
  ["tilesets/15_cave/metatiles.bin", "tilesets/cave/metatiles.bin"],
  ["tilesets/15_cave/attributes.bin", "tilesets/cave/attributes.bin"],

  [
    "tilesets/34_viridianforest/tiles.4bpp",
    "tilesets/viridian-forest/tiles.4bpp",
  ],
  [
    "tilesets/34_viridianforest/palettes.gbapal",
    "tilesets/viridian-forest/palettes.gbapal",
  ],
  [
    "tilesets/34_viridianforest/metatiles.bin",
    "tilesets/viridian-forest/metatiles.bin",
  ],
  [
    "tilesets/34_viridianforest/attributes.bin",
    "tilesets/viridian-forest/attributes.bin",
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
  [
    "maps/world/257_pallettown_professoroakslab/world.json",
    "maps/oak-lab/world.json",
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

const spriteCollabRoot = await findSpriteCollabRoot(repoRoot);

if (!spriteCollabRoot) {
  throw new Error(
    [
      "SpriteCollab checkout not found.",
      "Put it under local-assets/spritecollab/SpriteCollab",
      "or copy the SpriteCollab repository contents directly into local-assets/spritecollab.",
    ].join(" "),
  );
}

await buildRuntimeSpriteAssets(
  spriteCollabRoot,
  resolve(publicRoot, "pokemon-sprites"),
);

const pmdVfxRuntime = resolve(
  repoRoot,
  "local-assets/extracted/pmd-eos/vfx/runtime",
);
const pmdVfxDestination = resolve(publicRoot, "battle-vfx");

try {
  await access(resolve(pmdVfxRuntime, "manifest.json"));
  await cp(pmdVfxRuntime, pmdVfxDestination, { recursive: true });
  console.log("synced Explorers of Sky battle VFX runtime assets");
} catch {
  console.warn(
    "optional PMD battle VFX missing: run tools/pmd-vfx-extractor/extract.py with --render",
  );
}

const fireRedMusicRuntime = resolve(
  repoRoot,
  "local-assets/extracted/firered/music/runtime",
);
const fireRedMusicDestination = resolve(
  publicRoot,
  "music/firered",
);

await access(resolve(fireRedMusicRuntime, "manifest.json"));
await cp(fireRedMusicRuntime, fireRedMusicDestination, {
  recursive: true,
});
console.log("synced FireRed runtime music assets");

console.log(
  "Tactimon FireRed + SpriteCollab + optional PMD VFX/music assets synced.",
);
