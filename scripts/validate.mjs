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
  "public/assets/character-card-image.png",
  "public/assets/node-character-snapshot.png",
  "public/assets/location-reference-image.png",
  "public/assets/node-location-snapshot.png",
  "public/assets/node-video-snapshot.png",
  "public/assets/video-card-reference.png",
  "public/assets/story/dog.png",
  "public/assets/story/cat.png",
  "public/assets/story/elevator.png",
  "public/assets/story/hall.png",
  "public/assets/story/video-elevator-dog.png",
  "public/assets/story/video-dog-side.png",
  "public/assets/story/video-cat-close.png",
  "public/assets/story/video-dog-sit.png",
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
  hasScriptView: html.includes('data-view="script"') && html.includes("plannerChat") && html.includes("scriptDocument"),
  hasLibraryControls: ["story", "digital", "canvas"].every(name => html.includes(`data-library-tab="${name}"`)) && ["all", "overseas", "comic", "mv", "knowledge"].every(name => html.includes(`data-story-filter="${name}"`)),
  hasExploreComposer: html.includes("promptInput") && html.includes("tool-cluster") && html.includes("seriesToggle"),
  hasPromptTools: ["upload", "asset", "mention", "style"].every(name => html.includes(`data-tool="${name}"`)),
  hasCategoryTabs: ["overseas", "comic", "mv", "knowledge"].every(name => html.includes(`data-category="${name}"`)),
  hasCanvasGraph: ["canvasStudio", "canvasPlane", "generatePanel", "editorPanel", "shotList", "bottomZoomLabel"].every(id => html.includes(id)),
  hasGraphAssets: ["story/dog.png", "story/cat.png", "story/elevator.png", "story/hall.png", "story/video-elevator-dog.png", "story/video-dog-side.png", "story/video-cat-close.png", "story/video-dog-sit.png"].every(asset => html.includes(asset)),
  hasExpandedStyles: [".library-view", ".script-view", ".story-card", ".planner-message", ".script-document", ".graph-surface", ".generate-panel", ".editor-panel"].every(token => styles.includes(token)),
  hasResponsiveRules: styles.includes("@media (max-width: 1180px)") && styles.includes("@media (max-width: 760px)"),
  hasInteractionData: ["const storyProjects", "const plannerMessages", "function renderLibrary", "function renderPlannerChat", "function renderScriptDocument", "function setCanvasMode", "function runGenerator"].every(token => app.includes(token)),
  hasNoReplacementMojibake: !servedText.includes("\uFFFD")
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

if (missing.length || failed.length) {
  console.error(JSON.stringify({ ok: false, missing, failed, checks }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: required.length, checks }, null, 2));
