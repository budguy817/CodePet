<!--
  文件路径: src/components/SkinPicker.vue
  皮肤选择器组件

  点击 🎨 按钮弹出皮肤色块，选择后收起。
  选择持久化到 localStorage。
-->
<template>
  <div class="skin-picker">
    <button class="skin-toggle" @click.stop="show = !show" title="切换皮肤">
      🎨
    </button>

    <Transition name="skin-drop">
      <div v-if="show" class="skin-dropdown" @click.stop>
        <div class="skin-colors">
          <button
            v-for="s in SKIN_PRESETS"
            :key="s.name"
            class="skin-dot"
            :style="{ background: s.color }"
            :title="s.name"
            :class="{ 'skin-dot--active': modelValue === s.color }"
            @click="select(s.color)"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// ===== Props & Emits =====
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

import { SKIN_PRESETS } from '@/constants'

// ===== 状态 =====
const show = ref<boolean>(false)

// ===== 方法 =====
const select = (color: string): void => {
  emit('update:modelValue', color)
  show.value = false
}

// 展开时监听外部点击关闭
watch(show, (val) => {
  if (val) {
    setTimeout(() => document.addEventListener('click', closeOutside))
  } else {
    document.removeEventListener('click', closeOutside)
  }
})

const closeOutside = (): void => {
  show.value = false
  document.removeEventListener('click', closeOutside)
}
</script>

<style scoped>
.skin-picker {
  position: relative;
}

.skin-toggle {
  padding: 4px 10px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.skin-toggle:hover {
  background: rgba(200, 190, 220, 0.55);
}

/* 下拉面板 */
.skin-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 10px;
  border: 1px solid rgba(140, 120, 170, 0.15);
  box-shadow: 0 8px 24px rgba(80, 60, 120, 0.18);
  z-index: 999;
}

.skin-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  width: 120px;
}

.skin-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.skin-dot:hover {
  transform: scale(1.2);
}

.skin-dot--active {
  border-color: #7d6090;
  box-shadow: 0 0 0 2px rgba(125, 96, 144, 0.3);
}

/* 过渡动画 */
.skin-drop-enter-active,
.skin-drop-leave-active {
  transition: all 0.2s ease;
}
.skin-drop-enter-from,
.skin-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}
</style>
