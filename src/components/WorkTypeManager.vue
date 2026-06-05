<!--
  文件路径: src/components/WorkTypeManager.vue
  工作类型管理组件

  支持新增、修改、删除自定义工作类型。
  修改类型名称时，所有使用旧名称的历史记录会自动同步更新。
  删除类型时，历史记录不受影响，只是不再显示为可选项。
-->
<template>
  <div class="work-type-manager">
    <!-- 顶部导航 -->
    <div class="wtm-header">
      <button class="wtm-back" @click="$emit('back')">← 返回</button>
      <span class="wtm-title">⚙️ 管理工作类型</span>
    </div>

    <!-- 新增区域 -->
    <div class="wtm-add-section">
      <input
        v-model="newTypeName"
        class="wtm-input"
        placeholder="输入新工作类型名称..."
        maxlength="20"
        @keyup.enter="handleAdd"
      />
      <button
        class="wtm-btn wtm-btn--add"
        :disabled="!newTypeName.trim()"
        @click="handleAdd"
      >
        + 添加
      </button>
    </div>

    <!-- 错误提示 -->
    <Transition name="wtm-fade">
      <div v-if="errorMsg" class="wtm-error">
        {{ errorMsg }}
      </div>
    </Transition>

    <!-- 类型列表 -->
    <div class="wtm-list">
      <TransitionGroup name="wtm-list-item">
        <div
          v-for="wt in workStore.workTypes"
          :key="wt.id"
          class="wtm-item"
        >
          <!-- 编辑模式 -->
          <template v-if="editingId === wt.id">
            <input
              :ref="(el: unknown) => setEditInputRef(el as HTMLInputElement | null)"
              v-model="editingLabel"
              class="wtm-edit-input"
              maxlength="20"
              @keyup.enter="handleSaveEdit(wt.id)"
              @keyup.escape="cancelEdit"
              @blur="handleSaveEdit(wt.id)"
            />
            <div class="wtm-actions">
              <button
                class="wtm-action wtm-action--save"
                title="保存"
                @click="handleSaveEdit(wt.id)"
              >
                ✓
              </button>
              <button
                class="wtm-action wtm-action--cancel"
                title="取消"
                @click="cancelEdit"
              >
                ✕
              </button>
            </div>
          </template>

          <!-- 普通模式 -->
          <template v-else>
            <span class="wtm-item-label">{{ wt.label }}</span>
            <div class="wtm-actions">
              <button
                class="wtm-action wtm-action--edit"
                title="编辑"
                @click="startEdit(wt)"
              >
                ✎
              </button>
              <button
                class="wtm-action wtm-action--delete"
                title="删除"
                @click="handleDelete(wt.id)"
              >
                🗑
              </button>
            </div>
          </template>
        </div>
      </TransitionGroup>

      <!-- 空状态 -->
      <div v-if="workStore.workTypes.length === 0" class="wtm-empty">
        😕 暂无工作类型，请添加
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="wtm-hint">
      💡 修改类型名称会同步更新所有历史记录中对应的类型
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkStore, type WorkType } from '@/stores/workStore'

// ===== Emits =====
defineEmits<{
  /** 返回上一级 */
  back: []
}>()

// ===== Store =====
const workStore = useWorkStore()

// ===== 新增相关状态 =====
/** 新类型名称（双向绑定输入框） */
const newTypeName = ref<string>('')
/** 错误提示信息 */
const errorMsg = ref<string>('')
/** 错误消失计时器 */
let errorTimer: ReturnType<typeof setTimeout> | null = null

// ===== 编辑相关状态 =====
/** 当前正在编辑的类型 ID（null 表示不在编辑模式） */
const editingId = ref<string | null>(null)
/** 编辑中的名称 */
const editingLabel = ref<string>('')
/** 编辑输入框 DOM 引用 */
let editInputRef: HTMLInputElement | null = null

// ===== 方法 =====

/**
 * 显示错误提示（3 秒后自动消失）
 */
const showError = (msg: string): void => {
  errorMsg.value = msg
  if (errorTimer) clearTimeout(errorTimer)
  errorTimer = setTimeout(() => {
    errorMsg.value = ''
    errorTimer = null
  }, 3000)
}

/**
 * 新增工作类型
 */
const handleAdd = async (): Promise<void> => {
  const trimmed = newTypeName.value.trim()
  if (!trimmed) return

  try {
    await workStore.addWorkType(trimmed)
    newTypeName.value = ''
    errorMsg.value = ''
  } catch (e) {
    showError(e instanceof Error ? e.message : '添加失败')
  }
}

/**
 * 开始编辑工作类型
 */
const startEdit = (wt: WorkType): void => {
  editingId.value = wt.id
  editingLabel.value = wt.label
  // 自动聚焦输入框
  nextTick(() => {
    editInputRef?.focus()
    editInputRef?.select()
  })
}

/**
 * 保存编辑
 */
