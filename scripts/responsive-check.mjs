import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const outDir = path.join(root, "replica", "responsive");
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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

function assertCheck(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function viewportSnapshotExpression() {
  return `(() => {
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
    const images = [...document.images].map(img => ({
      src: img.getAttribute("src"),
      complete: img.complete,
      width: img.naturalWidth,
      height: img.naturalHeight
    }));
    const pathLengths = [...document.querySelectorAll(".connector-layer path")].map(path => (path.getAttribute("d") || "").length);
    return {
      viewport: [window.innerWidth, window.innerHeight],
      devicePixelRatio: window.devicePixelRatio,
      interactiveActive: document.querySelector(".app-shell")?.classList.contains("interactive-active") || false,
      pixelOpacity: getComputedStyle(document.querySelector(".pixel-underlay")).opacity,
      zoomText: document.querySelector("#zoomValue")?.textContent.trim() || "",
      nodeCount: document.querySelectorAll(".node").length,
      images,
      pathLengths,
      visible: {
        topbar: visible(".topbar"),
        modeSwitch: visible(".mode-switch"),
        toolRail: visible(".tool-rail"),
        bottomControls: visible(".bottom-controls"),
        assistant: visible(".assistant-btn"),
        minimap: visible(".minimap"),
        keyboard: visible(".keyboard-btn"),
        account: visible(".account-pill")
      },
      rects: {
        topbar: rect(".topbar"),
        modeSwitch: rect(".mode-switch"),
        bottomControls: rect(".bottom-controls"),
        toolRail: rect(".tool-rail"),
        assistant: rect(".assistant-btn")
      },
      cssFit: getComputedStyle(document.documentElement).getPropertyValue("--fit").trim(),
      bodyOverflow: getComputedStyle(document.body).overflow
    };
  })()`;
}

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
    "--window-size=1920,1000",
    "about:blank"
  ]);
  readChromeOutput = await collectOutput(chromeProcess);
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);

  cdp = new CdpClient(await getPageWebSocket(debugPort));
  await cdp.open();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");

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
    await waitForCondition(cdp, `(() => {
      const pixel = document.querySelector(".pixel-underlay");
      return pixel && Number(getComputedStyle(pixel).opacity) <= 0.01;
    })()`);
    await delay(120);

    const state = await evaluate(cdp, viewportSnapshotExpression());
    const evidence = path.join(outDir, `yuyu-${viewport.width}x${viewport.height}-${viewport.name}.png`);
    await screenshot(cdp, evidence);

    assertCheck(state.viewport[0] === viewport.width && state.viewport[1] === viewport.height, "Viewport dimensions do not match request", { viewport, state });
    assertCheck(state.interactiveActive, "Interactive layer is not active", { viewport, state });
    assertCheck(Number(state.pixelOpacity) <= 0.01, "Pixel layer did not fade out", { viewport, state });
    assertCheck(state.zoomText === "78%", "Zoom label drifted from captured default", { viewport, state });
    assertCheck(state.nodeCount >= 3, "Expected captured nodes to exist", { viewport, state });
    assertCheck(state.images.every(image => image.complete && image.width > 0 && image.height > 0), "Image failed to load", { viewport, state });
    assertCheck(state.pathLengths.length === 2 && state.pathLengths.every(length => length > 20), "Connector paths are missing", { viewport, state });
    assertCheck(state.visible.topbar && state.visible.modeSwitch && state.visible.bottomControls && state.visible.toolRail && state.visible.assistant, "Required controls are not visible", { viewport, state });
    if (viewport.width <= 720) {
      assertCheck(!state.visible.minimap && !state.visible.keyboard && !state.visible.account, "Mobile layout should hide minimap, keyboard helper, and account pill", { viewport, state });
    } else {
      assertCheck(state.visible.minimap && state.visible.keyboard && state.visible.account, "Desktop/tablet layout should keep minimap, keyboard helper, and account pill visible", { viewport, state });
    }

    results.push({
      ...viewport,
      evidence,
      state
    });
  }

  const imageStatsScript = `
from PIL import Image
from pathlib import Path
import json
paths = ${JSON.stringify(results.map(item => item.evidence))}
stats = []
for p in paths:
    im = Image.open(p).convert("RGB")
    pixels = list(im.getdata())
    non_dark = sum(1 for px in pixels if max(px) > 24)
    bright = sum(1 for px in pixels if max(px) > 120)
    stats.append({
        "path": p,
        "size": list(im.size),
        "nonDarkPixels": non_dark,
        "brightPixels": bright
    })
print(json.dumps(stats, indent=2))
`;
  const imageStats = JSON.parse(await new Promise((resolve, reject) => {
    const child = spawn("python", ["-c", imageStatsScript], { cwd: root, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `python exited ${code}`));
    });
  }));

  for (const [index, stats] of imageStats.entries()) {
    const viewport = viewports[index];
    assertCheck(stats.size[0] === viewport.width && stats.size[1] === viewport.height, "Screenshot dimensions do not match viewport", { viewport, stats });
    assertCheck(stats.nonDarkPixels > viewport.width * viewport.height * 0.08, "Responsive screenshot appears blank or too dark", { viewport, stats });
    assertCheck(stats.brightPixels > 500, "Responsive screenshot is missing bright UI/content pixels", { viewport, stats });
  }

  const result = {
    ok: true,
    url,
    viewports: results.map((item, index) => ({
      width: item.width,
      height: item.height,
      name: item.name,
      evidence: path.relative(root, item.evidence).replace(/\\/g, "/"),
      fit: item.state.cssFit,
      visible: item.state.visible,
      imageStats: {
        ...imageStats[index],
        path: path.relative(root, imageStats[index].path).replace(/\\/g, "/")
      }
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
  } catch {
    // The browser may already be gone if an assertion failed.
  }
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
