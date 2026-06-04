# CodePet 桌宠项目开发技能

## 元数据

```yaml
name: codepet
description: Tauri + Vue 3 + TypeScript 桌面宠物应用开发指南
trigger:
  - codepet
  - 桌宠
  - desktop pet
  - tauri vue
  - 透明窗口
  - 鼠标穿透
version: 1.0.0
```

## 概述

CodePet 是一个用 Tauri v2 + Vue 3 + TypeScript 构建的桌面宠物应用。创建透明、无边框、置顶的桌面窗口，显示可爱的宠物角色，支持鼠标穿透、拖拽移动和交互动画。

**边界情况处理**：所有窗口操作和 IPC 调用均需考虑多显示器、DPI 缩放、平台差异以及调用失败时的安全回退。涉及状态切换的功能（如鼠标穿透）必须有明确的进入/退出时序和失败恢复机制，避免竞态导致窗口卡死。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面壳 | Tauri v2 | Rust 后端 |
| 前端框架 | Vue 3 | Composition API + `<script setup>` |
| 语言 | TypeScript | 类型安全 |
| 构建工具 | Vite | 快速开发 |
| 状态管理 | Pinia | 响应式状态 |
| 动画方案 | Lottie（首选）/ CSS（降级）/ Canvas（像素操控） | 首选 lottie-web 或 @lottiefiles/dotlottie-web；若 Lottie 文件 > 500KB 或首次渲染超时 2s 则降级为 CSS animation；若需像素级操控（如颜色变换）则使用 Canvas |
| 包管理器 | pnpm / npm | 若项目根目录存在 pnpm-lock.yaml 则使用 pnpm；否则若存在 package-lock.json 则使用 npm；默认推荐 pnpm |

## 目录结构

```
CodePet/
├── src/                          # 前端源码
│   ├── assets/                   # 静态资源（Lottie JSON、图片、样式）
│   ├── components/               # Vue 组件（宠物本体、对话框、菜单等）
│   ├── composables/              # 组合式函数（动画控制、窗口拖拽、IPC）
│   ├── stores/                   # Pinia 状态管理
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 入口
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   └── main.rs               # 窗口创建、托盘、命令注册
│   ├── Cargo.toml
│   └── tauri.conf.json           # 窗口配置
├── public/                       # 静态资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 核心功能实现

### 1. 透明无边框置顶窗口

**tauri.conf.json 配置：**

```json
{
  "app": {
    "windows": [
      {
        "title": "CodePet",
        "width": 300,
        "height": 300,
        "transparent": true,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false
      }
    ]
  }
}
```

> **skipTaskbar 说明**：默认 `true`（桌面宠物不占用任务栏空间）；如果需要在任务栏显示图标以便用户快速找到窗口，请设为 `false`。
>
> **多显示器与 DPI 缩放**：设置/获取窗口位置时需基于当前显示器的逻辑像素和缩放因子（使用 `Physical` 位置类型）；拖拽时限制窗口位置使其始终至少部分可见于当前显示器，避免窗口完全移出屏幕。

### 2. 鼠标穿透

宠物背景区域让鼠标事件穿透到桌面，宠物身体可点击交互。

**“身体”与“透明背景”的判定规则**：将 DOM 元素分为两层——底层为全透明容器（pointer-events: none，始终穿透），上层为宠物身体元素（pointer-events: auto，可交互）。具体而言：宠物角色的 `.pet-body` 元素（或包含 Lottie/Canvas 的 DOM 节点）为可点击区域（穿透关闭）；其余区域为透明背景（穿透开启）。若需要像素级精度，可将像素 alpha >= 0.1 视为身体、alpha < 0.1 视为透明背景，或使用 SVG 碰撞路径精确划定可交互区域。

**Rust 命令（main.rs）：**

```rust
use tauri::Manager;

#[tauri::command]
fn set_ignore_cursor_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_ignore_cursor_events])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Vue 前端调用：**

