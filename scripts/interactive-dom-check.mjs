import { mkdir, rm, writeFile } from "node:fs/promises";
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
  queueText: document.querySelector("#queueList")?.innerText || "",
  queueActions: document.querySelectorAll("[data-queue-action]").length,
  assetDetailTitle: document.querySelector("#assetDetailPanel h2")?.textContent || "",
  planCards: document.querySelectorAll(".plan-card").length,
  canvasHidden: document.querySelector("#canvasStudio")?.hidden,
  canvasNodes: document.querySelectorAll(".canvas-node").length,
  selectedNodeText: document.querySelector(".canvas-node.selected span")?.textContent || "",
  nodeInspectorTitle: document.querySelector("#nodeInspector h2")?.textContent || "",
  generatePanelHidden: document.querySelector("#generatePanel")?.hidden,
  activeCanvasTool: document.querySelector("[data-canvas-tool].active")?.dataset.canvasTool || "",
  activeGeneratorTab: document.querySelector("[data-generator-tab].active")?.dataset.generatorTab || "",
  activeGeneratorPreset: document.querySelector("[data-generator-preset].active")?.dataset.generatorPreset || "",
  generatorPrompt: document.querySelector("#generatorPrompt")?.value || "",
  activeGeneratorSettings: [...document.querySelectorAll("[data-generator-setting].active")].map(item => item.dataset.generatorSetting + ":" + (item.dataset.settingValue || item.textContent.trim())),
  panoramaChecked: document.querySelector("#panoramaToggle")?.checked || false,
  generationHistoryItems: document.querySelectorAll("#generationHistory [data-result]").length,
  editorHidden: document.querySelector("#editorPanel")?.hidden,
  shotCount: document.querySelectorAll("[data-shot]").length,
  canvasView: document.querySelector("[data-canvas-view].active")?.dataset.canvasView || "",
  graphView: document.querySelector(".graph-surface")?.dataset.canvasView || "",
  canvasTransform: document.querySelector("#canvasPlane")?.style.transform || "",
  zoomLabel: document.querySelector("#zoomLabel")?.textContent || "",
  bottomZoomLabel: document.querySelector("#bottomZoomLabel")?.textContent || ""
}))()`;

async function click(cdp, selector) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
    el.click();
  })()`);
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

async function dragCanvasSurface(cdp) {
  const result = await evaluate(cdp, `(() => {
    const surface = document.querySelector("#canvasSurface");
    const plane = document.querySelector("#canvasPlane");
    const before = plane.style.transform;
    const base = { bubbles: true, pointerId: 42, pointerType: "mouse", button: 0, buttons: 1 };
    surface.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: 400, clientY: 240 }));
    surface.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: 460, clientY: 276 }));
    surface.dispatchEvent(new PointerEvent("pointerup", { ...base, clientX: 460, clientY: 276, buttons: 0 }));
    return { before, after: plane.style.transform };
  })()`);
  await delay(120);
  return result;
}

