/**
 * 全局状态类型与 Context 定义（store 模块的唯一类型真源）。
 * Provider 与 useAppStore hook 都从这里取类型，避免两处手写不一致；
 * 新增全局状态字段时，先改这里，再改 Provider 与 hook。
 */
import { createContext } from 'react'
import type { MemoryItem } from './storage'

// 重新导出，供 Provider / 组件统一从 context 取类型（context 是类型真源）
export type { MemoryItem } from './storage'

export type CountryCode = string

/** 新增回忆入参（id/createdAt 由 store 生成，调用方不必提供） */
export interface NewMemoryInput {
  visitedKey: string
  placeName: string
  date: string
  text: string
  /**
   * 父层键链（可选，默认 []）：回忆能"点亮"的祖先地区。
   * 例：深圳回忆传 ['CN', 'CN-440000']，这样中国省页的"广东"、
   * 地球上的"中国"也会亮。页面在确定地区后从路由/数据推导传入。
   */
  ancestorKeys?: string[]
}

/**
 * 全局状态类型定义。
 * 独立成文件，供 Provider 与 hook 复用（避免快照式组件混用警告）。
 *
 * 点亮语义（阶段 4.1 修正）：没有独立 visited 状态，"去过"完全由
 * 回忆推导——getVisited(key) 为 true 当且仅当存在一条回忆的
 * visitedKey === key，或其 ancestorKeys 包含 key（即下辖有回忆）。
 * 因此：添加回忆即点亮、删除最后一条回忆即熄灭，无需手动标记。
 */
export interface AppStoreValue {
  /** 某地是否点亮（自身有回忆，或下辖地区有回忆） */
  getVisited: (code: CountryCode) => boolean
  /** 某地区的回忆列表，按日期倒序（同日按 createdAt 倒序） */
  getMemories: (visitedKey: string) => MemoryItem[]
  /** 新增回忆，返回带 id/createdAt 的完整条目（写存储） */
  addMemory: (input: NewMemoryInput) => MemoryItem
  /** 按 id 删除回忆（写存储） */
  deleteMemory: (id: string) => void

  /** 存储是否可用（隐私模式/被禁用时为 false，页面降级提示，不白屏） */
  storageOk: boolean
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)