```typescript
// composables/useCursorEvents.ts
import { invoke } from '@tauri-apps/api/core'

export function useCursorEvents() {
  const setIgnoreCursorEvents = async (ignore: boolean) => {
    await invoke('set_ignore_cursor_events', { ignore })
  }

  return { setIgnoreCursorEvents }
}
```

### 3. 拖拽移动

**事件时序（必须严格遵循）**：
1. `mousedown` → 记录起始屏幕坐标 `(e.screenX, e.screenY)`，调用 `set_ignore_cursor_events(false)` 禁用穿透
2. `mousemove` → 计算 delta，调用 `setPosition({ type: 'Physical', x, y })` 更新窗口位置（限频 60ms 间隔）；若 `setPosition` 连续 2 次失败则停止更新并提示错误
3. `mouseup` → 调用 `set_ignore_cursor_events(true)` 恢复穿透，停止监听；若 500ms 内无移动事件则同样视为拖拽结束并恢复穿透

**失败回退**：若 `setPosition` 调用失败，重试最多 2 次；若仍失败则回滚到拖拽前位置并恢复穿透。若 `set_ignore_cursor_events` 失败，记录错误日志并在 UI 显示非阻塞提示，将该功能标记为不可用，所有依赖穿透的操作回退为始终允许点击。

**限频处理**：对 `setPosition` 调用实施 60ms 节流，避免高频调用导致窗口抖动。

```typescript
// composables/useWindowDrag.ts
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCursorEvents } from './useCursorEvents'

export function useWindowDrag() {
  const isDragging = ref(false)
  const startPos = ref({ x: 0, y: 0 })
  const { setIgnoreCursorEvents } = useCursorEvents()

  const onMouseDown = async (e: MouseEvent) => {
    isDragging.value = true
    startPos.value = { x: e.screenX, y: e.screenY }
    // 拖拽时禁用穿透
    await setIgnoreCursorEvents(false)
  }

  const onMouseMove = async (e: MouseEvent) => {
    if (!isDragging.value) return
    
    const window = getCurrentWindow()
    const pos = await window.outerPosition()
    const deltaX = e.screenX - startPos.value.x
    const deltaY = e.screenY - startPos.value.y
    
    await window.setPosition({
      type: 'Physical',
      x: pos.x + deltaX,
      y: pos.y + deltaY
    })
    
    startPos.value = { x: e.screenX, y: e.screenY }
  }

  const onMouseUp = async () => {
    isDragging.value = false
    // 恢复穿透
    await setIgnoreCursorEvents(true)
  }

  return { isDragging, onMouseDown, onMouseMove, onMouseUp }
}
```

### 4. 动画状态机

```typescript
// stores/petStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PetState = 'idle' | 'walk' | 'click' | 'drag' | 'sleep'

export const usePetStore = defineStore('pet', () => {
  const currentState = ref<PetState>('idle')
  const position = ref({ x: 100, y: 100 })

  const setState = (state: PetState) => {
    currentState.value = state
  }

  const setPosition = (x: number, y: number) => {
    position.value = { x, y }
  }

  return { currentState, position, setState, setPosition }
})
```

### 5. Lottie 动画组件

**加载策略与回退**：
- 首选使用 lottie-web 加载 JSON 动画；若 Lottie 文件超过 500KB 或首次渲染超时 2s，回退到预渲染的精灵图（sprite sheet）或 CSS animation
- 若 Lottie 加载失败（网络错误或 JSON 解析错误），展示备用静态占位图并在后台每 5 秒重试，最多重试 2 次
- 所有加载/解析错误需记录详细日志到输出面板

