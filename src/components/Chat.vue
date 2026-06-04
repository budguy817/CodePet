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
        <button class="chat-new-btn" @click="newConversation" title="新建对话">
          ＋
        </button>
      </div>

      <div class="chat-sidebar-list">
        <!-- 对话列表 -->
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="chat-conv-item"
          :class="{ 'chat-conv-item--active': conv.id === currentConversationId }"
          @click="switchConversation(conv.id)"
        >
          <span class="chat-conv-title">{{ conv.title || '新对话' }}</span>
          <span class="chat-conv-time">{{ formatConvTime(conv.updatedAt) }}</span>
          <button
            v-if="conversations.length > 1"
            class="chat-conv-del"
            @click.stop="deleteConversation(conv.id)"
            title="删除对话"
          >✕</button>
        </div>

        <!-- 无对话时提示 -->
        <div v-if="conversations.length === 0" class="chat-sidebar-empty">
          <p>暂无对话</p>
          <p class="chat-sidebar-hint">点击 + 开始新对话</p>
        </div>
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
      <div ref="chatAreaRef" class="chat-area">
        <!-- 欢迎提示（无消息时显示） -->
        <div v-if="messages.length === 0 && !loading" class="chat-welcome">
          <div class="chat-welcome-icon">🤖</div>
          <div class="chat-welcome-title">CodePet AI 助手</div>
          <div class="chat-welcome-desc">有什么可以帮你的？</div>
        </div>

        <!-- 消息列表 -->
        <div v-if="messages.length > 0 || loading" class="chat-messages">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="chat-msg"
            :class="'chat-msg--' + msg.role"
          >
            <span class="chat-msg-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</span>
            <div class="chat-msg-bubble" :class="'chat-msg-bubble--' + msg.role">
              <!-- 深度思考内容（折叠展示） -->
              <div v-if="msg.role === 'assistant' && thinkingText && isThinking" class="chat-thinking">
                <span class="chat-thinking-label">💭 思考中...</span>
                <span class="chat-thinking-text">{{ thinkingText.slice(-200) }}</span>
              </div>
              <!-- 正常回复内容（流式或已完成） -->
              <template v-if="msg.content">{{ msg.content }}</template>
              <!-- 空消息 + 加载中 → 思考动画 -->
              <template v-if="!msg.content && loading">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </template>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="chat-error">
            ⚠️ {{ errorMsg }}
            <button class="chat-error-retry" @click="retryLastMessage">重试</button>
          </div>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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

// ===== 对话消息 =====

/** 单条对话消息 */
interface ChatMessage {
  /** 唯一 ID */
  id: number
  /** 角色：用户 / 助手 */
  role: 'user' | 'assistant'
  /** 消息内容 */
  content: string
  /** 时间戳 */
  timestamp: number
}

/** 一次完整对话 */
interface Conversation {
  /** 唯一 ID */
  id: number
  /** 对话标题（取第一条用户消息，截断 30 字） */
  title: string
  /** 对话消息列表 */
  messages: ChatMessage[]
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
}

/** 对话列表持久化 key */
const STORAGE_CONVERSATIONS = 'codepet-chat-conversations'
/** 当前对话 ID 持久化 key */
const STORAGE_ACTIVE_CONV = 'codepet-chat-active-conv'

/** 对话 ID 计数器 */
let nextConvId = 1
/** 消息 ID 计数器（全局递增，确保唯一） */
let nextMsgId = 1

// ===== 对话管理 =====

/** 所有对话列表 */
const conversations = ref<Conversation[]>([])

/** 当前活跃对话 ID */
const currentConversationId = ref<number | null>(null)

/** 对话消息列表（当前活跃对话的消息） */
const messages = ref<ChatMessage[]>([])

// ===== 对话持久化 =====

/**
 * 将当前 messages 同步回 conversations 并保存到 localStorage
 */
const syncAndSave = (): void => {
  const conv = conversations.value.find((c) => c.id === currentConversationId.value)
  if (conv) {
    conv.messages = [...messages.value]
    conv.updatedAt = Date.now()
    // 自动生成标题：取第一条用户消息
    if (!conv.title || conv.title === '新对话') {
      const firstUser = messages.value.find((m) => m.role === 'user')
      if (firstUser) {
        conv.title = firstUser.content.length > 30
          ? firstUser.content.slice(0, 30) + '...'
          : firstUser.content
      }
    }
  }
  saveConversations()
}

