// Open the samples page in a headless Chromium browser and check that it works.
//
// Usage:
//   node check_page.mjs <browser.exe> <page-url> <screenshot-dir> [debug-port]
//
// Loads <page-url>?selftest (every clip is loaded once), then plays a line-2 clip
// and looks for the word highlight. Prints console errors, failed requests and
// the self-test list, saves phone-sized screenshots, and exits 1 on any problem.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [browser, url, shots, port = "9377"] = process.argv.slice(2);
if (!browser || !url || !shots) { console.error("usage: node check_page.mjs <browser> <url> <screenshot-dir> [port]"); process.exit(2); }
mkdirSync(shots, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "page-check-"));
const child = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--mute-audio",
  "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
}
if (!target) { child.kill(); throw new Error("browser did not start"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const waiting = new Map();
const problems = [];
const requests = new Map();
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result ?? msg.error); waiting.delete(msg.id); return; }
  const p = msg.params;
  if (msg.method === "Runtime.exceptionThrown") problems.push("exception: " + (p.exceptionDetails.exception?.description ?? p.exceptionDetails.text));
  if (msg.method === "Runtime.consoleAPICalled" && (p.type === "error" || p.type === "warning")) problems.push(`console ${p.type}: ` + p.args.map((a) => a.value ?? a.description).join(" "));
  if (msg.method === "Log.entryAdded" && (p.entry.level === "error" || p.entry.level === "warning")) problems.push(`log ${p.entry.level}: ${p.entry.text} ${p.entry.url ?? ""}`);
  if (msg.method === "Network.requestWillBeSent") requests.set(p.requestId, p.request.url);
  if (msg.method === "Network.loadingFailed" && !p.canceled) problems.push("request failed: " + requests.get(p.requestId) + " " + p.errorText);
  if (msg.method === "Network.responseReceived" && p.response.status >= 400) problems.push(`http ${p.response.status}: ${p.response.url}`);
});
const send = (method, params = {}) => new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
const shot = async (name, full) => {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full });
  writeFileSync(join(shots, name), Buffer.from(data, "base64"));
};

try {
  for (const d of ["Runtime", "Log", "Network", "Page"]) await send(d + ".enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "selftest" });
  let result;
  for (let i = 0; i < 150 && !result; i++) { await sleep(200); result = await evaluate(`document.getElementById("selftest")?.dataset.result`); }
  console.log("self-test:", result ?? "did not finish");
  console.log(await evaluate(`document.getElementById("selftest")?.textContent ?? ""`));
  if (!result || !result.startsWith("ok")) problems.push("self-test: " + result);
  await evaluate(`document.getElementById("selftest")?.remove()`);

  const counts = await evaluate(`JSON.stringify({cards: document.querySelectorAll("main .card").length, rows: document.querySelectorAll(".clip").length, engines: document.querySelectorAll("#engines tr").length - 1, wide: document.documentElement.scrollWidth > innerWidth, problem: document.getElementById("problem").textContent})`);
  console.log("page:", counts);
  if (JSON.parse(counts).wide) problems.push("page is wider than the phone screen");
  if (JSON.parse(counts).problem) problems.push("page shows: " + JSON.parse(counts).problem);
  await shot("page-top.png", false);
  await shot("page-full.png", true);

  // play the first voice of the line that has word timings and watch the highlight move
  const seen = await evaluate(`(async () => {
    const say = [...document.querySelectorAll(".card")].find((c) => c.querySelector(".note")?.textContent.startsWith("Words light up"));
    say.querySelector(".clip").click();
    const out = [];
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const now = say.querySelector(".w.now");
      out.push(document.getElementById("player").currentTime.toFixed(2) + ":" + (now ? now.textContent : "-"));
    }
    return out.join("  ");
  })()`);
  console.log("highlight while playing:", seen);
  if (new Set((seen ?? "").split("  ").map((s) => s.split(":")[1])).size < 4) problems.push("word highlight did not move");
  await shot("page-playing.png", false);
} finally {
  ws.close();
  child.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "no console errors, no failed requests");
process.exit(problems.length ? 1 : 0);
