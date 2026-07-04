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
const generatePanel = $("#generatePanel");
const editorPanel = $("#editorPanel");
const zoomLabel = $("#zoomLabel");
const bottomZoomLabel = $("#bottomZoomLabel");
const toast = $("#toast");
const queueDrawer = $("#queueDrawer");
const queueList = $("#queueList");
const assetDetailPanel = $("#assetDetailPanel");
const nodeInspector = $("#nodeInspector");
const generationHistory = $("#generationHistory");
const planGrid = $("#planGrid");
const backendStatus = $("#backendStatus");
const authUserSummary = $("#authUserSummary");
const authName = $("#authName");
const authEmail = $("#authEmail");
const authPassword = $("#authPassword");
const planName = $("#planName");
const seatCount = $("#seatCount");
const seatHint = $("#seatHint");

const categories = {
  overseas: {
    prefix: "出海短剧 /",
    title: "出海短剧项目已创建",
    copy: "已按出海短剧结构拆解爽点、反转和多集节奏。",
    templates: [
      { id: "dialog", title: "对话剧情", image: "../public/assets/explore/template-dialog.png", prompt: "一位普通女孩误入豪门继承人争夺战，用三场高反转对话推进剧情。" },
      { id: "narration", title: "旁白解说", image: "../public/assets/explore/template-narration.png", prompt: "用旁白解说风格讲述女主被背叛后逆袭出海创业的短剧第一集。" }
    ]
  },
  comic: {
    prefix: "短剧漫剧 /",
    title: "漫剧项目已创建",
    copy: "已切换为漫画分镜与角色表情驱动的制作流程。",
    templates: [
      { id: "comic-dialog", title: "角色对白", image: "../public/assets/explore/template-narration.png", prompt: "制作一段都市奇幻漫剧，女主在雨夜发现自己能听见时间倒流的声音。" },
      { id: "comic-panel", title: "分格叙事", image: "../public/assets/explore/template-dialog.png", prompt: "把校园悬疑故事拆成 8 格漫画分镜，每格都有明确动作和情绪。" }
    ]
  },
  mv: {
    prefix: "音乐 MV /",
    title: "音乐 MV 项目已创建",
    copy: "已准备歌词段落、节拍点、画面风格和镜头转场。",
    templates: [
      { id: "mv-beat", title: "节拍剪辑", image: "../public/assets/explore/feature-grid.png", prompt: "为一首夏日流行歌生成九宫格节拍画面，明亮、轻快、镜头随鼓点切换。" },
      { id: "mv-cinematic", title: "电影感 MV", image: "../public/assets/explore/feature-panorama.png", prompt: "生成一支沙漠公路 MV，孤独旅人、漂浮岩石、黄金日落和慢动作运镜。" }
    ]
  },
  knowledge: {
    prefix: "知识分享 /",
    title: "知识视频项目已创建",
    copy: "已切换为脚本提纲、重点提炼和画面示意流程。",
    templates: [
      { id: "knowledge-list", title: "三段式讲解", image: "../public/assets/explore/feature-seedance.png", prompt: "用三段式结构解释 AI 视频生成的工作流：输入、规划、生成。" },
      { id: "knowledge-card", title: "知识卡片", image: "../public/assets/explore/feature-grid.png", prompt: "做一个 60 秒知识分享视频，解释如何把短剧创意扩展成连续剧集。" }
    ]
  }
};

const promptTools = {
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
    chips: ["@蛋卷", "@云朵", "@导演视角"],
    action: "mentions"
  },
  style: {
    title: "风格控制",
    body: "选择画面风格、镜头语言和色彩倾向。当前默认匹配短剧漫剧的高对比暗色氛围。",
    chips: ["写实短剧", "国漫质感", "办公喜剧"],
    action: "style"
  }
};

const storyProjects = [
  {
    id: "story-1",
    tab: "story",
    category: "overseas",
    title: "霸总猫与憨憨狗的职场日常",
    subtitle: "@蛋卷 (Eggrol) @云朵 (Cloud)",
    status: "全能模式",
    mode: "画布",
    updated: "2026/07/03 18:38",
    progress: 78,
    cover: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.72)), url('./public/assets/story/video-elevator-dog.png')"
  },
  {
    id: "story-2",
    tab: "story",
    category: "comic",
    title: "第1集：打呼纸的复仇",
    subtitle: "办公室萌宠喜剧分镜",
    status: "脚本策划",
    mode: "策划",
    updated: "2026/07/03 19:16",
    progress: 64,
    cover: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.72)), url('./public/assets/story/video-cat-close.png')"
  },
  {
    id: "story-3",
    tab: "story",
    category: "mv",
    title: "电梯里的 15 秒主题曲",
    subtitle: "音乐节拍与镜头同步",
    status: "可导出",
    mode: "MV",
    updated: "今天 14:08",
    progress: 100,
    cover: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.72)), url('./public/assets/story/elevator.png')"
  },
  {
    id: "story-4",
    tab: "story",
    category: "knowledge",
    title: "用画布拆解一条宠物短剧",
    subtitle: "知识分享脚本",
    status: "草稿",
    mode: "知识",
    updated: "昨天 22:10",
    progress: 36,
    cover: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.72)), url('./public/assets/explore/feature-grid.png')"
  },
  {
    id: "digital-1",
    tab: "digital",
    category: "digital",
    title: "YUYU 口播主持人",
    subtitle: "可用于剧情解说和课程讲解",
    status: "已训练",
    mode: "数字人",
    updated: "今天 09:30",
    progress: 92,
    cover: "linear-gradient(135deg, rgba(84,188,230,.28), rgba(228,106,189,.18))"
  },
  {
    id: "canvas-1",
    tab: "canvas",
    category: "canvas",
    title: "第1集画布图谱",
    subtitle: "主体、场景、镜头和视频节点",
    status: "可编辑",
    mode: "画布",
    updated: "刚刚",
    progress: 88,
    cover: "linear-gradient(180deg, rgba(184,233,72,.14), rgba(0,0,0,.72)), url('./public/assets/yuyu-captured-state.png')"
  }
];

const assets = {
  characters: [
    { title: "蛋卷 Eggrol", meta: "拉布拉多 / 主体一致性", color: "#d8b46a", image: "./public/assets/story/dog.png" },
    { title: "云朵 Cloud", meta: "布偶猫 / 表情素材", color: "#9fc5df", image: "./public/assets/story/cat.png" },
    { title: "旁白主持", meta: "知识分享 / 口播", color: "#54bce6" }
  ],
  scenes: [
    { title: "电梯内部", meta: "室内 / 冷色金属", color: "#7f8690", image: "./public/assets/story/elevator.png" },
    { title: "电梯厅走廊", meta: "办公楼 / 现代感", color: "#b5b8ae", image: "./public/assets/story/hall.png" },
    { title: "会议室", meta: "职场喜剧", color: "#7867dc" }
  ],
  props: [
    { title: "工作牌", meta: "剧情道具", color: "#e4e4e4" },
    { title: "便签纸", meta: "反转线索", color: "#ffc33f" },
    { title: "宠物项圈", meta: "角色识别", color: "#e46abd" }
  ],
  styles: [
    { title: "写实短剧", meta: "高对比 / 近景", color: "#ff8f72" },
    { title: "轻喜剧质感", meta: "柔光 / 办公室", color: "#b8e948" },
    { title: "广告大片", meta: "慢镜 / 大光比", color: "#ffc33f" }
  ]
};