/**
 * 保存对话列表到 localStorage
 */
const saveConversations = (): void => {
  try {
    localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations.value))
    if (currentConversationId.value !== null) {
      localStorage.setItem(STORAGE_ACTIVE_CONV, String(currentConversationId.value))
    }
  } catch (e) {
    console.warn('[CodePet] 保存对话失败:', e)
  }
}

/**
 * 从 localStorage 加载对话列表
 */
const loadConversations = (): void => {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS)
    if (raw) {
      const data: Conversation[] = JSON.parse(raw)
      conversations.value = data
      // 恢复 ID 计数器
      const maxConvId = data.reduce((max, c) => Math.max(max, c.id), 0)
      nextConvId = Math.max(nextConvId, maxConvId + 1)
      let maxMsgId = 0
      data.forEach((c) => c.messages.forEach((m) => { if (m.id > maxMsgId) maxMsgId = m.id }))
      nextMsgId = Math.max(nextMsgId, maxMsgId + 1)
    }
    // 恢复上次活跃的对话
    const savedConvId = localStorage.getItem(STORAGE_ACTIVE_CONV)
    if (savedConvId) {
      const id = Number(savedConvId)
      if (conversations.value.find((c) => c.id === id)) {
        currentConversationId.value = id
        const conv = conversations.value.find((c) => c.id === id)
        if (conv) messages.value = [...conv.messages]
        return
      }
    }
    // 没有保存的活跃对话，创建默认对话
    ensureActiveConversation()
  } catch (e) {
    console.warn('[CodePet] 加载对话失败:', e)
    ensureActiveConversation()
  }
}

// ===== 对话操作 =====

/**
 * 确保至少有一个活跃对话
 */
