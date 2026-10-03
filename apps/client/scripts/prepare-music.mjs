import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  readdir,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const FIRE_RED_SHA1 =
  "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc";
const REQUIRED_TRACKS = [291, 297, 298, 300, 301, 314];

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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runtimeReady() {
  if (!(await exists(resolve(runtimeRoot, "manifest.json")))) {
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

if (await runtimeReady()) {
  console.log("FireRed music ready.");
  process.exit(0);
}

const rom = await findFireRedRom();
const pythonCommands = process.env.PYTHON
  ? [process.env.PYTHON]
  : ["python3", "python"];
console.log("FireRed music missing. Extracting directly from ROM...");

let lastError = null;
for (const python of pythonCommands) {
  try {
    await run(python, [
      extractor,
      rom,
    ]);
    lastError = null;
    break;
  } catch (error) {
    lastError = error;
  }
}

if (lastError || !(await runtimeReady())) {
  throw new Error(
    [
      "Could not generate FireRed music from the local ROM.",
      "The extractor uses only Python's standard library.",
      "Check the ROM hash and the Python error above.",
    ].join(" "),
    { cause: lastError ?? undefined },
  );
}

console.log("FireRed music extracted.");
