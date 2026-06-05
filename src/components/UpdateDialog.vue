<!--
  文件路径: src/components/UpdateDialog.vue
  自动更新对话框组件

  根据 useUpdater composable 的状态显示：
  - 正在检查（loading 动画）
  - 已是最新（成功提示）
  - 发现新版本（版本信息 + 下载按钮）
  - 下载中（进度条）
  - 下载完成（提示重启）
  - 出错（错误信息 + 重试按钮）
-->
<script setup lang="ts">
import { useUpdater } from '../composables/useUpdater'

const {
  status,
  updateInfo,
  downloadProgress,
  errorMessage,
  showDialog,
  downloadAndInstall,
  closeDialog,
  retry,
} = useUpdater()
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩层，点击外部可关闭 -->
    <Transition name="update-fade">
      <div
        v-if="showDialog"
        class="update-overlay"
        @click.self="closeDialog"
      >
        <div class="update-dialog">
          <!-- 标题栏 -->
          <div class="update-header">
            <span class="update-title">📦 软件更新</span>
            <button
              class="update-close"
              @click="closeDialog"
              title="关闭"
            >
              ✕
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="update-body">
            <!-- 正在检查 -->
            <div v-if="status === 'checking'" class="update-status">
              <div class="update-spinner" />
              <p>正在检查更新…</p>
            </div>

            <!-- 已是最新 -->
            <div v-else-if="status === 'idle' && !updateInfo" class="update-status">
              <span class="update-icon">✅</span>
              <p>当前已是最新版本</p>
              <button class="update-btn update-btn-secondary" @click="closeDialog">
                好的
              </button>
            </div>

            <!-- 发现新版本 -->
            <div v-else-if="status === 'available' && updateInfo" class="update-status">
              <span class="update-icon">🎉</span>
              <p class="update-version">
                发现新版本 <strong>v{{ updateInfo.version }}</strong>
              </p>
              <!-- 更新说明 -->
              <div
                v-if="updateInfo.notes"
                class="update-notes"
              >
                <p class="update-notes-title">更新内容：</p>
                <pre class="update-notes-body">{{ updateInfo.notes }}</pre>
              </div>
              <button
                class="update-btn update-btn-primary"
                @click="downloadAndInstall"
              >
                下载并安装
              </button>
              <button
                class="update-btn update-btn-text"
                @click="closeDialog"
              >
                稍后再说
              </button>
            </div>

            <!-- 下载中 -->
            <div v-else-if="status === 'downloading'" class="update-status">
              <p>正在下载更新…</p>
              <div class="update-progress-bar">
                <div
                  class="update-progress-fill"
                  :style="{ width: `${downloadProgress}%` }"
                />
              </div>
              <p class="update-progress-text">{{ downloadProgress }}%</p>
            </div>

            <!-- 下载完成 -->
            <div v-else-if="status === 'ready'" class="update-status">
              <span class="update-icon">✅</span>
              <p>更新已下载，正在重启安装…</p>
            </div>

            <!-- 出错 -->
            <div v-else-if="status === 'error'" class="update-status">
              <span class="update-icon">❌</span>
              <p>检查更新失败</p>
              <p class="update-error">{{ errorMessage }}</p>
              <button
                class="update-btn update-btn-primary"
                @click="retry"
              >
                重试
              </button>
              <button
                class="update-btn update-btn-text"
                @click="closeDialog"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ===== 遮罩层 ===== */
.update-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  pointer-events: auto;
}

/* ===== 对话框 ===== */
.update-dialog {
  width: 360px;
  max-width: 90vw;
  background: #1e1e2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: update-slide-in 0.25s ease-out;
}

@keyframes update-slide-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ===== 标题栏 ===== */
.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.update-title {
  font-size: 16px;
  font-weight: 600;
  color: #cdd6f4;
}

.update-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6c7086;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.update-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #cdd6f4;
}

/* ===== 内容区域 ===== */
.update-body {
  padding: 24px 20px 20px;
}

.update-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: #cdd6f4;
  font-size: 14px;
}

.update-icon {
  font-size: 40px;
  line-height: 1;
}

.update-version {
  font-size: 16px;
}

/* ===== 进度条 ===== */
.update-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.update-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #89b4fa, #cba6f7);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.update-progress-text {
  font-size: 12px;
  color: #6c7086;
}

/* ===== 加载动画 ===== */
.update-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.08);
  border-top-color: #89b4fa;
  border-radius: 50%;
  animation: update-spin 0.8s linear infinite;
}

@keyframes update-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 更新说明 ===== */
.update-notes {
  width: 100%;
  text-align: left;
}

.update-notes-title {
  font-size: 12px;
  color: #6c7086;
  margin-bottom: 4px;
}

.update-notes-body {
  font-size: 12px;
  color: #a6adc8;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 10px 12px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* ===== 错误信息 ===== */
.update-error {
  font-size: 12px;
  color: #f38ba8;
  background: rgba(243, 139, 168, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  word-break: break-word;
}

/* ===== 按钮 ===== */
.update-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 100px;
}

.update-btn-primary {
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
  color: #1e1e2e;
}

.update-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(137, 180, 250, 0.3);
}

.update-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #cdd6f4;
}

.update-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.update-btn-text {
  background: transparent;
  color: #6c7086;
  min-width: auto;
  padding: 8px 12px;
}

.update-btn-text:hover {
  color: #cdd6f4;
}

/* ===== 过渡动画 ===== */
.update-fade-enter-active,
.update-fade-leave-active {
  transition: opacity 0.2s ease;
}

.update-fade-enter-from,
.update-fade-leave-to {
  opacity: 0;
}
</style>