const plannerMessages = [
  { role: "system", title: "设计短片主要场景细节", body: "将剧本转化为详细的镜头语言和动作描述。", steps: ["提取并确认角色设定", "提取并确认场景设定"] },
  { role: "assistant", title: "YUYU", body: "收到！职场萌宠喜剧第一集即将开机，让我们看看云朵总裁和蛋卷又会闹出什么职场笑话吧。", steps: ["设计角色特征", "调用工具生成角色图", "设计短片主要场景细节", "调用工具生成场景图"] },
  { role: "user", title: "你", body: "继续做第二集，增加一次电梯门口的反转。", card: "第2集：门口偶遇" },
  { role: "assistant", title: "YUYU", body: "已补充第二集结构：蛋卷误触电梯开关，云朵以为它在暗中操控全局，最后发现只是项圈卡住按钮。" }
];

const scriptSections = [
  {
    title: "剧本内容",
    paragraphs: [
      "电梯门眼看就要合上了，我盯着那道缝隙，后腿猛地发力，像颗炮弹一样冲了过去。尾巴在身后摇成了螺旋桨，总算在金属门彻底闭合前，把湿漉漉的鼻子挤了进去。",
      "电梯里，云朵正优雅地站在正中央，那一身布偶猫的长毛顺滑得发亮，高冷得像尊冰雕。我拼命收着拉布拉多的大肚子，试图把自己塞进角落，结果一个没站稳，厚实的爪子直接踩在了云朵那条蓬松的大尾巴上。",
      "就在这时，电梯发出了那声让人绝望的滴。超载警报响得惊天动地。我瞬间僵住，憋红了脸死命缩着肚子，很不得把自己原地缩成一只吉娃娃。云朵一言不发，只用那双蓝宝石般的眼睛缓缓下移，死死盯着我踩在它尾巴上的爪子。"
    ]
  },
  {
    title: "美术风格",
    bullets: [
      "基础画风风格词：影视质感，现代办公室氛围，冷灰金属与暖色宠物形成反差。",
      "视觉风格描述：采用高保真的影视级写实风格，画面呈现通透、明亮的现代办公空间质感。"
    ]
  },
  {
    title: "主体列表",
    bullets: ["蛋卷：笨拙、憨厚且充满活力的拉布拉多，多动但很真诚。", "云朵：高冷、优雅且极具威严的布偶猫，总能用沉默制造笑点。"]
  },
  {
    title: "场景列表",
    bullets: ["电梯内部：金属墙面、镜面反射、顶部冷光，空间略显局促。", "电梯厅走廊：办公楼走廊，浅灰墙面与地毯，适合角色出场和反转。"]
  }
];

const members = [
  { name: "Yuyu", role: "Owner", state: "在线" },
  { name: "Director", role: "导演", state: "审阅中" },
  { name: "Writer", role: "编剧", state: "已交付" },
  { name: "Designer", role: "美术", state: "待反馈" }
];

const teamComments = [
  { author: "导演", body: "镜头 3 的反转需要更明确。" },
  { author: "编剧", body: "已补充蛋卷内心独白。" },
  { author: "美术", body: "场景色调已统一为冷灰金属。" }
];

const usageLedger = [
  ["视频生成", "-180", "职场萌宠喜剧 EP01"],
  ["九宫格图", "-60", "封面拆图"],
  ["多剧集策划", "-40", "短剧漫剧"],
  ["会员补给", "+500", "标准会员"]
];

const generationQueue = [
  { id: "q1", type: "视频", title: "电梯超载反转镜头", state: "生成中", progress: 78, cost: 120 },
  { id: "q2", type: "图片", title: "云朵表情参考图", state: "排队中", progress: 32, cost: 30 },
  { id: "q3", type: "导出", title: "EP01 分镜 PDF", state: "已完成", progress: 100, cost: 20 }
];

const generationResults = [
  { type: "视频", title: "EP01 预览片段", meta: "00:06 / 16:9 / 1080P" },
  { type: "图片", title: "蛋卷正面参考", meta: "2K / 主体一致性" },
  { type: "文本", title: "镜头 03 动作说明", meta: "已同步到策划文档" }
];

const planOptions = [
  { name: "标准会员", price: "当前", quota: "每月 6,000 点", perks: ["高清预览", "多剧集策划", "团队 8 席"] },
  { name: "专业会员", price: "¥199/月", quota: "每月 30,000 点", perks: ["4K 导出", "并发 5 任务", "批量素材管理"] },
  { name: "团队旗舰", price: "联系销售", quota: "自定义额度", perks: ["权限审计", "品牌模板", "项目归档"] }
];

const featureDetails = {
  blank: ["空白画布", "从零开始搭建角色、场景、提示词和视频节点。"],
  effects: ["特效模板", "套用热门视觉特效模板，快速生成可复用片段。"],
  video: ["YUYU 视频生成", "使用全能模式把故事提示词扩展为视频生成任务。"],
  grid: ["九宫格图", "把同一个主题拆成九张可发布封面或分镜图。"],
  panorama: ["720° 全景图", "生成全景空间，用于奇幻、旅行和沉浸式场景。"]
};

const generatorCopy = {
  text: "把当前节点扩展成三段镜头说明，包含动作、情绪、景别和转场。",
  image: "写实。全景，正面拍摄，拉布拉多犬，耳朵下垂，尾巴自然伸展，体型匀称，毛发短而光滑，黄色，姿态端正，眼神平静专注。",
  video: "将蛋卷冲进电梯、误踩云朵尾巴、超载警报响起三个动作串成 6 秒视频，镜头轻微手持。"
};

const shotRows = [
  ["01", "电梯门即将关闭", "推镜", "2.5s"],
  ["02", "蛋卷冲入电梯", "低机位", "3.0s"],
  ["03", "误踩云朵尾巴", "特写", "2.0s"],
  ["04", "超载警报响起", "广角", "3.5s"]
];

let activeCategory = "overseas";
let activeAssetTab = "characters";
let activeLibraryTab = "story";
let activeStoryFilter = "all";
let activeEpisode = 1;
let credits = 5083;
let toastTimer = 0;
let generationTimer = 0;
let zoom = 0.33;
let renderScale = 0.72;
let activeCanvasTool = "select";
let selectedAsset = "蛋卷 Eggrol";
let accountPlan = "标准会员";
let seatLimit = 8;

const apiState = {
  available: false,
  checked: false,
  token: window.localStorage.getItem("yuyu_token") || "",
  user: null,
  saveTimer: 0
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function replaceList(target, next = []) {
  if (!Array.isArray(next)) return;
  target.splice(0, target.length, ...next);
}

function replaceAssets(next = {}) {
  Object.keys(assets).forEach(key => {
    assets[key] = Array.isArray(next[key]) ? next[key] : assets[key];
  });
}

function setBackendStatus(message) {
  if (backendStatus) backendStatus.textContent = message;
}

function renderAuthState() {
  if (!authUserSummary) return;
  if (!apiState.checked) {
    setBackendStatus("正在检查后端连接...");
    authUserSummary.textContent = "静态演示模式";
    return;
  }
  if (!apiState.available) {
    setBackendStatus("当前页面未连接后端，功能以本地静态演示运行。");
    authUserSummary.textContent = "部署到 GitHub Pages 时保持静态可用";
    return;
  }
  if (!apiState.user) {
    setBackendStatus("后端在线。登录或注册后，项目、积分、评论和任务会写入 data/db.json。");
    authUserSummary.textContent = "可使用 demo@yuyu.ai / Yuyu123456";
    return;
  }
  setBackendStatus("后端在线，数据已按当前用户保存。");
  authUserSummary.textContent = `${apiState.user.name} · ${apiState.user.email}`;
  if (authEmail) authEmail.value = apiState.user.email;
  if (authName) authName.value = apiState.user.name;
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (apiState.token) headers.Authorization = `Bearer ${apiState.token}`;
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    cache: "no-store",
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `API ${path} failed`);
  }
  return data;
}

