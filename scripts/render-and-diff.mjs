import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  evaluate,
  findFreePort,
  launchChrome,
  removeWithRetry,
  startStaticServer,
  stopProcess,
  waitForCondition
} from "./browser-helpers.mjs";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const replicaDir = path.join(root, "replica");
const diffDir = path.join(root, "diff");
const profileDir = path.join(os.tmpdir(), `yuyu-render-profile-${process.pid}`);
const screenshotPath = path.join(replicaDir, "yuyu-fullsite-1920x863-top.png");

await mkdir(qaDir, { recursive: true });
await mkdir(replicaDir, { recursive: true });
await mkdir(diffDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });
await rm(screenshotPath, { force: true });

async function run(command, args, options = {}) {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, ...options });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function screenshot(cdp, filePath) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(filePath, Buffer.from(result.data, "base64"));
}

const serverPort = Number(process.env.YUYU_RENDER_QA_PORT || await findFreePort(5220));
const debugPort = Number(process.env.YUYU_RENDER_CDP_PORT || await findFreePort(9590));
const url = `http://127.0.0.1:${serverPort}/`;

let server;
let chromeProcess;
let cdp;

try {
  ({ server } = await startStaticServer(serverPort));
  ({ chromeProcess, cdp } = await launchChrome(debugPort, profileDir, "1920,863"));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 863,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);
  await evaluate(cdp, `document.fonts ? document.fonts.ready.then(() => true) : true`);
  await screenshot(cdp, screenshotPath);

  const statsScript = `
from PIL import Image
from pathlib import Path
import json
root = Path.cwd()
shot = root / "replica" / "yuyu-fullsite-1920x863-top.png"
im = Image.open(shot).convert("RGB")
pixels = list(im.getdata())
non_dark = sum(1 for px in pixels if max(px) > 24)
bright = sum(1 for px in pixels if max(px) > 120)
result = {
  "path": "replica/yuyu-fullsite-1920x863-top.png",
  "size": list(im.size),
  "nonDarkPixels": non_dark,
  "brightPixels": bright,
  "ok": im.size == (1920, 863) and non_dark > 150000 and bright > 12000
}
print(json.dumps(result, indent=2, ensure_ascii=False))
`;
  const stats = JSON.parse((await run("python", ["-c", statsScript])).stdout);
  if (!stats.ok) {
    throw new Error(`Full-site render appears blank or wrong size: ${JSON.stringify(stats)}`);
  }

  const report = {
    ok: true,
    kind: "full-site-render",
    screenshot: "replica/yuyu-fullsite-1920x863-top.png",
    note: "Static YUYU frontend render. Original brand assets and names are intentionally replaced.",
    stats
  };
  await writeFile(path.join(diffDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(path.join(qaDir, "render-and-diff.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    await cdp?.send("Browser.close");
  } catch {}
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
