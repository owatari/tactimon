import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  cp,
  mkdir,
  readdir,
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
const fireRedMusicRuntime = resolve(
  repoRoot,
  "local-assets/extracted/firered/music/runtime",
);

function runCommand(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(
          new Error(
            `${command} exited with code ${code ?? "unknown"}`,
          ),
        );
      }
    });
  });
}

async function hasFireRedMusicRuntime() {
  try {
    await access(resolve(fireRedMusicRuntime, "manifest.json"));
    return true;
  } catch {
    return false;
  }
}

async function ensureFireRedMusicRuntime() {
  if (await hasFireRedMusicRuntime()) {
    return true;
  }

  const romRoot = resolve(repoRoot, "local-assets/roms");
  let roms = [];

  try {
    roms = (await readdir(romRoot, { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".gba"),
      )
      .map((entry) => resolve(romRoot, entry.name))
      .sort((left, right) => {
        const leftFireRed = /fire.?red/i.test(left) ? 0 : 1;
        const rightFireRed = /fire.?red/i.test(right) ? 0 : 1;
        return leftFireRed - rightFireRed ||
          left.localeCompare(right);
      });
  } catch {
    return false;
  }

  if (roms.length === 0) {
    return false;
  }

  const extractor = resolve(
    repoRoot,
    "tools/firered-music-extractor/extract.py",
  );
  const pythonCommands = process.env.PYTHON
    ? [process.env.PYTHON]
    : ["python3", "python"];
  const ripperArgs = process.env.TACTIMON_GBA_MUS_RIPPER
    ? [
        "--ripper",
        process.env.TACTIMON_GBA_MUS_RIPPER,
      ]
    : [];

  for (const rom of roms) {
    for (const python of pythonCommands) {
      try {
        console.log(
          `FireRed music missing; extracting from local ROM ${rom}`,
        );
        await runCommand(python, [
          extractor,
          rom,
          ...ripperArgs,
        ]);
        if (await hasFireRedMusicRuntime()) {
          return true;
        }
      } catch (error) {
        console.warn(
          `FireRed music extraction attempt failed with ${python}: ${error}`,
        );
      }
    }
  }

  return false;
}

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
  [
    "maps/layouts/004_pallettown_professoroakslab_layout/layout.json",
    "maps/oak-lab/layout.json",
  ],
  [
    "maps/layouts/004_pallettown_professoroakslab_layout/preview.png",
    "maps/oak-lab/preview.png",
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

const fireRedMusicDestination = resolve(
  publicRoot,
  "music/firered",
);

if (await ensureFireRedMusicRuntime()) {
  await cp(fireRedMusicRuntime, fireRedMusicDestination, {
    recursive: true,
  });
  console.log("synced FireRed runtime music assets");
} else {
  console.warn(
    [
      "FireRed music runtime unavailable.",
      "Put the supported FireRed ROM under local-assets/roms and install",
      "GBA Mus Ripper + FluidSynth + FFmpeg.",
      "Set TACTIMON_GBA_MUS_RIPPER when the ripper is not on PATH.",
    ].join(" "),
  );
}

console.log(
  "Tactimon FireRed + SpriteCollab + optional PMD VFX/music assets synced.",
);
