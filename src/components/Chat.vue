<!--
  文件路径: src/components/Chat.vue
  智能问答组件

  DeepSeek 风格左右布局：
  - 左侧 1/3：对话历史 + 底部操作按钮
  - 右侧 2/3：对话区域
  与工作台共享相同顶栏（返回桌宠 + 皮肤选择器）
-->
<template>
  <div class="chat" :style="{ background: currentSkin }">
    <!-- 左侧边栏 -->
    <div class="chat-sidebar">
      <div class="chat-sidebar-header">
        <span class="chat-sidebar-title">对话记录</span>
      </div>

      <div class="chat-sidebar-list">
        <div class="chat-sidebar-empty">暂无对话记录</div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="chat-sidebar-actions">
        <button class="chat-action-btn" @click="showModelDialog = true">
          🤖 切换模型
        </button>

        <!-- 当前模型 -->
        <div class="chat-current-model" v-if="currentModel">
          {{ currentModel }}
        </div>
      </div>
    </div>

    <!-- 模型选择弹框 -->
    <Transition name="modal-fade">
      <div v-if="showModelDialog" class="model-overlay" @click.self="showModelDialog = false">
        <div class="model-dialog">
          <div class="model-dialog-header">
            <span class="model-dialog-title">模型设置</span>
            <button class="model-dialog-close" @click="showModelDialog = false">✕</button>
          </div>

          <!-- 模型列表 -->
          <div class="model-dialog-body">
            <label class="model-label">选择模型</label>
            <div class="model-list">
              <button
                v-for="m in availableModels"
                :key="m.id"
                class="model-item"
                :class="{ 'model-item--active': selectedModelId === m.id }"
                @click="selectedModelId = m.id"
              >
                <span class="model-item-name">{{ m.name }}</span>
                <span class="model-item-provider">{{ m.provider }}</span>
              </button>
            </div>

            <!-- API Key -->
            <label class="model-label">API Key</label>
            <input
              v-model="apiKey"
              type="password"
              class="model-input"
              :placeholder="apiKeyPlaceholder"
            />

            <!-- 连接测试消息 -->
            <div v-if="testMessage" class="model-test-msg" :class="testSuccess ? 'msg-success' : 'msg-error'">
              {{ testMessage }}
            </div>
          </div>

          <div class="model-dialog-footer">
            <button class="model-btn model-btn--test" @click="testConnection" :disabled="!apiKey || testing">
              {{ testing ? '测试中...' : '🔗 测试连接' }}
            </button>
            <button class="model-btn model-btn--save" @click="saveSettings" :disabled="!apiKey">
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 右侧对话区 -->
    <div class="chat-main">
      <!-- 顶部栏 -->
      <div class="chat-topbar" @mousedown="onTopbarMouseDown">
        <button class="chat-back-btn" @click="handleClose">← 返回桌宠</button>
        <SkinPicker v-model="currentSkin" />
      </div>

      <!-- 对话内容 -->
      <div class="chat-area">
        <div class="chat-welcome">
          <div class="chat-welcome-icon">🤖</div>
          <div class="chat-welcome-title">CodePet AI 助手</div>
          <div class="chat-welcome-desc">有什么可以帮你的？</div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input-bar">
        <textarea
          v-model="inputText"
          class="chat-input"
          rows="1"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="sendMessage"
        />
        <button class="chat-send-btn" @click="sendMessage">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import { usePetStore } from '@/stores/petStore'
import { useCursorEvents } from '@/composables/useCursorEvents'
import { DEFAULT_SKIN } from '@/constants'
import SkinPicker from './SkinPicker.vue'

const petStore = usePetStore()
const appWindow = getCurrentWindow()
const { setIgnoreCursorEvents } = useCursorEvents()

// ===== 模型选择 =====
interface ModelOption {
  id: string
  name: string
  provider: string
  apiUrl: string
}

