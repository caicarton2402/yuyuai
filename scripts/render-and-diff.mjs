import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(root, ".qa");
const profileDir = path.join(qaDir, "chrome-headless-profile");
const widePath = path.join(root, "replica", "yuyu-local-viewport-wide.png");
const croppedPath = path.join(root, "replica", "yuyu-local-viewport.png");
const namedReplicaPath = path.join(root, "replica", "yuyu-1920x863-top.png");
const interactiveWidePath = path.join(root, "replica", "yuyu-interactive-viewport-wide.png");
const interactivePath = path.join(root, "replica", "yuyu-interactive-viewport.png");
const htmlUrl = new URL(`file:///${path.join(root, "index.html").replace(/\\/g, "/")}`).href;
const interactiveUrl = `${htmlUrl}?interactive=1`;

await mkdir(qaDir, { recursive: true });
await mkdir(path.join(root, "replica"), { recursive: true });
await rm(profileDir, { recursive: true, force: true });
await rm(widePath, { force: true });
await rm(croppedPath, { force: true });
await rm(interactiveWidePath, { force: true });
await rm(interactivePath, { force: true });

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

async function renderChrome(url, outPath) {
  await run(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  `--user-data-dir=${profileDir}`,
  "--window-size=1936,951",
    `--screenshot=${outPath}`,
    url
  ]);
  await access(outPath);
}

await renderChrome(htmlUrl, widePath);

const cropScript = `
from PIL import Image
from pathlib import Path
root = Path(r'''${root}''')
wide = root / 'replica' / 'yuyu-local-viewport-wide.png'
cropped = root / 'replica' / 'yuyu-local-viewport.png'
named = root / 'replica' / 'yuyu-1920x863-top.png'
im = Image.open(wide)
im.crop((0, 0, 1920, 863)).save(cropped)
named.write_bytes(cropped.read_bytes())
print(f"wide={im.size[0]}x{im.size[1]} cropped=1920x863")
`;
await run("python", ["-c", cropScript]);

await run("python", [
  path.join(root, "scripts", "diff_images.py"),
  "--root", root,
  "--ref", "reference",
  "--rep", "replica",
  "--out", "diff",
  "--prefix", "yuyu",
  "--viewports", "1920x863",
  "--kinds", "top",
  "--threshold", "16",
  "--report", "report.json",
  "--strict"
]);

await renderChrome(interactiveUrl, interactiveWidePath);
const interactiveScript = `
from PIL import Image, ImageChops
from pathlib import Path
import json
root = Path(r'''${root}''')
wide = root / 'replica' / 'yuyu-interactive-viewport-wide.png'
out = root / 'replica' / 'yuyu-interactive-viewport.png'
ref = root / 'reference' / 'yuyu-1920x863-top.png'
im = Image.open(wide).convert('RGB')
crop = im.crop((0, 0, 1920, 863))
crop.save(out)
refim = Image.open(ref).convert('RGB')
diff = ImageChops.difference(refim, crop)
changed = 0
non_dark = 0
max_delta = 0
for pixel, delta in zip(crop.getdata(), diff.getdata()):
    if max(pixel) > 24:
        non_dark += 1
    d = max(delta)
    max_delta = max(max_delta, d)
    if d > 16:
        changed += 1
result = {
    "size": list(crop.size),
    "nonDarkPixels": non_dark,
    "changedFromDefaultPixels": changed,
    "maxDeltaFromDefault": max_delta,
    "ok": crop.size == (1920, 863) and non_dark > 100000 and changed > 10000
}
print(json.dumps(result, indent=2))
`;
const interactiveCheck = JSON.parse((await run("python", ["-c", interactiveScript])).stdout);
if (!interactiveCheck.ok) {
  throw new Error(`Interactive screenshot check failed: ${JSON.stringify(interactiveCheck)}`);
}

await rm(profileDir, { recursive: true, force: true });

const reportPath = path.join(root, "diff", "report.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
await writeFile(path.join(qaDir, "interactive-check.json"), JSON.stringify(interactiveCheck, null, 2), "utf8");
await writeFile(path.join(qaDir, "render-and-diff.json"), JSON.stringify({ ok: true, chrome, report, interactiveCheck }, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, report, interactiveCheck }, null, 2));