const handleSaveEdit = async (id: string): Promise<void> => {
  const trimmed = editingLabel.value.trim()
  if (!trimmed) {
    cancelEdit()
    return
  }

  try {
    await workStore.updateWorkType(id, trimmed)
    cancelEdit()
  } catch (e) {
    showError(e instanceof Error ? e.message : '修改失败')
    // 重新聚焦
    nextTick(() => editInputRef?.focus())
  }
}

/**
 * 取消编辑
 */
const cancelEdit = (): void => {
  editingId.value = null
  editingLabel.value = ''
}

/**
 * 删除工作类型
 */
const handleDelete = async (id: string): Promise<void> => {
  try {
    await workStore.deleteWorkType(id)
    // 如果删除的是正在编辑的类型，退出编辑模式
    if (editingId.value === id) {
      cancelEdit()
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : '删除失败')
  }
}

/**
 * 设置编辑输入框的 ref
 */
const setEditInputRef = (el: HTMLInputElement | null): void => {
  editInputRef = el
}
</script>

<style scoped>
/* ========================================
   WorkTypeManager — 半透明卡片风格
   ======================================== */

.work-type-manager { display: flex; flex-direction: column; height: 100%; padding: 12px 16px 16px; gap: 10px; overflow-y: auto; }

.wtm-header { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.wtm-back {
  padding: 4px 10px; border: 1px solid rgba(140, 120, 170, 0.15);
  border-radius: 7px; background: rgba(255, 255, 255, 0.4);
  color: #6e6080; font-size: 11px; cursor: pointer; transition: all 0.2s ease;
}
.wtm-back:hover { background: rgba(255, 255, 255, 0.7); color: #3a2850; }
.wtm-title { font-size: 14px; font-weight: 600; color: #3a2850; }

.wtm-add-section { display: flex; gap: 8px; }
.wtm-input {
  flex: 1; padding: 8px 12px; border: 1px solid rgba(140, 120, 170, 0.2);
  border-radius: 9px; background: rgba(255, 255, 255, 0.5);
  color: #3a2850; font-size: 13px; outline: none; transition: all 0.2s ease;
}
.wtm-input:focus { border-color: rgba(184, 138, 58, 0.4); box-shadow: 0 0 0 3px rgba(184, 138, 58, 0.08); }
.wtm-input::placeholder { color: #b0a0c0; }

.wtm-btn { padding: 8px 18px; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.wtm-btn--add { background: linear-gradient(135deg, #b88a3a, #9a6e2e); color: #fff; box-shadow: 0 2px 8px rgba(184, 138, 58, 0.2); }
.wtm-btn--add:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(184, 138, 58, 0.3); }
.wtm-btn--add:disabled { opacity: 0.35; cursor: not-allowed; }

.wtm-error { padding: 8px 12px; background: rgba(196, 104, 106, 0.1); border: 1px solid rgba(196, 104, 106, 0.2); border-radius: 9px; color: #a05052; font-size: 12px; }

.wtm-list { flex: 1; display: flex; flex-direction: column; gap: 5px; overflow-y: auto; }
.wtm-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(140, 120, 170, 0.08);
  border-radius: 10px; transition: all 0.2s ease;
}
.wtm-item:hover { background: rgba(255, 255, 255, 0.65); border-color: rgba(140, 120, 170, 0.15); }
.wtm-item-label { flex: 1; font-size: 13px; color: #3a2850; }
.wtm-edit-input {
  flex: 1; padding: 4px 8px; border: 1px solid rgba(184, 138, 58, 0.4);
  border-radius: 7px; background: rgba(255, 255, 255, 0.7);
  color: #3a2850; font-size: 13px; outline: none;
}

.wtm-actions { display: flex; gap: 2px; flex-shrink: 0; }
.wtm-action { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 7px; background: transparent; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.wtm-action--edit { color: #8e7ea0; }
.wtm-action--edit:hover { background: rgba(125, 104, 184, 0.1); color: #6e50a8; }
.wtm-action--delete { color: #b0a0c0; }
.wtm-action--delete:hover { background: rgba(196, 104, 106, 0.1); color: #c4686a; }
.wtm-action--save { color: #5e9e80; }
.wtm-action--save:hover { background: rgba(94, 158, 128, 0.1); }
.wtm-action--cancel { color: #c4686a; }
.wtm-action--cancel:hover { background: rgba(196, 104, 106, 0.1); }

.wtm-empty { text-align: center; color: #b0a0c0; font-size: 13px; padding: 32px 0; }
.wtm-hint { font-size: 11px; color: #b0a0c0; text-align: center; padding-top: 4px; line-height: 1.4; }

.wtm-fade-enter-active, .wtm-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.wtm-fade-enter-from, .wtm-fade-leave-to { opacity: 0; transform: translateY(-4px); }
.wtm-list-item-enter-active { transition: all 0.3s ease; }
.wtm-list-item-leave-active { transition: all 0.2s ease; }
.wtm-list-item-enter-from { opacity: 0; transform: translateX(-16px); }
.wtm-list-item-leave-to { opacity: 0; transform: translateX(16px); }
.wtm-list-item-move { transition: transform 0.25s ease; }
</style>
