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
  /**
   * 待上传的原始图片文件（阶段 5，可选，最多 MAX_PHOTOS_PER_MEMORY 张）。
   * store 负责压缩（src/lib/image.ts）→ 上传 Storage → 写 memory_photos；
   * 传空数组/缺省 = 纯文字回忆。
   */
  photos?: File[]
}

/**
 * 全局状态类型定义。
 * 独立成文件，供 Provider 与 hook 复用（避免快照式组件混用警告）。
 *
 * 点亮语义（阶段 4.1 修正）：没有独立 visited 状态，"去过"完全由
 * 回忆推导——getVisited(key) 为 true 当且仅当存在一条回忆的
 * visitedKey === key，或其 ancestorKeys 包含 key（即下辖有回忆）。
 * 因此：添加回忆即点亮、删除最后一条回忆即熄灭，无需手动标记。
 *
 * 阶段 5（云端化）接口变化说明：
 * - addMemory / deleteMemory 从同步改为返回 Promise：云端写入是异步的，
 *   调用方 await 后才知道成败（失败保留表单输入，不丢用户内容）；
 * - getVisited / getMemories 保持同步：数据从内存缓存读（登录时拉全量），
 *   渲染层无需感知云端；
 * - storageOk 语义改为"云端可用"：当前用户已登录且初始数据加载成功。
 *   不可用时回忆页顶部提示"云端不可用"，列表显示已缓存内容。
 */
export interface AppStoreValue {
  /** 某地是否点亮（自身有回忆，或下辖地区有回忆） */
  getVisited: (code: CountryCode) => boolean
  /** 某地区的回忆列表，按日期倒序（同日按 createdAt 倒序） */
  getMemories: (visitedKey: string) => MemoryItem[]
  /** 新增回忆（云端写入），返回带 id/createdAt/photos 的完整条目；失败抛错 */
  addMemory: (input: NewMemoryInput) => Promise<MemoryItem>
  /** 按 id 删除回忆（云端删除，含 Storage 文件）；失败抛错 */
  deleteMemory: (id: string) => Promise<void>
  /** 一次性导入本地 v2 回忆（幂等），返回本次新导入条数；失败抛错 */
  importLocalMemories: () => Promise<number>

  /** 云端是否可用（未登录 / 初始加载失败时为 false） */
  storageOk: boolean
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)