function canUseBackend() {
  return Boolean(apiState.available && apiState.user);
}

function reportBackendActionError(label, error) {
  setBackendStatus(`${label}失败：${error.message}`);
  showToast(`${label}失败，已保留本地演示状态`);
}

async function runBackendAction(label, action) {
  if (!canUseBackend()) return null;
  try {
    return await action();
  } catch (error) {
    reportBackendActionError(label, error);
    return null;
  }
}

function applyBackendWorkspace(result, message) {
  if (!result?.workspace) return false;
  applyWorkspace(result.workspace);
  if (message) showToast(message);
  return true;
}

function snapshotWorkspace() {
  return {
    credits,
    plan: accountPlan,
    seatLimit,
    projects: storyProjects,
    assets,
    plannerMessages,
    scriptSections,
    members,
    comments: teamComments,
    usageLedger,
    generationQueue,
    generationResults
  };
}

function applyWorkspace(workspace = {}) {
  replaceList(storyProjects, workspace.projects);
  replaceAssets(workspace.assets);
  replaceList(plannerMessages, workspace.plannerMessages);
  replaceList(scriptSections, workspace.scriptSections);
  replaceList(members, workspace.members);
  replaceList(teamComments, workspace.comments);
  replaceList(usageLedger, workspace.usageLedger);
  replaceList(generationQueue, workspace.generationQueue);
  replaceList(generationResults, workspace.generationResults);
  accountPlan = workspace.plan || accountPlan;
  seatLimit = Number(workspace.seatLimit || seatLimit);
  if (Number.isFinite(Number(workspace.credits))) setCredits(Number(workspace.credits));
  if (!assets[activeAssetTab]?.some(item => item.title === selectedAsset)) {
    selectedAsset = assets[activeAssetTab]?.[0]?.title || "";
  }
  renderLibrary();
  renderPlannerChat();
  renderScriptDocument();
  renderAssets();
  renderTeam();
  renderAccount();
  renderQueue();
  renderGenerationHistory();
  renderNodeInspector();
}

function persistWorkspace(reason = "auto") {
  if (!apiState.available || !apiState.user) return;
  window.clearTimeout(apiState.saveTimer);
  apiState.saveTimer = window.setTimeout(async () => {
    try {
      await apiFetch("/workspace", { method: "PUT", body: { workspace: snapshotWorkspace() } });
      setBackendStatus(`后端在线，${reason}已保存。`);
    } catch (error) {
      setBackendStatus(`后端保存失败：${error.message}`);
    }
  }, 180);
}

async function loadBackendWorkspace() {
  if (!apiState.available || !apiState.token) return;
  const data = await apiFetch("/auth/me");
  apiState.user = data.user;
  window.localStorage.setItem("yuyu_token", apiState.token);
  applyWorkspace(data.workspace);
  renderAuthState();
}

async function detectBackend() {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    apiState.checked = true;
    renderAuthState();
    return;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 900);
  try {
    const response = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
    apiState.available = response.ok;
  } catch {
    apiState.available = false;
  } finally {
    window.clearTimeout(timer);
    apiState.checked = true;
  }
  renderAuthState();
  if (apiState.available && apiState.token) {
    try {
      await loadBackendWorkspace();
    } catch {
      apiState.token = "";
      apiState.user = null;
      window.localStorage.removeItem("yuyu_token");
      renderAuthState();
    }
  }
}

async function authenticate(mode) {
  if (!apiState.available) {
    showToast("请用 npm.cmd run backend 启动后端");
    return;
  }
  const email = authEmail?.value.trim() || "";
  const password = authPassword?.value || "";
  const name = authName?.value.trim() || "YUYU 用户";
  try {
    const data = await apiFetch(`/auth/${mode}`, {
      method: "POST",
      body: mode === "register" ? { email, password, name } : { email, password }
    });
    apiState.token = data.token;
    apiState.user = data.user;
    window.localStorage.setItem("yuyu_token", data.token);
    applyWorkspace(data.workspace);
    renderAuthState();
    showToast(mode === "register" ? "注册成功，后端工作区已创建" : "登录成功，数据已同步");
  } catch (error) {
    showToast(error.message);
    setBackendStatus(`认证失败：${error.message}`);
  }
}

async function logoutBackend() {
  if (apiState.available && apiState.token) {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
  }
  apiState.token = "";
  apiState.user = null;
  window.localStorage.removeItem("yuyu_token");
  renderAuthState();
  showToast("已退出后端账户");
}

