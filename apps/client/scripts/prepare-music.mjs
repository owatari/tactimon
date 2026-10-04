import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const FIRE_RED_SHA1 =
  "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc";
const REQUIRED_TRACKS = [291, 297, 298, 300, 301, 303, 314];
const GBA_AUDIO_TOOLS_REVISION =
  "45e84ba8a5a47b22e56dac7e4e87b1ac605bcb19";
const GBA_AUDIO_TOOLS_SOURCE =
  `https://github.com/mudassarzahid/gba-audio-tools/archive/${GBA_AUDIO_TOOLS_REVISION}.zip`;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const romRoot = resolve(repoRoot, "local-assets/roms");
const runtimeRoot = resolve(
  repoRoot,
  "local-assets/extracted/firered/music/runtime",
);
const extractor = resolve(
  repoRoot,
  "tools/firered-music-extractor/extract.py",
);
const toolRoot = resolve(
  repoRoot,
  "local-assets/.tools/gba-audio-tools",
);
const toolPython = resolve(
  toolRoot,
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const toolMarker = resolve(toolRoot, ".tactimon-renderer.json");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runtimeReady() {
  const manifestPath = resolve(runtimeRoot, "manifest.json");
  if (!(await exists(manifestPath))) {
    return false;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return false;
  }

  if (
    manifest.extractor !== "gba-audio-tools-mp2k" ||
    manifest.rendererRevision !== GBA_AUDIO_TOOLS_REVISION ||
    !Array.isArray(manifest.tracks) ||
    manifest.tracks.length !== REQUIRED_TRACKS.length ||
    manifest.tracks.some((track) => track.sampleRate !== 32768)
  ) {
    return false;
  }

  for (const id of REQUIRED_TRACKS) {
    if (!(await exists(resolve(runtimeRoot, `${id}.wav`)))) {
      return false;
    }
  }

  return true;
}

function sha1(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha1");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolvePromise(hash.digest("hex")));
  });
}

async function findFireRedRom() {
  let entries;
  try {
    entries = await readdir(romRoot, { withFileTypes: true });
  } catch {
    throw new Error(
      "FireRed ROM not found. Put the .gba file in local-assets/roms/.",
    );
  }

  const candidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".gba"),
    )
    .map((entry) => resolve(romRoot, entry.name));

  for (const candidate of candidates) {
    if ((await sha1(candidate)) === FIRE_RED_SHA1) {
      return candidate;
    }
  }

  throw new Error(
    "Supported FireRed ROM not found in local-assets/roms/.",
  );
}

function run(command, args) {
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

async function installedRendererReady() {
  if (!(await exists(toolPython)) || !(await exists(toolMarker))) {
    return false;
  }

  try {
    const marker = JSON.parse(await readFile(toolMarker, "utf8"));
    return marker.revision === GBA_AUDIO_TOOLS_REVISION;
  } catch {
    return false;
  }
}

async function installRenderer(systemPython) {
  await rm(toolRoot, { recursive: true, force: true });
  console.log("Installing the pinned gba-audio-tools MP2K renderer...");
  await run(systemPython, ["-m", "venv", toolRoot]);
  await run(toolPython, [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    GBA_AUDIO_TOOLS_SOURCE,
  ]);
  await writeFile(
    toolMarker,
    JSON.stringify(
      {
        revision: GBA_AUDIO_TOOLS_REVISION,
        source: GBA_AUDIO_TOOLS_SOURCE,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

async function ensureRenderer() {
  if (await installedRendererReady()) {
    return toolPython;
  }

  const pythonCommands = process.env.PYTHON
    ? [process.env.PYTHON]
    : ["python3", "python"];
  let lastError = null;

  for (const python of pythonCommands) {
    try {
      await installRenderer(python);
      return toolPython;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    [
      "Could not install gba-audio-tools.",
      "Python 3.10+ and a working C compiler are required for the pinned renderer build.",
      "The first install also needs access to github.com.",
    ].join(" "),
    { cause: lastError ?? undefined },
  );
}

if (await runtimeReady()) {
  console.log("FireRed music ready.");
  process.exit(0);
}

const rom = await findFireRedRom();
const rendererPython = await ensureRenderer();

console.log("Extracting FireRed MP2K music with gba-audio-tools...");
await run(rendererPython, [extractor, rom]);

if (!(await runtimeReady())) {
  throw new Error(
    "gba-audio-tools completed, but the expected FireRed WAV assets were not generated.",
  );
}

console.log("FireRed music extracted with the MP2K renderer.");