const availableModels: ModelOption[] = [
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1/chat/completions' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1/chat/completions' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', apiUrl: 'https://api.openai.com/v1/chat/completions' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', apiUrl: 'https://api.openai.com/v1/chat/completions' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', apiUrl: 'https://api.anthropic.com/v1/messages' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', apiUrl: 'https://api.anthropic.com/v1/messages' },
  { id: 'qwen-max', name: 'Qwen-Max', provider: '阿里云', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
  { id: 'glm-4', name: 'GLM-4', provider: '智谱AI', apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' },
]

const STORAGE_MODEL = 'codepet-chat-model'
const STORAGE_APIKEY_PREFIX = 'codepet-chat-apikey-'

const showModelDialog = ref<boolean>(false)
const selectedModelId = ref<string>(localStorage.getItem(STORAGE_MODEL) || 'deepseek-v4-pro')
const apiKey = ref<string>('')
const testing = ref<boolean>(false)
const testMessage = ref<string>('')
const testSuccess = ref<boolean>(false)

/** 当前模型名称 */
const currentModel = computed(() => {
  const m = availableModels.find((m) => m.id === selectedModelId.value)
  return m ? `${m.name} (${m.provider})` : ''
})

/** 获取当前模型配置 */
const currentModelConfig = computed(() => {
  return availableModels.find((m) => m.id === selectedModelId.value)
})

const apiKeyPlaceholder = computed(() => {
  const m = currentModelConfig.value
  return m ? `输入 ${m.provider} 的 API Key` : '输入 API Key'
})

/** 打开弹框时加载已保存的 API Key */
const loadApiKey = (): void => {
  const key = localStorage.getItem(STORAGE_APIKEY_PREFIX + selectedModelId.value)
  if (key) apiKey.value = key
}
watch(showModelDialog, (val) => {
  if (val) loadApiKey()
})

/** 测试连接 */
const testConnection = async (): Promise<void> => {
  const model = currentModelConfig.value
  if (!model || !apiKey.value.trim()) return

  testing.value = true
  testMessage.value = ''

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    // 不同厂商的认证方式
    if (model.provider === 'OpenAI' || model.provider === 'DeepSeek') {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    } else if (model.provider === 'Anthropic') {
      headers['x-api-key'] = apiKey.value
      headers['anthropic-version'] = '2023-06-01'
    } else if (model.provider === '阿里云') {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    } else if (model.provider === '智谱AI') {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    }

    const body = model.provider === 'Anthropic'
      ? JSON.stringify({ model: model.id.replace('claude-', 'claude-'), max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] })
      : JSON.stringify({ model: model.id, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] })

    const res = await fetch(model.apiUrl, { method: 'POST', headers, body })

    if (res.ok) {
      testSuccess.value = true
      testMessage.value = '✅ 连接成功！API Key 有效'
    } else {
      const err = await res.text()
      testSuccess.value = false
      testMessage.value = `❌ 连接失败 (${res.status})：${err.slice(0, 100)}`
    }
  } catch (e) {
    testSuccess.value = false
    testMessage.value = `❌ 网络错误：${String(e).slice(0, 100)}`
  } finally {
    testing.value = false
  }
}

/** 保存设置 */
const saveSettings = (): void => {
  localStorage.setItem(STORAGE_MODEL, selectedModelId.value)
  localStorage.setItem(STORAGE_APIKEY_PREFIX + selectedModelId.value, apiKey.value.trim())
  testMessage.value = '✅ 设置已保存！'
  testSuccess.value = true
  setTimeout(() => { showModelDialog.value = false; testMessage.value = '' }, 800)
}

// ===== 皮肤 =====
const SKIN_KEY = 'codepet-workspace-skin'
const currentSkin = ref<string>(localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN)

// ===== 对话 =====
const inputText = ref<string>('')

const sendMessage = (): void => {
  if (!inputText.value.trim()) return
  // TODO: 接入 AI API
  inputText.value = ''
}

// ===== 拖拽 =====
let isDragging = false
let dragStartX = 0, dragStartY = 0

const onTopbarMouseDown = async (e: MouseEvent): Promise<void> => {
  isDragging = true
  dragStartX = e.screenX; dragStartY = e.screenY
  document.addEventListener('mousemove', onTopbarMouseMove)
  document.addEventListener('mouseup', onTopbarMouseUp)
}

const onTopbarMouseMove = async (e: MouseEvent): Promise<void> => {
  if (!isDragging) return
  const pos = await appWindow.outerPosition()
  await appWindow.setPosition(new PhysicalPosition(pos.x + e.screenX - dragStartX, pos.y + e.screenY - dragStartY))
  dragStartX = e.screenX; dragStartY = e.screenY
}

const onTopbarMouseUp = (): void => {
  isDragging = false
  document.removeEventListener('mousemove', onTopbarMouseMove)
  document.removeEventListener('mouseup', onTopbarMouseUp)
}

