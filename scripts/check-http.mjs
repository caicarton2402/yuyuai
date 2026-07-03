import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { findFreePort, startStaticServer, stopProcess } from "./browser-helpers.mjs";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const port = Number(process.env.YUYU_QA_PORT || await findFreePort(5180));

await mkdir(qaDir, { recursive: true });

const urls = [
  "/",
  "/src/styles.css",
  "/src/app.js",
  "/scripts/browser-helpers.mjs",
  "/public/assets/yuyu-logo.png",
  "/public/assets/yuyu-favicon.png",
  "/public/assets/explore/template-dialog.png",
  "/public/assets/explore/template-narration.png",
  "/public/assets/explore/feature-effects.png",
  "/public/assets/explore/feature-seedance.png",
  "/public/assets/explore/feature-grid.png",
  "/public/assets/explore/feature-panorama.png"
].map(url => `http://127.0.0.1:${port}${url}`);

const { server, readServerOutput } = await startStaticServer(port);

try {
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
  const bad = results.filter(item => item.status !== 200);
  const result = { ok: bad.length === 0, port, results, server: readServerOutput() };
  await writeFile(path.join(qaDir, "server-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  if (bad.length) process.exitCode = 1;
} finally {
  await stopProcess(server);
}
