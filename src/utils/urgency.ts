// 文件路径: src/utils/urgency.ts
// 紧急程度工具函数

/**
 * 根据紧急程度文本返回对应的 CSS class 后缀
 */
export const urgencyClass = (u: string): string => {
  if (u === '紧急') return 'urgent'
  if (u === '高') return 'high'
  if (u === '中') return 'mid'
  return 'low'
}
