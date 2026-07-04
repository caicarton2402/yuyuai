import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnHidden, findFreePort, stopProcess, waitForHttp } from "./browser-helpers.mjs";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "yuyu-api-data-"));
const port = Number(process.env.YUYU_API_QA_PORT || await findFreePort(5320));
const baseUrl = `http://127.0.0.1:${port}`;

function readOutput(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
  return () => ({ stdout, stderr });
}

async function api(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${options.method || "GET"} ${pathname} failed with ${response.status}`);
    error.details = json;
    throw error;
  }
  return json;
}

let server;
let output = () => ({ stdout: "", stderr: "" });

try {
  await writeFile(path.join(dataDir, ".keep"), "", "utf8");
  server = spawnHidden(process.execPath, ["server/server.mjs"], {
    env: { ...process.env, PORT: String(port), YUYU_DATA_DIR: dataDir }
  });
  output = readOutput(server);
  await waitForHttp(`${baseUrl}/api/health`, 12000);

  const email = `qa-${Date.now()}@yuyu.ai`;
  const password = "Yuyu123456";
  const registered = await api("/api/auth/register", {
    method: "POST",
    body: { email, password, name: "QA Owner" }
  });
  const token = registered.token;
  const me = await api("/api/auth/me", { token });
  const projectsBefore = await api("/api/projects", { token });
  const createdProject = await api("/api/projects", {
    method: "POST",
    token,
    body: { title: "QA 后端项目", category: "comic" }
  });
  await api(`/api/projects/${createdProject.project.id}/duplicate`, { method: "POST", token });
  const comment = await api("/api/team/comments", {
    method: "POST",
    token,
    body: { body: "后端评论保存检查" }
  });
  const generated = await api("/api/generate", {
    method: "POST",
    token,
    body: { type: "video", title: "QA 视频任务" }
  });
  const storyGenerated = await api("/api/generate", {
    method: "POST",
    token,
    body: { type: "story", title: "QA 故事策划", cost: 80 }
  });
  const toppedUp = await api("/api/billing/top-up", {
    method: "POST",
    token,
    body: { amount: 300, memo: "QA top up" }
  });
  const workspace = await api("/api/workspace", { token });
  await api("/api/auth/logout", { method: "POST", token });
  const loggedIn = await api("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });

  const checks = {
    health: true,
    registered: Boolean(token && registered.user?.email === email),
    me: me.user?.email === email,
    seededProjects: projectsBefore.projects.length >= 4,
    projectCreateAndDuplicate: workspace.workspace.projects.some(item => item.title === "QA 后端项目") && workspace.workspace.projects.some(item => item.title === "QA 后端项目 副本"),
    commentSaved: comment.comments.some(item => item.body === "后端评论保存检查"),
    generationSaved: generated.workspace.generationQueue[0].title === "QA 视频任务",
    storyGenerationSaved: storyGenerated.workspace.generationQueue[0].type === "策划" && storyGenerated.workspace.usageLedger[0][1] === "-80",
    billingSaved: toppedUp.workspace.usageLedger[0][0] === "充值",
    loginAfterLogout: Boolean(loggedIn.token)
  };

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    const error = new Error(`API checks failed: ${failed.join(", ")}`);
    error.details = checks;
    throw error;
  }

  const result = { ok: true, baseUrl, checks };
  await writeFile(path.join(qaDir, "api-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = {
    ok: false,
    message: error.message,
    details: error.details || null,
    server: output()
  };
  await writeFile(path.join(qaDir, "api-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await stopProcess(server);
  await rm(dataDir, { recursive: true, force: true });
}
