const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const promptInput = $("#promptInput");
const promptPrefix = $("#promptPrefix");
const toolPanel = $("#toolPanel");
const templateGrid = $("#templateGrid");
const workspacePanel = $("#workspacePanel");
const workspaceTitle = $("#workspaceTitle");
const workspaceCopy = $("#workspaceCopy");
const workflowList = $("#workflowList");
const workflowProgress = $("#workflowProgress");
const modalLayer = $("#modalLayer");
const modalTitle = $("#modalTitle");
const modalKicker = $("#modalKicker");
const modalBody = $("#modalBody");
const modalActions = $("#modalActions");
const canvasStudio = $("#canvasStudio");
const canvasPlane = $("#canvasPlane");
const zoomLabel = $("#zoomLabel");
const toast = $("#toast");

const categories = {
  overseas: {
    prefix: "出海短剧 /",
    title: "出海短剧项目已创建",
    copy: "已按出海短剧结构拆解爽点、反转和多集节奏。",
    templates: [
      {
        id: "dialog",
        title: "对话剧情",
        image: "../public/assets/explore/template-dialog.png",
        prompt: "一位普通女孩误入豪门继承人争夺战，用三场高反转对话推进剧情。"
      },
      {
        id: "narration",
        title: "旁白解说",
        image: "../public/assets/explore/template-narration.png",
        prompt: "用旁白解说风格讲述女主被背叛后逆袭出海创业的短剧第一集。"
      }
    ]
  },
  comic: {
    prefix: "短剧漫剧 /",
    title: "漫剧项目已创建",
    copy: "已切换为漫画分镜与角色表情驱动的制作流程。",
    templates: [
      {
        id: "comic-dialog",
        title: "角色对白",
        image: "../public/assets/explore/template-narration.png",
        prompt: "制作一段都市奇幻漫剧，女主在雨夜发现自己能听见时间倒流的声音。"
      },
      {
        id: "comic-panel",
        title: "分格叙事",
        image: "../public/assets/explore/template-dialog.png",
        prompt: "把校园悬疑故事拆成 8 格漫画分镜，每格都有明确动作和情绪。"
      }
    ]
  },
  mv: {
    prefix: "音乐 MV /",
    title: "音乐 MV 项目已创建",
    copy: "已准备歌词段落、节拍点、画面风格和镜头转场。",
    templates: [
      {
        id: "mv-beat",
        title: "节拍剪辑",
        image: "../public/assets/explore/feature-grid.png",
        prompt: "为一首夏日流行歌生成九宫格节拍画面，明亮、轻快、镜头随鼓点切换。"
      },
      {
        id: "mv-cinematic",
        title: "电影感 MV",
        image: "../public/assets/explore/feature-panorama.png",
        prompt: "生成一支沙漠公路 MV，孤独旅人、漂浮岩石、黄金日落和慢动作运镜。"
      }
    ]
  },
  knowledge: {
    prefix: "知识分享 /",
    title: "知识视频项目已创建",
    copy: "已切换为脚本提纲、重点提炼和画面示意流程。",
    templates: [
      {
        id: "knowledge-list",
        title: "三段式讲解",
        image: "../public/assets/explore/feature-seedance.png",
        prompt: "用三段式结构解释 AI 视频生成的工作流：输入、规划、生成。"
      },
      {
        id: "knowledge-card",
        title: "知识卡片",
        image: "../public/assets/explore/feature-grid.png",
        prompt: "做一个 60 秒知识分享视频，解释如何把短剧创意扩展成连续剧集。"
      }
    ]
  }
};

