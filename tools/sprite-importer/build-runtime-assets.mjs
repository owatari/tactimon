import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const SPECIES = {
  bulbasaur: "0001",
  charmander: "0004",
  squirtle: "0007",
  caterpie: "0010",
  weedle: "0013",
  pidgey: "0016",
  rattata: "0019",
  spearow: "0021",
  mankey: "0056",
};

const ANIMATIONS = ["Idle", "Walk", "Attack", "Hurt", "Faint"];

function animationBlocks(xml) {
  return xml.match(/<Anim>[\s\S]*?<\/Anim>/g) ?? [];
}

function tag(block, name) {
  return block.match(
    new RegExp(`<${name}>([^<]+)<\\/${name}>`),
  )?.[1] ?? null;
}

function parseAnimation(xml, animationName) {
  const block = animationBlocks(xml).find(
    (candidate) => tag(candidate, "Name") === animationName,
  );

  if (!block) return null;

  const copyOf = tag(block, "CopyOf");
  if (copyOf) {
    return parseAnimation(xml, copyOf);
  }

  const frameWidth = Number(tag(block, "FrameWidth") ?? 0);
  const frameHeight = Number(tag(block, "FrameHeight") ?? 0);
  const durationsBlock =
    block.match(/<Durations>([\s\S]*?)<\/Durations>/)?.[1] ?? "";
  const durations = Array.from(
    durationsBlock.matchAll(/<Duration>(\d+)<\/Duration>/g),
    (match) => Number(match[1]),
  );

  if (!frameWidth || !frameHeight || durations.length === 0) {
    return null;
  }

  return {
    frameWidth,
    frameHeight,
    frames: durations.length,
    durations,
  };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findSpriteCollabRoot(repoRoot) {
  const candidates = [
    resolve(repoRoot, "local-assets/spritecollab"),
    resolve(repoRoot, "local-assets/spritecollab/SpriteCollab"),
  ];

  for (const candidate of candidates) {
    if (
      await exists(
        join(candidate, "sprite", "0001", "AnimData.xml"),
      )
    ) {
      return candidate;
    }
  }

  return null;
}

export async function buildRuntimeSpriteAssets(
  spriteCollabRoot,
  outputRoot,
) {
  const manifest = {
    source: "PMDCollab/SpriteCollab",
    directions: [
      "down",
      "down-right",
      "right",
      "up-right",
      "up",
      "up-left",
      "left",
      "down-left",
    ],
    species: {},
  };

  await mkdir(outputRoot, { recursive: true });

  for (const [species, id] of Object.entries(SPECIES)) {
    const sourceDir = join(spriteCollabRoot, "sprite", id);
    const xmlPath = join(sourceDir, "AnimData.xml");
    const xml = await readFile(xmlPath, "utf8");
    const speciesOutput = join(outputRoot, species);
    await mkdir(speciesOutput, { recursive: true });

    const animations = {};

    for (const animationName of ANIMATIONS) {
      const metadata = parseAnimation(xml, animationName);
      const filename = `${animationName}-Anim.png`;
      const sourceFile = join(sourceDir, filename);

      if (!metadata || !(await exists(sourceFile))) {
        continue;
      }

      const outputFile = join(speciesOutput, filename);
      await copyFile(sourceFile, outputFile);

      animations[animationName.toLowerCase()] = {
        ...metadata,
        file: `${species}/${filename}`,
        directionRows: 8,
      };
    }

    const portraitSource = join(
      spriteCollabRoot,
      "portrait",
      id,
      "Normal.png",
    );
    let portraitFile = null;

    if (await exists(portraitSource)) {
      const outputPortrait = join(speciesOutput, "portrait.png");
      await copyFile(portraitSource, outputPortrait);
      portraitFile = `${species}/portrait.png`;
    }

    const creditsSource = join(sourceDir, "credits.txt");
    let creditsFile = null;

    if (await exists(creditsSource)) {
      const outputCredits = join(speciesOutput, "credits.txt");
      await copyFile(creditsSource, outputCredits);
      creditsFile = `${species}/credits.txt`;
    }

    manifest.species[species] = {
      id,
      animations,
      portraitFile,
      creditsFile,
    };
  }

  await writeFile(
    join(outputRoot, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2];
  const output = process.argv[3];

  if (!source || !output) {
    console.error(
      "usage: node build-runtime-assets.mjs <SpriteCollab checkout> <output-dir>",
    );
    process.exit(1);
  }

  await buildRuntimeSpriteAssets(
    resolve(source),
    resolve(output),
  );

  console.log(
    `built runtime SpriteCollab assets in ${basename(resolve(output))}`,
  );
}
