/**
 * 全局状态类型与 Context 定义（store 模块的唯一类型真源）。
 * Provider 与 useAppStore hook 都从这里取类型，避免两处手写不一致。
 * 修改提示：新增全局状态字段时，先改这里，再改 Provider 与 hook。
 */
import { createContext } from 'react'

export type CountryCode = string

/**
 * 全局状态类型定义。
 * 独立成文件，供 Provider 与 hook 复用（避免快照式组件混用警告）。
 */
export interface AppStoreValue {
  visited: Map<CountryCode, boolean>
  /** 某地是否去过（未记录视为未去过） */
  getVisited: (code: CountryCode) => boolean
  /** 手动点亮/熄灭（阶段 4 接入存储后这里写持久层） */
  setVisited: (code: CountryCode, visited: boolean) => void
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)
