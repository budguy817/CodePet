// 文件路径: src/main.ts
// CodePet 应用入口

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// 全局样式（Tailwind CSS + 自定义基础样式）
import './assets/main.css'

// 创建 Pinia 状态管理实例
const pinia = createPinia()

// 创建 Vue 应用实例
const app = createApp(App)

// 注册 Pinia
app.use(pinia)

// 挂载到 #app
app.mount('#app')
