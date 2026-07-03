import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCheck,
  delay,
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
const outDir = path.join(root, "replica", "responsive");
const profileDir = path.join(os.tmpdir(), `yuyu-responsive-profile-${process.pid}`);

const viewports = [
  { width: 1920, height: 1000, name: "desktop-wide" },
  { width: 1440, height: 1000, name: "desktop" },
  { width: 1024, height: 1000, name: "tablet-landscape" },
  { width: 768, height: 1000, name: "tablet" },
  { width: 375, height: 812, name: "mobile" }
];

await mkdir(qaDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

const snapshotExpression = `(() => {
  const visible = selector => {
    const el = document.querySelector(selector);
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  };
  const rect = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  };
  return {
    viewport: [window.innerWidth, window.innerHeight],
    activeView: document.querySelector(".view.active")?.dataset.view || "",
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    visible: {
      hero: visible(".hero"),
      promptBox: visible(".prompt-box"),
      categories: visible(".category-tabs"),
      templates: visible(".template-grid"),
      features: visible(".feature-section"),
      sideNav: visible(".side-nav"),
      navStack: visible(".nav-stack"),
      projectBoard: visible(".project-board")
    },
    counts: {
      tools: document.querySelectorAll("[data-tool]").length,
      categories: document.querySelectorAll("[data-category]").length,
      templates: document.querySelectorAll("[data-template]").length,
      features: document.querySelectorAll("[data-feature]").length,
      projects: document.querySelectorAll(".project-card").length
    },
    rects: {
      hero: rect(".hero"),
      prompt: rect(".prompt-box"),
      featureSection: rect(".feature-section"),
      sideNav: rect(".side-nav")
    }
  };
})()`;

async function screenshot(cdp, filePath) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(filePath, Buffer.from(result.data, "base64"));
}

const serverPort = Number(process.env.YUYU_RESPONSIVE_QA_PORT || await findFreePort(5200));
const debugPort = Number(process.env.YUYU_RESPONSIVE_CDP_PORT || await findFreePort(9390));
const url = `http://127.0.0.1:${serverPort}/`;

let server;
let readServerOutput = () => ({ stdout: "", stderr: "" });
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  ({ server, readServerOutput } = await startStaticServer(serverPort));
  ({ chromeProcess, readChromeOutput, cdp } = await launchChrome(debugPort, profileDir, "1920,1000"));

  const results = [];
  for (const viewport of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width <= 480
    });
    await cdp.send("Page.navigate", { url });
    await waitForCondition(cdp, `document.readyState === "complete"`);
    await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);
    await delay(180);

    const exploreState = await evaluate(cdp, snapshotExpression);
    const exploreEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-explore.png`);
    await screenshot(cdp, exploreEvidence);

    assertCheck(exploreState.viewport[0] === viewport.width && exploreState.viewport[1] === viewport.height, "Viewport dimensions do not match request", { viewport, exploreState });
    assertCheck(!exploreState.horizontalOverflow, "Explore view has horizontal overflow", { viewport, exploreState });
    assertCheck(exploreState.visible.hero && exploreState.visible.promptBox && exploreState.visible.categories && exploreState.visible.templates && exploreState.visible.features, "Explore sections are not visible", { viewport, exploreState });
    assertCheck(exploreState.visible.sideNav && exploreState.visible.navStack, "Navigation should be visible at all breakpoints", { viewport, exploreState });
    assertCheck(exploreState.counts.tools === 4 && exploreState.counts.categories === 4 && exploreState.counts.templates === 2 && exploreState.counts.features === 5, "Explore control counts changed", { viewport, exploreState });

    await evaluate(cdp, `document.querySelector("[data-route='projects']").click()`);
    await delay(160);
    const projectState = await evaluate(cdp, snapshotExpression);
    const projectEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-projects.png`);
    await screenshot(cdp, projectEvidence);
    assertCheck(projectState.activeView === "projects" && projectState.visible.projectBoard && projectState.counts.projects >= 4, "Projects view is not responsive-ready", { viewport, projectState });
    assertCheck(!projectState.horizontalOverflow, "Projects view has horizontal overflow", { viewport, projectState });

    results.push({
      ...viewport,
      exploreEvidence: path.relative(root, exploreEvidence).replace(/\\/g, "/"),
      projectEvidence: path.relative(root, projectEvidence).replace(/\\/g, "/"),
      exploreState,
      projectState
    });
  }

  const result = {
    ok: true,
    url,
    viewports: results.map(item => ({
      width: item.width,
      height: item.height,
      name: item.name,
      exploreEvidence: item.exploreEvidence,
      projectEvidence: item.projectEvidence,
      exploreVisible: item.exploreState.visible,
      projectCount: item.projectState.counts.projects
    }))
  };
  await writeFile(path.join(qaDir, "responsive-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = {
    ok: false,
    message: error.message,
    details: error.details || null,
    server: readServerOutput(),
    chrome: readChromeOutput()
  };
  await writeFile(path.join(qaDir, "responsive-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  try {
    await cdp?.send("Browser.close");
  } catch {}
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