const ensureActiveConversation = (): void => {
  if (conversations.value.length === 0) {
    const newConv: Conversation = {
      id: nextConvId++,
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    conversations.value.push(newConv)
    currentConversationId.value = newConv.id
    messages.value = []
  } else if (currentConversationId.value === null) {
    const first = conversations.value[0]
    currentConversationId.value = first.id
    messages.value = [...first.messages]
  }
}

/**
 * 新建对话
 */
const newConversation = (): void => {
  // 先保存当前对话
  syncAndSave()

  const newConv: Conversation = {
    id: nextConvId++,
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  conversations.value.unshift(newConv) // 新对话放在最前面
  currentConversationId.value = newConv.id
  messages.value = []
  errorMsg.value = ''
  thinkingText.value = ''
  isThinking.value = false
  streamingContent.value = ''
  saveConversations()

  // 聚焦输入框
  nextTick(() => {
    const input = document.querySelector('.chat-input') as HTMLTextAreaElement
    input?.focus()
  })
}

/**
 * 切换到指定对话
 *
 * @param convId - 目标对话 ID
 */
const switchConversation = (convId: number): void => {
  if (convId === currentConversationId.value) return
  if (loading.value) return // 正在响应中，不允许切换

  // 保存当前对话的消息
  syncAndSave()

  // 切换到目标对话
  const conv = conversations.value.find((c) => c.id === convId)
  if (conv) {
    currentConversationId.value = convId
    messages.value = [...conv.messages]
    errorMsg.value = ''
    thinkingText.value = ''
    isThinking.value = false
    streamingContent.value = ''
    saveConversations()
  }
}

/**
 * 删除对话
 *
 * @param convId - 要删除的对话 ID
 */
const deleteConversation = (convId: number): void => {
  if (conversations.value.length <= 1) return // 至少保留一个对话

  const idx = conversations.value.findIndex((c) => c.id === convId)
  if (idx === -1) return

  conversations.value.splice(idx, 1)

  // 如果删除的是当前对话，切换到第一个
  if (convId === currentConversationId.value) {
    const first = conversations.value[0]
    currentConversationId.value = first.id
    messages.value = [...first.messages]
  }

  saveConversations()
}

/**
 * 格式化对话时间显示
 * - 今天：显示时间 HH:MM
 * - 昨天：显示"昨天"
 * - 更早：显示 MM/DD
 */
const formatConvTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return '昨天'
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** 是否正在等待 AI 回复 */
const loading = ref<boolean>(false)

/** 错误信息（API 调用失败时展示） */
const errorMsg = ref<string>('')

/** 输入框文本 */
const inputText = ref<string>('')

/** 对话区域 DOM 引用（用于自动滚动到底部） */
const chatAreaRef = ref<HTMLElement | null>(null)

/** 上一次发送的消息内容（用于重试） */
const lastUserContent = ref<string>('')

/** 流式传输中累积的回复内容 */
const streamingContent = ref<string>('')

/** 深度思考/推理内容（DeepSeek reasoning_content） */
const thinkingText = ref<string>('')

/** 是否处于深度思考阶段 */
const isThinking = ref<boolean>(false)

/**
 * 自动滚动对话区域到底部
 */
const scrollToBottom = async (): Promise<void> => {
  await nextTick()
  if (chatAreaRef.value) {
    chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
  }
}

/**
 * 获取当前模型的 API Key（从 localStorage 读取，不依赖对话框状态）
 */
const getApiKey = (): string => {
  return localStorage.getItem(STORAGE_APIKEY_PREFIX + selectedModelId.value) || ''
}

/**
 * 构建认证请求头（与 testConnection 保持一致的认证逻辑）
 */
const buildHeaders = (): Record<string, string> => {
  const model = currentModelConfig.value
  const key = getApiKey()
  if (!model || !key) return { 'Content-Type': 'application/json' }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (model.provider === 'OpenAI' || model.provider === 'DeepSeek' || model.provider === '阿里云' || model.provider === '智谱AI') {
    headers['Authorization'] = `Bearer ${key}`
  } else if (model.provider === 'Anthropic') {
    headers['x-api-key'] = key
    headers['anthropic-version'] = '2023-06-01'
  }

  return headers
}

/**
 * 构建 API 请求体
 * OpenAI 兼容格式支持 stream: true，Anthropic 暂用非流式
 *
 * @param userContent - 用户最新消息
 * @param useStream   - 是否使用流式传输（默认 true）
 */
const buildRequestBody = (userContent: string, useStream = true): string => {
  const model = currentModelConfig.value
  if (!model) return '{}'

  // 构建消息历史（最近 20 条，避免上下文过长）
  const recentMessages = messages.value.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const allMessages = [
    ...recentMessages,
    { role: 'user', content: userContent },
  ]

  if (model.provider === 'Anthropic') {
    // Anthropic 暂用非流式（其 SSE 格式与 OpenAI 不兼容）
    return JSON.stringify({
      model: model.id,
      max_tokens: 2048,
      messages: allMessages,
    })
  }

  // OpenAI 兼容格式（DeepSeek / OpenAI / Qwen / GLM）
  return JSON.stringify({
    model: model.id,
    max_tokens: 2048,
    stream: useStream,
    messages: allMessages,
  })
}

/**
 * 从 API 响应中提取 AI 回复文本
 */
const parseResponse = async (res: Response): Promise<string> => {
  const model = currentModelConfig.value
  const data = await res.json()

  if (model?.provider === 'Anthropic') {
    // Anthropic 响应格式：{ content: [{ type: 'text', text: '...' }] }
    if (data.content && data.content.length > 0) {
      return data.content[0].text || ''
    }
  } else {
    // OpenAI 兼容格式：{ choices: [{ message: { content: '...' } }] }
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message?.content || ''
    }
  }

  return ''
}

/**
 * 处理 OpenAI 兼容的 SSE 流式响应
 *
 * SSE 格式：
 *   data: {"choices":[{"delta":{"content":"文本"},"index":0}]}
 *   data: {"choices":[{"delta":{"reasoning_content":"思考..."}}]}  ← DeepSeek 深度思考
 *   data: [DONE]
 *
 * @param res    - fetch 响应对象
 * @param msgId  - 当前消息的 ID（用于更新消息列表）
 */
const processOpenAIStream = async (res: Response, msgId: number): Promise<void> => {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 按行分割 SSE 数据
    const lines = buffer.split('\n')
    // 最后一个可能是不完整的行，保留到下次处理
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const jsonStr = trimmed.slice(6) // 去掉 "data: " 前缀

      // 流结束标记
      if (jsonStr === '[DONE]') return

      try {
        const chunk = JSON.parse(jsonStr)
        const delta = chunk.choices?.[0]?.delta
        if (!delta) continue

        // DeepSeek 深度思考内容
        if (delta.reasoning_content) {
          isThinking.value = true
          thinkingText.value += delta.reasoning_content
          continue
        }

        // 正式回复内容到达，结束思考状态
        if (delta.content !== undefined && delta.content !== null) {
          if (isThinking.value) {
            isThinking.value = false
          }
          streamingContent.value += delta.content

          // 实时更新消息列表中的内容
          const msg = messages.value.find((m) => m.id === msgId)
          if (msg) {
            msg.content = streamingContent.value
          }
        }
      } catch {
        // 非 JSON 行（如注释），忽略
      }
    }
  }
}

