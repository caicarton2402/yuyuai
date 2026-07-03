import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCheck,
  delay,
  evaluate,
  findFreePort,
  launchChrome,
  removeWithRetry,
  startStaticServer,
  stopProcess,
  waitForCondition
} from "./browser-helpers.mjs";

const root = process.cwd();
const qaDir = path.join(root, ".qa");
const profileDir = path.join(os.tmpdir(), `yuyu-interactive-profile-${process.pid}`);

await mkdir(qaDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

const snapshotExpression = `(() => ({
  activeView: document.querySelector(".view.active")?.dataset.view || "",
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
  modalHidden: document.querySelector("#modalLayer")?.hidden,
  modalTitle: document.querySelector("#modalTitle")?.textContent || "",
  projectCount: document.querySelectorAll(".project-card").length,
  assetTab: document.querySelector("[data-asset-tab].active")?.dataset.assetTab || "",
  selectedAsset: document.querySelector(".asset-card.selected")?.dataset.asset || "",
  commentText: document.querySelector("#commentFeed")?.innerText || "",
  credits: Number(document.querySelector("#creditCount")?.textContent || 0),
  canvasHidden: document.querySelector("#canvasStudio")?.hidden,
  canvasNodes: document.querySelectorAll(".canvas-node").length,
  selectedNodeTitle: document.querySelector(".canvas-node.selected strong")?.textContent || "",
  zoomLabel: document.querySelector("#zoomLabel")?.textContent || "",
  toastVisible: document.querySelector("#toast")?.classList.contains("show") || false
}))()`;

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(120);
}

async function typeValue(cdp, selector, value) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await delay(80);
}

async function dragSelectedNode(cdp) {
  const rect = await evaluate(cdp, `(() => {
    const node = document.querySelector(".canvas-node.selected");
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, before: node.style.getPropertyValue("--x") };
  })()`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + 64, y: rect.y + 34, button: "left" });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + 64, y: rect.y + 34, button: "left", clickCount: 1 });
  await delay(140);
  const after = await evaluate(cdp, `document.querySelector(".canvas-node.selected").style.getPropertyValue("--x")`);
  return { before: rect.before, after };
}

const serverPort = Number(process.env.YUYU_INTERACTIVE_QA_PORT || await findFreePort(5190));
const debugPort = Number(process.env.YUYU_CDP_PORT || await findFreePort(9290));
const url = `http://127.0.0.1:${serverPort}/`;

let server;
let readServerOutput = () => ({ stdout: "", stderr: "" });
let chromeProcess;
let readChromeOutput = () => ({ stdout: "", stderr: "" });
let cdp;

try {
  ({ server, readServerOutput } = await startStaticServer(serverPort));
  ({ chromeProcess, readChromeOutput, cdp } = await launchChrome(debugPort, profileDir, "1920,863"));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 863,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url });
  await waitForCondition(cdp, `document.readyState === "complete"`);
  await waitForCondition(cdp, `[...document.images].every(img => img.complete && img.naturalWidth > 0)`);

  const initial = await evaluate(cdp, snapshotExpression);
  assertCheck(initial.activeView === "explore", "Expected explore view by default", initial);
  assertCheck(initial.activeCategory === "overseas" && initial.templateCount === 2, "Default category/template state is wrong", initial);

  await click(cdp, "[data-tool='upload']");
  const afterUpload = await evaluate(cdp, snapshotExpression);
  assertCheck(afterUpload.activeTool === "upload" && afterUpload.toolPanelHidden === false, "Upload panel did not open", afterUpload);

  await click(cdp, "[data-chip='上传图片']");
  const afterChip = await evaluate(cdp, snapshotExpression);
  assertCheck(afterChip.promptValue.includes("上传图片"), "Chip did not append to prompt", afterChip);

  await click(cdp, "[data-action='model']");
  let state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("模型"), "Model modal did not open", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-category='comic']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeCategory === "comic" && state.promptPrefix.includes("漫剧"), "Category switch failed", state);
  await click(cdp, "[data-template]");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.selectedTemplate && state.workspaceHidden === false && state.promptValue.length > 10, "Template selection failed", state);

  const creditsBeforeGenerate = state.credits;
  await click(cdp, "#sendBtn");
  await delay(1900);
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.workspaceHidden === false && state.credits === creditsBeforeGenerate - 80, "Generation workflow did not complete", state);

  await click(cdp, "[data-route='projects']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "projects" && state.projectCount >= 4, "Projects route did not render", state);
  await click(cdp, "[data-action='new-project']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.projectCount >= 5, "New project action failed", state);
  await typeValue(cdp, "#projectSearch", "MV");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.projectCount >= 1, "Project search removed all expected projects", state);
  await click(cdp, "[data-project-action='export']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("导出"), "Project export modal did not open", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-route='assets']");
  await click(cdp, "[data-asset-tab='scenes']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "assets" && state.assetTab === "scenes" && state.selectedAsset, "Asset tab switch failed", state);
  await click(cdp, ".asset-card:nth-child(2)");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.selectedAsset.length > 0, "Asset selection failed", state);
  await click(cdp, "[data-action='use-selected-asset']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.workspaceHidden === false && state.workspaceTitle.includes("资产"), "Add asset to project failed", state);

  await click(cdp, "[data-route='team']");
  await typeValue(cdp, "#commentInput", "测试评论");
  await click(cdp, "[data-action='add-comment']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "team" && state.commentText.includes("测试评论"), "Team comment failed", state);
  await click(cdp, "[data-action='invite']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("邀请"), "Invite modal failed", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-route='account']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "account" && state.credits > 0, "Account route failed", state);

  await click(cdp, "[data-route='projects']");
  await click(cdp, "[data-action='open-canvas']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasHidden === false && state.canvasNodes === 4, "Canvas did not open", state);

  await click(cdp, "[data-canvas-action='add-node']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasNodes === 5 && state.selectedNodeTitle.includes("创作节点"), "Add canvas node failed", state);

  const dragState = await dragSelectedNode(cdp);
  assertCheck(dragState.before !== dragState.after, "Canvas node drag did not change x position", dragState);

  await click(cdp, "[data-canvas-action='zoom-in']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.zoomLabel === "110%", "Canvas zoom did not update", state);

  await typeValue(cdp, "#nodeNameInput", "测试节点");
  await click(cdp, "[data-canvas-action='apply-node']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.selectedNodeTitle === "测试节点", "Inspector did not apply node title", state);

  await click(cdp, "[data-canvas-action='preview']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("预览"), "Preview modal failed", state);
  await click(cdp, "[data-action='close-modal']");

  const creditsBeforeExport = state.credits;
  await click(cdp, "[data-canvas-action='export']");
  await click(cdp, "[data-modal-action='export-confirm']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.modalHidden && state.credits === creditsBeforeExport - 20, "Export confirmation did not update credits", state);

  const result = {
    ok: true,
    url,
    checks: {
      exploreTools: true,
      modelModal: true,
      categoryAndTemplate: true,
      generationWorkflow: true,
      projects: true,
      assets: true,
      team: true,
      account: true,
      canvasAddDragZoomEditPreviewExport: true
    },
    dragState,
    finalState: state
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
