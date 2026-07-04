import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCheck,
  closeBrowser,
  delay,
  evaluate,
  findFreePort,
  launchChrome,
  removeWithRetry,
  spawnHidden,
  stopProcess,
  waitForCondition,
  waitForHttp
} from "./browser-helpers.mjs";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "yuyu-backend-ui-data-"));
const profileDir = path.join(os.tmpdir(), `yuyu-backend-ui-profile-${process.pid}`);
const serverPort = Number(process.env.YUYU_BACKEND_UI_PORT || await findFreePort(5360));
const debugPort = Number(process.env.YUYU_BACKEND_UI_CDP_PORT || await findFreePort(9560));
const url = `http://127.0.0.1:${serverPort}/`;
const commentText = `后端 UI 持久化 ${Date.now()}`;

function collect(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
  return () => ({ stdout, stderr });
}

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(160);
}

async function typeValue(cdp, selector, value) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
}

let server;
let readServerOutput = () => ({ stdout: "", stderr: "" });
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  await mkdir(qaDir, { recursive: true });
  await rm(profileDir, { recursive: true, force: true });
  server = spawnHidden(process.execPath, ["server/server.mjs"], {
    env: { ...process.env, PORT: String(serverPort), YUYU_DATA_DIR: dataDir }
  });
  readServerOutput = collect(server);
  await waitForHttp(`${url}api/health`, 12000);

  ({ chromeProcess, readChromeOutput, cdp } = await launchChrome(debugPort, profileDir, "1440,900"));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `document.querySelector("#backendStatus")?.textContent.includes("后端在线")`);

  await typeValue(cdp, "#authEmail", "demo@yuyu.ai");
  await typeValue(cdp, "#authPassword", "Yuyu123456");
  await click(cdp, "[data-action='auth-login']");
  await waitForCondition(cdp, `document.querySelector("#authUserSummary")?.textContent.includes("demo@yuyu.ai")`);

  await click(cdp, "[data-route='projects']");
  await click(cdp, "[data-action='new-project']");
  await waitForCondition(cdp, `[...document.querySelectorAll(".project-card h2")].some(item => item.textContent.includes("新的 YUYU 故事"))`);
  await click(cdp, "[data-project-action='duplicate']");
  await waitForCondition(cdp, `[...document.querySelectorAll(".project-card h2")].some(item => item.textContent.includes("副本"))`);

  await click(cdp, "[data-route='team']");
  await typeValue(cdp, "#commentInput", commentText);
  await click(cdp, "[data-action='add-comment']");
  await waitForCondition(cdp, `document.querySelector("#commentFeed")?.innerText.includes(${JSON.stringify(commentText)})`);

  const creditsBeforeBilling = await evaluate(cdp, `Number(document.querySelector("#creditCount")?.textContent || 0)`);
  await click(cdp, "[data-route='account']");
  await click(cdp, "[data-action='open-billing']");
  await waitForCondition(cdp, `document.querySelector("#modalTitle")?.textContent.includes("充值")`);
  await click(cdp, "[data-modal-action='top-up']");
  await waitForCondition(cdp, `Number(document.querySelector("#creditCount")?.textContent || 0) >= ${creditsBeforeBilling + 2000}`);
  await click(cdp, "[data-action='open-plans']");
  await waitForCondition(cdp, `document.querySelector("#modalTitle")?.textContent.includes("会员")`);
  await click(cdp, "[data-modal-action='upgrade-plan']");
  await waitForCondition(cdp, `document.querySelector("#planName")?.textContent.includes("专业会员")`);
  await delay(800);

  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `document.querySelector("#authUserSummary")?.textContent.includes("demo@yuyu.ai")`);
  await click(cdp, "[data-route='team']");
  const state = await evaluate(cdp, `(() => ({
    authSummary: document.querySelector("#authUserSummary")?.textContent || "",
    backendStatus: document.querySelector("#backendStatus")?.textContent || "",
    projectText: document.querySelector("#projectBoard")?.innerText || "",
    commentText: document.querySelector("#commentFeed")?.innerText || "",
    credits: Number(document.querySelector("#creditCount")?.textContent || 0),
    planName: document.querySelector("#planName")?.textContent || ""
  }))()`);
  assertCheck(state.projectText.includes("新的 YUYU 故事") && state.projectText.includes("副本"), "Backend UI project actions did not persist after reload", state);
  assertCheck(state.commentText.includes(commentText), "Backend UI comment did not persist after reload", state);
  assertCheck(state.planName.includes("专业会员") && state.credits >= creditsBeforeBilling + 1800, "Backend UI billing actions did not persist after reload", state);

  const result = { ok: true, url, commentText, state };
  await writeFile(path.join(qaDir, "backend-ui-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = {
    ok: false,
    message: error.message,
    details: error.details || null,
    server: readServerOutput(),
    chrome: readChromeOutput()
  };
  await writeFile(path.join(qaDir, "backend-ui-check.json"), JSON.stringify(result, null, 2), "utf8");
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await closeBrowser(cdp);
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
  await rm(dataDir, { recursive: true, force: true });
}
