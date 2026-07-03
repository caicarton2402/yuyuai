import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = path.join(os.tmpdir(), `seko-runtime-profile-${process.pid}`);

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
      server.once("listening", () => server.close(() => resolve(true)));
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
      const response = await fetch(url);
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
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws = new WebSocket(webSocketUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      this.events.push({ method: message.method, params: message.params });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  takeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  close() {
    this.ws.close();
  }
}

async function getPageWebSocket(debugPort) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome can take a moment to expose the target list.
    }
    await delay(200);
  }
  throw new Error("Could not find Chrome page target");
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

async function waitForCondition(cdp, expression, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(cdp, expression);
    if (lastValue) return;
    await delay(80);
  }
  throw new Error(`Timed out waiting for condition: ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

function assertCleanRuntime(label, events, state) {
  const consoleErrors = events.filter(event => event.method === "Runtime.consoleAPICalled" && event.params?.type === "error");
  const exceptions = events.filter(event => event.method === "Runtime.exceptionThrown");
  const logErrors = events.filter(event => event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params?.entry?.level));
  const failedRequests = events.filter(event => event.method === "Network.loadingFailed" && event.params?.errorText !== "net::ERR_ABORTED");
  const badResponses = events.filter(event => event.method === "Network.responseReceived" && event.params?.response?.status >= 400);
  const bad = { consoleErrors, exceptions, logErrors, failedRequests, badResponses };
  if (Object.values(bad).some(items => items.length)) {
    const error = new Error(`${label} has runtime errors`);
    error.details = { bad, state };
    throw error;
  }
}

function stateExpression() {
  return `(() => {
    const images = [...document.images].map(img => ({
      src: img.getAttribute("src"),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    }));
    const scripts = [...document.scripts].map(script => script.getAttribute("src") || "inline");
    const stylesheets = [...document.styleSheets].map(sheet => sheet.href || "inline");
    return {
      title: document.title,
      readyState: document.readyState,
      url: location.href,
      interactiveActive: document.querySelector(".app-shell")?.classList.contains("interactive-active") || false,
      pixelOpacity: getComputedStyle(document.querySelector(".pixel-underlay")).opacity,
      nodeCount: document.querySelectorAll(".node").length,
      connectorCount: document.querySelectorAll(".connector-layer path[d]").length,
      images,
      scripts,
      stylesheets
    };
  })()`;
}

async function inspectPage(cdp, url, mode) {
  cdp.takeEvents();
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  if (mode === "interactive") {
    await waitForCondition(cdp, `(() => {
      const pixel = document.querySelector(".pixel-underlay");
      return document.querySelector(".app-shell")?.classList.contains("interactive-active") && pixel && Number(getComputedStyle(pixel).opacity) <= 0.01;
    })()`);
  }
  await delay(350);
  const state = await evaluate(cdp, stateExpression());
  const events = cdp.takeEvents();
  if (state.nodeCount < 3 || state.connectorCount < 2) {
    const error = new Error(`${mode} page did not initialize canvas state`);
    error.details = { state, events };
    throw error;
  }
  const badImages = state.images.filter(image => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0);
  if (badImages.length) {
    const error = new Error(`${mode} page has broken images`);
    error.details = { badImages, state, events };
    throw error;
  }
  assertCleanRuntime(mode, events, state);
  return { mode, url, state, eventCount: events.length };
}

const serverPort = Number(process.env.SEKO_RUNTIME_QA_PORT || await findFreePort(5210));
const debugPort = Number(process.env.SEKO_RUNTIME_CDP_PORT || await findFreePort(9490));
const baseUrl = `http://127.0.0.1:${serverPort}/`;

const server = spawnHidden("python", ["-m", "http.server", String(serverPort), "--bind", "127.0.0.1"]);
const readServerOutput = await collectOutput(server);
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  await waitForHttp(baseUrl);
  chromeProcess = spawnHidden(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    "--window-size=1936,951",
    "about:blank"
  ]);
  readChromeOutput = await collectOutput(chromeProcess);
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);

  cdp = new CdpClient(await getPageWebSocket(debugPort));
  await cdp.open();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 863,
    deviceScaleFactor: 1,
    mobile: false
  });

  const pages = [
    await inspectPage(cdp, baseUrl, "default"),
    await inspectPage(cdp, `${baseUrl}?interactive=1`, "interactive")
  ];

  const result = {
    ok: true,
    baseUrl,
    checks: {
      noConsoleErrors: true,
      noRuntimeExceptions: true,
      noNetworkFailures: true,
      noBadHttpResponses: true,
      imagesLoaded: true,
      canvasInitialized: true
    },
    pages
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
  } catch {
    // The browser may already be gone if an assertion failed.
  }
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
