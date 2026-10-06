import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

/** Minimal Chrome DevTools Protocol client (no dependencies). */
export class Cdp {
  private id = 0;
  private pending = new Map<number, (m: { result?: unknown; error?: unknown }) => void>();
  readonly errors: string[] = [];
  constructor(private ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg);
        this.pending.delete(msg.id);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.errors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? "exception");
      }
    });
  }
  send<T = unknown>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result as T)));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  /** Brings the tab to the front: a hidden tab does not run requestAnimationFrame. */
  bringToFront(): Promise<unknown> {
    return this.send("Page.bringToFront");
  }
  async eval<T = unknown>(expression: string): Promise<T> {
    const res = await this.send<{ result?: { value?: T }; exceptionDetails?: { text: string } }>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) throw new Error(`eval failed: ${res.exceptionDetails.text}`);
    return res.result?.value as T;
  }
}

/** Starts a headless Edge/Chrome and returns a connected CDP client plus the process to kill. */
export async function launchBrowser(): Promise<{ cdp: Cdp; proc: ChildProcess }> {
  const browser = BROWSERS.find((p) => existsSync(p));
  if (!browser) throw new Error("no Edge/Chrome found (set BROWSER_PATH)");
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(browser, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "tactimon-e2e-"))}`,
    "--hide-scrollbars",
    "--mute-audio",
    // Fast battles chain thousands of 1-25 ms timers: never let the browser throttle a headless tab.
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ], { stdio: "ignore" });
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200);
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      target = list.find((t) => t.type === "page");
    } catch {
      /* browser still starting */
    }
  }
  if (!target) throw new Error("CDP not available");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const cdp = new Cdp(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  // Headless pages can turn "hidden" after a few navigations, which stops requestAnimationFrame (the
  // overworld loop): keep the tab focused and visible.
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  return { cdp, proc };
}
