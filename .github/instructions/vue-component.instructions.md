---
description: "CodePet Vue 3 组件规范 — Composition API、<script setup>、TypeScript 严格模式、Tailwind CSS、Sass、Pinia store、composables。Use when: 编写或修改 src/ 下的 .vue 文件、创建组件/composable/store、处理窗口拖拽/动画/鼠标穿透。触发词：vue、组件、component、composable、pinia、store、<script setup>、tailwind、sass、宠物、动画、拖拽。"
applyTo: "src/**/*.vue"
---
# CodePet Vue 3 组件规范

本规范适用于 `src/` 下的所有 `.vue` 文件。所有组件必须遵循 Vue 3 Composition API + `<script setup lang="ts">` + TypeScript 严格模式。

**样式方案**：Tailwind CSS v4（原子类）+ Sass/SCSS（嵌套、mixin、变量）。Tailwind 负责布局、间距、颜色等原子样式；Sass 负责复杂动画、组件专属样式和设计令牌。

**代码分离原则**：`.vue` 文件仅包含组件业务逻辑（模板、交互、样式）。硬编码数据（数组、常量配置）、通用工具函数、类型定义等一律提取到独立 `.ts` 文件中：
- 常量配置 → `src/constants/index.ts`
- 工具函数 → `src/utils/xxx.ts`
- 类型定义 → `src/types/xxx.ts`

## 文件结构

```
src/
├── assets/          # 静态资源：Lottie JSON、图片、字体
├── components/      # Vue 组件：Pet.vue、PetAnimation.vue、DialogBubble.vue 等
├── composables/     # 组合式函数：useWindowDrag、useCursorEvents、useAnimation 等
├── stores/          # Pinia 状态管理：petStore.ts、settingsStore.ts 等
├── App.vue          # 根组件
└── main.ts          # 入口文件
```

## 组件模板

### 块顺序（强制）

所有 `.vue` 文件必须按以下顺序组织：`<template>` → `<script setup>` → `<style scoped lang="scss">`

```vue
<!-- ✅ 正确顺序 -->
<template>
  <!-- 模板内容优先，Tailwind 原子类 -->
</template>

<script setup lang="ts">
// 脚本逻辑：所有 import 放在顶部
</script>

<style scoped lang="scss">
/* 组件样式：Sass/SCSS 处理复杂动画和专属样式 */
</style>
```

### `<template>` 块

-   根元素使用语义化 class 命名，**优先使用 Tailwind 原子类**
-   布局、间距、颜色等基础样式直接用 Tailwind 类名
-   条件渲染和列表渲染使用 `v-if` / `v-for`
-   事件绑定统一使用 `@` 语法
-   `pointer-events` 相关 class 必须明确区分穿透区域和可交互区域

```vue
<template>
  <!-- 全屏容器：Tailwind 处理定位 + 透明背景 + 鼠标穿透 -->
  <div class="fixed inset-0 bg-transparent pointer-events-none">
    <!-- 宠物身体：可交互区域 -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
             flex items-center justify-center w-45 h-45 cursor-grab
             pointer-events-auto transition-filter duration-200"
      :class="{ 'cursor-grabbing brightness-105': isDragging }"
      @mousedown.prevent="onMouseDown"
      @click.stop="handleClick"
    >
      <PetAnimation :state="petStore.currentState" />

      <!-- 点击反馈气泡：Tailwind 原子类完成全部样式 -->
      <Transition name="feedback-fade">
        <div
          v-if="showClickFeedback"
          class="absolute -top-8 left-1/2 -translate-x-1/2
                 bg-white/85 backdrop-blur px-3.5 py-1 rounded-2xl
                 text-sm font-medium text-pet-mouth shadow-md
                 pointer-events-none select-none whitespace-nowrap"
        >
          {{ clickFeedbackText }}
        </div>
      </Transition>
    </div>
  </div>
</template>
```

### `<script setup>` 块

所有组件必须使用 `<script setup lang="ts">`，**所有 import 必须放在文件顶部**：

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePetStore } from '@/stores/petStore'
import { useWindowDrag } from '@/composables/useWindowDrag'

// ===== Props（带完整类型） =====
interface Props {
  /** 宠物名称 */
  name: string
  /** 宠物初始位置 */
  initialPosition?: { x: number; y: number }
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: () => ({ x: 100, y: 100 }),
})

// ===== Emits =====
const emit = defineEmits<{
  click: [petName: string]
  dragEnd: [position: { x: number; y: number }]
}>()

// ===== Store / Composable =====
const petStore = usePetStore()
const { isDragging, onMouseDown } = useWindowDrag()

