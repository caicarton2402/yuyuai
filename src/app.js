const canvas = document.getElementById("canvasBg");
const shell = document.querySelector(".app-shell");
const zoomValue = document.getElementById("zoomValue");
const pathCharacter = document.getElementById("pathCharacter");
const pathLocation = document.getElementById("pathLocation");
const toast = document.getElementById("toast");

const defaults = {
  zoom: 0.78,
  panX: 0,
  panY: 0,
  nodes: {
    character: { x: 508, y: 52, w: 289, h: 450 },
    location: { x: 397, y: 538, w: 509, h: 305 },
    video: { x: 1018, y: 333, w: 506, h: 303 }
  }
};

const state = JSON.parse(JSON.stringify(defaults));
let fitScale = 1;
let toastTimer = 0;

function activateInteractive() {
  shell?.classList.add("interactive-active");
}

function setFitScale() {
  fitScale = Math.min(window.innerWidth / 1920, window.innerHeight / 863, 1);
  document.documentElement.style.setProperty("--fit", fitScale.toFixed(4));
  syncTransform();
}

function syncTransform() {
  document.documentElement.style.setProperty("--zoom", state.zoom.toFixed(3));
  document.documentElement.style.setProperty("--effective-zoom", (state.zoom / defaults.zoom).toFixed(3));
  document.documentElement.style.setProperty("--pan-x", `${state.panX}px`);
  document.documentElement.style.setProperty("--pan-y", `${state.panY}px`);
  zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  updateConnectors();
}

function updateConnectors() {
  const c = state.nodes.character;
  const l = state.nodes.location;
  const v = state.nodes.video;
  const cStart = { x: c.x + c.w, y: c.y + 238 };
  const lStart = { x: l.x + l.w, y: l.y + 158 };
  const end = { x: v.x, y: v.y + 164 };
  pathCharacter.setAttribute("d", curved(cStart, end, 1));
  pathLocation.setAttribute("d", curved(lStart, end, -1));
}

function curved(a, b, bias) {
  const mid = a.x + (b.x - a.x) * 0.52;
  const yBias = bias > 0 ? -34 : 36;
  return `M ${a.x} ${a.y} C ${mid} ${a.y + yBias}, ${mid} ${b.y - yBias}, ${b.x} ${b.y}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1400);
}

function setZoom(nextZoom) {
  activateInteractive();
  state.zoom = Math.max(0.4, Math.min(1.6, nextZoom));
  syncTransform();
}

function resetLayout() {
  activateInteractive();
  state.zoom = defaults.zoom;
  state.panX = defaults.panX;
  state.panY = defaults.panY;
  for (const [key, pos] of Object.entries(defaults.nodes)) {
    state.nodes[key] = { ...pos };
    const node = document.querySelector(`[data-node="${key}"]`);
    if (node) {
      node.style.setProperty("--x", `${pos.x}px`);
      node.style.setProperty("--y", `${pos.y}px`);
    }
  }
  syncTransform();
  showToast("已恢复自动布局");
}

function makeDraggable(node) {
  const id = node.dataset.node;
  let drag = null;

  node.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    activateInteractive();
    node.setPointerCapture(event.pointerId);
    const current = state.nodes[id];
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: current.x,
      nodeY: current.y
    };
    node.classList.add("dragging");
  });

  node.addEventListener("pointermove", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scale = fitScale * (state.zoom / defaults.zoom);
    const nextX = drag.nodeX + (event.clientX - drag.startX) / scale;
    const nextY = drag.nodeY + (event.clientY - drag.startY) / scale;
    state.nodes[id].x = Math.round(nextX);
    state.nodes[id].y = Math.round(nextY);
    node.style.setProperty("--x", `${state.nodes[id].x}px`);
    node.style.setProperty("--y", `${state.nodes[id].y}px`);
    updateConnectors();
  });

  node.addEventListener("pointerup", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    node.classList.remove("dragging");
  });
}

function addPromptNode() {
  activateInteractive();
  const id = `prompt-${Date.now()}`;
  const node = document.createElement("section");
  node.className = "node";
  node.dataset.node = id;
  state.nodes[id] = { x: 820, y: 182, w: 252, h: 108 };
  node.style.setProperty("--x", "820px");
  node.style.setProperty("--y", "182px");
  node.innerHTML = `
    <div class="node-label">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h10v10H3zM5.5 6h5M5.5 9h3.2"/></svg>
      <span>新提示词</span>
    </div>
    <div class="prompt-node">
      <strong>创作节点</strong>
      <p>本地复刻演示节点，可拖拽并参与画布布局。</p>
    </div>`;
  canvas.appendChild(node);
  makeDraggable(node);
  showToast("已添加创作节点");
}

function setMode(button) {
  activateInteractive();
  document.querySelectorAll(".mode-switch button").forEach(item => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });
  showToast(button.dataset.mode === "editor" ? "编辑器视图已切换" : "画布视图已切换");
}

document.querySelectorAll(".node").forEach(makeDraggable);

document.getElementById("zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.08));
document.getElementById("zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.08));
document.getElementById("autoLayout").addEventListener("click", resetLayout);

document.querySelectorAll(".mode-switch button").forEach(button => {
  button.addEventListener("click", () => setMode(button));
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    activateInteractive();
    const action = button.dataset.action;
    if (action === "add") return addPromptNode();
    if (action === "hand") return showToast("拖动画布空白处可平移");
    if (action === "assistant") return showToast("智能助手入口");
    if (action === "keyboard") return showToast("快捷键面板");
    showToast("本地复刻控件");
  });
});

let pan = null;
canvas.addEventListener("pointerdown", event => {
  if (event.target.closest(".node")) return;
  activateInteractive();
  canvas.setPointerCapture(event.pointerId);
  pan = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    panX: state.panX,
    panY: state.panY
  };
});

canvas.addEventListener("pointermove", event => {
  if (!pan || pan.pointerId !== event.pointerId) return;
  state.panX = Math.round(pan.panX + event.clientX - pan.startX);
  state.panY = Math.round(pan.panY + event.clientY - pan.startY);
  syncTransform();
});

canvas.addEventListener("pointerup", event => {
  if (pan && pan.pointerId === event.pointerId) pan = null;
});

window.addEventListener("wheel", event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  activateInteractive();
  setZoom(state.zoom + (event.deltaY < 0 ? 0.04 : -0.04));
}, { passive: false });

window.addEventListener("resize", setFitScale);
setFitScale();
syncTransform();

if (new URLSearchParams(window.location.search).get("interactive") === "1") {
  activateInteractive();
}
