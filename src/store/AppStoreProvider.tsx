/**
 * 全局状态 Provider：维护旅行回忆，并对外提供读写接口。
 * 阶段 4.1 起"点亮"完全由回忆推导，无独立 visited 状态：
 * - getVisited(key) = 存在回忆其 visitedKey === key 或 ancestorKeys 包含 key；
 * - 添加回忆即点亮（回忆带 ancestorKeys 父层链，下级有回忆时父层也亮）；
 * - 删除回忆：该键没有回忆后自动熄灭，无需额外标记逻辑。
 *
 * 持久化（storage.ts schema v2）：
 * - 首次挂载从存储恢复 memories（同步读，无闪烁；v1 旧数据自动迁移）；
 * - addMemory / deleteMemory 都是"先更新内存态，再同步写存储"，
 *   存储不可用（隐私模式/禁用/写满）时静默降级，页面照常渲染；
 * - 业务组件（地球着色、回忆列表）只认 Context 接口，不感知存储细节。
 *
 * 稳定性约定（重要）：addMemory / deleteMemory 必须是稳定引用
 * （useCallback 空依赖），回忆列表等依赖它们的组件才不会反复重渲染。
 * 新增全局状态字段时，先改 context.ts（类型真源）再改本文件。
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppStoreContext, type AppStoreValue } from './context'
import type { MemoryItem, NewMemoryInput } from './context'
import { isStorageAvailable, loadState, saveState } from './storage'

/**
 * 生成回忆唯一 id：优先 crypto.randomUUID()（现代浏览器），
 * 兜底时间戳 + 随机串（旧环境）。
 */
function newMemoryId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** 回忆排序：日期倒序，同日按 createdAt 倒序 */
function sortMemories(list: MemoryItem[]): MemoryItem[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
}

/**
 * 由回忆推导"点亮键集合"：每条回忆点亮自身 visitedKey + 全部 ancestorKeys。
 * 集合内任意键被 getVisited 命中即"亮"；回忆增删时本集合随之变化。
 */
function computeLitKeys(memories: Record<string, MemoryItem[]>): Set<string> {
  const keys = new Set<string>()
  for (const list of Object.values(memories)) {
    for (const m of list) {
      keys.add(m.visitedKey)
      for (const k of m.ancestorKeys ?? []) keys.add(k)
    }
  }
  return keys
}

/**
 * 全局状态 Provider。
 *
 * 持久化实现：
 * 1. 启动时同步读 storage.ts 的 loadState()，恢复 memories；读失败用空态；
 * 2. 每次回忆增删把 { version, memories } 写回存储。同步写无性能问题，
 *    且保证"写完即可刷新不丢"；写入失败静默（storageOk=false 提示）；
 * 3. 落盘用 ref 镜像最新内存态：React setState 是异步的，直接读闭包值
 *    会写旧快照；在 updater 内同步更新镜像后再写，连续多次操作不丢。
 *    （StrictMode 开发模式会双调用 updater，写同一份幂等数据，无害。）
 * 4. storageOk 供回忆页顶部提示"记忆存储不可用"，绝不抛错白屏。
 */
export default function AppStoreProvider({ children }: { children: ReactNode }) {
  // 启动时一次性恢复（同步读；null 表示无数据或不可用）
  const [initial] = useState(() => loadState())
  const [storageOk] = useState<boolean>(() => isStorageAvailable())

  const [memories, setMemoriesState] = useState<Record<string, MemoryItem[]>>(
    () => initial?.memories ?? {},
  )

  // 最新状态镜像：updater 内同步更新，落盘读它（见上方说明第 3 点）
  const memoriesRef = useRef(memories)

  /** 写整份存储（读 ref 镜像的"最新"内存态；不可用时静默） */
  const persist = useCallback(() => {
    saveState({ version: 2, memories: memoriesRef.current })
  }, [])

  const addMemory = useCallback(
    (input: NewMemoryInput): MemoryItem => {
      const item: MemoryItem = {
        id: newMemoryId(),
        visitedKey: input.visitedKey,
        placeName: input.placeName,
        date: input.date,
        text: input.text,
        ancestorKeys: input.ancestorKeys ?? [],
        createdAt: Date.now(),
      }
      setMemoriesState((prev) => {
        const next = { ...prev }
        next[input.visitedKey] = sortMemories([
          ...(next[input.visitedKey] ?? []),
          item,
        ])
        memoriesRef.current = next
        persist()
        return next
      })
      return item
    },
    [persist],
  )

  const deleteMemory = useCallback(
    (id: string) => {
      setMemoriesState((prev) => {
        const next: Record<string, MemoryItem[]> = {}
        for (const [key, list] of Object.entries(prev)) {
          next[key] = list.filter((m) => m.id !== id)
        }
        memoriesRef.current = next
        persist()
        return next
      })
    },
    [persist],
  )

  // 点亮集合：由回忆推导，memories 变化时重算（回忆量小，开销可忽略）
  const litKeys = useMemo(() => computeLitKeys(memories), [memories])

  const value = useMemo<AppStoreValue>(
    () => ({
      getVisited: (code) => litKeys.has(code),
      getMemories: (visitedKey) => sortMemories(memories[visitedKey] ?? []),
      // 以下两个是稳定引用（useCallback），依赖见上
      addMemory,
      deleteMemory,
      storageOk,
    }),
    [memories, litKeys, storageOk, addMemory, deleteMemory],
  )

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  )
}
