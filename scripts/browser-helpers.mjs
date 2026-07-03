import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import net from "node:net";

export const root = process.cwd();
export const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function findFreePort(start) {
  for (let port = start; port < start + 100; port += 1) {
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

export async function waitForHttp(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      await delay(180);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export function spawnHidden(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    ...options
  });
}

export async function stopProcess(child) {
  if (!child) return;
  if (typeof child.close === "function" && !child.kill) {
    await new Promise(resolve => child.close(resolve));
    return;
  }
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    await new Promise(resolve => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
      const timer = setTimeout(resolve, 3000);
      killer.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      killer.once("error", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    return;
  }
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

export async function removeWithRetry(target) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch {
      await delay(250);
    }
  }
}

export async function collectOutput(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
  return () => ({ stdout, stderr });
}

export class CdpClient {
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

export async function getPageWebSocket(debugPort) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      await delay(180);
    }
  }
  throw new Error("Could not find Chrome page target");
}

export async function evaluate(cdp, expression) {
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

export async function waitForCondition(cdp, expression, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(cdp, expression);
    if (lastValue) return;
    await delay(80);
  }
  throw new Error(`Timed out waiting for condition: ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

export function assertCheck(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

export async function startStaticServer(port) {
  const output = { stdout: "", stderr: "" };
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };
  const rootDir = path.resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = path.resolve(rootDir, `.${pathname.replaceAll("/", path.sep)}`);
      if (target !== rootDir && !target.startsWith(`${rootDir}${path.sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const info = await stat(target);
      if (!info.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
        "Content-Length": info.size
      });
      output.stderr += `127.0.0.1 ${request.method} ${url.pathname} 200\n`;
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      createReadStream(target).pipe(response);
    } catch (error) {
      output.stderr += `127.0.0.1 ${request.method} ${request.url} ${error.code || error.message}\n`;
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const readServerOutput = () => output;
  await waitForHttp(`http://127.0.0.1:${port}/`);
  return { server, readServerOutput };
}

export async function launchChrome(debugPort, profileDir, windowSize = "1440,1000") {
  const chromeProcess = spawnHidden(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    `--window-size=${windowSize}`,
    "about:blank"
  ]);
  const readChromeOutput = await collectOutput(chromeProcess);
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const cdp = new CdpClient(await getPageWebSocket(debugPort));
  await cdp.open();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Network.enable");
  return { chromeProcess, readChromeOutput, cdp };
}
