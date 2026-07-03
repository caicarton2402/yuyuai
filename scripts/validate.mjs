import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "scripts/validate.mjs",
  "scripts/check-http.mjs",
  "scripts/runtime-check.mjs",
  "scripts/render-and-diff.mjs",
  "scripts/interactive-dom-check.mjs",
  "scripts/responsive-check.mjs",
  "scripts/diff_images.py",
  "public/assets/character-card-image.png",
  "public/assets/location-reference-image.png",
  "public/assets/yuyu-captured-state.png",
  "public/assets/yuyu-logo.png",
  "public/assets/yuyu-favicon.png",
  "public/assets/node-character-snapshot.png",
  "public/assets/node-location-snapshot.png",
  "public/assets/node-video-snapshot.png",
  "public/assets/favicon.svg",
  "reference/yuyu-current-viewport.png",
  "docs/research/PAGE_TOPOLOGY.md",
  "docs/research/BEHAVIORS.md",
  "docs/research/components/canvas-app.spec.md"
];

const missing = [];
for (const rel of required) {
  try {
    await access(path.join(root, rel));
  } catch {
    missing.push(rel);
  }
}

const html = await readFile(path.join(root, "index.html"), "utf8");
const styles = await readFile(path.join(root, "src/styles.css"), "utf8");
const app = await readFile(path.join(root, "src/app.js"), "utf8");
const interactiveDomCheck = await readFile(path.join(root, "scripts/interactive-dom-check.mjs"), "utf8");
const responsiveCheck = await readFile(path.join(root, "scripts/responsive-check.mjs"), "utf8");
const runtimeCheck = await readFile(path.join(root, "scripts/runtime-check.mjs"), "utf8");

const checks = {
  hasCanvasTitle: html.includes("YUYU"),
  hasViolationText: html.includes("生成内容违规"),
  hasYuyuLogo: html.includes("yuyu-logo.png"),
  hasZoom: html.includes("78%"),
  hasDottedGrid: styles.includes("radial-gradient"),
  hasDragLogic: app.includes("makeDraggable"),
  hasZoomLogic: app.includes("setZoom"),
  hasConnectorLogic: app.includes("updateConnectors"),
  hasInteractiveDomCheck: interactiveDomCheck.includes("queryActivatesInteractiveLayer"),
  hasResponsiveCheck: responsiveCheck.includes("desktop-wide") && responsiveCheck.includes("mobile"),
  hasRuntimeCheck: runtimeCheck.includes("noConsoleErrors") && runtimeCheck.includes("Network.responseReceived")
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

if (missing.length || failed.length) {
  console.error(JSON.stringify({ ok: false, missing, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: required.length, checks }, null, 2));
