<!--
  文件路径: src/components/PetAnimation.vue
  宠物动画组件

  使用纯 CSS 渲染桌宠角色（粉蓝渐变圆润小可爱），
  支持多种动画状态：idle / click / drag / walk / sleep。

  后续可集成 Lottie 动画，CSS 作为降级方案。
  当前使用 CSS 绘制宠物是因为尚无 Lottie JSON 资源，
  CSS 版本可直接运行且视觉效果良好。
-->
<template>
  <div class="pet-animation" :class="stateClass">
    <!-- 宠物身体：粉蓝渐变圆润造型 -->
    <div class="pet-body-css">
      <!-- 左眼 -->
      <div class="pet-eye pet-eye--left" />
      <!-- 右眼 -->
      <div class="pet-eye pet-eye--right" />
      <!-- 左腮红 -->
      <div class="pet-cheek pet-cheek--left" />
      <!-- 右腮红 -->
      <div class="pet-cheek pet-cheek--right" />
      <!-- 嘴巴 -->
      <div class="pet-mouth" />
      <!-- 左手 -->
      <div class="pet-arm pet-arm--left" />
      <!-- 右手 -->
      <div class="pet-arm pet-arm--right" />
      <!-- 左脚 -->
      <div class="pet-leg pet-leg--left" />
      <!-- 右脚 -->
      <div class="pet-leg pet-leg--right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePetStore, type PetState } from '@/stores/petStore'

// ===== Props =====
interface Props {
  /** 直接指定动画状态（优先级高于 store），用于预览/调试 */
  state?: PetState
}

const props = defineProps<Props>()

// ===== Store =====
const petStore = usePetStore()

// ===== 计算属性 =====
/** 当前动画状态：优先使用 prop，否则从 store 读取 */
const currentState = computed<PetState>(() => props.state ?? petStore.currentState)

/** 根据状态返回对应的 CSS class */
const stateClass = computed<string>(() => `pet-state--${currentState.value}`)
</script>

<style scoped>
/* ========================================
   宠物身体基础样式
   粉蓝渐变圆润造型，类似史莱姆/团子
   ======================================== */

.pet-animation {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 动画元素不拦截鼠标事件，由父级 .pet-body 处理 */
  pointer-events: none;
  user-select: none;
}

/* 宠物身体：圆形粉蓝渐变，撑满容器 */
.pet-body-css {
  position: relative;
  width: 150px;
  height: 140px;
  /* 粉蓝渐变：左上粉色 → 右下蓝色 */
  background: radial-gradient(
    ellipse at 35% 35%,
    #ffb3c1 0%,
    #f8a4c8 25%,
    #c9b1e8 55%,
    #93c5e8 80%,
    #7ec8e3 100%
  );
  border-radius: 50%;
  /* 仅保留内阴影增加立体感，去掉外阴影避免透明边框线 */
  box-shadow:
    inset 0 -8px 16px rgba(124, 160, 210, 0.35),
    inset 0 4px 12px rgba(255, 255, 255, 0.5);
  transition: transform 0.15s ease;
}

/* ========================================
   五官样式
   ======================================== */

/* 眼睛：深色小圆点 */
.pet-eye {
  position: absolute;
  width: 10px;
  height: 12px;
  background: #3d3055;
  border-radius: 50%;
  top: 50px;
}

.pet-eye--left {
  left: 38px;
}

.pet-eye--right {
  right: 38px;
}

/* 腮红：粉色椭圆 */
.pet-cheek {
  position: absolute;
  width: 18px;
  height: 11px;
  background: rgba(255, 150, 170, 0.55);
  border-radius: 50%;
  top: 63px;
}

.pet-cheek--left {
  left: 26px;
}

.pet-cheek--right {
  right: 26px;
}

/* 嘴巴：弧形微笑 */
.pet-mouth {
  position: absolute;
  width: 24px;
  height: 10px;
  top: 68px;
  left: 50%;
  transform: translateX(-50%);
  /* 用 border 画弧形微笑 */
  border-bottom: 2.5px solid #6d5080;
  border-radius: 0 0 50% 50%;
}

/* ========================================
   四肢样式
   ======================================== */

/* 手臂：小椭圆 */
.pet-arm {
  position: absolute;
  width: 16px;
  height: 28px;
  background: #d4a8d0;
  border-radius: 40%;
  top: 82px;
  transform-origin: top center;
}

.pet-arm--left {
  left: 4px;
  transform: rotate(-20deg);
}

.pet-arm--right {
  right: 4px;
  transform: rotate(20deg);
}

