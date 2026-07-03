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
  "public/assets/yuyu-logo.png",
  "public/assets/yuyu-favicon.png",
  "public/assets/explore/template-dialog.png",
  "public/assets/explore/template-narration.png",
  "public/assets/explore/feature-effects.png",
  "public/assets/explore/feature-seedance.png",
  "public/assets/explore/feature-grid.png",
  "public/assets/explore/feature-panorama.png",
  "docs/design-references/live-explore/explore-current-viewport.png"
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

const checks = {
  hasYuyuBranding: html.includes("YUYU") && html.includes("yuyu-logo.png"),
  hasExploreComposer: html.includes("promptInput") && html.includes("tool-cluster"),
  hasPromptTools: ["upload", "asset", "mention", "style"].every(name => html.includes(`data-tool="${name}"`)),
  hasCategoryTabs: ["overseas", "comic", "mv", "knowledge"].every(name => html.includes(`data-category="${name}"`)),
  hasFeatureCards: ["blank", "effects", "seedance", "grid", "panorama"].every(name => html.includes(`data-feature="${name}"`)),
  hasWorkspacePanel: html.includes("workspacePanel") && html.includes("进入画布"),
  hasDarkExploreStyles: styles.includes(".explore-shell") && styles.includes(".prompt-box") && styles.includes(".feature-card"),
  hasResponsiveRules: styles.includes("@media (max-width: 760px)") && styles.includes("@media (max-width: 1180px)"),
  hasInteractionData: app.includes("const categories") && app.includes("const tools") && app.includes("showWorkspace"),
  hasTemplateRendering: app.includes("renderTemplates") && app.includes("selectTemplate")
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

if (missing.length || failed.length) {
  console.error(JSON.stringify({ ok: false, missing, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: required.length, checks }, null, 2));
