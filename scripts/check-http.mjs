import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const port = Number(process.env.SEKO_QA_PORT || 5180);

await mkdir(qaDir, { recursive: true });

const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
server.stdout.on("data", chunk => { stdout += chunk.toString(); });
server.stderr.on("data", chunk => { stderr += chunk.toString(); });

const urls = [
  "/",
  "/src/styles.css",
  "/src/app.js",
  "/public/assets/seko-captured-state.png",
  "/public/assets/node-character-snapshot.png",
  "/public/assets/node-location-snapshot.png",
  "/public/assets/node-video-snapshot.png",
  "/public/assets/favicon.svg"
].map(url => `http://127.0.0.1:${port}${url}`);

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error(`HTTP server did not become ready on port ${port}`);
}

try {
  await waitForServer();
  const results = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      results.push({
        url,
        status: response.status,
        type: response.headers.get("content-type"),
        length: response.headers.get("content-length")
      });
    } catch (error) {
      results.push({ url, status: "ERROR", error: error.message });
    }
  }
  await writeFile(path.join(qaDir, "server-check.json"), JSON.stringify(results, null, 2), "utf8");
  await writeFile(path.join(qaDir, "server.stdout.log"), stdout, "utf8");
  await writeFile(path.join(qaDir, "server.stderr.log"), stderr, "utf8");
  const bad = results.filter(item => item.status !== 200);
  console.log(JSON.stringify({ ok: bad.length === 0, port, results }, null, 2));
  if (bad.length) process.exitCode = 1;
} finally {
  server.kill();
}