/**
 * 发送消息（流式传输）
 *
 * 流程：
 * 1. 验证输入和 API 配置
 * 2. 添加用户消息到列表
 * 3. 创建一个空的助手消息占位
 * 4. 调用 AI API（stream: true）
 * 5. 逐 chunk 更新助手消息内容（流式渲染）
 * 6. 错误处理与重试
 */
const sendMessage = async (): Promise<void> => {
  const content = inputText.value.trim()
  if (!content || loading.value) return

  // 验证 API 配置
  const model = currentModelConfig.value
  const key = getApiKey()
  if (!model || !key) {
    errorMsg.value = '请先在左侧「切换模型」中配置 AI 模型和 API Key'
    return
  }

  // 清除之前的错误与流式状态
  errorMsg.value = ''
  streamingContent.value = ''
  thinkingText.value = ''
  isThinking.value = false

  // 添加用户消息
  messages.value.push({
    id: nextMsgId++,
    role: 'user',
    content,
    timestamp: Date.now(),
  })
  lastUserContent.value = content
  inputText.value = ''
  await scrollToBottom()

  // 创建一个空的助手消息占位（流式过程中实时更新其 content）
  const assistantMsgId = nextMsgId++
  messages.value.push({
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  })

  // 开始请求
  loading.value = true

  try {
    const isAnthropic = model.provider === 'Anthropic'
    const useStream = !isAnthropic // Anthropic 暂用非流式

    const res = await fetch(model.apiUrl, {
      method: 'POST',
      headers: buildHeaders(),
      body: buildRequestBody(content, useStream),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`API 返回错误 (${res.status})：${errText.slice(0, 200)}`)
    }

    if (useStream) {
      // === 流式传输（OpenAI 兼容） ===
      await processOpenAIStream(res, assistantMsgId)

      // 流式完成后，确保最终内容已写入
      const finalMsg = messages.value.find((m) => m.id === assistantMsgId)
      if (finalMsg) {
        finalMsg.content = streamingContent.value || '（AI 未返回内容）'
      }
    } else {
      // === 非流式传输（Anthropic 等） ===
      const reply = await parseResponse(res)
      const msg = messages.value.find((m) => m.id === assistantMsgId)
      if (msg) {
        msg.content = reply || '（AI 未返回内容）'
      }
    }

    // 保存对话到 localStorage
    syncAndSave()
  } catch (e) {
    const errStr = String(e)
    errorMsg.value = errStr.length > 300 ? errStr.slice(0, 300) + '...' : errStr
    console.error('[CodePet] AI 请求失败:', e)
    // 移除失败的占位消息
    messages.value = messages.value.filter((m) => m.id !== assistantMsgId)
    // 保存（移除失败消息后的状态）
    syncAndSave()
  } finally {
    loading.value = false
    isThinking.value = false
    await scrollToBottom()
  }
}

/**
 * 重试最后一次发送的消息
 */
const retryLastMessage = async (): Promise<void> => {
  if (!lastUserContent.value) return
  // 如果最后一条是用户消息（失败的），移除它
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg && lastMsg.role === 'user' && lastMsg.content === lastUserContent.value) {
    messages.value.pop()
  }
  errorMsg.value = ''
  inputText.value = lastUserContent.value
  await sendMessage()
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

