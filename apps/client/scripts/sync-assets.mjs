import { copyFile, mkdir, rm } from "node:fs/promises";
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
];

await rm(publicRoot, { recursive: true, force: true });

for (const [source, destination] of files) {
  const from = resolve(sourceRoot, source);
  const to = resolve(publicRoot, destination);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`synced ${source} -> ${destination}`);
}

console.log("Tactimon client assets synced.");
