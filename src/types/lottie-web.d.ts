// 文件路径: src/types/lottie-web.d.ts
// lottie-web 类型声明

declare module 'lottie-web' {
  interface AnimationItem {
    name: string
    play(): void
    stop(): void
    pause(): void
    setSpeed(speed: number): void
    goToAndPlay(frame: number, isFrame?: boolean): void
    goToAndStop(frame: number, isFrame?: boolean): void
    setDirection(direction: number): void
    destroy(): void
    addEventListener(event: string, callback: () => void): void
    removeEventListener(event: string, callback: () => void): void
  }

  interface AnimationConfig {
    container: HTMLElement
    renderer?: 'svg' | 'canvas' | 'html'
    loop?: boolean
    autoplay?: boolean
    animationData?: unknown
    path?: string
    name?: string
  }

  function loadAnimation(config: AnimationConfig): AnimationItem
  function destroy(name: string): void
}
