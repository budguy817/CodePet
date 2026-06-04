// 文件路径: src/utils/lottieAnimations.ts
// Lottie 动画数据
//
// 为每种宠物动画状态提供手写的、经过验证的 Lottie JSON。
// 不使用程序化生成，确保数据结构与 lottie-web 完全兼容。
//
// 动画规格：150×140 画布，30fps，SVG 渲染

// ===== 工具：构建 Lottie 缩放关键帧 =====

/** 在图层变换上创建缩放脉冲关键帧 */
const scalePulse = (values: number[], frames: number[]) => {
  const kf: Record<string, unknown>[] = []
  for (let i = 0; i < values.length; i++) {
    kf.push({
      t: frames[i],
      s: [values[i], values[i]],
      ...(i > 0 ? {
        i: { x: [0.33], y: [1] },
        o: { x: [0.67], y: [0] },
      } : {}),
    })
  }
  return kf
}

// ===== 基础宠物形状（无动画） =====

/** 椭圆 */
const el = (nm: string, w: number, h: number, px = 0, py = 0) => ({
  ty: 'el' as const, nm,
  p: { a: 0, k: [px, py] },
  s: { a: 0, k: [w, h] },
})

/** 填充 */
const fl = (r: number, g: number, b: number, alpha = 1) => ({
  ty: 'fl' as const, nm: 'Fill',
  c: { a: 0, k: [r, g, b] },
  o: { a: 0, k: alpha * 100 },
  r: 1,
})

/** 描边 */
const st = (r: number, g: number, b: number, w: number, alpha = 1) => ({
  ty: 'st' as const, nm: 'Stroke',
  c: { a: 0, k: [r, g, b] },
  o: { a: 0, k: alpha * 100 },
  w: { a: 0, k: w },
  lc: 2, lj: 2,
})

/** 变换（静止） */
const tr = (px = 0, py = 0, sx = 100, sy = 100, rot = 0) => ({
  ty: 'tr' as const, nm: 'Transform',
  p: { a: 0, k: [px, py] },
  a: { a: 0, k: [0, 0] },
  s: { a: 0, k: [sx, sy] },
  r: { a: 0, k: rot },
  o: { a: 0, k: 100 },
})

/** 带动画缩放的关键帧变换 */
const trAnim = (px: number, py: number, scaleKF: Record<string, unknown>[]) => ({
  ty: 'tr' as const, nm: 'Transform',
  p: { a: 0, k: [px, py] },
  a: { a: 0, k: [0, 0] },
  s: { a: 1, k: scaleKF },
  r: { a: 0, k: 0 },
  o: { a: 0, k: 100 },
})

// ===== 各状态动画 =====

const W = 150
const H = 140

/**
 * idle：待机 — 3s 呼吸缩放循环
 */