// 启动时加载对话历史并确保鼠标可交互
onMounted(() => {
  setIgnoreCursorEvents(false)
  loadConversations()
})
</script>

<style scoped>
/* ========================================
   Chat — 自适应玻璃态布局
   适配所有 SkinPicker 背景色，通过半透明层叠
   与精致边框构建层次感。
   字体：Georgia（标题）+ system-ui（正文）
   ======================================== */

.chat {
  width: 100%;
  height: 100%;
  display: flex;
  pointer-events: auto;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ========================================
   左侧边栏 1/3 — 半透明玻璃面板
   ======================================== */

.chat-sidebar {
  flex: 0 0 220px;
  width: 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
}

.chat-sidebar-header {
  padding: 16px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-sidebar-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 14px;
  font-weight: 600;
  color: #4a3060;
  letter-spacing: 0.2px;
}

/* 新建对话按钮 */
.chat-new-btn {
  width: 30px;
  height: 30px;
  border: 1.5px dashed rgba(160, 130, 190, 0.45);
  border-radius: 9px;
  background: rgba(180, 160, 210, 0.1);
  color: #8b6ba8;
  font-size: 18px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1;
}

.chat-new-btn:hover {
  border-color: #a080c8;
  border-style: solid;
  background: rgba(180, 150, 220, 0.25);
  color: #6d4898;
  box-shadow: 0 2px 12px rgba(150, 120, 190, 0.15);
  transform: scale(1.06);
}

.chat-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

/* 对话列表项 */
.chat-conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.chat-conv-item:hover {
  background: rgba(200, 180, 220, 0.2);
}

.chat-conv-item--active {
  background: rgba(190, 170, 220, 0.3);
  box-shadow: inset 3px 0 0 #a080c8;
}

.chat-conv-item--active:hover {
  background: rgba(190, 170, 220, 0.38);
}

.chat-conv-title {
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  color: #4a3060;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-conv-time {
  font-size: 10px;
  color: #9a80b8;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.chat-conv-del {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #b8a0d0;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.chat-conv-item:hover .chat-conv-del {
  opacity: 1;
}

.chat-conv-del:hover {
  background: rgba(220, 140, 140, 0.3);
  color: #c85050;
}

/* 无对话空状态 */
.chat-sidebar-empty {
  text-align: center;
  color: #9a80b8;
  font-size: 12px;
  padding: 32px 12px;
}

.chat-sidebar-hint {
  font-size: 11px;
  color: #c0a8d8;
  margin-top: 8px;
}

/* 底部操作 */
.chat-sidebar-actions {
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.chat-action-btn {
  width: 100%;
  padding: 9px;
  border: 1px solid rgba(160, 140, 190, 0.2);
  background: rgba(200, 190, 220, 0.2);
  color: #5d4070;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-action-btn:hover {
  background: rgba(200, 190, 220, 0.4);
  border-color: rgba(160, 130, 190, 0.4);
  color: #4a3060;
  transform: translateY(-1px);
}

.chat-current-model {
  margin-top: 8px;
  font-size: 10px;
  color: #9a80b8;
  text-align: center;
  word-break: break-all;
}

/* ========================================
   模型设置弹框 — 精致卡片 + 柔和阴影
   ======================================== */

.model-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(30, 25, 45, 0.35);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.model-dialog {
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(180, 160, 200, 0.15);
  border-radius: 18px;
  width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow:
    0 8px 32px rgba(80, 60, 120, 0.12),
    0 2px 8px rgba(80, 60, 120, 0.06);
}

.model-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
}

.model-dialog-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 17px;
  font-weight: 600;
  color: #3d2858;
}

.model-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(180, 160, 200, 0.15);
  font-size: 14px;
  color: #8b6ba8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.model-dialog-close:hover {
  background: rgba(180, 160, 200, 0.3);
  color: #5d4070;
}

.model-dialog-body {
  padding: 6px 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.model-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #7d6090;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.model-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}

.model-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 13px;
  border: 1.5px solid rgba(180, 160, 200, 0.2);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.model-item:hover {
  background: rgba(210, 200, 230, 0.35);
  border-color: rgba(170, 150, 200, 0.4);
  transform: translateY(-1px);
}

.model-item--active {
  border-color: #a080c8;
  background: rgba(190, 170, 220, 0.3);
  box-shadow: 0 2px 8px rgba(150, 120, 190, 0.1);
}

.model-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #3d2858;
}

