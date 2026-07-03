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
    projects: document.querySelectorAll(".project-card").length,
    assets: document.querySelectorAll(".asset-card").length,
    members: document.querySelectorAll(".member-row").length,
    ledgerRows: document.querySelectorAll(".ledger-row").length,
    canvasHidden: document.querySelector("#canvasStudio")?.hidden,
    modalHidden: document.querySelector("#modalLayer")?.hidden,
    images
  };
})()`;

function runtimeProblems(events) {
  return {
    consoleErrors: events.filter(event => event.method === "Runtime.consoleAPICalled" && event.params?.type === "error"),
    exceptions: events.filter(event => event.method === "Runtime.exceptionThrown"),
    failedRequests: events.filter(event => event.method === "Network.loadingFailed" && event.params?.errorText !== "net::ERR_ABORTED"),
    badResponses: events.filter(event => event.method === "Network.responseReceived" && event.params?.response?.status >= 400)
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
  assertCheck(state.routeCount >= 6 && state.viewCount === 5, "Route/view counts are wrong", state);
  assertCheck(state.promptTools === 4 && state.categories === 4 && state.templates === 2 && state.features === 5, "Explore controls did not initialize", state);
  assertCheck(state.projects >= 4 && state.assets >= 3 && state.members >= 4 && state.ledgerRows >= 4, "Secondary modules did not render", state);
  assertCheck(state.canvasHidden === true && state.modalHidden === true, "Canvas and modal should start hidden", state);
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
      fullSiteInitialized: true
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
  try {
    await cdp?.send("Browser.close");
  } catch {}
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
