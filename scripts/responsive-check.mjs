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
      storyBoard: visible(".story-board"),
      scriptDoc: visible(".script-document"),
      planner: visible(".chat-column"),
      canvas: visible("#canvasStudio"),
      graph: visible(".graph-surface")
    },
    counts: {
      tools: document.querySelectorAll("[data-tool]").length,
      categories: document.querySelectorAll("[data-category]").length,
      templates: document.querySelectorAll("[data-template]").length,
      features: document.querySelectorAll("[data-feature]").length,
      stories: document.querySelectorAll(".story-card").length,
      plannerMessages: document.querySelectorAll(".planner-message").length,
      canvasNodes: document.querySelectorAll(".canvas-node").length
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

async function getCanvasLayout(cdp) {
  return evaluate(cdp, `(() => {
    const rectOf = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const toolbar = rectOf(".floating-generate-toolbar");
    const selectedNode = rectOf(".canvas-node.selected");
    const inspector = rectOf("#nodeInspector");
    const bottomBar = rectOf(".canvas-bottom-bar");
    return {
      toolbar,
      selectedNode,
      inspector,
      bottomBar,
      toolbarOverlapsSelected: overlaps(toolbar, selectedNode),
      inspectorOverlapsSelected: overlaps(inspector, selectedNode),
      bottomBarOverlapsInspector: overlaps(bottomBar, inspector)
    };
  })()`);
}

async function navigateHome(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);
  await delay(180);
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
    await navigateHome(cdp, url);

    const exploreState = await evaluate(cdp, snapshotExpression);
    const exploreEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-explore.png`);
    await screenshot(cdp, exploreEvidence);

    assertCheck(exploreState.viewport[0] === viewport.width && exploreState.viewport[1] === viewport.height, "Viewport dimensions do not match request", { viewport, exploreState });
    assertCheck(!exploreState.horizontalOverflow, "Explore view has horizontal overflow", { viewport, exploreState });
    assertCheck(exploreState.visible.hero && exploreState.visible.promptBox && exploreState.visible.categories && exploreState.visible.templates && exploreState.visible.features, "Explore sections are not visible", { viewport, exploreState });
    assertCheck(exploreState.visible.sideNav, "Navigation should be visible at all breakpoints", { viewport, exploreState });
    assertCheck(exploreState.counts.tools === 4 && exploreState.counts.categories === 4 && exploreState.counts.templates === 2 && exploreState.counts.features === 5, "Explore control counts changed", { viewport, exploreState });

    await evaluate(cdp, `document.querySelector("[data-route='projects']").click()`);
    await delay(160);
    const libraryState = await evaluate(cdp, snapshotExpression);
    const libraryEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-library.png`);
    await screenshot(cdp, libraryEvidence);
    assertCheck(libraryState.activeView === "projects" && libraryState.visible.storyBoard && libraryState.counts.stories >= 4, "Story library is not responsive-ready", { viewport, libraryState });
    assertCheck(!libraryState.horizontalOverflow, "Story library has horizontal overflow", { viewport, libraryState });

    await evaluate(cdp, `document.querySelector("[data-action='open-script']").click()`);
    await delay(160);
    const scriptState = await evaluate(cdp, snapshotExpression);
    const scriptEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-script.png`);
    await screenshot(cdp, scriptEvidence);
    assertCheck(scriptState.activeView === "script" && scriptState.visible.scriptDoc && scriptState.visible.planner && scriptState.counts.plannerMessages >= 4, "Script planning is not responsive-ready", { viewport, scriptState });
    assertCheck(!scriptState.horizontalOverflow, "Script view has horizontal overflow", { viewport, scriptState });

    await evaluate(cdp, `document.querySelector("[data-action='open-canvas']").click()`);
    await delay(160);
    const canvasState = await evaluate(cdp, snapshotExpression);
    const canvasEvidence = path.join(outDir, `yuyu-fullsite-${viewport.width}x${viewport.height}-${viewport.name}-canvas.png`);
    await screenshot(cdp, canvasEvidence);
    assertCheck(canvasState.visible.canvas && canvasState.visible.graph && canvasState.counts.canvasNodes >= 10, "Canvas graph is not responsive-ready", { viewport, canvasState });
    const canvasLayout = await getCanvasLayout(cdp);
    if (viewport.width <= 480) {
      assertCheck(!canvasLayout.toolbarOverlapsSelected && !canvasLayout.inspectorOverlapsSelected && !canvasLayout.bottomBarOverlapsInspector, "Mobile canvas controls overlap content", { viewport, canvasLayout });
    }

    results.push({
      ...viewport,
      exploreEvidence: path.relative(root, exploreEvidence).replace(/\\/g, "/"),
      libraryEvidence: path.relative(root, libraryEvidence).replace(/\\/g, "/"),
      scriptEvidence: path.relative(root, scriptEvidence).replace(/\\/g, "/"),
      canvasEvidence: path.relative(root, canvasEvidence).replace(/\\/g, "/"),
      exploreState,
      libraryState,
      scriptState,
      canvasState,
      canvasLayout
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
      libraryEvidence: item.libraryEvidence,
      scriptEvidence: item.scriptEvidence,
      canvasEvidence: item.canvasEvidence,
      storyCount: item.libraryState.counts.stories,
      plannerMessages: item.scriptState.counts.plannerMessages,
      canvasNodes: item.canvasState.counts.canvasNodes,
      mobileCanvasClear: item.width > 480 || (!item.canvasLayout.toolbarOverlapsSelected && !item.canvasLayout.inspectorOverlapsSelected && !item.canvasLayout.bottomBarOverlapsInspector)
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
