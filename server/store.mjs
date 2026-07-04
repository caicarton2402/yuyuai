import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cloneDefaultWorkspace } from "./default-data.mjs";

const scrypt = promisify(scryptCallback);
const root = process.cwd();
const dataDir = process.env.YUYU_DATA_DIR || path.join(root, "data");
const dbPath = process.env.YUYU_DB_PATH || path.join(dataDir, "db.json");
const tmpPath = `${dbPath}.tmp`;

let dbCache;
let writeQueue = Promise.resolve();

export function nowIso() {
  return new Date().toISOString();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    credits: user.credits,
    createdAt: user.createdAt
  };
}

export function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const key = await scrypt(password, salt, 64);
  return { salt, hash: key.toString("hex") };
}

export async function verifyPassword(password, salt, expectedHash) {
  const { hash } = await hashPassword(password, salt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(expectedHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function loadDb() {
  if (dbCache) return dbCache;
  await mkdir(dataDir, { recursive: true });
  try {
    dbCache = JSON.parse(await readFile(dbPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    dbCache = { version: 1, users: [], sessions: [], workspaces: {} };
    await saveDb();
  }
  dbCache.users ||= [];
  dbCache.sessions ||= [];
  dbCache.workspaces ||= {};
  return dbCache;
}

export async function saveDb() {
  if (!dbCache) return;
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    await writeFile(tmpPath, `${JSON.stringify(dbCache, null, 2)}\n`, "utf8");
    await rename(tmpPath, dbPath);
  });
  return writeQueue;
}

export async function mutateDb(mutator) {
  const db = await loadDb();
  const result = await mutator(db);
  await saveDb();
  return result;
}

export function findUserByEmail(db, email) {
  return db.users.find(user => user.email.toLowerCase() === String(email).trim().toLowerCase());
}

export async function createUser({ email, name, password }) {
  return mutateDb(async db => {
    if (findUserByEmail(db, email)) {
      const error = new Error("Email already registered");
      error.status = 409;
      throw error;
    }
    const passwordRecord = await hashPassword(password);
    const user = {
      id: randomUUID(),
      email: String(email).trim().toLowerCase(),
      name: String(name || email).trim(),
      role: "owner",
      plan: "标准会员",
      credits: 5083,
      passwordSalt: passwordRecord.salt,
      passwordHash: passwordRecord.hash,
      createdAt: nowIso()
    };
    db.users.push(user);
    db.workspaces[user.id] = normalizeWorkspace(cloneDefaultWorkspace());
    return user;
  });
}

export async function createSession(userId, userAgent = "") {
  const token = randomBytes(32).toString("base64url");
  const session = {
    id: randomUUID(),
    userId,
    tokenHash: tokenHash(token),
    userAgent: String(userAgent).slice(0, 240),
    createdAt: nowIso(),
    lastSeenAt: nowIso()
  };
  await mutateDb(db => {
    db.sessions.push(session);
    return session;
  });
  return { token, session };
}

export async function getSessionUser(token) {
  if (!token) return null;
  return mutateDb(db => {
    const hash = tokenHash(token);
    const session = db.sessions.find(item => item.tokenHash === hash);
    if (!session) return null;
    const user = db.users.find(item => item.id === session.userId);
    if (!user) return null;
    session.lastSeenAt = nowIso();
    return { user, session };
  });
}

export async function deleteSession(token) {
  if (!token) return false;
  return mutateDb(db => {
    const hash = tokenHash(token);
    const before = db.sessions.length;
    db.sessions = db.sessions.filter(item => item.tokenHash !== hash);
    return db.sessions.length !== before;
  });
}

export async function ensureDemoUser() {
  const db = await loadDb();
  if (findUserByEmail(db, "demo@yuyu.ai")) return;
  await createUser({ email: "demo@yuyu.ai", name: "YUYU Demo", password: "Yuyu123456" });
}

export function normalizeWorkspace(workspace = {}) {
  const fallback = cloneDefaultWorkspace();
  return {
    credits: Number.isFinite(Number(workspace.credits)) ? Number(workspace.credits) : fallback.credits,
    plan: workspace.plan || fallback.plan,
    seatLimit: Number.isFinite(Number(workspace.seatLimit)) ? Number(workspace.seatLimit) : fallback.seatLimit,
    projects: Array.isArray(workspace.projects) ? workspace.projects : fallback.projects,
    assets: workspace.assets && typeof workspace.assets === "object" ? workspace.assets : fallback.assets,
    plannerMessages: Array.isArray(workspace.plannerMessages) ? workspace.plannerMessages : fallback.plannerMessages,
    scriptSections: Array.isArray(workspace.scriptSections) ? workspace.scriptSections : fallback.scriptSections,
    members: Array.isArray(workspace.members) ? workspace.members : fallback.members,
    comments: Array.isArray(workspace.comments) ? workspace.comments : fallback.comments,
    usageLedger: Array.isArray(workspace.usageLedger) ? workspace.usageLedger : fallback.usageLedger,
    generationQueue: Array.isArray(workspace.generationQueue) ? workspace.generationQueue : fallback.generationQueue,
    generationResults: Array.isArray(workspace.generationResults) ? workspace.generationResults : fallback.generationResults,
    updatedAt: nowIso()
  };
}

export async function getWorkspace(userId) {
  return mutateDb(db => {
    db.workspaces[userId] = normalizeWorkspace(db.workspaces[userId]);
    return structuredClone(db.workspaces[userId]);
  });
}

export async function updateWorkspace(userId, patch) {
  return mutateDb(db => {
    db.workspaces[userId] = normalizeWorkspace({ ...db.workspaces[userId], ...patch, updatedAt: nowIso() });
    const user = db.users.find(item => item.id === userId);
    if (user) {
      user.credits = db.workspaces[userId].credits;
      user.plan = db.workspaces[userId].plan;
    }
    return structuredClone(db.workspaces[userId]);
  });
}
