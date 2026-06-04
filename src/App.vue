<!--
  文件路径: src/App.vue
  CodePet 根组件

  根据 appMode 切换显示：
  - pet：桌宠模式（210×240，透明背景）
  - workspace：工作台模式（960×600）
  - chat：智能问答模式（960×600）
-->
<template>
  <Pet v-if="petStore.appMode === 'pet'" />
  <Workspace v-else-if="petStore.appMode === 'workspace'" />
  <Chat v-else />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { getCurrentWindow, PhysicalSize, PhysicalPosition } from '@tauri-apps/api/window'
import { usePetStore } from '@/stores/petStore'
import Pet from './components/Pet.vue'
import Workspace from './components/Workspace.vue'
import Chat from './components/Chat.vue'

const petStore = usePetStore()
const appWindow = getCurrentWindow()

let savedPetPosition: PhysicalPosition | null = null

watch(
  () => petStore.appMode,
  async (mode, prev) => {
    const isOpening = mode !== 'pet' && prev === 'pet'
    const isClosing = mode === 'pet' && prev !== 'pet'

    if (isOpening) {
      await appWindow.setAlwaysOnTop(false)
      savedPetPosition = await appWindow.outerPosition()
      await appWindow.setSize(new PhysicalSize(960, 600))
      await appWindow.center()
    } else if (isClosing) {
      await appWindow.setAlwaysOnTop(true)
      await appWindow.setSize(new PhysicalSize(210, 240))
      if (savedPetPosition) {
        await appWindow.setPosition(savedPetPosition)
      }
    }
  }
)
</script>

<style>
/* App 根组件无额外样式，全局基础样式见 src/assets/main.css */
</style>
