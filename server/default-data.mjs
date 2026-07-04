export function createDefaultWorkspace() {
  return {
    credits: 5083,
    plan: "标准会员",
    seatLimit: 8,
    projects: [
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
    ],
    assets: {
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
    },
    plannerMessages: [
      { role: "system", title: "设计短片主要场景细节", body: "将剧本转化为详细的镜头语言和动作描述。", steps: ["提取并确认角色设定", "提取并确认场景设定"] },
      { role: "assistant", title: "YUYU", body: "收到！职场萌宠喜剧第一集即将开机，让我们看看云朵总裁和蛋卷又会闹出什么职场笑话吧。", steps: ["设计角色特征", "调用工具生成角色图", "设计短片主要场景细节", "调用工具生成场景图"] },
      { role: "user", title: "你", body: "继续做第二集，增加一次电梯门口的反转。", card: "第2集：门口偶遇" },
      { role: "assistant", title: "YUYU", body: "已补充第二集结构：蛋卷误触电梯开关，云朵以为它在暗中操控全局，最后发现只是项圈卡住按钮。" }
    ],
    scriptSections: [
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
    ],
    members: [
      { id: "member-owner", name: "Yuyu", role: "Owner", state: "在线" },
      { id: "member-director", name: "Director", role: "导演", state: "审阅中" },
      { id: "member-writer", name: "Writer", role: "编剧", state: "已交付" },
      { id: "member-designer", name: "Designer", role: "美术", state: "待反馈" }
    ],
    comments: [
      { id: "comment-1", author: "导演", body: "镜头 3 的反转需要更明确。", createdAt: "2026-07-03T18:20:00.000Z" },
      { id: "comment-2", author: "编剧", body: "已补充蛋卷内心独白。", createdAt: "2026-07-03T18:28:00.000Z" },
      { id: "comment-3", author: "美术", body: "场景色调已统一为冷灰金属。", createdAt: "2026-07-03T18:42:00.000Z" }
    ],
    usageLedger: [
      ["视频生成", "-180", "职场萌宠喜剧 EP01"],
      ["九宫格图", "-60", "封面拆图"],
      ["多剧集策划", "-40", "短剧漫剧"],
      ["会员补给", "+500", "标准会员"]
    ],
    generationQueue: [
      { id: "q1", type: "视频", title: "电梯超载反转镜头", state: "生成中", progress: 78, cost: 120 },
      { id: "q2", type: "图片", title: "云朵表情参考图", state: "排队中", progress: 32, cost: 30 },
      { id: "q3", type: "导出", title: "EP01 分镜 PDF", state: "已完成", progress: 100, cost: 20 }
    ],
    generationResults: [
      { type: "视频", title: "EP01 预览片段", meta: "00:06 / 16:9 / 1080P" },
      { type: "图片", title: "蛋卷正面参考", meta: "2K / 主体一致性" },
      { type: "文本", title: "镜头 03 动作说明", meta: "已同步到策划文档" }
    ]
  };
}

export function cloneDefaultWorkspace() {
  return structuredClone(createDefaultWorkspace());
}