.model-item-provider {
  font-size: 10px;
  color: #8b6ba8;
}

.model-input {
  padding: 10px 14px;
  border: 1.5px solid rgba(180, 160, 200, 0.25);
  border-radius: 10px;
  font-size: 13px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.6);
  outline: none;
  font-family: 'Consolas', 'Cascadia Code', 'Courier New', monospace;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.model-input:focus {
  border-color: #a080c8;
  box-shadow: 0 0 0 3px rgba(160, 128, 200, 0.1);
}

.model-input::placeholder {
  color: #b098c8;
}

.model-test-msg {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.msg-success {
  background: rgba(130, 200, 150, 0.2);
  color: #387048;
  border: 1px solid rgba(130, 200, 150, 0.3);
}

.msg-error {
  background: rgba(230, 130, 130, 0.15);
  color: #b84040;
  border: 1px solid rgba(230, 130, 130, 0.25);
}

.model-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 14px 22px 18px;
}

.model-btn {
  padding: 8px 22px;
  border: 1.5px solid rgba(180, 160, 200, 0.2);
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(200, 190, 220, 0.2);
  color: #5d4070;
}

.model-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.model-btn--test {
  background: rgba(200, 190, 220, 0.15);
  color: #6d5080;
}

.model-btn--test:hover:not(:disabled) {
  background: rgba(200, 190, 220, 0.35);
}

.model-btn--save {
  background: #a080c8;
  border-color: #a080c8;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(150, 120, 190, 0.2);
}

.model-btn--save:hover:not(:disabled) {
  background: #8b68b8;
  border-color: #8b68b8;
  box-shadow: 0 4px 16px rgba(150, 120, 190, 0.3);
  transform: translateY(-1px);
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
  transform: scale(0.95) translateY(6px);
}

/* ========================================
   右侧对话区 2/3
   ======================================== */

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部栏 */
.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: grab;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
}

.chat-topbar:active {
  cursor: grabbing;
}

.chat-back-btn {
  padding: 5px 16px;
  border: 1px solid rgba(160, 140, 190, 0.2);
  background: rgba(200, 190, 220, 0.2);
  color: #5d4070;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-back-btn:hover {
  background: rgba(200, 190, 220, 0.4);
  border-color: rgba(160, 130, 190, 0.4);
  color: #4a3060;
  transform: translateX(-2px);
}

/* ========================================
   对话内容区
   ======================================== */

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px 20px;
  scroll-behavior: smooth;
}

/* 滚动条 */
.chat-area::-webkit-scrollbar,
.chat-sidebar-list::-webkit-scrollbar {
  width: 5px;
}

.chat-area::-webkit-scrollbar-track,
.chat-sidebar-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-area::-webkit-scrollbar-thumb,
.chat-sidebar-list::-webkit-scrollbar-thumb {
  background: rgba(160, 140, 190, 0.2);
  border-radius: 3px;
}

.chat-area::-webkit-scrollbar-thumb:hover,
.chat-sidebar-list::-webkit-scrollbar-thumb:hover {
  background: rgba(160, 140, 190, 0.35);
}

/* 无消息时居中欢迎 */
.chat-area:not(:has(.chat-messages)) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 欢迎页 */
.chat-welcome {
  text-align: center;
  animation: welcome-appear 0.7s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes welcome-appear {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-welcome-icon {
  font-size: 64px;
  margin-bottom: 18px;
  filter: drop-shadow(0 6px 20px rgba(150, 120, 190, 0.2));
  animation: welcome-float 3.5s ease-in-out infinite;
}

@keyframes welcome-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-8px) rotate(-2deg); }
  70% { transform: translateY(-3px) rotate(1deg); }
}

.chat-welcome-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 600;
  color: #3d2858;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.chat-welcome-desc {
  font-size: 14px;
  color: #8b6ba8;
  font-weight: 350;
}

/* ========================================
   消息列表
   ======================================== */

.chat-messages {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 12px;
}