// ===== 本地状态 =====
const localState = ref<string>('idle')

// ===== 计算属性 =====
const displayName = computed(() => `🐾 ${props.name}`)

// ===== 侦听器 =====
watch(() => petStore.currentState, (newState) => {
  // 状态变化时的副作用
})

// ===== 生命周期 =====
onMounted(() => { /* 初始化 */ })
onUnmounted(() => { /* 清理副作用 */ })

// ===== 方法 =====
const handleClick = (): void => {
  if (isDragging.value) return
  emit('click', props.name)
  petStore.setState('click')
  setTimeout(() => petStore.setState('idle'), 1000)
}
</script>
```

### `<style>` 块

样式方案分两层协作：
- **Tailwind CSS v4**：模板中直接使用原子类（布局、间距、简单颜色）
- **Sass/SCSS**：`<style scoped lang="scss">` 处理复杂动画、关键帧、伪元素、嵌套选择器

```vue
<style scoped lang="scss">
/* ========================================
   Sass/SCSS 仅用于 Tailwind 覆盖不到的场景：
   - 复杂 @keyframes 动画
   - 伪元素 (::before, ::after)
   - Sass mixin / 变量 / 嵌套
   ======================================== */

// Sass 变量
$pet-size: 130px;

.pet-body-css {
  width: $pet-size;
  height: $pet-size;
  border-radius: 50%;
  // 引用 CSS 自定义属性（设计令牌）
  background: radial-gradient(
    ellipse at 35% 35%,
    var(--color-pet-pink) 0%,
    var(--color-pet-blue) 100%
  );

  // Sass 嵌套
  &-eye {
    position: absolute;
    background: var(--color-pet-eye);
    border-radius: 50%;
  }
}

// Sass mixin：动画复用
@mixin pet-float($duration: 3s) {
  animation: pet-idle-float $duration ease-in-out infinite;
}

.pet-state--idle .pet-body-css {
  @include pet-float(3s);
}

@keyframes pet-idle-float {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-6px) scale(1.03); }
}
</style>
```

## Tailwind CSS + Sass 使用规范

### 分工原则

| 场景 | 方案 | 示例 |
|------|------|------|
| 布局、间距、简单颜色 | Tailwind 原子类 | `flex items-center gap-2 px-4` |
| 响应式、状态变体 | Tailwind 变体 | `hover:brightness-105 md:flex-row` |
| 设计令牌引用 | Tailwind 主题类 | `text-pet-mouth bg-pet-pink` |
| 复杂动画、关键帧 | Sass/SCSS | `@keyframes`、`@include` |
| 伪元素、深度选择器 | Sass/SCSS | `&::before`、`&:nth-child` |
| 组件专属样式 | Sass/SCSS | 嵌套、mixin、变量 |

### 设计令牌

全局 CSS 变量定义在 `src/assets/main.css` 的 `@theme` 块中，Tailwind 和 SCSS 均可引用：

```css
/* src/assets/main.css */
@import "tailwindcss";

@theme {
  --color-pet-pink: #ffb3c1;
  --color-pet-blue: #93c5e8;
  --color-pet-eye: #3d3055;
  --color-pet-mouth: #6d5080;
  --color-bubble-bg: rgba(255, 255, 255, 0.85);
  --shadow-pet: 0 6px 20px rgba(150, 150, 180, 0.25);
  --duration-idle: 3s;
}
```

- Tailwind 用法：`bg-pet-pink`、`text-pet-mouth`、`shadow-pet`
- SCSS 用法：`color: var(--color-pet-eye)`、`animation-duration: var(--duration-idle)`

### Sass/SCSS 约束

-   仅 `<style scoped lang="scss">` 块使用 SCSS 语法
-   SCSS 变量和 mixin 仅在当前组件作用域内使用
-   可跨组件复用的样式抽象优先使用 Tailwind `@theme` 令牌，而非 SCSS 全局变量

## Composable 规范

### 命名

-   文件名：`useXxxYyy.ts`（驼峰命名）
-   函数名：`useXxxYyy()`（与文件名一致）
-   存放位置：`src/composables/`

### 返回值

Composable 必须返回明确类型的对象或响应式引用：

```typescript
// composables/useCursorEvents.ts
import { invoke } from '@tauri-apps/api/core'

