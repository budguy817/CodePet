# 🐾 CodePet — 桌面桌宠伴侣

**CodePet** 是一款基于 Tauri v2 + Vue 3 的透明桌面桌宠应用。一只可爱的宠物生活在你的屏幕上——你可以拖拽它、点击互动，还能展开工作台管理待办事项，查看带有农历和宜忌的日历。

> 透明无边框窗口 · 鼠标穿透 · 始终置顶 · 不打扰你的工作流

---

## ✨ 功能

### 🐱 桌面宠物
- **纯 CSS 动画宠物** — 支持 5 种动画状态：待机 `idle`、点击反馈 `click`、拖拽跟随 `drag`、行走 `walk`、休眠 `sleep`
- **鼠标穿透** — 宠物背景区域自动穿透鼠标事件，不干扰桌面操作
- **窗口拖拽** — 按住宠物身体即可拖到屏幕任意位置
- **右键菜单** — 右键弹出菜单：进入工作台 / 智能问答 / 退出应用
- **点击反馈** — 点击宠物随机显示爱心、颜文字等可爱反馈气泡

### 📅 日历 + 黄历
- **月视图日历** — 仿 Element Plus 风格，支持翻月、日期选中、双击新增工作
- **农历显示** — 每个日期格子展示农历日期（初一显示月名，节日显示节日名）
- **24 节气** — 精确到日的节气标注
- **传统节日** — 春节、元宵、端午、中秋、七夕等自动标记
- **公历节日** — 元旦、劳动节、国庆节等法定节日高亮
- **每日宜忌** — hover 任意日期弹出浮框，显示当日宜忌、干支、建除十二神

### 📋 工作台
- **工作记录管理** — 新增 / 编辑 / 删除待办事项，支持类型（会议/开发/改bug）、紧急程度、内容、进度
- **日历关联** — 日历上有工作的日期自动着色（黄色=未完成，绿色=已完成）
- **筛选视图** — 支持按全部、指定日期、日期范围筛选记录
- **本地持久化** — 基于 `tauri-plugin-store` 自动保存到本地文件，启动即恢复
- **7 种皮肤主题** — 紫白、天空蓝、薄荷绿、暖橘、樱花粉、深色模式

