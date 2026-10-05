// Audits battle sprite metadata in the runtime manifest.
// Usage: node tools/sprite-importer/audit-sprites.mjs [manifest.json] [--json]
//
// Flags: missing visible bounds, low canvas occupancy, ground point drifting
// from the PMD convention (frame centre + ~4 px), and animations whose
// visible body height differs a lot from idle (size jumps between frames).
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const manifestPath = resolve(
  args.find((arg) => !arg.startsWith("--")) ??
    "apps/client/public/game-assets/pokemon-sprites/manifest.json",
);

// Keep in sync with apps/client/lib/spriteLayout.ts.
const REFERENCE_PIXELS = 24;
const SIZE_EXPONENT = 0.6;
const MIN_TILES = 1;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const rows = [];

for (const [species, entry] of Object.entries(manifest.species)) {
  const idle = entry.animations.idle;
  const flags = [];
  if (!idle?.bounds) {
    rows.push({ species, flags: ["missing idle bounds"] });
    continue;
  }

  const bodyWidth = idle.bounds.right - idle.bounds.left;
  const bodyHeight = idle.bounds.bottom - idle.bounds.top;
  const body = Math.max(bodyWidth, bodyHeight);
  const tiles = Math.max(
    MIN_TILES,
    (body / REFERENCE_PIXELS) ** SIZE_EXPONENT,
  );
  const occupancy =
    (bodyWidth * bodyHeight) / (idle.frameWidth * idle.frameHeight);
  if (occupancy < 0.3) flags.push(`idle canvas ${Math.round(occupancy * 100)}% used`);

  for (const [name, animation] of Object.entries(entry.animations)) {
    if (!animation.bounds) {
      flags.push(`${name}: missing bounds`);
      continue;
    }
    const groundDy = animation.groundY - animation.frameHeight / 2;
    if (Math.abs(groundDy - 4) > 2) {
      flags.push(`${name}: ground dy ${groundDy}`);
    }
    const height = animation.bounds.bottom - animation.bounds.top;
    const ratio = height / bodyHeight;
    if (name !== "faint" && (ratio > 1.8 || ratio < 0.55)) {
      flags.push(`${name}: body height x${ratio.toFixed(2)} vs idle`);
    }
  }

  rows.push({
    species,
    canvas: `${idle.frameWidth}x${idle.frameHeight}`,
    body: `${bodyWidth}x${bodyHeight}`,
    occupancy: Math.round(occupancy * 100),
    tiles: Number(tiles.toFixed(2)),
    flags,
  });
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("species        canvas   body    used%  tiles  flags");
  for (const row of rows) {
    console.log(
      [
        row.species.padEnd(14),
        String(row.canvas ?? "-").padEnd(8),
        String(row.body ?? "-").padEnd(7),
        String(row.occupancy ?? "-").padStart(5),
        String(row.tiles ?? "-").padStart(6),
        " " + row.flags.join("; "),
      ].join(" "),
    );
  }
  const flagged = rows.filter((row) => row.flags.length > 0).length;
  console.log(`\n${rows.length} species, ${flagged} with flags`);
}