// ===== 关闭 =====
const handleClose = (): void => {
  petStore.closeSubWindow()
}

// 启动时确保鼠标可交互
onMounted(() => setIgnoreCursorEvents(false))
</script>

<style scoped>
.chat {
  width: 100%;
  height: 100%;
  display: flex;
  pointer-events: auto;
}

/* 左侧边栏 1/3 */
.chat-sidebar {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(180, 170, 200, 0.2);
  background: rgba(255, 255, 255, 0.3);
}

.chat-sidebar-header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(180, 170, 200, 0.15);
}

.chat-sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #4a3060;
}

.chat-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.chat-sidebar-empty {
  text-align: center;
  color: #b8a0d0;
  font-size: 12px;
  padding: 20px 0;
}

/* 底部操作 */
.chat-sidebar-actions {
  padding: 10px;
  border-top: 1px solid rgba(180, 170, 200, 0.15);
  position: relative;
}

.chat-action-btn {
  width: 100%;
  padding: 8px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #5d4070;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.chat-action-btn:hover {
  background: rgba(200, 190, 220, 0.5);
}

.chat-current-model {
  margin-top: 6px;
  font-size: 10px;
  color: #9a80b8;
  text-align: center;
  word-break: break-all;
}

/* ========================================
   模型设置弹框
   ======================================== */

.model-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(30, 25, 45, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.model-dialog {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 14px;
  width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(80, 70, 110, 0.25);
}

.model-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(180, 170, 200, 0.2);
}

.model-dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a3060;
}

.model-dialog-close {
  border: none;
  background: none;
  font-size: 16px;
  color: #b8a0d0;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.model-dialog-close:hover {
  background: rgba(200, 190, 220, 0.3);
}

.model-dialog-body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-label {
  font-size: 12px;
  font-weight: 600;
  color: #5d4070;
}

.model-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.model-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1.5px solid rgba(180, 170, 200, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
}

.model-item:hover {
  background: rgba(220, 210, 240, 0.35);
}

.model-item--active {
  border-color: #b89ad8;
  background: rgba(200, 180, 230, 0.3);
}

.model-item-name {
  font-size: 12px;
  font-weight: 600;
  color: #4a3060;
}

.model-item-provider {
  font-size: 10px;
  color: #9a80b8;
}

.model-input {
  padding: 8px 12px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 8px;
  font-size: 12px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.8);
  outline: none;
  font-family: inherit;
}

.model-input:focus {
  border-color: #b89ad8;
}

.model-test-msg {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.msg-success {
  background: rgba(140, 210, 160, 0.3);
  color: #3a7040;
}

.msg-error {
  background: rgba(240, 140, 140, 0.25);
  color: #c0392b;
}

.model-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid rgba(180, 170, 200, 0.2);
}

.model-btn {
  padding: 7px 18px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.model-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.model-btn--test {
  background: rgba(200, 190, 220, 0.35);
  color: #6d5080;
}

.model-btn--test:hover:not(:disabled) {
  background: rgba(200, 190, 220, 0.55);
}

.model-btn--save {
  background: #b89ad8;
  color: #fff;
}

.model-btn--save:hover:not(:disabled) {
  background: #a080c8;
}

/* 弹框过渡 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .model-dialog {
  transform: scale(0.95);
}

/* 右侧对话区 2/3 */
.chat-main {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(180, 170, 200, 0.15);
  cursor: grab;
  flex-shrink: 0;
}

.chat-back-btn {
  padding: 4px 14px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #6d5080;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

.chat-back-btn:hover {
  background: rgba(200, 190, 220, 0.55);
}

/* 对话内容 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-welcome {
  text-align: center;
}

.chat-welcome-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.chat-welcome-title {
  font-size: 18px;
  font-weight: 600;
  color: #4a3060;
  margin-bottom: 6px;
}

.chat-welcome-desc {
  font-size: 13px;
  color: #9a80b8;
}

/* 输入框 */
.chat-input-bar {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(180, 170, 200, 0.15);
  background: rgba(255, 255, 255, 0.3);
}

.chat-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 20px;
  font-size: 13px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.8);
  outline: none;
  resize: none;
  font-family: inherit;
}

.chat-input:focus {
  border-color: #b89ad8;
}

.chat-send-btn {
  padding: 8px 20px;
  border: none;
  background: #b89ad8;
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.chat-send-btn:hover {
  background: #a080c8;
}
</style>
