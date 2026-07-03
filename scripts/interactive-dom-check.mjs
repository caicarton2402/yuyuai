import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = path.join(os.tmpdir(), `yuyu-interactive-profile-${process.pid}`);

await mkdir(qaDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findFreePort(start) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise(resolve => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error(`No free port found starting at ${start}`);
}

async function waitForHttp(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

function spawnHidden(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    ...options
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function removeWithRetry(target) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError;
}

async function collectOutput(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", chunk => {
    stderr += chunk.toString();
  });
  return () => ({ stdout, stderr });
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(webSocketUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function getPageWebSocket(debugPort, expectedUrl) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === "page" && target.url.startsWith(expectedUrl));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome can take a moment to expose the target list.
    }
    await delay(200);
  }
  throw new Error(`Could not find Chrome page target for ${expectedUrl}`);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result.value;
}

async function waitForCondition(cdp, expression, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(cdp, expression);
    if (lastValue) return;
    await delay(80);
  }
  throw new Error(`Timed out waiting for condition: ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

async function mouseDrag(cdp, from, to) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: from.x,
    y: from.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: to.x,
    y: to.y,
    button: "left",
    buttons: 1
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: to.x,
    y: to.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
}

function assertCheck(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function snapshotExpression() {
  return `(() => {
    const $ = selector => document.querySelector(selector);
    const nodes = [...document.querySelectorAll(".node")].map(node => ({
      id: node.dataset.node,
      x: node.style.getPropertyValue("--x"),
      y: node.style.getPropertyValue("--y")
    }));
    const paths = [...document.querySelectorAll(".connector-layer path")].map(path => path.getAttribute("d") || "");
    const images = [...document.images].map(img => ({
      src: img.getAttribute("src"),
      complete: img.complete,
      width: img.naturalWidth,
      height: img.naturalHeight
    }));
    return {
      readyState: document.readyState,
      interactiveActive: $(".app-shell")?.classList.contains("interactive-active") || false,
      pixelOpacity: getComputedStyle($(".pixel-underlay")).opacity,
      zoomText: $("#zoomValue")?.textContent.trim() || "",
      rootZoom: getComputedStyle(document.documentElement).getPropertyValue("--zoom").trim(),
      panX: getComputedStyle(document.documentElement).getPropertyValue("--pan-x").trim(),
      panY: getComputedStyle(document.documentElement).getPropertyValue("--pan-y").trim(),
      activeMode: $(".mode-switch button.active")?.dataset.mode || "",
      ariaSelectedEditor: $("[data-mode='editor']")?.getAttribute("aria-selected") || "",
      nodeCount: nodes.length,
      nodes,
      connectorPaths: paths,
      images,
      toastVisible: $("#toast")?.classList.contains("show") || false
    };
  })()`;
}

const serverPort = Number(process.env.YUYU_INTERACTIVE_QA_PORT || await findFreePort(5190));
const debugPort = Number(process.env.YUYU_CDP_PORT || await findFreePort(9290));
const url = `http://127.0.0.1:${serverPort}/?interactive=1`;

const server = spawnHidden("python", ["-m", "http.server", String(serverPort), "--bind", "127.0.0.1"]);
const readServerOutput = await collectOutput(server);
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  await waitForHttp(`http://127.0.0.1:${serverPort}/`);

  chromeProcess = spawnHidden(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    "--window-size=1936,951",
    url
  ]);
  readChromeOutput = await collectOutput(chromeProcess);

  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const webSocketUrl = await getPageWebSocket(debugPort, url);
  cdp = new CdpClient(webSocketUrl);
  await cdp.open();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 863,
    deviceScaleFactor: 1,
    mobile: false
  });
  await waitForCondition(cdp, `document.readyState === "complete"`, 15000);
  await waitForCondition(cdp, `(() => {
    const pixel = document.querySelector(".pixel-underlay");
    return pixel && Number(getComputedStyle(pixel).opacity) <= 0.01;
  })()`, 15000);
  await waitForCondition(cdp, `(() => {
    const images = [...document.images];
    return images.length > 0 && images.every(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  })()`, 15000);

  const initial = await evaluate(cdp, snapshotExpression());
  assertCheck(initial.readyState === "complete", "Page did not finish loading", initial);
  assertCheck(initial.interactiveActive, "Interactive mode did not activate from query string", initial);
  assertCheck(Number(initial.pixelOpacity) <= 0.01, "Captured pixel layer should be hidden in interactive mode", initial);
  assertCheck(initial.nodeCount === 3, "Expected the three captured canvas nodes", initial);
  assertCheck(initial.zoomText === "78%", "Expected initial zoom label to match captured state", initial);
  assertCheck(initial.connectorPaths.every(value => value.startsWith("M ")), "Connector paths were not generated", initial);
  assertCheck(initial.images.every(image => image.complete && image.width > 0 && image.height > 0), "One or more images failed to load", initial);

  await evaluate(cdp, `document.querySelector("#zoomIn").click()`);
  await delay(120);
  const afterZoom = await evaluate(cdp, snapshotExpression());
  assertCheck(afterZoom.zoomText === "86%", "Zoom-in control did not update the zoom label", afterZoom);

  await evaluate(cdp, `document.querySelector("[data-mode='editor']").click()`);
  await delay(120);
  const afterMode = await evaluate(cdp, snapshotExpression());
  assertCheck(afterMode.activeMode === "editor" && afterMode.ariaSelectedEditor === "true", "Mode switch did not update selected state", afterMode);

  await evaluate(cdp, `document.querySelector(".tool-add").click()`);
  await delay(120);
  const afterAdd = await evaluate(cdp, snapshotExpression());
  assertCheck(afterAdd.nodeCount === 4, "Add tool did not create a prompt node", afterAdd);
  assertCheck(afterAdd.nodes.some(node => node.id?.startsWith("prompt-")), "Prompt node missing after add action", afterAdd);

  const characterRect = await evaluate(cdp, `(() => {
    const rect = document.querySelector("[data-node='character']").getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await mouseDrag(cdp, characterRect, { x: characterRect.x + 90, y: characterRect.y + 44 });
  await delay(160);
  const afterDrag = await evaluate(cdp, snapshotExpression());
  const draggedCharacter = afterDrag.nodes.find(node => node.id === "character");
  assertCheck(draggedCharacter.x !== "508px" || draggedCharacter.y !== "52px", "Character node did not move after drag", afterDrag);

  await mouseDrag(cdp, { x: 1810, y: 760 }, { x: 1730, y: 716 });
  await delay(160);
  const afterPan = await evaluate(cdp, snapshotExpression());
  assertCheck(afterPan.panX !== "0px" || afterPan.panY !== "0px", "Canvas pan did not update root pan variables", afterPan);

  await evaluate(cdp, `document.querySelector("#autoLayout").click()`);
  await delay(160);
  const afterReset = await evaluate(cdp, snapshotExpression());
  const resetCharacter = afterReset.nodes.find(node => node.id === "character");
  assertCheck(afterReset.zoomText === "78%", "Auto layout did not restore zoom", afterReset);
  assertCheck(afterReset.panX === "0px" && afterReset.panY === "0px", "Auto layout did not reset pan", afterReset);
  assertCheck(resetCharacter.x === "508px" && resetCharacter.y === "52px", "Auto layout did not restore character node position", afterReset);

  const result = {
    ok: true,
    url,
    checks: {
      loaded: true,
      queryActivatesInteractiveLayer: true,
      imagesLoaded: true,
      connectorPathsGenerated: true,
      zoomInUpdatesLabel: true,
      modeSwitchUpdatesState: true,
      addToolCreatesPromptNode: true,
      nodeDragMovesCard: true,
      canvasPanUpdatesTransform: true,
      autoLayoutRestoresCapturedState: true
    },
    states: {
      initial,
      afterZoom,
      afterMode,
      afterAdd,
      afterDrag,
      afterPan,
      afterReset
    }
  };
  await writeFile(path.join(qaDir, "interactive-dom-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = {
    ok: false,
    message: error.message,
    details: error.details || null,
    server: readServerOutput(),
    chrome: readChromeOutput()
  };
  await writeFile(path.join(qaDir, "interactive-dom-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  try {
    await cdp?.send("Browser.close");
  } catch {
    // The browser may already be gone if an earlier assertion failed.
  }
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
