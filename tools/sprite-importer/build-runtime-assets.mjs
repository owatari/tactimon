import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { measureAnimation, readPng } from "./sprite-metrics.mjs";

const SPECIES = {
  bulbasaur: "0001",
  ivysaur: "0002",
  charmander: "0004",
  charmeleon: "0005",
  squirtle: "0007",
  wartortle: "0008",
  caterpie: "0010",
  metapod: "0011",
  weedle: "0013",
  kakuna: "0014",
  butterfree: "0012",
  pidgey: "0016",
  pidgeotto: "0017",
  rattata: "0019",
  raticate: "0020",
  spearow: "0021",
  raichu: "0026",
  ekans: "0023",
  pikachu: "0025",
  "nidoran-f": "0029",
  "nidoran-m": "0032",
  clefairy: "0035",
  jigglypuff: "0039",
  zubat: "0041",
  oddish: "0043",
  meowth: "0052",
  paras: "0046",
  parasect: "0047",
  mankey: "0056",
  abra: "0063",
  kadabra: "0064",
  machop: "0066",
  bellsprout: "0069",
  slowpoke: "0079",
  magnemite: "0081",
  drowzee: "0096",
  sandshrew: "0027",
  geodude: "0074",
  grimer: "0088",
  shellder: "0090",
  onix: "0095",
  voltorb: "0100",
  koffing: "0109",
  horsea: "0116",
  tentacool: "0072",
  ponyta: "0077",
  goldeen: "0118",
  staryu: "0120",
  starmie: "0121",
  venusaur: "0003",
  charizard: "0006",
  blastoise: "0009",
  beedrill: "0015",
  pidgeot: "0018",
  fearow: "0022",
  arbok: "0024",
  sandslash: "0028",
  nidorina: "0030",
  nidoqueen: "0031",
  nidorino: "0033",
  nidoking: "0034",
  clefable: "0036",
  vulpix: "0037",
  ninetales: "0038",
  wigglytuff: "0040",
  golbat: "0042",
  gloom: "0044",
  vileplume: "0045",
  venonat: "0048",
  venomoth: "0049",
  diglett: "0050",
  dugtrio: "0051",
  persian: "0053",
  psyduck: "0054",
  golduck: "0055",
  primeape: "0057",
  growlithe: "0058",
  arcanine: "0059",
  poliwag: "0060",
  poliwhirl: "0061",
  poliwrath: "0062",
  alakazam: "0065",
  machoke: "0067",
  machamp: "0068",
  weepinbell: "0070",
  victreebel: "0071",
  tentacruel: "0073",
  graveler: "0075",
  golem: "0076",
  rapidash: "0078",
  slowbro: "0080",
  magneton: "0082",
  farfetchd: "0083",
  doduo: "0084",
  dodrio: "0085",
  seel: "0086",
  dewgong: "0087",
  muk: "0089",
  cloyster: "0091",
  gastly: "0092",
  haunter: "0093",
  gengar: "0094",
  hypno: "0097",
  krabby: "0098",
  kingler: "0099",
  electrode: "0101",
  exeggcute: "0102",
  exeggutor: "0103",
  cubone: "0104",
  marowak: "0105",
  hitmonlee: "0106",
  hitmonchan: "0107",
  lickitung: "0108",
  weezing: "0110",
  rhyhorn: "0111",
  rhydon: "0112",
  chansey: "0113",
  tangela: "0114",
  kangaskhan: "0115",
  seadra: "0117",
  seaking: "0119",
  "mr-mime": "0122",
  scyther: "0123",
  jynx: "0124",
  electabuzz: "0125",
  magmar: "0126",
  pinsir: "0127",
  tauros: "0128",
  magikarp: "0129",
  gyarados: "0130",
  lapras: "0131",
  ditto: "0132",
  eevee: "0133",
  vaporeon: "0134",
  jolteon: "0135",
  flareon: "0136",
  porygon: "0137",
  omanyte: "0138",
  omastar: "0139",
  kabuto: "0140",
  kabutops: "0141",
  aerodactyl: "0142",
  snorlax: "0143",
  articuno: "0144",
  zapdos: "0145",
  moltres: "0146",
  dratini: "0147",
  dragonair: "0148",
  dragonite: "0149",
  mewtwo: "0150",
  mew: "0151",
};

const ANIMATIONS = ["Idle", "Hover", "Walk", "Attack", "Hurt", "Faint"];

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

      // Visible body + ground point drive runtime scale and anchoring.
      const shadowFile = join(
        sourceDir,
        `${animationName}-Shadow.png`,
      );
      const metrics = measureAnimation(
        await readPng(sourceFile),
        (await exists(shadowFile)) ? await readPng(shadowFile) : null,
        metadata,
      );

      // SpriteCollab keeps the shiny recolour of the base form in `<id>/0000/0001` (same frames).
      const shinySource = join(sourceDir, "0000", "0001", filename);
      let shinyFile = null;
      if (await exists(shinySource)) {
        await mkdir(join(speciesOutput, "shiny"), { recursive: true });
        await copyFile(shinySource, join(speciesOutput, "shiny", filename));
        shinyFile = `${species}/shiny/${filename}`;
      }

      animations[animationName.toLowerCase()] = {
        ...metadata,
        file: `${species}/${filename}`,
        ...(shinyFile ? { shinyFile } : {}),
        directionRows: 8,
        bounds: metrics.bounds,
        groundX: metrics.groundX,
        groundY: metrics.groundY,
      };
    }

    // Flying species ship Hover instead of Idle in SpriteCollab.
    if (!animations.idle) {
      const fallback = animations.hover ?? animations.walk;
      if (fallback) {
        animations.idle = { ...fallback };
      }
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
