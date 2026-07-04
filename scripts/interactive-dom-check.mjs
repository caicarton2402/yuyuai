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
  activeCategory: document.querySelector("[data-category].active")?.dataset.category || "",
  promptPrefix: document.querySelector("#promptPrefix")?.textContent || "",
  promptValue: document.querySelector("#promptInput")?.value || "",
  templateCount: document.querySelectorAll("[data-template]").length,
  selectedTemplate: document.querySelector("[data-template].selected")?.dataset.template || "",
  workspaceHidden: document.querySelector("#workspacePanel")?.hidden,
  workspaceTitle: document.querySelector("#workspaceTitle")?.textContent || "",
  modalHidden: document.querySelector("#modalLayer")?.hidden,
  modalTitle: document.querySelector("#modalTitle")?.textContent || "",
  libraryTab: document.querySelector("[data-library-tab].active")?.dataset.libraryTab || "",
  storyFilter: document.querySelector("[data-story-filter].active")?.dataset.storyFilter || "",
  storyCount: document.querySelectorAll(".story-card").length,
  plannerMessages: document.querySelectorAll(".planner-message").length,
  plannerText: document.querySelector("#plannerChat")?.innerText || "",
  scriptText: document.querySelector("#scriptDocument")?.innerText || "",
  assetTab: document.querySelector("[data-asset-tab].active")?.dataset.assetTab || "",
  selectedAsset: document.querySelector(".asset-card.selected")?.dataset.asset || "",
  commentText: document.querySelector("#commentFeed")?.innerText || "",
  credits: Number(document.querySelector("#creditCount")?.textContent || 0),
  queueHidden: document.querySelector("#queueDrawer")?.hidden,
  queueItems: document.querySelectorAll(".queue-item").length,
  assetDetailTitle: document.querySelector("#assetDetailPanel h2")?.textContent || "",
  planCards: document.querySelectorAll(".plan-card").length,
  canvasHidden: document.querySelector("#canvasStudio")?.hidden,
  canvasNodes: document.querySelectorAll(".canvas-node").length,
  selectedNodeText: document.querySelector(".canvas-node.selected span")?.textContent || "",
  nodeInspectorTitle: document.querySelector("#nodeInspector h2")?.textContent || "",
  generatePanelHidden: document.querySelector("#generatePanel")?.hidden,
  activeGeneratorTab: document.querySelector("[data-generator-tab].active")?.dataset.generatorTab || "",
  generatorPrompt: document.querySelector("#generatorPrompt")?.value || "",
  generationHistoryItems: document.querySelectorAll("#generationHistory [data-result]").length,
  editorHidden: document.querySelector("#editorPanel")?.hidden,
  shotCount: document.querySelectorAll("[data-shot]").length,
  zoomLabel: document.querySelector("#zoomLabel")?.textContent || "",
  bottomZoomLabel: document.querySelector("#bottomZoomLabel")?.textContent || ""
}))()`;

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(140);
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
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + 48, y: rect.y + 30, button: "left" });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + 48, y: rect.y + 30, button: "left", clickCount: 1 });
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

  let state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "explore", "Expected explore view by default", state);
  assertCheck(state.activeCategory === "overseas" && state.templateCount === 2, "Default category/template state is wrong", state);

  await click(cdp, "[data-tool='upload']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeTool === "upload" && state.toolPanelHidden === false, "Upload panel did not open", state);

  await click(cdp, "[data-chip='上传图片']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.promptValue.includes("上传图片"), "Chip did not append to prompt", state);

  await click(cdp, "[data-action='model']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("模型"), "Model modal did not open", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-action='open-queue']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueHidden === false && state.queueItems >= 3, "Queue drawer did not open", state);
  await click(cdp, "[data-action='close-queue']");

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
  assertCheck(state.activeView === "projects" && state.libraryTab === "story" && state.storyCount >= 4, "Story library route did not render", state);
  await click(cdp, "[data-project-action='detail']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.length > 2, "Project detail modal failed", state);
  await click(cdp, "[data-action='close-modal']");
  await click(cdp, "[data-story-filter='comic']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.storyFilter === "comic" && state.storyCount >= 1, "Story filter failed", state);
  await click(cdp, "[data-library-tab='digital']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.libraryTab === "digital" && state.storyCount >= 1, "Digital human tab failed", state);
  await click(cdp, "[data-action='new-project']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.libraryTab === "story" && state.storyCount >= 1, "New story action failed", state);

  await click(cdp, "[data-action='open-script']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "script" && state.plannerMessages >= 4 && state.scriptText.includes("剧本内容"), "Script planning view failed", state);
  await typeValue(cdp, "#plannerInput", "加入一个电梯门突然打开的笑点");
  await click(cdp, "[data-action='send-planner']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.plannerMessages >= 6 && state.scriptText.includes("新增策划要求"), "Planner send did not update chat/doc", state);
  await click(cdp, "[data-action='add-episode']");
  await click(cdp, "[data-episode='3']");

  await click(cdp, "[data-action='open-canvas']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasHidden === false && state.canvasNodes >= 10 && state.zoomLabel === "33%" && state.nodeInspectorTitle.length > 0, "Canvas did not open", state);

  const dragState = await dragSelectedNode(cdp);
  assertCheck(dragState.before !== dragState.after, "Canvas node drag did not change x position", dragState);

  const zoomBefore = state.zoomLabel;
  await click(cdp, "[data-canvas-action='zoom-in']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.zoomLabel !== zoomBefore && state.bottomZoomLabel === state.zoomLabel, "Canvas zoom did not update both labels", state);

  await click(cdp, "[data-canvas-action='open-generate']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.generatePanelHidden === false && state.activeGeneratorTab === "image" && state.generationHistoryItems >= 3, "Generate panel did not open", state);
  await click(cdp, "#generationHistory [data-result]");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.generatorPrompt.includes("继续优化"), "Generation history did not load into prompt", state);
  await click(cdp, "[data-generator-tab='video']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeGeneratorTab === "video" && state.generatorPrompt.includes("6 秒视频"), "Generator tab switch failed", state);
  const nodesBefore = state.canvasNodes;
  const creditsBeforeGenerator = state.credits;
  await click(cdp, "[data-action='run-generator']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasNodes === nodesBefore + 1 && state.credits === creditsBeforeGenerator - 120, "Run generator failed", state);

  await click(cdp, "[data-canvas-mode='editor']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.editorHidden === false && state.shotCount >= 4, "Editor mode failed", state);
  await click(cdp, "[data-action='render-preview']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("预览"), "Preview modal failed", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-canvas-action='export']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("导出"), "Canvas export modal failed", state);
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-action='close-canvas']");
  await click(cdp, "[data-route='assets']");
  await click(cdp, "[data-asset-tab='scenes']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "assets" && state.assetTab === "scenes" && state.selectedAsset && state.assetDetailTitle.length > 0, "Asset tab switch failed", state);
  await click(cdp, ".asset-card:nth-child(2)");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.selectedAsset.length > 0 && state.assetDetailTitle === state.selectedAsset, "Asset selection failed", state);

  await click(cdp, "[data-route='team']");
  await typeValue(cdp, "#commentInput", "测试评论");
  await click(cdp, "[data-action='add-comment']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "team" && state.commentText.includes("测试评论"), "Team comment failed", state);

  await click(cdp, "[data-route='account']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeView === "account" && state.credits > 0 && state.planCards >= 3, "Account route failed", state);
  await click(cdp, "[data-action='open-plans']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("会员"), "Plans modal failed", state);
  await click(cdp, "[data-action='close-modal']");

  const result = {
    ok: true,
    url,
    checks: {
      exploreTools: true,
      categoryAndTemplate: true,
      generationWorkflow: true,
      queueAndProjectDetail: true,
      storyLibrary: true,
      scriptPlanning: true,
      canvasGraphAndGenerator: true,
      generationHistoryAndInspector: true,
      editorPreviewExport: true,
      assetsTeamAccount: true,
      membershipPanels: true
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
