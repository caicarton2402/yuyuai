import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  createSession,
  createUser,
  deleteSession,
  ensureDemoUser,
  findUserByEmail,
  getSessionUser,
  getWorkspace,
  loadDb,
  nowIso,
  publicUser,
  updateWorkspace,
  verifyPassword
} from "./store.mjs";

const root = process.cwd();
const defaultPort = Number(process.env.PORT || process.env.YUYU_PORT || 5180);
const serverFile = fileURLToPath(import.meta.url);

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

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  });
  response.end(body);
}

function readToken(request) {
  const authorization = request.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)yuyu_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      const error = new Error("Request body too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

async function requireAuth(request) {
  const context = await getSessionUser(readToken(request));
  if (!context?.user) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }
  return context;
}

function validateCredentials({ email, password }) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ""))) {
    const error = new Error("Valid email is required");
    error.status = 400;
    throw error;
  }
  if (String(password || "").length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.status = 400;
    throw error;
  }
}

function byId(items, id) {
  return items.findIndex(item => item.id === id);
}

async function authPayload(user, request) {
  const { token } = await createSession(user.id, request.headers["user-agent"]);
  const workspace = await getWorkspace(user.id);
  return { token, user: publicUser(user), workspace };
}

async function handleAuth(method, segments, request, response) {
  if (method === "POST" && segments[1] === "register") {
    const body = await readJson(request);
    validateCredentials(body);
    const user = await createUser(body);
    const workspace = await getWorkspace(user.id);
    workspace.members[0] = { ...workspace.members[0], name: user.name, role: "Owner", state: "在线" };
    await updateWorkspace(user.id, workspace);
    return sendJson(response, 201, await authPayload(user, request));
  }

  if (method === "POST" && segments[1] === "login") {
    const body = await readJson(request);
    validateCredentials(body);
    const db = await loadDb();
    const user = findUserByEmail(db, body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordSalt, user.passwordHash))) {
      return sendJson(response, 401, { ok: false, message: "Email or password is incorrect" });
    }
    return sendJson(response, 200, await authPayload(user, request));
  }

  if (method === "POST" && segments[1] === "logout") {
    await deleteSession(readToken(request));
    return sendJson(response, 200, { ok: true });
  }

  if (method === "GET" && segments[1] === "me") {
    const context = await requireAuth(request);
    const workspace = await getWorkspace(context.user.id);
    return sendJson(response, 200, { user: publicUser(context.user), workspace });
  }

  return sendJson(response, 404, { ok: false, message: "Unknown auth endpoint" });
}

async function handleWorkspace(method, request, response, context) {
  if (method === "GET") {
    return sendJson(response, 200, { workspace: await getWorkspace(context.user.id) });
  }
  if (method === "PUT") {
    const body = await readJson(request);
    const workspace = await updateWorkspace(context.user.id, body.workspace || body);
    return sendJson(response, 200, { workspace });
  }
  return sendJson(response, 405, { ok: false, message: "Method not allowed" });
}

async function handleProjects(method, segments, request, response, context) {
  const workspace = await getWorkspace(context.user.id);
  const id = segments[1];
  if (method === "GET" && !id) return sendJson(response, 200, { projects: workspace.projects });
  if (method === "POST" && !id) {
    const body = await readJson(request);
    const project = {
      id: body.id || `story-${Date.now()}`,
      tab: body.tab || "story",
      category: body.category || "overseas",
      title: body.title || "新的 YUYU 故事",
      subtitle: body.subtitle || "等待策划内容",
      status: body.status || "草稿",
      mode: body.mode || "策划",
      updated: "刚刚",
      progress: Number(body.progress ?? 8),
      cover: body.cover || "linear-gradient(135deg, rgba(184,233,72,.18), rgba(84,188,230,.18))"
    };
    workspace.projects.unshift(project);
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 201, { project });
  }
  const index = byId(workspace.projects, id);
  if (index < 0) return sendJson(response, 404, { ok: false, message: "Project not found" });
  if (method === "GET") return sendJson(response, 200, { project: workspace.projects[index] });
  if (method === "PATCH") {
    const body = await readJson(request);
    workspace.projects[index] = { ...workspace.projects[index], ...body, updated: "刚刚" };
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 200, { project: workspace.projects[index] });
  }
  if (method === "POST" && segments[2] === "duplicate") {
    const copy = { ...workspace.projects[index], id: `copy-${Date.now()}`, title: `${workspace.projects[index].title} 副本`, updated: "刚刚", status: "草稿", progress: Math.min(workspace.projects[index].progress || 0, 20) };
    workspace.projects.unshift(copy);
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 201, { project: copy });
  }
  if (method === "DELETE") {
    const [project] = workspace.projects.splice(index, 1);
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 200, { project });
  }
  return sendJson(response, 405, { ok: false, message: "Method not allowed" });
}