const tools = {
  upload: {
    title: "上传参考素材",
    body: "支持图片、视频片段、角色设定和文档。素材会进入当前故事项目，作为角色、场景或镜头参考。",
    chips: ["上传图片", "上传视频", "导入脚本"],
    action: "upload-modal"
  },
  asset: {
    title: "角色和场景资产",
    body: "从角色、场景、道具三个维度组织内容，适合连续短剧和多集故事保持一致性。",
    chips: ["主角设定", "场景库", "道具清单"],
    action: "assets"
  },
  mention: {
    title: "引用角色",
    body: "在提示词中引用已有角色或协作成员，让生成流程保持相同人设和语气。",
    chips: ["@女主", "@反派", "@导演视角"],
    action: "mentions"
  },
  style: {
    title: "风格控制",
    body: "选择画面风格、镜头语言和色彩倾向。当前默认匹配短剧漫剧的高对比暗色氛围。",
    chips: ["写实短剧", "国漫质感", "赛博夜景"],
    action: "style"
  }
};

const projects = [
  { id: "p1", title: "出海短剧 EP01", type: "短剧", status: "生成中", progress: 68, updated: "刚刚", thumb: "feature-effects.png" },
  { id: "p2", title: "沙漠公路 MV", type: "音乐 MV", status: "草稿", progress: 24, updated: "12 分钟前", thumb: "feature-panorama.png" },
  { id: "p3", title: "AI 工作流知识分享", type: "知识视频", status: "可导出", progress: 100, updated: "今天", thumb: "feature-seedance.png" },
  { id: "p4", title: "九宫格旅行封面", type: "图像", status: "可导出", progress: 100, updated: "昨天", thumb: "feature-grid.png" }
];

const assets = {
  characters: [
    { title: "逆袭女主", meta: "写实 / 蓝白球衣", color: "#92b9ff" },
    { title: "冷面继承人", meta: "商务 / 夜景", color: "#b8e948" },
    { title: "旁白主持", meta: "知识分享", color: "#54bce6" }
  ],
  scenes: [
    { title: "豪门走廊", meta: "室内 / 暖光", color: "#c99665" },
    { title: "沙漠公路", meta: "外景 / 日落", color: "#f0b14c" },
    { title: "赛博街区", meta: "夜景 / 霓虹", color: "#7867dc" }
  ],
  props: [
    { title: "继承合同", meta: "剧情道具", color: "#e4e4e4" },
    { title: "复古巴士", meta: "移动场景", color: "#d3985b" },
    { title: "悬浮岩石", meta: "奇幻元素", color: "#c6a177" }
  ],
  styles: [
    { title: "写实短剧", meta: "高对比 / 近景", color: "#ff8f72" },
    { title: "国漫质感", meta: "线稿 / 分格", color: "#e46abd" },
    { title: "广告大片", meta: "慢镜 / 大光比", color: "#ffc33f" }
  ]
};

const members = [
  { name: "Yuyu", role: "Owner", state: "在线" },
  { name: "Director", role: "导演", state: "审阅中" },
  { name: "Writer", role: "编剧", state: "已交付" },
  { name: "Designer", role: "美术", state: "待反馈" }
];

const usageLedger = [
  ["视频生成", "-180", "出海短剧 EP01"],
  ["九宫格图", "-60", "旅行封面"],
  ["多剧集策划", "-40", "短剧漫剧"],
  ["会员补给", "+500", "标准会员"]
];

const featureDetails = {
  blank: ["空白画布", "从零开始搭建角色、场景、提示词和视频节点。"],
  effects: ["特效模板", "套用热门视觉特效模板，快速生成可复用片段。"],
  video: ["YUYU 视频生成", "使用全能模式把故事提示词扩展为视频生成任务。"],
  grid: ["九宫格图", "把同一个主题拆成九张可发布封面或分镜图。"],
  panorama: ["720° 全景图", "生成全景空间，用于奇幻、旅行和沉浸式场景。"]
};

let activeCategory = "overseas";
let activeAssetTab = "characters";
let credits = 5083;
let toastTimer = 0;
let generationTimer = 0;
let zoom = 1;
let activeCanvasTool = "select";
let selectedAsset = "逆袭女主";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setCredits(next) {
  credits = Math.max(0, next);
  $("#creditCount").textContent = String(credits);
  $("#accountCredits").textContent = String(credits);
}