async function syncBackendNow() {
  if (!apiState.available) {
    showToast("后端未连接");
    return;
  }
  if (!apiState.user) {
    showToast("请先登录后端账户");
    return;
  }
  try {
    await apiFetch("/workspace", { method: "PUT", body: { workspace: snapshotWorkspace() } });
    await loadBackendWorkspace();
    showToast("已同步后端数据");
  } catch (error) {
    showToast(error.message);
  }
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

function syncQueueCount() {
  const active = generationQueue.filter(item => item.state !== "已完成").length;
  const queueCount = $("#queueCount");
  if (queueCount) queueCount.textContent = String(active);
}

async function upgradeToPlan(plan, cost = plan === "团队旗舰" ? 999 : 199) {
  if (!plan || plan === accountPlan) {
    showToast("当前已是该会员方案");
    return true;
  }
  const backendResult = await runBackendAction("会员升级", () => apiFetch("/billing/upgrade", {
    method: "POST",
    body: { cost, plan }
  }));
  if (applyBackendWorkspace(backendResult, "会员方案已保存到后端")) return true;
  usageLedger.unshift(["会员升级", `-${cost}`, `${plan}演示`]);
  accountPlan = plan;
  setCredits(credits - cost);
  renderAccount();
  persistWorkspace("会员升级");
  showToast("会员方案已更新");
  return true;
}

function closeModal() {
  modalLayer.hidden = true;
}

function closeQueue() {
  queueDrawer.hidden = true;
}

function closeToolPanel() {
  toolPanel.hidden = true;
  $$("[data-tool]").forEach(button => button.setAttribute("aria-pressed", "false"));
}

function routeTo(name) {
  const target = $(`[data-view="${name}"]`);
  if (!target) return;
  $$(".view").forEach(view => view.classList.toggle("active", view.dataset.view === name));
  $$("[data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === name));
  canvasStudio.hidden = true;
  closeModal();
  closeQueue();
  closeToolPanel();
  if (name === "projects") renderLibrary();
  if (name === "script") {
    renderPlannerChat();
    renderScriptDocument();
  }
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
  const tool = promptTools[toolName];
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

function renderQueue() {
  syncQueueCount();
  queueList.innerHTML = generationQueue.map(item => `
    <article class="queue-item" data-queue-id="${item.id}">
      <div><span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.state)} · ${item.cost} 点</small></div>
      <em>${item.progress}%</em>
      <i style="width:${item.progress}%"></i>
    </article>
  `).join("");
}

function openQueueDrawer() {
  renderQueue();
  queueDrawer.hidden = false;
}

function renderGenerationHistory() {
  generationHistory.innerHTML = generationResults.map(item => `
    <button type="button" data-result="${escapeHtml(item.title)}">
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.meta)}</small>
    </button>
  `).join("");
}

function renderPlanGrid() {
  if (!planGrid) return;
  planGrid.innerHTML = planOptions.map(plan => `
    <article class="plan-card ${plan.name === accountPlan ? "current" : ""}">
      <span>${escapeHtml(plan.name)}</span>
      <strong>${escapeHtml(plan.price)}</strong>
      <small>${escapeHtml(plan.quota)}</small>
      <p>${plan.perks.map(escapeHtml).join(" · ")}</p>
      <button type="button" data-plan="${escapeHtml(plan.name)}">${plan.name === accountPlan ? "当前方案" : "选择方案"}</button>
    </article>
  `).join("");
}

function getSelectedAsset() {
  const items = assets[activeAssetTab] || [];
  return items.find(item => item.title === selectedAsset) || items[0];
}

function renderAssetDetail() {
  const asset = getSelectedAsset();
  if (!asset || !assetDetailPanel) return;
  assetDetailPanel.innerHTML = `
    <span class="eyebrow">Asset Detail</span>
    <h2>${escapeHtml(asset.title)}</h2>
    <div class="asset-detail-preview" style="--swatch:${asset.color};${asset.image ? `background-image:linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.42)), url('${asset.image}')` : ""}"></div>
    <p>${escapeHtml(asset.meta)}</p>
    <dl>
      <div><dt>一致性</dt><dd>92%</dd></div>
      <div><dt>引用次数</dt><dd>${activeAssetTab === "characters" ? 18 : 7}</dd></div>
      <div><dt>绑定项目</dt><dd>职场萌宠喜剧</dd></div>
    </dl>
    <div class="asset-detail-actions">
      <button type="button" data-action="use-selected-asset">加入项目</button>
      <button type="button" data-action="copy-asset-prompt">复制提示词</button>
    </div>
  `;
}

function renderNodeInspector(node = $(".canvas-node.selected")) {
  if (!nodeInspector || !node) return;
  const label = node.querySelector("span")?.textContent || "视频节点";
  const type = node.classList.contains("subject-node") ? "主体" : node.classList.contains("scene-node") ? "场景" : "视频";
  const image = node.querySelector("img")?.getAttribute("src") || "./public/assets/story/video-elevator-dog.png";
  nodeInspector.innerHTML = `
    <span class="eyebrow">Inspector</span>
    <h2>${escapeHtml(label)}</h2>
    <img src="${escapeHtml(image)}" alt="" />
    <dl>
      <div><dt>类型</dt><dd>${type}</dd></div>
      <div><dt>状态</dt><dd>${type === "视频" ? "可重生成" : "已锁定一致性"}</dd></div>
      <div><dt>位置</dt><dd>${node.style.getPropertyValue("--x") || "0px"}, ${node.style.getPropertyValue("--y") || "0px"}</dd></div>
    </dl>
    <textarea>${type === "视频" ? "保持角色一致，强化电梯门口反转，镜头轻微手持。" : "作为当前故事的核心参考资产，保持风格和细节一致。"}</textarea>
    <div class="asset-detail-actions">
      <button type="button" data-action="regenerate-node">重生成</button>
      <button type="button" data-action="duplicate-node">复制节点</button>
    </div>
  `;
}

function startGeneration() {
  const text = promptInput.value.trim();
  const title = text || categories[activeCategory].title;
  showWorkspace(categories[activeCategory].title, text ? `已接收灵感：${text}` : categories[activeCategory].copy, 1);
  generationQueue.unshift({ id: `q${Date.now()}`, type: "策划", title, state: "生成中", progress: 8, cost: 80 });
  renderQueue();
  let step = 1;
  window.clearInterval(generationTimer);
  generationTimer = window.setInterval(async () => {
    step += 1;
    renderWorkflow(step);
    generationQueue[0].progress = Math.min(100, step * 25);
    if (step === 2) workspaceCopy.textContent = "正在抽取角色、场景和道具资产。";
    if (step === 3) workspaceCopy.textContent = "正在生成分镜脚本和镜头调度。";
    if (step >= 4) {
      window.clearInterval(generationTimer);
      workspaceCopy.textContent = "视频任务已进入预览阶段，可进入策划或画布继续编辑。";
      generationQueue[0].state = "已完成";
      generationResults.unshift({ type: "策划", title, meta: "已生成脚本、角色、场景和分镜" });
      renderGenerationHistory();
      renderQueue();
      const backendResult = await runBackendAction("生成任务保存", () => apiFetch("/generate", {
        method: "POST",
        body: { type: "story", title, cost: 80 }
      }));
      if (backendResult?.workspace) {
        applyWorkspace(backendResult.workspace);
        showWorkspace(categories[activeCategory].title, "生成任务已保存到后端，可继续进入策划或画布编辑。", 4);
        showToast("生成任务已保存到后端");
      } else {
        setCredits(credits - 80);
        persistWorkspace("生成任务");
      }
    }
  }, 520);
}

function renderLibrary() {
  $$("[data-library-tab]").forEach(button => button.classList.toggle("active", button.dataset.libraryTab === activeLibraryTab));
  $$("[data-story-filter]").forEach(button => button.classList.toggle("active", button.dataset.storyFilter === activeStoryFilter));
  const query = $("#projectSearch")?.value?.trim().toLowerCase() || "";
  const items = storyProjects.filter(item => {
    const tabOk = item.tab === activeLibraryTab;
    const filterOk = activeLibraryTab !== "story" || activeStoryFilter === "all" || item.category === activeStoryFilter;
    const queryOk = `${item.title}${item.subtitle}${item.status}${item.mode}`.toLowerCase().includes(query);
    return tabOk && filterOk && queryOk;
  });
  $("#projectBoard").innerHTML = items.map(project => `
    <article class="story-card project-card" data-project="${project.id}">
      <div class="story-cover" style="background:${project.cover}">
        <div class="story-badges"><span>⌘ ${escapeHtml(project.status)}</span><span>${escapeHtml(project.mode)}</span></div>
        <p>${escapeHtml(project.subtitle)}</p>
      </div>
      <div class="story-foot">
        <span class="story-icon">▣</span>
        <div>
          <h2>${escapeHtml(project.title)}</h2>
          <small>${escapeHtml(project.updated)}</small>
        </div>
      </div>
      <div class="bar"><i style="width:${project.progress}%"></i></div>
      <div class="card-actions">
        <button type="button" data-project-action="detail">详情</button>
        <button type="button" data-project-action="continue">继续</button>
        <button type="button" data-project-action="duplicate">复制</button>
        <button type="button" data-project-action="export">导出</button>
      </div>
    </article>
  `).join("") || `<p class="empty-state">没有找到匹配内容。</p>`;
}

function renderPlannerChat() {
  $("#plannerChat").innerHTML = plannerMessages.map(message => `
    <article class="planner-message ${message.role}">
      <div class="message-avatar">${message.role === "assistant" ? "Y" : message.role === "user" ? "你" : "✓"}</div>
      <div class="message-body">
        <strong>${escapeHtml(message.title)}</strong>
        ${message.card ? `<button class="message-card" type="button" data-action="open-canvas">▣ ${escapeHtml(message.card)}</button>` : ""}
        <p>${escapeHtml(message.body)}</p>
        ${message.steps ? `<div class="planner-steps">${message.steps.map(step => `<span>✓ ${escapeHtml(step)}</span>`).join("")}</div>` : ""}
      </div>
    </article>
  `).join("");
  const feed = $("#plannerChat");
  feed.scrollTop = feed.scrollHeight;
}

function renderScriptDocument() {
  $("#scriptDocument").innerHTML = scriptSections.map(section => `
    <section class="doc-section">
      <h3>${escapeHtml(section.title)}</h3>
      ${section.paragraphs ? `<div class="doc-block">${section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join("")}</div>` : ""}
      ${section.bullets ? `<ul>${section.bullets.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul>` : ""}
    </section>
  `).join("");
}

function sendPlannerMessage() {
  const input = $("#plannerInput");
  const value = input.value.trim();
  if (!value) {
    showToast("请输入策划问题");
    return;
  }
  plannerMessages.push({ role: "user", title: "你", body: value });
  plannerMessages.push({ role: "assistant", title: "YUYU", body: "已收到，我会把这个要求同步到右侧策划文档，并更新画布中的镜头节点。" });
  scriptSections.unshift({ title: "新增策划要求", bullets: [value, "已同步到画布生成提示词。"] });
  input.value = "";
  renderPlannerChat();
  renderScriptDocument();
  persistWorkspace("策划内容");
  showToast("策划内容已更新");
}

function renderAssets() {
  $$("[data-asset-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.assetTab === activeAssetTab);
  });
  const items = assets[activeAssetTab] || [];
  $("#assetGrid").innerHTML = items.map((asset, index) => `
    <button class="asset-card ${asset.title === selectedAsset || (!selectedAsset && index === 0) ? "selected" : ""}" type="button" data-asset="${escapeHtml(asset.title)}">
      <span class="asset-swatch" style="--swatch:${asset.color};${asset.image ? `background-image:linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.34)), url('${asset.image}')` : ""}"></span>
      <strong>${escapeHtml(asset.title)}</strong>
      <small>${escapeHtml(asset.meta)}</small>
    </button>
  `).join("");
  if (!selectedAsset && items[0]) selectedAsset = items[0].title;
  renderAssetDetail();
}