export const IDLE_LOTTIE = {
  v: '5.5.2', fr: 30, ip: 0, op: 90,
  w: W, h: H, nm: 'idle', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'Pet', sr: 1,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 0, k: [W / 2, H / 2] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr', nm: 'Body',
        it: [
          el('body', 120, 105, 0, -3),
          fl(1, 0.7, 0.76),
          trAnim(0, 0, scalePulse([100, 103, 101, 100], [0, 20, 45, 90])),
        ],
      },
      { ty: 'gr', nm: 'LEye', it: [el('le', 10, 12, -22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'REye', it: [el('re', 10, 12, 22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'LCheek', it: [el('lc', 16, 10, -30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      { ty: 'gr', nm: 'RCheek', it: [el('rc', 16, 10, 30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      {
        ty: 'gr', nm: 'Mouth',
        it: [
          {
            ty: 'sh', nm: 'mouth',
            ks: {
              a: 0,
              k: {
                c: false,
                v: [[-4, 10], [0, 14], [4, 10]],
                i: [[-1.5, 0], [0, 2], [1.5, 0]],
                o: [[0, 0], [0, 0], [0, 0]],
              },
            },
          },
          st(0.43, 0.31, 0.5, 2.2, 1),
          tr(),
        ],
      },
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  }],
}

/**
 * click：点击 — 0.3s 弹跳
 */
export const CLICK_LOTTIE = {
  v: '5.5.2', fr: 30, ip: 0, op: 9,
  w: W, h: H, nm: 'click', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'Pet', sr: 1,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 0, k: [W / 2, H / 2] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr', nm: 'Body',
        it: [
          el('body', 120, 105, 0, -3),
          fl(1, 0.7, 0.76),
          trAnim(0, 0, scalePulse([100, 115, 90, 105, 100], [0, 2, 4, 6, 9])),
        ],
      },
      { ty: 'gr', nm: 'LEye', it: [el('le', 10, 12, -22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'REye', it: [el('re', 10, 12, 22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'LCheek', it: [el('lc', 16, 10, -30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      { ty: 'gr', nm: 'RCheek', it: [el('rc', 16, 10, 30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      {
        ty: 'gr', nm: 'Mouth',
        it: [{ ty: 'sh', nm: 'mouth', ks: { a: 0, k: { c: false, v: [[-4, 10], [0, 14], [4, 10]], i: [[-1.5, 0], [0, 2], [1.5, 0]], o: [[0, 0], [0, 0], [0, 0]] } } }, st(0.43, 0.31, 0.5, 2.2), tr()],
      },
    ],
    ip: 0, op: 9, st: 0, bm: 0,
  }],
}

/**
 * drag：拖拽 — 静止压扁
 */
export const DRAG_LOTTIE = {
  v: '5.5.2', fr: 30, ip: 0, op: 1,
  w: W, h: H, nm: 'drag', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'Pet', sr: 1,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 0, k: [W / 2, H / 2] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr', nm: 'Body',
        it: [el('body', 120, 105, 0, -3), fl(1, 0.7, 0.76), tr(0, 0, 106, 92)],
      },
      { ty: 'gr', nm: 'LEye', it: [el('le', 10, 12, -22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'REye', it: [el('re', 10, 12, 22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'LCheek', it: [el('lc', 16, 10, -30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      { ty: 'gr', nm: 'RCheek', it: [el('rc', 16, 10, 30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      {
        ty: 'gr', nm: 'Mouth',
        it: [{ ty: 'sh', nm: 'mouth', ks: { a: 0, k: { c: false, v: [[-4, 10], [0, 12], [4, 10]], i: [[-1.5, 0], [0, 0], [1.5, 0]], o: [[0, 0], [0, 0], [0, 0]] } } }, st(0.43, 0.31, 0.5, 2.2), tr()],
      },
    ],
    ip: 0, op: 1, st: 0, bm: 0,
  }],
}

/**
 * walk：行走 — 0.6s 左右摇摆
 */
export const WALK_LOTTIE = {
  v: '5.5.2', fr: 30, ip: 0, op: 18,
  w: W, h: H, nm: 'walk', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'Pet', sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: {
        a: 1,
        k: [
          { t: 0, s: [0], i: { x: [0.33], y: [1] }, o: { x: [0.67], y: [0] } },
          { t: 5, s: [-4] },
          { t: 13, s: [4] },
          { t: 18, s: [0] },
        ],
      },
      p: { a: 0, k: [W / 2, H / 2] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    },
    ao: 0,
    shapes: [
      { ty: 'gr', nm: 'Body', it: [el('body', 120, 105, 0, -3), fl(1, 0.7, 0.76), tr()] },
      { ty: 'gr', nm: 'LEye', it: [el('le', 10, 12, -22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'REye', it: [el('re', 10, 12, 22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'LCheek', it: [el('lc', 16, 10, -30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      { ty: 'gr', nm: 'RCheek', it: [el('rc', 16, 10, 30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      {
        ty: 'gr', nm: 'Mouth',
        it: [{ ty: 'sh', nm: 'mouth', ks: { a: 0, k: { c: false, v: [[-4, 10], [0, 14], [4, 10]], i: [[-1.5, 0], [0, 2], [1.5, 0]], o: [[0, 0], [0, 0], [0, 0]] } } }, st(0.43, 0.31, 0.5, 2.2), tr()],
      },
    ],
    ip: 0, op: 18, st: 0, bm: 0,
  }],
}

/**
 * sleep：睡觉 — 4s 缓慢呼吸
 */
export const SLEEP_LOTTIE = {
  v: '5.5.2', fr: 30, ip: 0, op: 120,
  w: W, h: H, nm: 'sleep', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'Pet', sr: 1,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 0, k: [W / 2, H / 2] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr', nm: 'Body',
        it: [
          el('body', 120, 105, 0, -3),
          fl(1, 0.7, 0.76),
          trAnim(0, 0, scalePulse([100, 95, 100], [0, 60, 120])),
        ],
      },
      // 睡觉时眼睛闭起（扁椭圆模拟闭眼）
      { ty: 'gr', nm: 'LEye', it: [el('le', 10, 4, -22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'REye', it: [el('re', 10, 4, 22, -16), fl(0.24, 0.19, 0.33), tr()] },
      { ty: 'gr', nm: 'LCheek', it: [el('lc', 16, 10, -30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      { ty: 'gr', nm: 'RCheek', it: [el('rc', 16, 10, 30, 2), fl(1, 0.59, 0.67, 0.5), tr()] },
      {
        ty: 'gr', nm: 'Mouth',
        it: [{ ty: 'sh', nm: 'mouth', ks: { a: 0, k: { c: false, v: [[-3, 10], [0, 11], [3, 10]], i: [[-1, 0], [0, 0], [1, 0]], o: [[0, 0], [0, 0], [0, 0]] } } }, st(0.43, 0.31, 0.5, 1.5), tr()],
      },
    ],
    ip: 0, op: 120, st: 0, bm: 0,
  }],
}
