// Headless screenshot via Chrome DevTools Protocol (Edge/Chrome), sem dependências.
// Uso: node screenshot.mjs <url> <out.png> [width=1365] [height=768] [--eval "<js>"] [--wait ms] [--storage file.json]
//   --storage: JSON {chave: valor} gravado em localStorage antes de recarregar a página.
//   --eval: JS executado após o load (pode retornar Promise); repetível.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const positional = [];
const evals = [];
let wait = 1500;
let storage = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--eval") evals.push(args[++i]);
  else if (args[i] === "--wait") wait = Number(args[++i]);
  else if (args[i] === "--storage") storage = JSON.parse(readFileSync(args[++i], "utf8"));
  else positional.push(args[i]);
}
const [url, out, width = "1365", height = "768"] = positional;
if (!url || !out) {
  console.error("uso: node screenshot.mjs <url> <out.png> [w] [h] [--eval js] [--wait ms] [--storage f.json]");
  process.exit(1);
}

const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) throw new Error("Nenhum Edge/Chrome encontrado (defina BROWSER_PATH).");

const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(browser, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "tactimon-shot-"))}`,
  `--window-size=${width},${height}`,
  "--hide-scrollbars",
  "--mute-audio",
  "--autoplay-policy=no-user-gesture-required",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i += 1) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
if (!target) { proc.kill(); throw new Error("CDP indisponível"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) console.error("eval error:", res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  return res.result?.value;
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await sleep(1500);
  if (storage) {
    await evaluate(`(() => { const s = ${JSON.stringify(storage)}; for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); })()`);
    await send("Page.reload");
    await sleep(1500);
  }
  for (const code of evals) {
    const value = await evaluate(code);
    if (value !== undefined) console.log("eval:", typeof value === "string" ? value : JSON.stringify(value));
  }
  await sleep(wait);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`screenshot: ${out} (${width}x${height})`);
} finally {
  ws.close();
  proc.kill();
}