function closeModal() {
  modalLayer.hidden = true;
}

function closeToolPanel() {
  toolPanel.hidden = true;
  $$("[data-tool]").forEach(button => button.setAttribute("aria-pressed", "false"));
}

function routeTo(name) {
  if (!$(`[data-view="${name}"]`)) return;
  $$(".view").forEach(view => view.classList.toggle("active", view.dataset.view === name));
  $$("[data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === name));
  canvasStudio.hidden = true;
  closeModal();
  closeToolPanel();
  if (name === "projects") renderProjects();
  if (name === "assets") renderAssets();
  if (name === "team") renderTeam();
  if (name === "account") renderAccount();
}

function renderTemplates() {
  const category = categories[activeCategory];
  promptPrefix.textContent = category.prefix;
  templateGrid.innerHTML = category.templates.map(item => `
    <button class="template-card" type="button" data-template="${item.id}" style="--template-image: url('${item.image}')">
      <span>${escapeHtml(item.title)}</span>
    </button>
  `).join("");
}

function openToolPanel(toolName) {
  const tool = tools[toolName];
  if (!tool) return;
  $$("[data-tool]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.tool === toolName));
  });
  toolPanel.hidden = false;
  toolPanel.innerHTML = `
    <strong>${escapeHtml(tool.title)}</strong>
    <p>${escapeHtml(tool.body)}</p>
    <div class="panel-chips">
      ${tool.chips.map(chip => `<button type="button" data-chip="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join("")}
    </div>
    <button class="panel-link" type="button" data-panel-action="${tool.action}">打开${escapeHtml(tool.title)}</button>
  `;
}

function selectCategory(nextCategory) {
  activeCategory = nextCategory;
  $$("[data-category]").forEach(button => {
    button.classList.toggle("active", button.dataset.category === nextCategory);
  });
  closeToolPanel();
  renderTemplates();
  showToast(`已切换到${categories[nextCategory].prefix.replace(" /", "")}`);
}

function selectTemplate(templateId) {
  const template = categories[activeCategory].templates.find(item => item.id === templateId);
  if (!template) return;
  promptInput.value = template.prompt;
  $$("[data-template]").forEach(card => {
    card.classList.toggle("selected", card.dataset.template === templateId);
  });
  showWorkspace(template.title, `已载入《${template.title}》模板，可继续生成故事策划。`, 1);
}

function renderWorkflow(step = 1) {
  const items = [
    ["故事策划", "题材、受众和冲突线"],
    ["角色资产", "主角、配角、服化道"],
    ["分镜生成", "镜头脚本和节奏"],
    ["视频成片", "预览、重生成和导出"]
  ];
  workflowList.innerHTML = items.map((item, index) => `
    <li class="${index < step ? "done" : ""}">
      <span>${index + 1}</span>
      <strong>${item[0]}</strong>
      <small>${item[1]}</small>
    </li>
  `).join("");
  workflowProgress.style.width = `${Math.min(step, 4) * 25}%`;
}

function showWorkspace(title = categories[activeCategory].title, copy = categories[activeCategory].copy, step = 1) {
  workspaceTitle.textContent = title;
  workspaceCopy.textContent = copy;
  renderWorkflow(step);
  workspacePanel.hidden = false;
  showToast("工作台已准备");
}

function startGeneration() {
  const text = promptInput.value.trim();
  showWorkspace(categories[activeCategory].title, text ? `已接收灵感：“${text}”` : categories[activeCategory].copy, 1);
  let step = 1;
  window.clearInterval(generationTimer);
  generationTimer = window.setInterval(() => {
    step += 1;
    renderWorkflow(step);
    if (step === 2) workspaceCopy.textContent = "正在抽取角色、场景和道具资产。";
    if (step === 3) workspaceCopy.textContent = "正在生成分镜脚本和镜头调度。";
    if (step >= 4) {
      workspaceCopy.textContent = "视频任务已进入预览阶段，可进入画布继续编辑。";
      setCredits(credits - 80);
      window.clearInterval(generationTimer);
    }
  }, 520);
}

function renderProjects() {
  const query = $("#projectSearch")?.value?.trim().toLowerCase() || "";
  const filtered = projects.filter(item => `${item.title}${item.type}${item.status}`.toLowerCase().includes(query));
  $("#projectBoard").innerHTML = filtered.map(project => `
    <article class="project-card" data-project="${project.id}">
      <div class="project-thumb" style="background-image:url('./public/assets/explore/${project.thumb}')"></div>
      <div class="project-meta"><span>${escapeHtml(project.type)}</span><em>${escapeHtml(project.updated)}</em></div>
      <h2>${escapeHtml(project.title)}</h2>
      <div class="status-line"><strong>${escapeHtml(project.status)}</strong><small>${project.progress}%</small></div>
      <div class="bar"><i style="width:${project.progress}%"></i></div>
      <div class="card-actions">
        <button type="button" data-project-action="continue">继续</button>
        <button type="button" data-project-action="duplicate">复制</button>
        <button type="button" data-project-action="export">导出</button>
      </div>
    </article>
  `).join("");
}

function renderAssets() {
  $$("[data-asset-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.assetTab === activeAssetTab);
  });
  const items = assets[activeAssetTab] || [];
  $("#assetGrid").innerHTML = items.map((asset, index) => `
    <button class="asset-card ${asset.title === selectedAsset || (!selectedAsset && index === 0) ? "selected" : ""}" type="button" data-asset="${escapeHtml(asset.title)}">
      <span class="asset-swatch" style="--swatch:${asset.color}"></span>
      <strong>${escapeHtml(asset.title)}</strong>
      <small>${escapeHtml(asset.meta)}</small>
    </button>
  `).join("");
}

function renderTeam() {
  $("#memberList").innerHTML = members.map(member => `
    <div class="member-row">
      <span>${escapeHtml(member.name.slice(0, 1))}</span>
      <strong>${escapeHtml(member.name)}</strong>
      <small>${escapeHtml(member.role)} · ${escapeHtml(member.state)}</small>
    </div>
  `).join("");
  if (!$("#commentFeed").dataset.rendered) {
    $("#commentFeed").innerHTML = [
      "导演：镜头 3 的反转需要更明确。",
      "编剧：已补充女主内心独白。",
      "美术：场景色调已统一为暖灰。"
    ].map(text => `<p>${text}</p>`).join("");
    $("#commentFeed").dataset.rendered = "true";
  }
}

function renderAccount() {
  $("#usageLedger").innerHTML = usageLedger.map(row => `
    <div class="ledger-row"><span>${row[0]}</span><strong>${row[1]}</strong><small>${row[2]}</small></div>
  `).join("");
}

function openModal(kind, data = {}) {
  const configs = {
    "upload-modal": {
      kicker: "Upload",
      title: "上传素材",
      body: `<div class="drop-zone"><strong>拖入文件或点击选择</strong><span>图片、视频、脚本、角色设定均可模拟导入</span></div><div class="modal-list"><p>已选择：角色参考.png</p><p>已选择：第一集脚本.docx</p></div>`,
      actions: [["导入到资产库", "confirm-upload"]]
    },
    model: {
      kicker: "Model",
      title: "模型与生成参数",
      body: `<div class="option-grid"><button class="selected">YUYU Video 2.0 全能模式</button><button>快速草稿</button><button>高清成片</button><button>图像序列</button></div><label class="range-row">创意强度<input type="range" value="72" /></label><label class="range-row">镜头稳定<input type="range" value="66" /></label>`,
      actions: [["应用参数", "apply-model"]]
    },
    notifications: {
      kicker: "Notifications",
      title: "通知中心",
      body: `<div class="modal-list"><p>出海短剧 EP01 已完成 68%</p><p>团队成员 Director 留下 1 条评论</p><p>720° 全景图已可预览</p></div>`,
      actions: [["全部标为已读", "mark-read"]]
    },
    export: {
      kicker: "Export",
      title: data.title || "导出项目",
      body: `<div class="option-grid"><button class="selected">MP4 1080P</button><button>分镜 PDF</button><button>素材包 ZIP</button><button>项目 JSON</button></div>`,
      actions: [["生成下载任务", "export-confirm"]]
    },
    preview: {
      kicker: "Preview",
      title: "视频预览",
      body: `<div class="preview-frame"><span>00:42</span><strong>YUYU Preview</strong><small>这里模拟视频播放、暂停和重生成。</small></div>`,
      actions: [["重新生成", "regen"], ["确认成片", "approve-preview"]]
    },
    invite: {
      kicker: "Team",
      title: "邀请成员",
      body: `<label class="modal-input">邮箱<input value="creator@yuyu.ai" /></label><label class="modal-input">权限<select><option>可编辑</option><option>仅评论</option><option>管理员</option></select></label>`,
      actions: [["发送邀请", "send-invite"]]
    },
    mentions: {
      kicker: "Mention",
      title: "引用角色",
      body: `<div class="option-grid"><button>@逆袭女主</button><button>@冷面继承人</button><button>@旁白主持</button><button>@导演视角</button></div>`,
      actions: [["加入提示词", "apply-mention"]]
    },
    style: {
      kicker: "Style",
      title: "风格控制",
      body: `<div class="option-grid"><button class="selected">写实短剧</button><button>国漫质感</button><button>广告大片</button><button>赛博夜景</button></div>`,
      actions: [["应用风格", "apply-style"]]
    }
  };
  const config = configs[kind] || configs.notifications;
  modalKicker.textContent = config.kicker;
  modalTitle.textContent = config.title;
  modalBody.innerHTML = config.body;
  modalActions.innerHTML = config.actions.map(([label, action]) => `<button class="primary-action compact" type="button" data-modal-action="${action}">${label}</button>`).join("");
  modalLayer.hidden = false;
}

function openCanvas() {
  closeModal();
  workspacePanel.hidden = true;
  $$(".view").forEach(view => view.classList.remove("active"));
  canvasStudio.hidden = false;
  setZoom(zoom);
}

function selectCanvasNode(node) {
  $$(".canvas-node").forEach(item => item.classList.toggle("selected", item === node));
  $("#inspector h2").textContent = node.querySelector("span").textContent;
  $("#nodeNameInput").value = node.querySelector("strong").textContent;
  $("#nodeCopyInput").value = node.querySelector("p").textContent;
}

function setZoom(nextZoom) {
  zoom = Math.min(1.5, Math.max(0.65, Math.round(nextZoom * 100) / 100));
  canvasPlane.style.transform = `scale(${zoom})`;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function resetCanvasLayout() {
  const positions = {
    prompt: ["120px", "118px"],
    character: ["108px", "358px"],
    shots: ["640px", "276px"],
    video: ["1098px", "458px"]
  };
  Object.entries(positions).forEach(([id, [x, y]]) => {
    const node = $(`.canvas-node[data-node-id="${id}"]`);
    if (!node) return;
    node.style.setProperty("--x", x);
    node.style.setProperty("--y", y);
  });
  setZoom(1);
}

function addCanvasNode() {
  const node = document.createElement("article");
  node.className = "canvas-node";
  node.dataset.nodeId = `node-${Date.now()}`;
  node.style.setProperty("--x", "420px");
  node.style.setProperty("--y", "120px");
  node.innerHTML = "<span>新节点</span><strong>创作节点</strong><p>可编辑、选择并加入流程。</p>";
  canvasPlane.appendChild(node);
  selectCanvasNode(node);
  showToast("节点已添加");
}

function handleAction(action) {
  if (action === "close-workspace") workspacePanel.hidden = true;
  if (action === "continue-workflow" || action === "open-canvas") openCanvas();
  if (action === "close-canvas") routeTo("explore");
  if (action === "model") openModal("model");
  if (action === "assistant") showToast("YUYU 助手已打开");
  if (action === "notifications") openModal("notifications");
  if (action === "upload-modal" || action === "batch-import") openModal("upload-modal");
  if (action === "new-project") {
    projects.unshift({ id: `p${Date.now()}`, title: "新的 YUYU 项目", type: "短剧", status: "草稿", progress: 8, updated: "刚刚", thumb: "feature-effects.png" });
    renderProjects();
    showToast("新项目已创建");
  }
  if (action === "use-selected-asset") {
    showToast(`已加入当前项目：${selectedAsset}`);
    showWorkspace("资产已加入", "选中的角色、场景或风格已绑定到当前生成流程。", 2);
  }
  if (action === "invite") openModal("invite");
  if (action === "add-comment") {
    const input = $("#commentInput");
    if (input.value.trim()) {
      $("#commentFeed").insertAdjacentHTML("afterbegin", `<p>我：${escapeHtml(input.value.trim())}</p>`);
      input.value = "";
      showToast("评论已发送");
    }
  }
  if (action === "approve-version") showToast("版本已批准");
  if (action === "more") showToast("更多菜单已打开");
  if (action === "close-modal") closeModal();
}

function handleModalAction(action) {
  closeModal();
  if (action.includes("upload")) routeTo("assets");
  if (action.includes("export")) setCredits(credits - 20);
  if (action === "apply-mention") {
    promptInput.value = `${promptInput.value.trim()} @逆袭女主`.trim();
  }
  showToast("操作已完成");
}

function handleProjectAction(action, card) {
  const project = projects.find(item => item.id === card?.dataset.project);
  if (action === "continue") openCanvas();
  if (action === "duplicate" && project) {
    projects.unshift({ ...project, id: `p${Date.now()}`, title: `${project.title} 副本`, updated: "刚刚", status: "草稿", progress: Math.min(project.progress, 20) });
    renderProjects();
    showToast("项目副本已创建");
  }
  if (action === "export") openModal("export", { title: `导出${project?.title || "项目"}` });
}

function handleCanvasAction(action) {
  if (action === "add-node") addCanvasNode();
  if (action === "auto-layout") {
    resetCanvasLayout();
    showToast("画布已自动布局");
  }
  if (action === "zoom-in") setZoom(zoom + 0.1);
  if (action === "zoom-out") setZoom(zoom - 0.1);
  if (action === "preview") openModal("preview");
  if (action === "export") openModal("export", { title: "导出视频与项目" });
  if (action === "apply-node") {
    const node = $(".canvas-node.selected");
    if (node) {
      node.querySelector("strong").textContent = $("#nodeNameInput").value;
      node.querySelector("p").textContent = $("#nodeCopyInput").value;
      showToast("节点已更新");
    }
  }
}

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    event.preventDefault();
    routeTo(routeButton.dataset.route);
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    selectCategory(categoryButton.dataset.category);
    return;
  }

  const toolButton = event.target.closest("[data-tool]");
  if (toolButton) {
    const isPressed = toolButton.getAttribute("aria-pressed") === "true";
    if (isPressed) closeToolPanel();
    else openToolPanel(toolButton.dataset.tool);
    return;
  }

  const templateButton = event.target.closest("[data-template]");
  if (templateButton) {
    selectTemplate(templateButton.dataset.template);
    return;
  }

  const featureButton = event.target.closest("[data-feature]");
  if (featureButton) {
    const [title, copy] = featureDetails[featureButton.dataset.feature];
    promptInput.value = copy;
    showWorkspace(title, copy, featureButton.dataset.feature === "blank" ? 1 : 2);
    return;
  }

  const chip = event.target.closest("[data-chip]");
  if (chip) {
    promptInput.value = `${promptInput.value.trim()} ${chip.dataset.chip}`.trim();
    showToast(`已加入${chip.dataset.chip}`);
    return;
  }

  const panelAction = event.target.closest("[data-panel-action]")?.dataset.panelAction;
  if (panelAction) {
    if (panelAction === "assets") routeTo("assets");
    else openModal(panelAction);
    return;
  }

  const assetTab = event.target.closest("[data-asset-tab]");
  if (assetTab) {
    activeAssetTab = assetTab.dataset.assetTab;
    selectedAsset = assets[activeAssetTab][0].title;
    renderAssets();
    return;
  }

  const assetCard = event.target.closest("[data-asset]");
  if (assetCard) {
    selectedAsset = assetCard.dataset.asset;
    $$(".asset-card").forEach(item => item.classList.toggle("selected", item === assetCard));
    showToast(`已选择 ${selectedAsset}`);
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action) {
    handleAction(action);
    return;
  }

  const modalAction = event.target.closest("[data-modal-action]")?.dataset.modalAction;
  if (modalAction) {
    handleModalAction(modalAction);
    return;
  }

  const projectAction = event.target.closest("[data-project-action]")?.dataset.projectAction;
  if (projectAction) {
    handleProjectAction(projectAction, event.target.closest(".project-card"));
    return;
  }

  const canvasAction = event.target.closest("[data-canvas-action]")?.dataset.canvasAction;
  if (canvasAction) {
    handleCanvasAction(canvasAction);
    return;
  }

  const canvasTool = event.target.closest("[data-canvas-tool]");
  if (canvasTool) {
    activeCanvasTool = canvasTool.dataset.canvasTool;
    $$("[data-canvas-tool]").forEach(item => item.classList.toggle("active", item === canvasTool));
    showToast(`已切换到${canvasTool.textContent}工具`);
    return;
  }

  const shot = event.target.closest("[data-shot]");
  if (shot) {
    showToast(`已定位到镜头 ${shot.dataset.shot}`);
    return;
  }

  const canvasNode = event.target.closest(".canvas-node");
  if (canvasNode) selectCanvasNode(canvasNode);
});

document.addEventListener("pointerdown", event => {
  const node = event.target.closest(".canvas-node");
  if (!node || canvasStudio.hidden || activeCanvasTool !== "select") return;
  if (event.button !== 0) return;
  selectCanvasNode(node);
  try {
    node.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic browser events used by QA may not own an active pointer.
  }
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = Number.parseFloat(node.style.getPropertyValue("--x")) || 0;
  const originY = Number.parseFloat(node.style.getPropertyValue("--y")) || 0;
  node.classList.add("dragging");

  function move(moveEvent) {
    const dx = (moveEvent.clientX - startX) / zoom;
    const dy = (moveEvent.clientY - startY) / zoom;
    node.style.setProperty("--x", `${originX + dx}px`);
    node.style.setProperty("--y", `${originY + dy}px`);
  }

  function up() {
    node.classList.remove("dragging");
    node.removeEventListener("pointermove", move);
    node.removeEventListener("pointerup", up);
    node.removeEventListener("pointercancel", up);
  }

  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", up);
});

$("#sendBtn").addEventListener("click", startGeneration);

$("#seriesToggle").addEventListener("change", event => {
  showToast(event.target.checked ? "已开启多剧集策划" : "已切换为单集创作");
});

$("#projectSearch").addEventListener("input", renderProjects);

canvasPlane.addEventListener("wheel", event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setZoom(zoom + (event.deltaY > 0 ? -0.08 : 0.08));
}, { passive: false });

renderTemplates();
renderWorkflow(1);
renderProjects();
renderAssets();
renderTeam();
renderAccount();
setCredits(credits);