/* 单条消息行 */
.chat-msg {
  display: flex;
  gap: 12px;
  max-width: 88%;
  animation: msg-slide-in 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes msg-slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户消息靠右 */
.chat-msg--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* 助手消息靠左 */
.chat-msg--assistant {
  align-self: flex-start;
}

/* 头像 */
.chat-msg-avatar {
  font-size: 20px;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(210, 200, 230, 0.4);
  border: 1.5px solid rgba(180, 160, 210, 0.25);
  transition: transform 0.2s ease;
}

.chat-msg:hover .chat-msg-avatar {
  transform: scale(1.1);
}

/* 消息气泡 */
.chat-msg-bubble {
  padding: 12px 17px;
  border-radius: 18px;
  font-size: 13.5px;
  line-height: 1.65;
  word-break: break-word;
  white-space: pre-wrap;
  letter-spacing: 0.1px;
  position: relative;
}

/* 用户气泡 — 浓郁紫晶渐变 */
.chat-msg-bubble--user {
  background: linear-gradient(135deg, #b490e0 0%, #9b70d0 40%, #8a5cc4 100%);
  color: #fff;
  border-bottom-right-radius: 5px;
  box-shadow: 0 3px 14px rgba(140, 100, 190, 0.25);
}

/* 助手气泡 — 精致白色毛玻璃 */
.chat-msg-bubble--assistant {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  color: #3d2858;
  border: 1px solid rgba(180, 160, 210, 0.15);
  border-bottom-left-radius: 5px;
  box-shadow: 0 1px 4px rgba(140, 120, 170, 0.08);
  min-width: 44px;
}

/* ========================================
   深度思考区域 — 暖琥珀色标识
   ======================================== */

.chat-thinking {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(245, 195, 130, 0.15);
  border: 1px solid rgba(220, 170, 100, 0.25);
  border-radius: 10px;
  border-left: 3px solid #d49840;
}

.chat-thinking-label {
  font-size: 11px;
  font-weight: 600;
  color: #b87830;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: think-pulse 2s ease-in-out infinite;
}

@keyframes think-pulse {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

.chat-thinking-text {
  font-size: 11px;
  color: #9a7040;
  line-height: 1.6;
  word-break: break-word;
  max-height: 80px;
  overflow-y: auto;
  font-style: italic;
}

/* 思考跳动圆点 */
.chat-msg-bubble--assistant .typing-dot {
  display: inline-block;
  vertical-align: middle;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b498d0;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* ========================================
   错误提示
   ======================================== */

.chat-error {
  align-self: center;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: rgba(240, 150, 140, 0.15);
  border: 1px solid rgba(220, 130, 120, 0.25);
  border-radius: 12px;
  font-size: 12.5px;
  color: #b85040;
  max-width: 85%;
}

.chat-error-retry {
  padding: 4px 15px;
  border: 1px solid rgba(200, 120, 100, 0.3);
  border-radius: 7px;
  background: rgba(240, 200, 190, 0.3);
  color: #b85040;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.chat-error-retry:hover {
  background: rgba(240, 180, 170, 0.4);
  color: #a04030;
}

/* ========================================
   输入栏 — 悬浮玻璃条
   ======================================== */

.chat-input-bar {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
}

.chat-input {
  flex: 1;
  padding: 11px 18px;
  border: 1.5px solid rgba(180, 160, 200, 0.25);
  border-radius: 14px;
  font-size: 13.5px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.65);
  outline: none;
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  line-height: 1.5;
}

.chat-input:focus {
  border-color: #a080c8;
  box-shadow: 0 0 0 3px rgba(160, 128, 200, 0.1);
  background: rgba(255, 255, 255, 0.9);
}

.chat-input::placeholder {
  color: #b098c8;
}

.chat-send-btn {
  padding: 11px 24px;
  border: none;
  background: linear-gradient(135deg, #b490e0, #9b70d0);
  color: #fff;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 3px 12px rgba(155, 112, 208, 0.25);
  letter-spacing: 0.3px;
}

.chat-send-btn:hover {
  box-shadow: 0 6px 22px rgba(155, 112, 208, 0.35);
  transform: translateY(-1.5px);
}

.chat-send-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(155, 112, 208, 0.2);
  transition: all 0.08s ease;
}
</style>
