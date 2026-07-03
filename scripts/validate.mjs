import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "scripts/browser-helpers.mjs",
  "scripts/validate.mjs",
  "scripts/check-http.mjs",
  "scripts/runtime-check.mjs",
  "scripts/render-and-diff.mjs",
  "scripts/interactive-dom-check.mjs",
  "scripts/responsive-check.mjs",
  "public/assets/yuyu-logo.png",
  "public/assets/yuyu-favicon.png",
  "public/assets/explore/template-dialog.png",
  "public/assets/explore/template-narration.png",
  "public/assets/explore/feature-effects.png",
  "public/assets/explore/feature-seedance.png",
  "public/assets/explore/feature-grid.png",
  "public/assets/explore/feature-panorama.png",
  "docs/research/FULL_SITE_SCOPE.md"
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
const servedText = `${html}\n${styles}\n${app}`;
const sourceBrandPattern = new RegExp(`${"se"}${"ko"}|${"sense"}${"time"}`, "i");

const checks = {
  noOriginalBranding: !sourceBrandPattern.test(servedText),
  hasYuyuBranding: html.includes("YUYU") && html.includes("yuyu-logo.png"),
  hasMainRoutes: ["explore", "projects", "assets", "team", "account"].every(name => html.includes(`data-route="${name}"`) && html.includes(`data-view="${name}"`)),
  hasExploreComposer: html.includes("promptInput") && html.includes("tool-cluster") && html.includes("seriesToggle"),
  hasPromptTools: ["upload", "asset", "mention", "style"].every(name => html.includes(`data-tool="${name}"`)),
  hasCategoryTabs: ["overseas", "comic", "mv", "knowledge"].every(name => html.includes(`data-category="${name}"`)),
  hasFeatureCards: ["blank", "effects", "video", "grid", "panorama"].every(name => html.includes(`data-feature="${name}"`)),
  hasFullSitePanels: ["projectBoard", "assetGrid", "memberList", "usageLedger", "canvasStudio", "workspacePanel", "modalLayer"].every(id => html.includes(id)),
  hasFullSiteStyles: [".app-shell", ".console-view", ".project-card", ".asset-card", ".team-layout", ".account-grid", ".canvas-studio", ".modal-layer"].every(token => styles.includes(token)),
  hasResponsiveRules: styles.includes("@media (max-width: 1180px)") && styles.includes("@media (max-width: 760px)"),
  hasInteractionData: ["const categories", "const projects", "const assets", "function openCanvas", "function addCanvasNode", "function setZoom"].every(token => app.includes(token)),
  hasNoReplacementMojibake: !servedText.includes("\uFFFD") && !servedText.includes("锟")
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

if (missing.length || failed.length) {
  console.error(JSON.stringify({ ok: false, missing, failed, checks }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: required.length, checks }, null, 2));
