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
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error(`No free port found starting at ${start}`);
}

async function waitForHttp(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      await delay(200);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
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
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch {
      await delay(250);
    }
  }
}

async function collectOutput(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
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
      await delay(200);
    }
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

async function waitForCondition(cdp, expression, timeoutMs = 8000) {
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

const snapshotExpression = `(() => ({
  readyState: document.readyState,
  activeTool: document.querySelector("[data-tool][aria-pressed='true']")?.dataset.tool || "",
  toolPanelHidden: document.querySelector("#toolPanel")?.hidden,
  toolPanelText: document.querySelector("#toolPanel")?.innerText || "",
  activeCategory: document.querySelector("[data-category].active")?.dataset.category || "",
  promptPrefix: document.querySelector("#promptPrefix")?.textContent || "",
  promptValue: document.querySelector("#promptInput")?.value || "",
  templateCount: document.querySelectorAll("[data-template]").length,
  selectedTemplate: document.querySelector("[data-template].selected")?.dataset.template || "",
  workspaceHidden: document.querySelector("#workspacePanel")?.hidden,
  workspaceTitle: document.querySelector("#workspaceTitle")?.textContent || "",
  workspaceCopy: document.querySelector("#workspaceCopy")?.textContent || "",
  toastVisible: document.querySelector("#toast")?.classList.contains("show") || false
}))()`;

const serverPort = Number(process.env.YUYU_INTERACTIVE_QA_PORT || await findFreePort(5190));
const debugPort = Number(process.env.YUYU_CDP_PORT || await findFreePort(9290));
const url = `http://127.0.0.1:${serverPort}/`;

const server = spawnHidden("python", ["-m", "http.server", String(serverPort), "--bind", "127.0.0.1"]);
const readServerOutput = await collectOutput(server);
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  await waitForHttp(url);

  chromeProcess = spawnHidden(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    "--window-size=1920,863",
    "about:blank"
  ]);
  readChromeOutput = await collectOutput(chromeProcess);

  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const webSocketUrl = await getPageWebSocket(debugPort);
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
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `!!document.querySelector(".prompt-box")`);
  await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);

  const initial = await evaluate(cdp, snapshotExpression);
  assertCheck(initial.activeCategory === "overseas", "Expected overseas category active by default", initial);
  assertCheck(initial.promptPrefix.includes("出海短剧"), "Default prompt prefix should be overseas short drama", initial);
  assertCheck(initial.templateCount === 2, "Expected two prompt template cards", initial);
  assertCheck(initial.workspaceHidden === true, "Workspace should be hidden on initial load", initial);

  await evaluate(cdp, `document.querySelector("[data-tool='upload']").click()`);
  await delay(120);
  const afterUploadTool = await evaluate(cdp, snapshotExpression);
  assertCheck(afterUploadTool.activeTool === "upload", "Upload tool did not activate", afterUploadTool);
  assertCheck(afterUploadTool.toolPanelHidden === false && afterUploadTool.toolPanelText.includes("上传参考素材"), "Upload tool panel did not open", afterUploadTool);

  await evaluate(cdp, `document.querySelector("[data-chip='上传图片']").click()`);
  await delay(120);
  const afterChip = await evaluate(cdp, snapshotExpression);
  assertCheck(afterChip.promptValue.includes("上传图片"), "Tool chip did not append to prompt", afterChip);

  await evaluate(cdp, `document.querySelector("[data-category='comic']").click()`);
  await delay(120);
  const afterCategory = await evaluate(cdp, snapshotExpression);
  assertCheck(afterCategory.activeCategory === "comic", "Comic category did not activate", afterCategory);
  assertCheck(afterCategory.promptPrefix.includes("短剧漫剧"), "Prompt prefix did not update for comic category", afterCategory);
  assertCheck(afterCategory.templateCount === 2, "Template list did not rerender after category switch", afterCategory);

  await evaluate(cdp, `document.querySelector("[data-template]").click()`);
  await delay(160);
  const afterTemplate = await evaluate(cdp, snapshotExpression);
  assertCheck(afterTemplate.selectedTemplate !== "", "Template did not become selected", afterTemplate);
  assertCheck(afterTemplate.promptValue.length > 10, "Template did not populate prompt", afterTemplate);
  assertCheck(afterTemplate.workspaceHidden === false, "Template click did not open workspace panel", afterTemplate);

  await evaluate(cdp, `document.querySelector("[data-feature='seedance']").click()`);
  await delay(160);
  const afterFeature = await evaluate(cdp, snapshotExpression);
  assertCheck(afterFeature.workspaceTitle.includes("Seedance2.0"), "Seedance feature did not update workspace", afterFeature);
  assertCheck(afterFeature.workspaceCopy.includes("视频生成"), "Seedance feature copy missing", afterFeature);

  await evaluate(cdp, `document.querySelector("#sendBtn").click()`);
  await delay(160);
  const afterSend = await evaluate(cdp, snapshotExpression);
  assertCheck(afterSend.workspaceHidden === false, "Send button did not keep workspace open", afterSend);
  assertCheck(afterSend.workspaceTitle.length > 0, "Workspace title missing after send", afterSend);

  const result = {
    ok: true,
    url,
    checks: {
      defaultOverseasCategory: true,
      uploadToolOpensPanel: true,
      chipAppendsPrompt: true,
      categorySwitchRerendersTemplates: true,
      templatePopulatesPrompt: true,
      featureUpdatesWorkspace: true,
      sendCreatesWorkspace: true
    },
    states: {
      initial,
      afterUploadTool,
      afterChip,
      afterCategory,
      afterTemplate,
      afterFeature,
      afterSend
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
  } catch {}
  cdp?.close();
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
