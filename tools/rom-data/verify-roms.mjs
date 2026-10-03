import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sources from "./rom-sources.json" with { type: "json" };

const paths = process.argv.slice(2);
if (!paths.length) { console.error("usage: node verify-roms.mjs <rom.gba> [...]"); process.exit(1); }
const expectedBySha = new Map(Object.entries(sources).map(([key,value]) => [value.sha1,{key,...value}]));
for (const path of paths) {
  const bytes = await readFile(path);
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  const title = bytes.subarray(0xa0,0xac).toString("ascii").replace(/\0/g,"").trim();
  const gameCode = bytes.subarray(0xac,0xb0).toString("ascii");
  const expected = expectedBySha.get(sha1);
  console.log(JSON.stringify({path,size:bytes.length,title,gameCode,sha1,recognized:Boolean(expected),reference:expected?.key ?? null},null,2));
}
