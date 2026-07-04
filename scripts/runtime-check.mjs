import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCheck,
  closeBrowser,
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
const profileDir = path.join(os.tmpdir(), `yuyu-runtime-profile-${process.pid}`);

await mkdir(qaDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

const stateExpression = `(() => {
  const sourceBrandPattern = new RegExp(["se", "ko"].join("") + "|" + ["sense", "time"].join(""), "i");
  const images = [...document.images].map(img => ({
    src: img.getAttribute("src"),
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  }));
  const text = document.documentElement.innerText + " " + document.title;
  return {
    title: document.title,
    readyState: document.readyState,
    yuyu: text.includes("YUYU"),
    originalBrandVisible: sourceBrandPattern.test(text),
    routeCount: document.querySelectorAll("[data-route]").length,
    viewCount: document.querySelectorAll(".view").length,
    activeView: document.querySelector(".view.active")?.dataset.view || "",
    promptTools: document.querySelectorAll("[data-tool]").length,
    categories: document.querySelectorAll("[data-category]").length,
    templates: document.querySelectorAll("[data-template]").length,
    features: document.querySelectorAll("[data-feature]").length,
    libraryTabs: document.querySelectorAll("[data-library-tab]").length,
    libraryFilters: document.querySelectorAll("[data-story-filter]").length,
    storyCards: document.querySelectorAll(".story-card").length,
    plannerMessages: document.querySelectorAll(".planner-message").length,
    docSections: document.querySelectorAll(".doc-section").length,
    assets: document.querySelectorAll(".asset-card").length,
    assetDetailVisible: !!document.querySelector("#assetDetailPanel h2"),
    members: document.querySelectorAll(".member-row").length,
    ledgerRows: document.querySelectorAll(".ledger-row").length,
    planCards: document.querySelectorAll(".plan-card").length,
    queueItems: document.querySelectorAll(".queue-item").length,
    queueHidden: document.querySelector("#queueDrawer")?.hidden,
    canvasHidden: document.querySelector("#canvasStudio")?.hidden,
    canvasNodes: document.querySelectorAll(".canvas-node").length,
    nodeInspectorVisible: !!document.querySelector("#nodeInspector h2"),
    generationHistoryItems: document.querySelectorAll("#generationHistory [data-result]").length,
    generatePanelHidden: document.querySelector("#generatePanel")?.hidden,
    editorPanelHidden: document.querySelector("#editorPanel")?.hidden,
    modalHidden: document.querySelector("#modalLayer")?.hidden,
    zoomLabel: document.querySelector("#zoomLabel")?.textContent || "",
    images
  };
})()`;

function runtimeProblems(events) {
  return {
    consoleErrors: events.filter(event => event.method === "Runtime.consoleAPICalled" && event.params?.type === "error"),
    exceptions: events.filter(event => event.method === "Runtime.exceptionThrown"),
    failedRequests: events.filter(event => event.method === "Network.loadingFailed" && event.params?.errorText !== "net::ERR_ABORTED"),
    badResponses: events.filter(event => {
      const response = event.params?.response;
      if (!response || response.status < 400) return false;
      return !(response.url.endsWith("/api/health") && response.status === 404);
    })
  };
}

const serverPort = Number(process.env.YUYU_RUNTIME_QA_PORT || await findFreePort(5210));
const debugPort = Number(process.env.YUYU_RUNTIME_CDP_PORT || await findFreePort(9490));
const baseUrl = `http://127.0.0.1:${serverPort}/`;

let server;
let readServerOutput = () => ({ stdout: "", stderr: "" });
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  ({ server, readServerOutput } = await startStaticServer(serverPort));
  ({ chromeProcess, readChromeOutput, cdp } = await launchChrome(debugPort, profileDir, "1920,863"));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 863,
    deviceScaleFactor: 1,
    mobile: false
  });

  cdp.takeEvents();
  await cdp.send("Page.navigate", { url: baseUrl });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);
  await delay(220);

  const state = await evaluate(cdp, stateExpression);
  const badImages = state.images.filter(image => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0);
  const events = cdp.takeEvents();
  const bad = runtimeProblems(events);

  assertCheck(state.yuyu, "YUYU branding not visible", state);
  assertCheck(!state.originalBrandVisible, "Original branding is visible in runtime text", state);
  assertCheck(state.activeView === "explore", "Explore should be active by default", state);
  assertCheck(state.routeCount >= 6 && state.viewCount === 6, "Route/view counts are wrong", state);
  assertCheck(state.promptTools === 4 && state.categories === 4 && state.templates === 2 && state.features === 5, "Explore controls did not initialize", state);
  assertCheck(state.libraryTabs === 3 && state.libraryFilters === 5 && state.storyCards >= 4, "Story library did not initialize", state);
  assertCheck(state.plannerMessages >= 4 && state.docSections >= 4, "Script planning view did not initialize", state);
  assertCheck(state.assets >= 3 && state.assetDetailVisible && state.members >= 4 && state.ledgerRows >= 4 && state.planCards >= 3, "Secondary modules did not render", state);
  assertCheck(state.canvasHidden === true && state.queueHidden === true && state.generatePanelHidden === true && state.editorPanelHidden === true && state.modalHidden === true, "Hidden surfaces should start hidden", state);
  assertCheck(state.canvasNodes >= 10 && state.zoomLabel === "33%", "Canvas graph did not initialize", state);
  assertCheck(state.queueItems >= 3 && state.nodeInspectorVisible && state.generationHistoryItems >= 3, "Deep workflow panels did not initialize", state);
  assertCheck(badImages.length === 0, "Broken images detected", { badImages, state });
  assertCheck(Object.values(bad).every(items => items.length === 0), "Runtime has console/network errors", bad);

  const result = {
    ok: true,
    baseUrl,
    checks: {
      noOriginalBranding: true,
      noConsoleErrors: true,
      noRuntimeExceptions: true,
      noNetworkFailures: true,
      imagesLoaded: true,
      expandedSiteInitialized: true
    },
    state
  };
  await writeFile(path.join(qaDir, "runtime-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = {
    ok: false,
    message: error.message,
    details: error.details || null,
    server: readServerOutput(),
    chrome: readChromeOutput()
  };
  await writeFile(path.join(qaDir, "runtime-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await closeBrowser(cdp);
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