async function handleAssets(method, request, response, context) {
  const workspace = await getWorkspace(context.user.id);
  if (method === "GET") return sendJson(response, 200, { assets: workspace.assets });
  if (method === "POST") {
    const body = await readJson(request);
    const kind = body.kind || "characters";
    workspace.assets[kind] ||= [];
    const asset = {
      title: body.title || "新素材",
      meta: body.meta || "用户上传 / 后端保存",
      color: body.color || "#54bce6",
      image: body.image || ""
    };
    workspace.assets[kind].unshift(asset);
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 201, { asset, assets: workspace.assets });
  }
  return sendJson(response, 405, { ok: false, message: "Method not allowed" });
}

async function handleTeam(method, segments, request, response, context) {
  const workspace = await getWorkspace(context.user.id);
  if (segments[1] === "members") {
    if (method === "GET") return sendJson(response, 200, { members: workspace.members });
    if (method === "POST") {
      const body = await readJson(request);
      const member = { id: randomUUID(), name: body.name || "New Member", role: body.role || "成员", state: "待接受" };
      workspace.members.push(member);
      await updateWorkspace(context.user.id, workspace);
      return sendJson(response, 201, { member });
    }
  }
  if (segments[1] === "comments") {
    if (method === "GET") return sendJson(response, 200, { comments: workspace.comments });
    if (method === "POST") {
      const body = await readJson(request);
      const comment = { id: randomUUID(), author: body.author || context.user.name || "我", body: String(body.body || "").trim(), createdAt: nowIso() };
      if (!comment.body) return sendJson(response, 400, { ok: false, message: "Comment body is required" });
      workspace.comments.unshift(comment);
      await updateWorkspace(context.user.id, workspace);
      return sendJson(response, 201, { comment, comments: workspace.comments });
    }
  }
  return sendJson(response, 404, { ok: false, message: "Unknown team endpoint" });
}

async function handleQueue(method, segments, request, response, context) {
  const workspace = await getWorkspace(context.user.id);
  const id = segments[1];
  if (method === "GET") return sendJson(response, 200, { queue: workspace.generationQueue });
  if (method === "POST") {
    const body = await readJson(request);
    const task = { id: body.id || `q${Date.now()}`, type: body.type || "视频", title: body.title || "生成任务", state: body.state || "排队中", progress: Number(body.progress || 0), cost: Number(body.cost || 30) };
    workspace.generationQueue.unshift(task);
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 201, { task });
  }
  if (method === "DELETE" && id === "finished") {
    workspace.generationQueue = workspace.generationQueue.filter(item => item.state !== "已完成");
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 200, { queue: workspace.generationQueue });
  }
  const index = byId(workspace.generationQueue, id);
  if (index < 0) return sendJson(response, 404, { ok: false, message: "Task not found" });
  if (method === "PATCH") {
    const body = await readJson(request);
    workspace.generationQueue[index] = { ...workspace.generationQueue[index], ...body };
    await updateWorkspace(context.user.id, workspace);
    return sendJson(response, 200, { task: workspace.generationQueue[index] });
  }
  return sendJson(response, 405, { ok: false, message: "Method not allowed" });
}

async function handleBilling(method, segments, request, response, context) {
  if (method !== "POST") return sendJson(response, 405, { ok: false, message: "Method not allowed" });
  const body = await readJson(request);
  const workspace = await getWorkspace(context.user.id);
  if (segments[1] === "top-up") {
    const amount = Math.max(1, Number(body.amount || 2000));
    workspace.credits += amount;
    workspace.usageLedger.unshift(["充值", `+${amount}`, body.memo || "后端充值"]);
  } else if (segments[1] === "upgrade") {
    const cost = Math.max(0, Number(body.cost || 199));
    workspace.credits = Math.max(0, workspace.credits - cost);
    workspace.plan = body.plan || "专业会员";
    workspace.usageLedger.unshift(["会员升级", `-${cost}`, workspace.plan]);
  } else {
    return sendJson(response, 404, { ok: false, message: "Unknown billing endpoint" });
  }
  const next = await updateWorkspace(context.user.id, workspace);
  return sendJson(response, 200, { workspace: next });
}