```vue
<!-- components/PetAnimation.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'
import { usePetStore } from '@/stores/petStore'

const petStore = usePetStore()
const container = ref<HTMLDivElement>()
let animation: AnimationItem | null = null

const animations: Record<string, string> = {
  idle: '/animations/idle.json',
  walk: '/animations/walk.json',
  click: '/animations/click.json',
  drag: '/animations/drag.json',
  sleep: '/animations/sleep.json'
}

const loadAnimation = (state: string) => {
  if (animation) animation.destroy()
  
  animation = lottie.loadAnimation({
    container: container.value!,
    renderer: 'svg',
    loop: state !== 'click',
    autoplay: true,
    path: animations[state]
  })
}

onMounted(() => {
  loadAnimation(petStore.currentState)
})

watch(() => petStore.currentState, (newState) => {
  loadAnimation(newState)
})
</script>

<template>
  <div ref="container" class="pet-animation" />
</template>

<style scoped>
.pet-animation {
  width: 200px;
  height: 200px;
  pointer-events: none;
}
</style>
```

### 6. 宠物主组件

```vue
<!-- components/Pet.vue -->
<script setup lang="ts">
import { usePetStore } from '@/stores/petStore'
import { useWindowDrag } from '@/composables/useWindowDrag'
import { useCursorEvents } from '@/composables/useCursorEvents'
import PetAnimation from './PetAnimation.vue'

const petStore = usePetStore()
const { onMouseDown, onMouseMove, onMouseUp, isDragging } = useWindowDrag()
const { setIgnoreCursorEvents } = useCursorEvents()

const handleClick = () => {
  if (!isDragging.value) {
    petStore.setState('click')
    setTimeout(() => petStore.setState('idle'), 1000)
  }
}

const handleMouseEnter = () => {
  setIgnoreCursorEvents(false)
}

const handleMouseLeave = () => {
  if (!isDragging.value) {
    setIgnoreCursorEvents(true)
  }
}
</script>

<template>
  <div
    class="pet-container"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <PetAnimation />
  </div>
</template>

<style scoped>
.pet-container {
  cursor: grab;
  user-select: none;
}

.pet-container:active {
  cursor: grabbing;
}
</style>
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发模式（热更新）
pnpm tauri dev

# 构建生产包
pnpm tauri build

# 仅前端开发
pnpm dev
```

## 最佳实践

1. **鼠标穿透协作**：拖拽时按严格事件时序禁用穿透（mousedown 禁用 → mousemove 更新位置 → mouseup 恢复）；若 500ms 无移动则自动恢复穿透，避免遗漏恢复调用
2. **动画状态管理**：使用 Pinia 统一管理动画状态机
3. **性能优化**：Lottie 动画使用 SVG 渲染器，避免 Canvas 在透明窗口的问题；大文件降级为 CSS/精灵图
4. **IPC 通信**：封装 composables 统一管理 Tauri API 调用；所有 `invoke` 调用若返回错误应记录到输出面板并重试最多 3 次，仍失败则呈现非阻塞通知并回退到安全状态
5. **类型安全**：为所有 Rust 命令定义 TypeScript 类型
6. **跨平台兼容**：Windows 支持鼠标穿透（测试 SetWindowLong 行为）；macOS 可能需要特殊 NSWindow 配置（`setIgnoresMouseEvents:`）；Linux 行为因窗口管理器不同而异；若平台不支持则提供降级方案并在设置中允许用户开启/关闭该功能
7. **错误处理**：`set_ignore_cursor_events` 调用失败时记录错误、显示非阻塞提示并将功能标记为不可用，所有依赖穿透的操作使用安全回退（始终允许点击）

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 窗口不透明 | 检查 `transparent: true` 配置，确保 CSS 背景为透明 |
| 鼠标无法点击 | 检查 `set_ignore_cursor_events` 调用逻辑 |
| 拖拽卡顿 | 使用 `Physical` 位置类型，避免频繁状态更新 |
| 动画不显示 | 确认 Lottie JSON 路径正确，检查 public 目录 |
| 构建后无法运行 | 确保 Rust 环境正确，检查构建日志 |