### 🤖 智能问答（开发中）
- **模型选择** — 支持多种 AI 供应商（OpenAI / 硅基流动 / DeepSeek 等）
- **API Key 管理** — 配置 API Key 并支持连接测试
- **对话界面** — 左侧历史列表 + 右侧对话区（发送逻辑待接入）

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri v2](https://v2.tauri.app/) (Rust) |
| 前端框架 | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) |
| 语言 | TypeScript (strict mode) |
| 构建工具 | [Vite](https://vitejs.dev/) |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) |
| 样式 | [Tailwind CSS v4](https://tailwindcss.com/) + Sass |
| 农历/黄历 | [lunar-javascript](https://github.com/6tail/lunar-javascript) |
| 持久化 | `@tauri-apps/plugin-store` |

---

## 📁 项目结构

```
CodePet/
├── index.html                    # 入口 HTML
├── package.json                  # 项目依赖与脚本
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── public/
│   └── CodePet.svg               # 应用图标源文件
├── src/                          # Vue 前端
│   ├── main.ts                   # 入口
│   ├── App.vue                   # 根组件（模式切换 / 窗口尺寸管理）
│   ├── assets/
│   │   └── main.css              # 全局样式 & Tailwind 主题令牌
│   ├── components/
│   │   ├── Pet.vue               # 桌宠主视图（拖拽/菜单/反馈）
│   │   ├── PetAnimation.vue      # 宠物 CSS 动画（5 种状态）
│   │   ├── Calendar.vue          # 月视图日历（农历/节气/hover宜忌）
│   │   ├── Workspace.vue         # 工作台主界面
│   │   ├── WorkForm.vue          # 工作记录表单（增删改）
│   │   ├── WorkLog.vue           # 工作记录列表（筛选/查看）
│   │   ├── SkinPicker.vue        # 皮肤主题选择器
│   │   └── Chat.vue              # 智能问答界面（占位）
│   ├── composables/
│   │   ├── useWindowDrag.ts      # 窗口拖拽封装
│   │   └── useCursorEvents.ts    # 鼠标穿透控制封装
│   ├── stores/
│   │   ├── petStore.ts           # 宠物状态管理（动画/位置/模式）
│   │   └── workStore.ts          # 工作记录管理（CRUD + 持久化）
│   ├── utils/
│   │   ├── lunarCalendar.ts      # 农历转换 & 宜忌计算
│   │   └── urgency.ts            # 紧急程度样式映射
│   ├── constants/
│   │   └── index.ts              # 全局常量（皮肤/星期/工作类型等）
│   └── types/
│       └── lunar-javascript.d.ts # lunar-javascript 类型声明
└── src-tauri/                    # Tauri Rust 后端
    ├── Cargo.toml                # Rust 依赖
    ├── tauri.conf.json           # Tauri 窗口 & 打包配置
    ├── build.rs                  # Tauri 构建脚本
    ├── icons/                    # 各平台应用图标
    └── src/
        ├── main.rs               # Rust 入口
        └── lib.rs                # 命令注册 / 窗口图标 / 插件
```

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/) >= 1.77
- Windows 10+ / macOS 11+ / Linux (X11/Wayland)

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd CodePet

# 安装前端依赖
pnpm install
```

### 开发

```bash
pnpm tauri dev
```

### 构建

```bash
pnpm tauri build
```

构建产物在 `src-tauri/target/release/bundle/` 目录下。

### 更新应用图标

```bash
# 用你的 SVG 图标替换 public/CodePet.svg，然后：
pnpm exec tauri icon "public/CodePet.svg"
pnpm tauri build
```

---

## 🎨 自定义

### 皮肤主题

编辑 `src/constants/index.ts` 中的 `SKIN_PRESETS` 数组：

```ts
export const SKIN_PRESETS: SkinPreset[] = [
  { name: '默认紫白', color: 'rgba(245, 242, 250, 0.95)' },
  { name: '天空蓝',   color: 'rgba(235, 245, 255, 0.95)' },
  // 添加更多...
]
```

### 工作类型

```ts
export const WORK_TYPES = ['会议', '开发', '改bug'] as const
```

### 宠物交互文案

```ts
export const PET_CLICK_MESSAGES: string[] = [
  '❤️', '✨', '💕', '嘿嘿~', '别闹~', '嘤~', // ...
]
```

---

## 📡 Tauri 命令

| 命令 | 参数 | 说明 |
|------|------|------|
| `set_ignore_cursor_events` | `ignore: bool` | 控制鼠标穿透（true=穿透，false=正常） |

前端调用：

```ts
import { invoke } from '@tauri-apps/api/core'
await invoke('set_ignore_cursor_events', { ignore: true })
```

---

## 🧩 核心设计

### 三种应用模式

`petStore.appMode` 控制当前视图：

| 模式 | 窗口尺寸 | 置顶 | 组件 |
|------|---------|------|------|
| `pet` | 210×240 | ✅ | `Pet` |
| `workspace` | 960×600 | ❌ | `Workspace` |
| `chat` | 960×600 | ❌ | `Chat` |

### 鼠标穿透时序

```
mousedown → 关闭穿透（可交互）
  → 拖拽/点击处理
mouseup → 恢复穿透（事件透传到桌面）
```

### 数据流

```
Calendar.vue ← workStore (datesWithRecords, completedDates)
WorkForm.vue → workStore.addRecord() → saveToDisk()
WorkLog.vue  ← workStore.records (filtered)
Pet.vue      ↔ petStore (state, position, appMode)
App.vue      ← petStore.appMode → 切换窗口尺寸/置顶
```

---

## 🗺 待开发

- [✅] Chat 接入真实 AI API（已预留模型选择与连接测试）
- [ ] Lottie 动画替换纯 CSS 宠物动画
- [✅] 系统托盘图标与后台运行
- [ ] 多宠物 / 宠物换装
- [ ] 番茄钟 / 专注模式
- [ ] 数据导出（CSV / JSON）
- [ ] 自定义工作类型

---

## 📄 推荐 IDE

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 📄 许可

MIT License