/* 腿：小圆脚 */
.pet-leg {
  position: absolute;
  width: 18px;
  height: 14px;
  background: #b8a0d8;
  border-radius: 50%;
  bottom: 10px;
}

.pet-leg--left {
  left: 32px;
}

.pet-leg--right {
  right: 32px;
}

/* ========================================
   动画状态：idle（待机）
   轻微上下浮动 + 呼吸感缩放
   ======================================== */

.pet-state--idle .pet-body-css {
  animation: pet-idle-float 3s ease-in-out infinite;
}

@keyframes pet-idle-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  30% {
    transform: translateY(-6px) scale(1.03);
  }
  60% {
    transform: translateY(-2px) scale(1.01);
  }
}

/* 待机时手臂微微摆动 */
.pet-state--idle .pet-arm--left {
  animation: pet-idle-arm-left 3s ease-in-out infinite;
}

.pet-state--idle .pet-arm--right {
  animation: pet-idle-arm-right 3s ease-in-out infinite;
}

@keyframes pet-idle-arm-left {
  0%,
  100% {
    transform: rotate(-20deg);
  }
  50% {
    transform: rotate(-28deg);
  }
}

@keyframes pet-idle-arm-right {
  0%,
  100% {
    transform: rotate(20deg);
  }
  50% {
    transform: rotate(28deg);
  }
}

/* ========================================
   动画状态：click（点击）
   快速弹跳一下
   ======================================== */

.pet-state--click .pet-body-css {
  animation: pet-click-bounce 0.4s ease-out;
}

@keyframes pet-click-bounce {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.15, 0.85);
  }
  50% {
    transform: scale(0.9, 1.1) translateY(-14px);
  }
  70% {
    transform: scale(1.05, 0.95) translateY(-4px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

/* 点击时眼睛变大 */
.pet-state--click .pet-eye {
  animation: pet-click-eye 0.4s ease-out;
}

@keyframes pet-click-eye {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
}

/* ========================================
   动画状态：drag（拖拽）
   轻微压扁 + 紧张表情
   ======================================== */

.pet-state--drag .pet-body-css {
  transform: scale(1.05, 0.92);
  transition: transform 0.1s ease;
}

/* 拖拽时眼睛略微眯起 */
.pet-state--drag .pet-eye {
  height: 6px;
  transition: height 0.15s ease;
}

/* ========================================
   动画状态：walk（行走）
   左右摇摆
   ======================================== */

.pet-state--walk .pet-body-css {
  animation: pet-walk-wobble 0.6s ease-in-out infinite;
}

@keyframes pet-walk-wobble {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  25% {
    transform: translateX(4px) rotate(-4deg);
  }
  75% {
    transform: translateX(-4px) rotate(4deg);
  }
}

/* 行走时手脚交替摆动 */
.pet-state--walk .pet-arm--left {
  animation: pet-walk-arm-left 0.6s ease-in-out infinite;
}

.pet-state--walk .pet-arm--right {
  animation: pet-walk-arm-right 0.6s ease-in-out infinite;
}

.pet-state--walk .pet-leg--left {
  animation: pet-walk-leg-left 0.6s ease-in-out infinite;
}

.pet-state--walk .pet-leg--right {
  animation: pet-walk-leg-right 0.6s ease-in-out infinite;
}

@keyframes pet-walk-arm-left {
  0%,
  100% {
    transform: rotate(-20deg);
  }
  50% {
    transform: rotate(-35deg);
  }
}

@keyframes pet-walk-arm-right {
  0%,
  100% {
    transform: rotate(20deg);
  }
  50% {
    transform: rotate(35deg);
  }
}

@keyframes pet-walk-leg-left {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pet-walk-leg-right {
  0%,
  100% {
    transform: translateY(-5px);
  }
  50% {
    transform: translateY(0);
  }
}

/* ========================================
   动画状态：sleep（睡觉）
   缓慢呼吸缩放 + 闭眼
   ======================================== */

.pet-state--sleep .pet-body-css {
  animation: pet-sleep-breathe 4s ease-in-out infinite;
}

@keyframes pet-sleep-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
}

/* 睡觉时眼睛闭起 */
.pet-state--sleep .pet-eye {
  height: 3px;
  border-radius: 50%;
  background: #6d5080;
  transition: height 0.3s ease;
}

/* 睡觉时嘴巴变小 */
.pet-state--sleep .pet-mouth {
  width: 14px;
  height: 6px;
  border-bottom-width: 1.5px;
  transition: all 0.3s ease;
}
</style>
