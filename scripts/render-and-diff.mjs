import { spawn } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(root, ".qa");
const replicaDir = path.join(root, "replica");
const diffDir = path.join(root, "diff");
const profileDir = path.join(qaDir, "chrome-explore-render-profile");
const port = Number(process.env.YUYU_RENDER_QA_PORT || 5220);
const url = `http://127.0.0.1:${port}/`;
const screenshotPath = path.join(replicaDir, "yuyu-explore-1920x863-top.png");

await mkdir(qaDir, { recursive: true });
await mkdir(replicaDir, { recursive: true });
await mkdir(diffDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });
await rm(screenshotPath, { force: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(command, args, options = {}) {
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

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      await delay(200);
    }
  }
  throw new Error(`HTTP server did not become ready on port ${port}`);
}

const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

try {
  await waitForServer();
  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profileDir}`,
    "--window-size=1920,863",
    `--screenshot=${screenshotPath}`,
    url
  ]);
  await access(screenshotPath);

  const statsScript = `
from PIL import Image
from pathlib import Path
import json
root = Path.cwd()
shot = root / "replica" / "yuyu-explore-1920x863-top.png"
im = Image.open(shot).convert("RGB")
pixels = list(im.getdata())
non_dark = sum(1 for px in pixels if max(px) > 24)
bright = sum(1 for px in pixels if max(px) > 120)
result = {
  "path": "replica/yuyu-explore-1920x863-top.png",
  "size": list(im.size),
  "nonDarkPixels": non_dark,
  "brightPixels": bright,
  "ok": im.size == (1920, 863) and non_dark > 120000 and bright > 12000
}
print(json.dumps(result, indent=2, ensure_ascii=False))
`;
  const stats = JSON.parse((await run("python", ["-c", statsScript])).stdout);
  if (!stats.ok) {
    throw new Error(`Explore render appears blank or wrong size: ${JSON.stringify(stats)}`);
  }

  const report = {
    ok: true,
    kind: "explore-render",
    screenshot: "replica/yuyu-explore-1920x863-top.png",
    reference: "docs/design-references/live-explore/explore-current-viewport.png",
    note: "Reference is the logged-in source page; local render intentionally replaces original branding with YUYU and implements interactive controls.",
    stats
  };
  await writeFile(path.join(diffDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(path.join(qaDir, "render-and-diff.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill();
  await rm(profileDir, { recursive: true, force: true });
}