function renderTeam() {
  $("#memberList").innerHTML = members.map(member => `
    <div class="member-row">
      <span>${escapeHtml(member.name.slice(0, 1))}</span>
      <strong>${escapeHtml(member.name)}</strong>
      <small>${escapeHtml(member.role)} · ${escapeHtml(member.state)}</small>
    </div>
  `).join("");
  $("#commentFeed").innerHTML = teamComments.map(comment => `<p>${escapeHtml(comment.author || "我")}：${escapeHtml(comment.body || "")}</p>`).join("");
}

function renderAccount() {
  $("#usageLedger").innerHTML = usageLedger.map(row => `
    <div class="ledger-row"><span>${row[0]}</span><strong>${row[1]}</strong><small>${row[2]}</small></div>
  `).join("");
  if (planName) planName.textContent = accountPlan;
  if (seatCount) seatCount.textContent = `${members.length} / ${seatLimit}`;
  if (seatHint) seatHint.textContent = `可继续邀请 ${Math.max(0, seatLimit - members.length)} 人`;
  renderPlanGrid();
  syncQueueCount();
}

function renderShotList() {
  $("#shotList").innerHTML = shotRows.map(row => `
    <button type="button" data-shot="${row[0]}">
      <span>${row[0]}</span><strong>${row[1]}</strong><small>${row[2]} · ${row[3]}</small>
    </button>
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
      body: `<div class="option-grid"><button class="selected">YUYU Video 2.0 全能模式</button><button>快速草稿</button><button>高清成片</button><button>图像序列</button></div><label class="range-row">创意强度<input type="range" value="72" /></label><label class="range-row">镜头稳定<input type="range" value="66" /></label><label class="range-row">角色一致性<input type="range" value="88" /></label><label class="range-row">时长<select><option>6 秒</option><option>12 秒</option><option>30 秒</option></select></label>`,
      actions: [["应用参数", "apply-model"]]
    },
    notifications: {
      kicker: "Notifications",
      title: "通知中心",
      body: `<div class="modal-list"><p>职场萌宠喜剧 EP01 已完成 78%</p><p>团队成员 Director 留下 1 条评论</p><p>720° 全景图已可预览</p></div>`,
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
      body: `<div class="option-grid"><button>@蛋卷</button><button>@云朵</button><button>@旁白主持</button><button>@导演视角</button></div>`,
      actions: [["加入提示词", "apply-mention"]]
    },
    style: {
      kicker: "Style",
      title: "风格控制",
      body: `<div class="option-grid"><button class="selected">写实短剧</button><button>轻喜剧质感</button><button>广告大片</button><button>办公冷灰</button></div>`,
      actions: [["应用风格", "apply-style"]]
    },
    more: {
      kicker: "Menu",
      title: "更多工具",
      body: `<div class="option-grid"><button data-modal-shortcut="queue">任务队列</button><button data-modal-shortcut="billing">会员与充值</button><button data-modal-shortcut="archive">项目归档</button><button data-modal-shortcut="help">快捷键</button></div><div class="modal-list"><p>支持回收站、生成记录、项目复制、批量导入、导出任务和团队权限模拟。</p></div>`,
      actions: [["打开任务队列", "open-queue"], ["查看快捷键", "open-help"]]
    },
    plans: {
      kicker: "Plans",
      title: "会员方案",
      body: `<div class="plan-grid modal-plans">${planOptions.map(plan => `<article class="plan-card ${plan.name === accountPlan ? "current" : ""}"><span>${escapeHtml(plan.name)}</span><strong>${escapeHtml(plan.price)}</strong><small>${escapeHtml(plan.quota)}</small><p>${plan.perks.map(escapeHtml).join(" · ")}</p></article>`).join("")}</div>`,
      actions: [["模拟升级", "upgrade-plan"]]
    },
    billing: {
      kicker: "Billing",
      title: "充值与账单",
      body: `<div class="modal-list"><p>2026/07/03 标准会员补给 +500 点</p><p>2026/07/03 视频生成 -180 点</p><p>2026/07/02 批量导出 -80 点</p></div><div class="option-grid"><button>500 点</button><button class="selected">2000 点</button><button>10000 点</button><button>团队包</button></div>`,
      actions: [["模拟充值", "top-up"]]
    },
    help: {
      kicker: "Help",
      title: "快捷键与帮助",
      body: `<div class="modal-list"><p>Cmd/Ctrl + Enter：发送策划消息</p><p>Ctrl + 滚轮：缩放画布</p><p>拖拽节点：调整镜头和素材关系</p><p>点击 +：打开生成面板</p></div>`,
      actions: [["知道了", "close-help"]]
    },
    "project-detail": {
      kicker: "Project",
      title: data.project?.title || "项目详情",
      body: `<div class="project-detail-modal"><div class="project-detail-cover" style="background:${data.project?.cover || "rgba(255,255,255,.08)"}"></div><p>${escapeHtml(data.project?.subtitle || "当前项目")}</p><dl><div><dt>状态</dt><dd>${escapeHtml(data.project?.status || "草稿")}</dd></div><div><dt>模式</dt><dd>${escapeHtml(data.project?.mode || "策划")}</dd></div><div><dt>进度</dt><dd>${data.project?.progress || 0}%</dd></div><div><dt>更新时间</dt><dd>${escapeHtml(data.project?.updated || "刚刚")}</dd></div></dl></div>`,
      actions: [["继续制作", "continue-project"], ["创建副本", "duplicate-project"], ["导出", "export-confirm"]]
    }
  };
  const config = configs[kind] || configs.notifications;
  modalKicker.textContent = config.kicker;
  modalTitle.textContent = config.title;
  modalBody.innerHTML = config.body;
  modalActions.innerHTML = config.actions.map(([label, action]) => `<button class="primary-action compact" type="button" data-modal-action="${action}">${label}</button>`).join("");
  modalLayer.hidden = false;
}

function openCanvas(mode = "canvas") {
  closeModal();
  workspacePanel.hidden = true;
  $$(".view").forEach(view => view.classList.remove("active"));
  canvasStudio.hidden = false;
  setCanvasMode(mode);
  setZoom(zoom);
  renderShotList();
}

function setCanvasMode(mode) {
  if (mode === "script") {
    canvasStudio.hidden = true;
    routeTo("script");
    return;
  }
  $$("[data-canvas-mode]").forEach(button => button.classList.toggle("active", button.dataset.canvasMode === mode));
  editorPanel.hidden = mode !== "editor";
  $(".graph-surface").classList.toggle("editor-open", mode === "editor");
  if (mode === "editor") {
    generatePanel.hidden = true;
    renderShotList();
  }
}

function selectCanvasNode(node) {
  $$(".canvas-node").forEach(item => item.classList.toggle("selected", item === node));
  renderNodeInspector(node);
  showToast(`已选择节点：${node.querySelector("span")?.textContent || "视频"}`);
}

function setZoom(nextZoom) {
  zoom = Math.min(0.9, Math.max(0.22, Math.round(nextZoom * 100) / 100));
  renderScale = Math.min(1.15, Math.max(0.55, Math.round(zoom * 220) / 100));
  canvasPlane.style.transform = `scale(${renderScale})`;
  const label = `${Math.round(zoom * 100)}%`;
  zoomLabel.textContent = label;
  bottomZoomLabel.textContent = label;
}

function resetCanvasLayout() {
  const positions = {
    eggro: ["0px", "0px"],
    cloud: ["0px", "170px"],
    elevator: ["0px", "360px"],
    hall: ["0px", "540px"],
    shot1: ["430px", "140px"],
    shot2: ["430px", "290px"],
    shot3: ["430px", "445px"],
    shot4: ["760px", "155px"],
    shot5: ["760px", "310px"],
    shot6: ["760px", "465px"]
  };
  Object.entries(positions).forEach(([id, [x, y]]) => {
    const node = $(`.canvas-node[data-node-id="${id}"]`);
    if (!node) return;
    node.style.setProperty("--x", x);
    node.style.setProperty("--y", y);
  });
  setZoom(0.33);
}

function addGeneratedNode(label = "生成视频") {
  const count = $$(".video-card").length + 1;
  const node = document.createElement("article");
  node.className = "media-node video-card canvas-node generated-node";
  node.dataset.nodeId = `generated-${Date.now()}`;
  node.style.setProperty("--x", `${760 + (count % 2) * 150}px`);
  node.style.setProperty("--y", `${110 + (count % 4) * 120}px`);
  node.innerHTML = `<span>${escapeHtml(label)}</span><img src="./public/assets/story/video-elevator-dog.png" alt="" />`;
  canvasPlane.appendChild(node);
  selectCanvasNode(node);
  return node;
}

function openGeneratePanel() {
  generatePanel.hidden = false;
  $$("[data-canvas-mode]").forEach(button => button.classList.toggle("active", button.dataset.canvasMode === "canvas"));
  editorPanel.hidden = true;
  renderGenerationHistory();
  showToast("生成面板已打开");
}

function switchGeneratorTab(tab) {
  $$("[data-generator-tab]").forEach(button => button.classList.toggle("active", button.dataset.generatorTab === tab));
  $("#generatorPrompt").value = generatorCopy[tab] || generatorCopy.image;
}

async function runGenerator() {
  const active = $("[data-generator-tab].active")?.dataset.generatorTab || "image";
  const label = active === "video" ? "生成视频" : active === "text" ? "脚本节点" : "生成图片";
  addGeneratedNode(label);
  const cost = active === "video" ? 120 : 30;
  const backendResult = await runBackendAction("生成节点保存", () => apiFetch("/generate", {
    method: "POST",
    body: { type: active, title: label, cost }
  }));
  if (backendResult?.workspace) {
    applyWorkspace(backendResult.workspace);
    showToast("已生成新节点并保存到后端");
    return;
  }
  generationQueue.unshift({ id: `q${Date.now()}`, type: active === "video" ? "视频" : active === "text" ? "文本" : "图片", title: label, state: "已完成", progress: 100, cost: active === "video" ? 120 : 30 });
  generationResults.unshift({ type: generationQueue[0].type, title: `${label} ${generationResults.length + 1}`, meta: "刚刚生成 · 已加入画布" });
  renderGenerationHistory();
  renderQueue();
  setCredits(credits - cost);
  persistWorkspace("生成节点");
  showToast("已生成新节点");
}

async function handleAction(action) {
  if (action === "close-workspace") workspacePanel.hidden = true;
  if (action === "open-queue") openQueueDrawer();
  if (action === "close-queue") closeQueue();
  if (action === "pause-queue") {
    const backendResult = await runBackendAction("队列状态", () => apiFetch("/queue/pause", { method: "POST" }));
    if (backendResult?.queue) {
      replaceList(generationQueue, backendResult.queue);
      renderQueue();
      showToast(backendResult.paused ? "已暂停全部未完成任务" : "已恢复全部未完成任务");
      return;
    }
    generationQueue.forEach(item => {
      if (item.state !== "已完成") item.state = item.state === "已暂停" ? "排队中" : "已暂停";
    });
    renderQueue();
    persistWorkspace("队列状态");
    showToast("队列状态已更新");
  }
  if (action === "clear-finished") {
    const backendResult = await runBackendAction("队列清理", () => apiFetch("/queue/finished", { method: "DELETE" }));
    if (backendResult?.queue) {
      replaceList(generationQueue, backendResult.queue);
      renderQueue();
      showToast("已从后端清理完成任务");
      return;
    }
    for (let index = generationQueue.length - 1; index >= 0; index -= 1) {
      if (generationQueue[index].state === "已完成") generationQueue.splice(index, 1);
    }
    renderQueue();
    persistWorkspace("队列清理");
    showToast("已清理完成任务");
  }
  if (action === "open-script") routeTo("script");
  if (action === "open-canvas") openCanvas("canvas");
  if (action === "close-canvas") routeTo("projects");
  if (action === "model") openModal("model");
  if (action === "assistant") {
    openModal("help");
    showToast("YUYU 助手已打开");
  }
  if (action === "notifications") openModal("notifications");
  if (action === "more") openModal("more");
  if (action === "open-plans") openModal("plans");
  if (action === "open-billing") openModal("billing");
  if (action === "upload-modal" || action === "batch-import" || action === "attach-reference") openModal("upload-modal");
  if (action === "mention-character") {
    const input = $("#plannerInput");
    input.value = `${input.value.trim()} @蛋卷`.trim();
    input.focus();
  }
  if (action === "send-planner") sendPlannerMessage();
  if (action === "refresh-doc") {
    renderScriptDocument();
    showToast("策划文档已刷新");
  }
  if (action === "add-episode") {
    const next = $$(".episode-rail button[data-episode]").length + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.episode = String(next);
    button.textContent = String(next).padStart(2, "0");
    $(".episode-rail").insertBefore(button, $('[data-action="add-episode"]'));
    showToast(`已新增第 ${next} 集`);
  }
  if (action === "new-project") {
    const projectDraft = {
      id: `story-${Date.now()}`,
      tab: "story",
      category: activeStoryFilter === "all" ? "overseas" : activeStoryFilter,
      title: "新的 YUYU 故事",
      subtitle: "等待策划内容",
      status: "草稿",
      mode: "策划",
      updated: "刚刚",
      progress: 8,
      cover: "linear-gradient(135deg, rgba(184,233,72,.18), rgba(84,188,230,.18))"
    };
    const backendResult = await runBackendAction("新建故事", async () => {
      const created = await apiFetch("/projects", { method: "POST", body: projectDraft });
      await loadBackendWorkspace();
      return created;
    });
    activeLibraryTab = "story";
    if (backendResult?.project) {
      renderLibrary();
      showToast("新故事已保存到后端");
      return;
    }
    storyProjects.unshift(projectDraft);
    renderLibrary();
    persistWorkspace("新建故事");
    showToast("新故事已创建");
  }
  if (action === "use-selected-asset") {
    const asset = getSelectedAsset();
    const backendResult = await runBackendAction("资产绑定", () => apiFetch("/actions/use-asset", {
      method: "POST",
      body: { title: asset?.title || selectedAsset, kind: activeAssetTab }
    }));
    if (applyBackendWorkspace(backendResult, `已保存资产绑定：${asset?.title || selectedAsset}`)) {
      showWorkspace("资产已加入", "选中的角色、场景或风格已绑定到当前生成流程。", 2);
      return;
    }
    showToast(`已加入当前项目：${selectedAsset}`);
    showWorkspace("资产已加入", "选中的角色、场景或风格已绑定到当前生成流程。", 2);
  }
  if (action === "copy-asset-prompt") {
    promptInput.value = `${promptInput.value.trim()} ${selectedAsset}，保持角色和场景一致性。`.trim();
    showToast("资产提示词已复制到首页输入框");
  }
  if (action === "select-generated") showToast("已选择生成结果");
  if (action === "run-generator") runGenerator();
  if (action === "regenerate-node") {
    switchGeneratorTab("video");
    openGeneratePanel();
    showToast("已把节点送入重生成面板");
  }
  if (action === "duplicate-node") {
    const selected = $(".canvas-node.selected");
    if (selected) {
      const clone = addGeneratedNode(`${selected.querySelector("span")?.textContent || "节点"}副本`);
      clone.style.setProperty("--x", `${(Number.parseFloat(selected.style.getPropertyValue("--x")) || 0) + 80}px`);
      clone.style.setProperty("--y", `${(Number.parseFloat(selected.style.getPropertyValue("--y")) || 0) + 60}px`);
    }
  }
  if (action === "render-preview") {
    const backendResult = await runBackendAction("预览生成", () => apiFetch("/generate", {
      method: "POST",
      body: { type: "video", title: "镜头预览任务", cost: 40 }
    }));
    if (!applyBackendWorkspace(backendResult, "预览任务已保存到后端")) {
      generationQueue.unshift({ id: `preview-${Date.now()}`, type: "视频", title: "镜头预览任务", state: "排队中", progress: 18, cost: 40 });
      usageLedger.unshift(["视频预览", "-40", "镜头预览任务"]);
      setCredits(credits - 40);
      renderQueue();
      renderAccount();
      persistWorkspace("预览任务");
    }
    openModal("preview");
  }
  if (action === "invite") openModal("invite");
  if (action === "add-comment") {
    const input = $("#commentInput");
    const body = input.value.trim();
    if (body) {
      const backendResult = await runBackendAction("评论发送", () => apiFetch("/team/comments", {
        method: "POST",
        body: { body }
      }));
      if (backendResult?.comments) {
        replaceList(teamComments, backendResult.comments);
        input.value = "";
        renderTeam();
        showToast("评论已保存到后端");
        return;
      }
      teamComments.unshift({ id: `comment-${Date.now()}`, author: apiState.user?.name || "我", body, createdAt: new Date().toISOString() });
      input.value = "";
      renderTeam();
      persistWorkspace("评论");
      showToast("评论已发送");
    }
  }
  if (action === "auth-login") authenticate("login");
  if (action === "auth-register") authenticate("register");
  if (action === "auth-logout") logoutBackend();
  if (action === "auth-sync") syncBackendNow();
  if (action === "approve-version") {
    const backendResult = await runBackendAction("版本审批", () => apiFetch("/actions/approve", {
      method: "POST",
      body: { version: "第1集 v3" }
    }));
    if (applyBackendWorkspace(backendResult, "版本审批已保存到后端")) return;
    teamComments.unshift({ id: `approval-${Date.now()}`, author: apiState.user?.name || "我", body: "已批准版本：第1集 v3", createdAt: new Date().toISOString() });
    usageLedger.unshift(["版本审批", "0", "第1集 v3"]);
    renderTeam();
    renderAccount();
    persistWorkspace("版本审批");
    showToast("版本已批准");
  }
  if (action === "close-modal") closeModal();
}

async function handleModalAction(action) {
  const currentModalTitle = modalTitle.textContent || "";
  const modalInput = modalBody.querySelector("input")?.value.trim() || "";
  const modalSelect = modalBody.querySelector("select")?.value || "";
  closeModal();
  if (action === "open-queue") openQueueDrawer();
  if (action === "open-help") openModal("help");

  if (action === "confirm-upload") {
    const assetDraft = {
      kind: activeAssetTab,
      title: "YUYU 上传素材",
      meta: "上传导入 / 后端保存",
      color: "#54bce6"
    };
    const backendResult = await runBackendAction("素材导入", () => apiFetch("/assets", {
      method: "POST",
      body: assetDraft
    }));
    if (backendResult?.workspace) {
      applyWorkspace(backendResult.workspace);
      activeAssetTab = assetDraft.kind;
      selectedAsset = assetDraft.title;
      routeTo("assets");
      showToast("素材已导入并保存到后端");
      return;
    }
    assets[assetDraft.kind].unshift(assetDraft);
    selectedAsset = assetDraft.title;
    routeTo("assets");
    persistWorkspace("素材导入");
    showToast("素材已导入资产库");
    return;
  }

  if (action === "apply-model" || action === "apply-style") {
    const backendResult = await runBackendAction("参数应用", () => apiFetch("/actions/model", {
      method: "POST",
      body: { model: action === "apply-style" ? "写实短剧风格" : "YUYU Video 2.0 全能模式" }
    }));
    if (applyBackendWorkspace(backendResult, "生成参数已保存到后端")) return;
    usageLedger.unshift(["参数应用", "0", action === "apply-style" ? "写实短剧风格" : "YUYU Video 2.0 全能模式"]);
    renderAccount();
    persistWorkspace("生成参数");
    showToast("生成参数已应用");
    return;
  }

  if (action === "send-invite") {
    const email = modalInput || `creator-${Date.now()}@yuyu.ai`;
    const name = email.split("@")[0] || "Creator";
    const backendResult = await runBackendAction("成员邀请", () => apiFetch("/team/members", {
      method: "POST",
      body: { name, role: modalSelect || "可编辑" }
    }));
    if (backendResult?.workspace) {
      applyWorkspace(backendResult.workspace);
      routeTo("team");
      showToast("成员邀请已保存到后端");
      return;
    }
    members.push({ id: `member-${Date.now()}`, name, role: modalSelect || "可编辑", state: "待接受" });
    routeTo("team");
    persistWorkspace("成员邀请");
    showToast("成员邀请已发送");
    return;
  }

  if (action === "export-confirm") {
    const title = currentModalTitle.startsWith("导出") ? `${currentModalTitle} 下载任务` : "项目导出下载任务";
    const backendResult = await runBackendAction("导出任务", () => apiFetch("/exports", {
      method: "POST",
      body: { title, cost: 20 }
    }));
    if (applyBackendWorkspace(backendResult, "导出任务已保存到后端")) {
      openQueueDrawer();
      return;
    }
    generationQueue.unshift({ id: `export-${Date.now()}`, type: "导出", title, state: "排队中", progress: 12, cost: 20 });
    usageLedger.unshift(["导出任务", "-20", title]);
    setCredits(credits - 20);
    renderQueue();
    renderAccount();
    persistWorkspace("导出扣费");
    openQueueDrawer();
    showToast("导出任务已生成");
    return;
  }

  if (action === "regen") {
    const backendResult = await runBackendAction("重新生成", () => apiFetch("/generate", {
      method: "POST",
      body: { type: "video", title: "重新生成预览", cost: 60 }
    }));
    if (applyBackendWorkspace(backendResult, "重新生成任务已保存到后端")) return;
    generationQueue.unshift({ id: `regen-${Date.now()}`, type: "视频", title: "重新生成预览", state: "排队中", progress: 5, cost: 60 });
    setCredits(credits - 60);
    renderQueue();
    renderAccount();
    persistWorkspace("重新生成");
    showToast("重新生成任务已创建");
    return;
  }

  if (action === "approve-preview") {
    const backendResult = await runBackendAction("成片确认", () => apiFetch("/actions/approve", {
      method: "POST",
      body: { version: "预览成片" }
    }));
    if (applyBackendWorkspace(backendResult, "成片确认已保存到后端")) return;
    teamComments.unshift({ id: `approval-${Date.now()}`, author: apiState.user?.name || "我", body: "已确认预览成片。", createdAt: new Date().toISOString() });
    renderTeam();
    persistWorkspace("成片确认");
    showToast("成片已确认");
    return;
  }

  if (action === "top-up") {
    const backendResult = await runBackendAction("充值", () => apiFetch("/billing/top-up", {
      method: "POST",
      body: { amount: 2000, memo: "前端充值" }
    }));
    if (applyBackendWorkspace(backendResult, "充值已保存到后端")) return;
    usageLedger.unshift(["模拟充值", "+2000", "前端演示充值"]);
    setCredits(credits + 2000);
    renderAccount();
    persistWorkspace("充值");
    showToast("充值已完成");
    return;
  }
  if (action === "upgrade-plan") {
    await upgradeToPlan("专业会员", 199);
    return;
  }
  if (action === "continue-project") routeTo("script");
  if (action === "duplicate-project") {
    const source = storyProjects[0];
    const backendResult = source && await runBackendAction("项目复制", async () => {
      const copy = await apiFetch(`/projects/${encodeURIComponent(source.id)}/duplicate`, { method: "POST" });
      await loadBackendWorkspace();
      return copy;
    });
    if (backendResult?.project) {
      routeTo("projects");
      showToast("项目副本已保存到后端");
      return;
    }
    storyProjects.unshift({ ...storyProjects[0], id: `copy-${Date.now()}`, title: `${storyProjects[0].title} 副本`, updated: "刚刚", status: "草稿", progress: 18 });
    persistWorkspace("项目副本");
    routeTo("projects");
  }
  if (action === "apply-mention") {
    promptInput.value = `${promptInput.value.trim()} @蛋卷`.trim();
    showToast("角色引用已加入提示词");
    return;
  }
  if (action === "mark-read" || action === "close-help") {
    showToast("操作已完成");
    return;
  }
  showToast("操作已完成");
}

async function handleProjectAction(action, card) {
  const project = storyProjects.find(item => item.id === card?.dataset.project);
  if (action === "detail" && project) openModal("project-detail", { project });
  if (action === "continue") {
    if (project?.tab === "canvas") openCanvas("canvas");
    else routeTo("script");
  }
  if (action === "duplicate" && project) {
    const backendResult = await runBackendAction("项目复制", async () => {
      const copy = await apiFetch(`/projects/${encodeURIComponent(project.id)}/duplicate`, { method: "POST" });
      await loadBackendWorkspace();
      return copy;
    });
    if (backendResult?.project) {
      showToast("项目副本已保存到后端");
      return;
    }
    storyProjects.unshift({ ...project, id: `copy-${Date.now()}`, title: `${project.title} 副本`, updated: "刚刚", status: "草稿", progress: Math.min(project.progress, 20) });
    renderLibrary();
    persistWorkspace("项目副本");
    showToast("项目副本已创建");
  }
  if (action === "export") openModal("export", { title: `导出${project?.title || "项目"}` });
}

function handleCanvasAction(action) {
  if (action === "open-generate") openGeneratePanel();
  if (action === "auto-layout") {
    resetCanvasLayout();
    showToast("画布已自动布局");
  }
  if (action === "zoom-in") setZoom(zoom + 0.05);
  if (action === "zoom-out") setZoom(zoom - 0.05);
  if (action === "export") openModal("export", { title: "导出视频与项目" });
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

  const libraryTab = event.target.closest("[data-library-tab]");
  if (libraryTab) {
    activeLibraryTab = libraryTab.dataset.libraryTab;
    renderLibrary();
    return;
  }

  const storyFilter = event.target.closest("[data-story-filter]");
  if (storyFilter) {
    activeStoryFilter = storyFilter.dataset.storyFilter;
    activeLibraryTab = "story";
    renderLibrary();
    return;
  }

  const episode = event.target.closest("[data-episode]");
  if (episode) {
    activeEpisode = Number(episode.dataset.episode);
    $$("[data-episode]").forEach(item => item.classList.toggle("active", item === episode));
    $("#scriptTitle").textContent = `第${activeEpisode}集：职场萌宠喜剧`;
    showToast(`已切换到第 ${activeEpisode} 集`);
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
    renderAssetDetail();
    showToast(`已选择 ${selectedAsset}`);
    return;
  }

  const planButton = event.target.closest("[data-plan]");
  if (planButton) {
    upgradeToPlan(planButton.dataset.plan);
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

  const canvasMode = event.target.closest("[data-canvas-mode]")?.dataset.canvasMode;
  if (canvasMode) {
    setCanvasMode(canvasMode);
    return;
  }

  const generatorTab = event.target.closest("[data-generator-tab]")?.dataset.generatorTab;
  if (generatorTab) {
    switchGeneratorTab(generatorTab);
    return;
  }

  const preset = event.target.closest("[data-generator-preset]")?.dataset.generatorPreset;
  if (preset) {
    openGeneratePanel();
    $("#generatorPrompt").value = `${event.target.textContent}：${generatorCopy.image}`;
    return;
  }

  const result = event.target.closest("[data-result]");
  if (result) {
    $("#generatorPrompt").value = `基于「${result.dataset.result}」继续优化，保持主体一致并输出可用镜头。`;
    showToast("已载入生成历史");
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
  } catch {}
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = Number.parseFloat(node.style.getPropertyValue("--x")) || 0;
  const originY = Number.parseFloat(node.style.getPropertyValue("--y")) || 0;
  node.classList.add("dragging");

  function move(moveEvent) {
    const dx = (moveEvent.clientX - startX) / renderScale;
    const dy = (moveEvent.clientY - startY) / renderScale;
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

$("#projectSearch").addEventListener("input", renderLibrary);

$("#plannerInput").addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    sendPlannerMessage();
  }
});

canvasPlane.addEventListener("wheel", event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setZoom(zoom + (event.deltaY > 0 ? -0.04 : 0.04));
}, { passive: false });

renderTemplates();
renderWorkflow(1);
renderLibrary();
renderPlannerChat();
renderScriptDocument();
renderAssets();
renderTeam();
renderAccount();
renderShotList();
renderQueue();
renderGenerationHistory();
renderNodeInspector();
setCredits(credits);
setZoom(zoom);
renderAuthState();
detectBackend();