/** 鼠标穿透控制组合式函数 */
export function useCursorEvents() {
  /** 设置窗口鼠标穿透状态 */
  const setIgnoreCursorEvents = async (ignore: boolean): Promise<void> => {
    await invoke('set_ignore_cursor_events', { ignore })
  }

  return { setIgnoreCursorEvents }  // ✅ 返回清晰的对象
}
```

### 状态封装

Composable 内部的状态必须在 `onUnmounted` 时清理：

```typescript
export function useWindowDrag() {
  const isDragging = ref(false)
  // ... 逻辑

  onUnmounted(() => {
    // 组件销毁时确保恢复穿透状态
    setIgnoreCursorEvents(true)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })

  return { isDragging, onMouseDown }
}
```

## Pinia Store 规范

### 定义格式

使用组合式 API 风格（Setup Store），不使用 Options API：

```typescript
// stores/petStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** 宠物动画状态 */
export type PetState = 'idle' | 'walk' | 'click' | 'drag' | 'sleep'

/** 宠物位置 */
export interface PetPosition {
  x: number
  y: number
}

export const usePetStore = defineStore('pet', () => {
  // ===== 状态 =====
  const currentState = ref<PetState>('idle')
  const position = ref<PetPosition>({ x: 100, y: 100 })

  // ===== 计算属性 =====
  const isMoving = computed(() => currentState.value === 'walk' || currentState.value === 'drag')

  // ===== 操作 =====
  /** 切换宠物动画状态 */
  const setState = (state: PetState): void => {
    currentState.value = state
  }

  /** 更新宠物位置 */
  const setPosition = (x: number, y: number): void => {
    position.value = { x, y }
  }

  return { currentState, position, isMoving, setState, setPosition }
})
```

## TypeScript 类型要求

-   所有 `props` 使用 `interface` + `defineProps<T>()` 声明
-   所有 `emits` 使用 `defineEmits<T>()` 声明
-   所有 composable 函数显式标注返回类型
-   所有 store 导出类型（`PetState`、`PetPosition` 等）供组件引用
-   禁止使用 `any`，必要时使用 `unknown` + 类型守卫
-   使用 `@tauri-apps/api` v2 的窗口类型（`getCurrentWindow()` 返回 `Window` 类型）

## 通信模式

### Vue → Rust（调用 Tauri 命令）

```typescript
import { invoke } from '@tauri-apps/api/core'

// 调用 Rust 命令
const result = await invoke<string>('greet', { name: 'CodePet' })

// 调用窗口操作
import { getCurrentWindow } from '@tauri-apps/api/window'
const appWindow = getCurrentWindow()
await appWindow.setPosition({ type: 'Physical', x: 100, y: 200 })
```

### Rust → Vue（监听事件，如需要）

```typescript
import { listen } from '@tauri-apps/api/event'

const unlisten = await listen<string>('pet-event', (event) => {
  console.log('收到后端事件:', event.payload)
})

onUnmounted(() => {
  unlisten()  // 组件销毁时必须取消监听
})
```

## 动画回退策略

当 Lottie 动画不可用时（文件过大 > 500KB / 加载超时 2s / 解析失败），必须提供 CSS 降级动画：

```vue
<script setup lang="ts">
const useLottie = ref(true)  // 是否使用 Lottie
const loadError = ref(false)

const handleLottieError = () => {
  loadError.value = true
  useLottie.value = false
  console.warn('[CodePet] Lottie 动画加载失败，启用 CSS 降级动画')
}
</script>

<template>
  <div class="pet-body">
    <LottieAnimation
      v-if="useLottie"
      :animation-data="animations[petStore.currentState]"
      @error="handleLottieError"
    />
    <!-- CSS 降级动画 -->
    <div v-else class="css-fallback" :class="`css-${petStore.currentState}`" />
  </div>
</template>
```

## 行数限制

-   单个 `.vue` 组件不超过 200 行（不含模板），超过则拆分子组件
-   单个 composable 文件不超过 80 行
-   单个 store 文件不超过 100 行

## 禁止事项

-   **禁止** 使用 Options API（`data`、`methods`、`computed` 等选项）
-   **禁止** 使用 `<script>` 替代 `<script setup>`
-   **禁止** 打乱 `<template>` → `<script>` → `<style>` 的块顺序
-   **禁止** 引入重型 UI 库（Element Plus、Ant Design Vue、Vuetify 等）
-   **禁止** 使用 `any` 类型
-   **禁止** 在 `<style>` 中省略 `scoped` 属性
-   **禁止** 在模板中使用 `v-html`（XSS 风险）
-   **禁止** 在组件中直接操作 DOM（使用 `ref` + `watch` 代替）
-   **禁止** 在 Tailwind 能覆盖的场景写自定义 CSS（冗余）
-   **禁止** 使用 `!important` 或内联 `:style` 绑定
-   **禁止** 在 `.vue` 文件中硬编码常量数组、配置数据、工具函数（一律提取到 `src/constants/` 或 `src/utils/`）
