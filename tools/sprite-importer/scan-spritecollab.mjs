import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const root = process.argv[2];
const output = process.argv[3] ?? "tools/sprite-importer/generated/sprite-manifest.json";
if (!root) { console.error("usage: node scan-spritecollab.mjs <SpriteCollab checkout> [output.json]"); process.exit(1); }

const spriteRoot = join(root,"sprite");
const ids = (await readdir(spriteRoot,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
const manifest = {};
for (const id of ids) {
  let xml;
  try { xml = await readFile(join(spriteRoot,id,"AnimData.xml"),"utf8"); } catch { continue; }
  const animations = [];
  for (const block of xml.match(/<Anim>[\s\S]*?<\/Anim>/g) ?? []) {
    const name = block.match(/<Name>([^<]+)<\/Name>/)?.[1];
    if (!name) continue;
    const frameWidth = Number(block.match(/<FrameWidth>(\d+)<\/FrameWidth>/)?.[1] ?? 0);
    const frameHeight = Number(block.match(/<FrameHeight>(\d+)<\/FrameHeight>/)?.[1] ?? 0);
    animations.push({name,frameWidth,frameHeight});
  }
  manifest[id] = {animations};
}
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(manifest,null,2)+"\n");
console.log(`wrote ${Object.keys(manifest).length} sprite entries to ${output}`);