async function handleGenerate(method, request, response, context) {
  if (method !== "POST") return sendJson(response, 405, { ok: false, message: "Method not allowed" });
  const body = await readJson(request);
  const workspace = await getWorkspace(context.user.id);
  const type = body.type || "video";
  const defaultCost = type === "video" ? 120 : type === "story" ? 80 : type === "text" ? 30 : 30;
  const cost = Number.isFinite(Number(body.cost)) ? Math.max(0, Number(body.cost)) : defaultCost;
  const title = body.title || (type === "video" ? "生成视频" : type === "story" ? "故事策划" : type === "text" ? "脚本节点" : "生成图片");
  const taskType = type === "video" ? "视频" : type === "story" ? "策划" : type === "text" ? "文本" : "图片";
  const task = { id: `q${Date.now()}`, type: taskType, title, state: "已完成", progress: 100, cost };
  const result = { type: task.type, title: `${title} ${workspace.generationResults.length + 1}`, meta: "后端生成任务 · 已保存" };
  workspace.generationQueue.unshift(task);
  workspace.generationResults.unshift(result);
  workspace.usageLedger.unshift([task.type, `-${cost}`, title]);
  workspace.credits = Math.max(0, workspace.credits - cost);
  const next = await updateWorkspace(context.user.id, workspace);
  return sendJson(response, 201, { task, result, workspace: next });
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const resource = segments[0] || "health";
  if (resource === "health") return sendJson(response, 200, { ok: true, service: "yuyu-backend", time: nowIso() });
  if (resource === "auth") return handleAuth(request.method, segments, request, response);
  if (resource === "bootstrap") {
    const context = await getSessionUser(readToken(request));
    return sendJson(response, 200, {
      ok: true,
      user: publicUser(context?.user),
      workspace: context?.user ? await getWorkspace(context.user.id) : null
    });
  }

  const context = await requireAuth(request);
  if (resource === "workspace") return handleWorkspace(request.method, request, response, context);
  if (resource === "projects") return handleProjects(request.method, segments, request, response, context);
  if (resource === "assets") return handleAssets(request.method, request, response, context);
  if (resource === "team") return handleTeam(request.method, segments, request, response, context);
  if (resource === "queue") return handleQueue(request.method, segments, request, response, context);
  if (resource === "billing") return handleBilling(request.method, segments, request, response, context);
  if (resource === "generate") return handleGenerate(request.method, request, response, context);
  if (resource === "account") {
    return sendJson(response, 200, { user: publicUser(context.user), workspace: await getWorkspace(context.user.id) });
  }
  return sendJson(response, 404, { ok: false, message: "Unknown API endpoint" });
}

async function serveStatic(request, response, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const target = path.resolve(root, `.${pathname.replaceAll("/", path.sep)}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw Object.assign(new Error("Not found"), { code: "ENOENT" });
    response.writeHead(200, {
      "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size
    });
    if (request.method === "HEAD") return response.end();
    createReadStream(target).pipe(response);
  } catch (error) {
    if (error.code === "ENOENT" && request.method === "GET" && !path.extname(pathname)) {
      createReadStream(path.join(root, "index.html")).pipe(response.writeHead(200, { "Content-Type": mime[".html"] }));
      return;
    }
    response.writeHead(error.code === "ENOENT" ? 404 : 500);
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
}

export async function createYuyuServer() {
  await ensureDemoUser();
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    try {
      if (url.pathname.startsWith("/api/") || url.pathname === "/api") {
        await handleApi(request, response, url);
        return;
      }
      await serveStatic(request, response, url);
    } catch (error) {
      sendJson(response, error.status || 500, { ok: false, message: error.message || "Internal server error" });
    }
  });
}

export async function startServer(port = defaultPort) {
  const server = await createYuyuServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.log(`YUYU backend listening on http://127.0.0.1:${port}/`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === serverFile) {
  startServer().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