async function getRectOverlap(cdp, firstSelector, secondSelector) {
  return evaluate(cdp, `(() => {
    const rectOf = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const first = rectOf(${JSON.stringify(firstSelector)});
    const second = rectOf(${JSON.stringify(secondSelector)});
    const overlaps = Boolean(first && second && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top);
    return { first, second, overlaps };
  })()`);
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

  await click(cdp, "#promptPrefix");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeCategory === "comic" && state.promptPrefix.includes("漫剧"), "Prompt prefix button did not cycle category", state);
  await click(cdp, "[data-category='overseas']");

  await click(cdp, "[data-tool='upload']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeTool === "upload" && state.toolPanelHidden === false, "Upload panel did not open", state);
  const uploadPanelLayout = await getRectOverlap(cdp, "#toolPanel", ".category-tabs");
  assertCheck(!uploadPanelLayout.overlaps, "Upload tool panel overlaps category tabs", uploadPanelLayout);

  await click(cdp, "[data-chip='上传图片']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.promptValue.includes("上传图片"), "Chip did not append to prompt", state);

  await click(cdp, "[data-action='model']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("模型"), "Model modal did not open", state);
  await click(cdp, "#modalBody .option-grid button:nth-child(3)");
  const selectedModelOption = await evaluate(cdp, `document.querySelector("#modalBody .option-grid button.selected")?.textContent || ""`);
  assertCheck(selectedModelOption.includes("高清"), "Model option button did not become selected", { selectedModelOption });
  await click(cdp, "[data-action='close-modal']");

  await click(cdp, "[data-action='more']");
  await click(cdp, "[data-modal-shortcut='billing']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("充值"), "More billing shortcut failed", state);
  await click(cdp, "[data-action='close-modal']");
  await click(cdp, "[data-action='more']");
  await click(cdp, "[data-modal-shortcut='archive']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("归档"), "More archive shortcut failed", state);
  await click(cdp, "[data-action='close-modal']");
  await click(cdp, "[data-action='more']");
  await click(cdp, "[data-modal-shortcut='help']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(!state.modalHidden && state.modalTitle.includes("快捷键"), "More help shortcut failed", state);
  await click(cdp, "[data-action='close-modal']");
  await click(cdp, "[data-action='more']");
  await click(cdp, "[data-modal-shortcut='queue']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueHidden === false && state.queueItems >= 3, "More queue shortcut failed", state);
  await click(cdp, "[data-action='close-queue']");

  await click(cdp, "[data-action='open-queue']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueHidden === false && state.queueItems >= 3 && state.queueActions >= state.queueItems * 2, "Queue drawer did not expose item controls", state);
  const queueItemsBeforeRemove = state.queueItems;
  await click(cdp, "[data-queue-action='pause']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueText.includes("已暂停"), "Queue item pause failed", state);
  await click(cdp, "[data-queue-action='resume']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueText.includes("排队中"), "Queue item resume failed", state);
  await click(cdp, "[data-queue-action='remove']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.queueItems === queueItemsBeforeRemove - 1, "Queue item remove failed", state);
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

  await click(cdp, "[data-doc-mode='editor']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasHidden === false && state.editorHidden === false, "Document editor mode button failed", state);
  await click(cdp, "[data-action='close-canvas']");
  await click(cdp, "[data-action='open-script']");
  await click(cdp, "[data-doc-mode='canvas']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasHidden === false && state.canvasNodes >= 10 && state.zoomLabel === "33%" && state.nodeInspectorTitle.length > 0, "Canvas did not open", state);

  const dragState = await dragSelectedNode(cdp);
  assertCheck(dragState.before !== dragState.after, "Canvas node drag did not change x position", dragState);

  const zoomBefore = state.zoomLabel;
  await click(cdp, "[data-canvas-action='zoom-in']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.zoomLabel !== zoomBefore && state.bottomZoomLabel === state.zoomLabel, "Canvas zoom did not update both labels", state);

  await click(cdp, "[data-canvas-tool='asset']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeCanvasTool === "asset" && state.generatePanelHidden === false && state.generatorPrompt.includes("核心资产"), "Canvas asset tool did not prepare generator prompt", state);
  await click(cdp, "[data-canvas-view='grid']");

  await click(cdp, "[data-canvas-action='open-generate']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.generatePanelHidden === false && state.activeGeneratorTab === "image" && state.generationHistoryItems >= 3, "Generate panel did not open", state);
  await click(cdp, "[data-generator-preset='grid']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeGeneratorPreset === "grid" && state.generatorPrompt.includes("九宫格"), "Generator grid preset failed", state);
  await click(cdp, "[data-generator-preset='hd']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeGeneratorPreset === "hd" && state.generatorPrompt.includes("超清"), "Generator HD preset failed", state);
  await click(cdp, "#generationHistory [data-result]");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.generatorPrompt.includes("继续优化"), "Generation history did not load into prompt", state);
  await click(cdp, "[data-generator-tab='video']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.activeGeneratorTab === "video" && state.generatorPrompt.includes("6 秒视频"), "Generator tab switch failed", state);
  await click(cdp, "[data-generator-setting='mention']");
  await click(cdp, "#panoramaToggle");
  await click(cdp, "[data-generator-setting='boost']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.panoramaChecked && state.generatorPrompt.includes("@") && state.generatorPrompt.includes("720° 全景") && state.generatorPrompt.includes("+5"), "Generator settings did not update prompt/state", state);
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

  await click(cdp, "[data-canvas-view='outline']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasView === "outline" && state.graphView === "outline" && state.editorHidden === false, "Canvas outline view failed", state);
  await click(cdp, "[data-canvas-view='map']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasView === "map" && state.graphView === "map", "Canvas map view failed", state);
  await click(cdp, "[data-canvas-view='hand']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasView === "hand" && state.graphView === "hand", "Canvas hand view failed", state);
  const panState = await dragCanvasSurface(cdp);
  assertCheck(panState.before !== panState.after && panState.after.includes("translate"), "Canvas hand pan did not move graph plane", panState);
  await click(cdp, "[data-canvas-view='grid']");
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.canvasView === "grid" && state.graphView === "grid", "Canvas grid view failed", state);

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
  state = await evaluate(cdp, snapshotExpression);
  assertCheck(state.modalHidden === true, "Plans modal did not close", state);

  const result = {
    ok: true,
    url,
    checks: {
      exploreTools: true,
      categoryAndTemplate: true,
      generationWorkflow: true,
      queueAndProjectDetail: true,
      queueItemControls: true,
      storyLibrary: true,
      scriptPlanning: true,
      canvasGraphAndGenerator: true,
      canvasToolAndPan: true,
      generatorPresets: true,
      generationHistoryAndInspector: true,
      editorPreviewExport: true,
      assetsTeamAccount: true,
      membershipPanels: true
    },
    dragState,
    panState,
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
  await closeBrowser(cdp);
  await stopProcess(chromeProcess);
  await stopProcess(server);
  await removeWithRetry(profileDir);
}
