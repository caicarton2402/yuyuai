const promptInput = document.getElementById("promptInput");
const promptPrefix = document.getElementById("promptPrefix");
const toolPanel = document.getElementById("toolPanel");
const templateGrid = document.getElementById("templateGrid");
const workspacePanel = document.getElementById("workspacePanel");
const workspaceTitle = document.getElementById("workspaceTitle");
const workspaceCopy = document.getElementById("workspaceCopy");
const toast = document.getElementById("toast");

const categories = {
  overseas: {
    prefix: "出海短剧 /",
    title: "出海短剧项目已创建",
    copy: "已按海外短剧结构拆解爽点、反转和多集节奏。",
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
    prefix: "音乐MV /",
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
    chips: ["上传图片", "上传视频", "导入脚本"]
  },
  asset: {
    title: "角色和场景资产",
    body: "从角色、场景、道具三个维度组织内容，适合连续短剧和多集故事保持一致性。",
    chips: ["主角设定", "场景库", "道具清单"]
  },
  mention: {
    title: "引用角色",
    body: "在提示词中引用已有角色或创作者协作成员，让 AI 保持相同人设和语气。",
    chips: ["@女主", "@反派", "@导演视角"]
  },
  style: {
    title: "风格控制",
    body: "选择画面风格、镜头语言和色彩倾向。当前默认匹配短剧漫剧的高对比暗色氛围。",
    chips: ["写实短剧", "国漫质感", "赛博夜景"]
  }
};

const featureDetails = {
  blank: ["空白画布", "从零开始搭建角色、场景、提示词和视频节点。"],
  effects: ["特效模板", "套用热门视觉特效模板，快速生成可复用片段。"],
  seedance: ["Seedance2.0 视频生成", "使用全能模式把故事提示词扩展为视频生成任务。"],
  grid: ["九宫格图", "把同一主题拆成九张可发布封面或分镜图。"],
  panorama: ["720°全景图", "生成全景空间，用于奇幻、旅行和沉浸式场景。"]
};

let activeCategory = "overseas";
let toastTimer = 0;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderTemplates() {
  const category = categories[activeCategory];
  promptPrefix.textContent = category.prefix;
  templateGrid.innerHTML = category.templates.map(item => `
    <button class="template-card" type="button" data-template="${item.id}" style="--template-image: url('${item.image}')">
      <span>${item.title}</span>
    </button>
  `).join("");
}

function openToolPanel(toolName) {
  const tool = tools[toolName];
  document.querySelectorAll("[data-tool]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.tool === toolName));
  });
  toolPanel.hidden = false;
  toolPanel.innerHTML = `
    <strong>${tool.title}</strong>
    <p>${tool.body}</p>
    <div class="panel-chips">
      ${tool.chips.map(chip => `<button type="button" data-chip="${chip}">${chip}</button>`).join("")}
    </div>
  `;
}

function closeToolPanel() {
  toolPanel.hidden = true;
  document.querySelectorAll("[data-tool]").forEach(button => button.setAttribute("aria-pressed", "false"));
}

function selectCategory(nextCategory) {
  activeCategory = nextCategory;
  document.querySelectorAll("[data-category]").forEach(button => {
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
  document.querySelectorAll("[data-template]").forEach(card => {
    card.classList.toggle("selected", card.dataset.template === templateId);
  });
  showWorkspace(template.title, `已载入「${template.title}」模板，可继续生成故事策划。`);
}

function showWorkspace(title = categories[activeCategory].title, copy = categories[activeCategory].copy) {
  workspaceTitle.textContent = title;
  workspaceCopy.textContent = copy;
  workspacePanel.hidden = false;
  showToast("工作台已准备");
}

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => selectCategory(button.dataset.category));
});

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    const isPressed = button.getAttribute("aria-pressed") === "true";
    if (isPressed) {
      closeToolPanel();
      return;
    }
    openToolPanel(button.dataset.tool);
  });
});

templateGrid.addEventListener("click", event => {
  const card = event.target.closest("[data-template]");
  if (!card) return;
  selectTemplate(card.dataset.template);
});

document.querySelectorAll("[data-feature]").forEach(button => {
  button.addEventListener("click", () => {
    const [title, copy] = featureDetails[button.dataset.feature];
    promptInput.value = copy;
    showWorkspace(title, copy);
  });
});

document.getElementById("sendBtn").addEventListener("click", () => {
  const text = promptInput.value.trim();
  showWorkspace(categories[activeCategory].title, text ? `已接收灵感：「${text}」` : categories[activeCategory].copy);
});

document.getElementById("seriesToggle").addEventListener("change", event => {
  showToast(event.target.checked ? "已开启多剧集策划" : "已切换为单集创作");
});

document.addEventListener("click", event => {
  const chip = event.target.closest("[data-chip]");
  if (chip) {
    promptInput.value = `${promptInput.value.trim()} ${chip.dataset.chip}`.trim();
    showToast(`已加入 ${chip.dataset.chip}`);
  }
  if (event.target.closest("[data-action='close-workspace']")) {
    workspacePanel.hidden = true;
  }
  if (event.target.closest("[data-action='continue-workflow']")) {
    showToast("下一步将进入画布节点编辑");
  }
  if (event.target.closest("[data-action='model']")) {
    showToast("Seedance2.0 全能模式已启用");
  }
  if (event.target.closest("[data-action='translator']")) {
    showToast("语言助手已打开");
  }
});

renderTemplates();
