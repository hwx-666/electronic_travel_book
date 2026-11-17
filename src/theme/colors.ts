/**
 * 主题色——TS 侧定义（唯一真源之一）。
 *
 * globe.gl 用 Canvas/WebGL 渲染，颜色由 JS 直接控制、不经过 CSS，
 * 所以 3D 层必须在这里读颜色；DOM 层则用 theme.css 里的 CSS 变量。
 * 两份文件的取值必须保持一致（theme.css 顶部有同步说明）。
 *
 * 业务组件一律引用本文件 / CSS 变量，禁止在代码里写死颜色值。
 */
export const themeColors = {
  /** 地球板块 · 未去过 */
  unvisited: '#1C2B3F',
  /** 地球板块 · 去过/点亮 */
  visited: '#C4B2A3',
  /** 板块边缘描边 */
  stroke: '#F9F4F4',
  /** 上传内容背景 */
  contentBg: '#5C687E',
  /** 上传内容文字 */
  contentText: '#EEE8E3',
  /** 按钮底色 */
  buttonBg: '#F9F4F4',
  /** 按钮文字/图案 */
  buttonText: '#57687B',
} as const

/**
 * 把任意主题色朝白色方向提亮。
 * 用于 hover 高亮等"同色系变亮"的场景，这样高亮色是派生值，
 * 而不是在业务代码里再写一个新颜色。
 *
 * @param hex   形如 "#1C2B3F" 的十六进制颜色
 * @param ratio 提亮比例，0~1
 */
export function lightenColor(hex: string, ratio: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio)
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}
