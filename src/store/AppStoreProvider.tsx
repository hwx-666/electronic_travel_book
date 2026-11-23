/**
 * 全局状态 Provider（阶段 5 云端版）：维护旅行回忆，读写 Supabase。
 *
 * 数据流（云端为真源）：
 * - 挂载后随登录用户变化拉全量（memories + 嵌套 memory_photos），
 *   存内存态 Record<visitedKey, MemoryItem[]>；登出即清空；
 * - getVisited / getMemories 保持同步，从内存态读（渲染层零感知云端）；
 * - addMemory：异步写入云端——
 *    1) insert memories（id 前端 crypto.randomUUID、created_at/updated_at 用 ISO）；
 *    2) 若带照片：逐张压缩（image.ts）→ 上传 Storage（photos/<uid>/<memId>/）
 *       → 批量 insert memory_photos（sort_order 递增）；
 *    3) 任一步失败回滚：删除已传文件 + 删除 memories 记录，然后抛错，
 *       调用方（表单）保留输入不丢；
 * - deleteMemory：先取该回忆的 storage_path 清单 → remove Storage 文件
 *   （尽力，失败仅 warn，避免孤儿文件阻塞主流程）→ delete memories
 *   （memory_photos 由 on delete cascade 连带清除）→ 更新内存态；
 * - storageOk 语义（阶段 5）：云端可用 = 已登录且初始拉取未失败；
 *   回忆页据此提示"云端不可用"，不白屏。
 *
 * 点亮推导（阶段 4.1，云端沿用）：无独立 visited 状态，完全由回忆推导
 * ——getVisited(key) = 存在回忆 visitedKey===key 或 ancestorKeys 包含 key。
 *
 * 稳定性约定：addMemory / deleteMemory 用 useCallback 依赖 user 保持引用稳定，
 * 回忆列表等组件不会因 Provider 重渲染而反复重渲染。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppStoreContext, type AppStoreValue, type NewMemoryInput } from './context'
import type { MemoryItem } from './context'
import {
  PHOTOS_BUCKET,
  TABLES,
  normalizeError,
  photosPath,
  supabase,
} from '../lib/supabase'
import { compressPhoto, thumbPathFor } from '../lib/image'
import { useAuth } from './useAuth'
import { clearLocalMemories, loadState } from './storage'

/**
 * 生成记录唯一 id：优先 crypto.randomUUID()（现代浏览器），
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

/** 由回忆推导"点亮键集合"：每条回忆点亮自身 visitedKey + 全部 ancestorKeys */
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

/** 云端行 → 前端模型映射（snake_case → camelCase，created_at ISO → epoch ms） */
interface MemoryRow {
  id: string
  visited_key: string
  place_name: string
  date: string
  text: string
  ancestor_keys: string[] | null
  created_at: string
  memory_photos?: Array<{
    id: string
    storage_path: string
    sort_order: number
  }>
}

function rowToMemoryItem(row: MemoryRow): MemoryItem {
  return {
    id: row.id,
    visitedKey: row.visited_key,
    placeName: row.place_name,
    date: row.date,
    text: row.text ?? '',
    createdAt: Date.parse(row.created_at) || Date.now(),
    ancestorKeys: row.ancestor_keys ?? [],
    photos: (row.memory_photos ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ id: p.id, storagePath: p.storage_path, sortOrder: p.sort_order })),
  }
}

/** 拉取当前用户全部回忆（含照片元数据），按 visitedKey 分组 */
async function fetchAllMemories(userId: string): Promise<Record<string, MemoryItem[]>> {
  const { data, error } = await supabase
    .from(TABLES.memories)
    .select('*, memory_photos(id, storage_path, sort_order)')
    .eq('user_id', userId)
  if (error) throw error

  const grouped: Record<string, MemoryItem[]> = {}
  for (const row of (data ?? []) as unknown as MemoryRow[]) {
    const item = rowToMemoryItem(row)
    const list = grouped[item.visitedKey] ?? []
    list.push(item)
    grouped[item.visitedKey] = list
  }
  for (const key of Object.keys(grouped)) grouped[key] = sortMemories(grouped[key])
  return grouped
}

export default function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [memories, setMemoriesState] = useState<Record<string, MemoryItem[]>>({})
  // 初始拉取是否失败（storageOk=false 的依据之一）
  const [loadFailed, setLoadFailed] = useState(false)
  const memoriesRef = useRef(memories)

  // 用户变化（含首登）→ 拉全量。
  // 注意：AppGate 以 key={user.id} 挂载本 Provider，登出即卸载、
  // 换账号即重建，天然清空旧数据；此处只需在挂载时拉取一次。
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void fetchAllMemories(userId)
      .then((ms) => {
        if (cancelled) return
        memoriesRef.current = ms
        setMemoriesState(ms)
        setLoadFailed(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[store] 拉取回忆失败', err)
        setLoadFailed(true)
        // 拉取失败不清空旧数据（列表显示已缓存内容，降级不白屏）
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const addMemory = useCallback(
    async (input: NewMemoryInput): Promise<MemoryItem> => {
      if (!userId) {
        const err = { code: 'not-signed-in' as const, message: '未登录，无法保存回忆' }
        throw err
      }
      const id = newMemoryId()
      const now = new Date()
      const nowIso = now.toISOString()
      const ancestorKeys = input.ancestorKeys ?? []
      const item: MemoryItem = {
        id,
        visitedKey: input.visitedKey,
        placeName: input.placeName,
        date: input.date,
        text: input.text,
        ancestorKeys,
        createdAt: now.getTime(),
        photos: [],
      }

      // 1. insert memories（表内无默认值，全字段前端提供）
      const { error: insertError } = await supabase.from(TABLES.memories).insert({
        id,
        user_id: userId,
        visited_key: input.visitedKey,
        place_name: input.placeName,
        date: input.date,
        text: input.text,
        ancestor_keys: ancestorKeys,
        created_at: nowIso,
        updated_at: nowIso,
      })
      if (insertError) throw normalizeError(insertError)

      // 2. 照片链路：压缩 → 上传 → 写 memory_photos；失败回滚
      const uploadedPaths: string[] = []
      try {
        const files = input.photos ?? []
        for (let i = 0; i < files.length; i++) {
          const { blob, thumbBlob, fileName } = await compressPhoto(files[i], i)
          const fullPath = photosPath(userId, id, fileName)
          const thumbPath = photosPath(userId, id, thumbPathFor(fileName))
          const upFull = await supabase.storage
            .from(PHOTOS_BUCKET)
            .upload(fullPath, blob, { contentType: 'image/jpeg', upsert: false })
          if (upFull.error) throw upFull.error
          uploadedPaths.push(fullPath)
          const upThumb = await supabase.storage
            .from(PHOTOS_BUCKET)
            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: false })
          if (upThumb.error) throw upThumb.error
          uploadedPaths.push(thumbPath)
          item.photos.push({
            id: newMemoryId(),
            storagePath: fullPath,
            sortOrder: i,
          })
        }
        if (item.photos.length > 0) {
          const { error: photosError } = await supabase
            .from(TABLES.memoryPhotos)
            .insert(
              item.photos.map((p) => ({
                id: p.id,
                memory_id: id,
                storage_path: p.storagePath,
                sort_order: p.sortOrder,
                created_at: nowIso,
              })),
            )
          if (photosError) throw photosError
        }
      } catch (uploadError) {
        // 回滚：删已传文件 + 删 memories（memory_photos 连带清除）
        if (uploadedPaths.length > 0) {
          const { error: rmError } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .remove(uploadedPaths)
          if (rmError) console.warn('[store] 回滚删除照片失败', rmError.message)
        }
        const { error: delError } = await supabase
          .from(TABLES.memories)
          .delete()
          .eq('id', id)
        if (delError) console.warn('[store] 回滚删除回忆失败', delError.message)
        throw normalizeError(uploadError)
      }

      // 3. 更新内存态（云端已成功）
      setMemoriesState((prev) => {
        const next = { ...prev }
        next[input.visitedKey] = sortMemories([
          ...(next[input.visitedKey] ?? []),
          item,
        ])
        memoriesRef.current = next
        return next
      })
      return item
    },
    [userId],
  )

  const deleteMemory = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        throw { code: 'not-signed-in', message: '未登录，无法删除回忆' }
      }
      // 从内存态找目标（photos 的 storage_path 清单用于删文件）
      let target: MemoryItem | null = null
      for (const list of Object.values(memoriesRef.current)) {
        const found = list.find((m) => m.id === id)
        if (found) {
          target = found
          break
        }
      }
      if (!target) return // 不存在，幂等成功

      // 先删 Storage 文件（尽力而为：失败仅 warn，不让孤儿文件阻塞删除）
      if (target.photos.length > 0) {
        const paths = target.photos.flatMap((p) => [
          p.storagePath,
          thumbPathFor(p.storagePath),
        ])
        const { error: rmError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove(paths)
        if (rmError) console.warn('[store] 删除照片文件失败', rmError.message)
      }

      // 删 memories（memory_photos 由 on delete cascade 连带清除）
      const { error } = await supabase.from(TABLES.memories).delete().eq('id', id)
      if (error) throw normalizeError(error)

      // 更新内存态
      setMemoriesState((prev) => {
        const next: Record<string, MemoryItem[]> = {}
        for (const [key, list] of Object.entries(prev)) {
          next[key] = list.filter((m) => m.id !== id)
        }
        memoriesRef.current = next
        return next
      })
    },
    [userId],
  )

  // 点亮集合：由回忆推导，memories 变化时重算（回忆量小，开销可忽略）
  const litKeys = useMemo(() => computeLitKeys(memories), [memories])

  // storageOk 语义（阶段 5）：云端可用 = 已登录且初始拉取未失败
  const storageOk = userId !== null && !loadFailed

  /**
   * 一次性导入本地 v2 回忆（登录后按钮触发）：
   * - 读 localStorage（含 v1 自动迁移）→ 逐条 upsert 到云端（幂等：
   *   id 已存在则跳过，失败重试不会重复导入）；
   * - 全部成功（含"全部已存在"）后清除本地，返回导入条数；
   * - 中途失败抛错：本地保留，已成功的因幂等下次跳过。
   */
  const importLocalMemories = useCallback(async (): Promise<number> => {
    if (!userId) {
      throw { code: 'not-signed-in', message: '未登录，无法导入' }
    }
    const local = loadState()
    if (!local) return 0 // 无本地数据
    const rows = Object.values(local.memories).flat()

    let imported = 0
    for (const m of rows) {
      // id 必须是合法 uuid 才能幂等 upsert（本地旧 id 兜底格式重新生成）
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const id = uuidRe.test(m.id) ? m.id : newMemoryId()
      const nowIso = new Date(m.createdAt || Date.now()).toISOString()
      const { error } = await supabase
        .from(TABLES.memories)
        .upsert(
          {
            id,
            user_id: userId,
            visited_key: m.visitedKey,
            place_name: m.placeName,
            date: m.date,
            text: m.text,
            ancestor_keys: m.ancestorKeys ?? [],
            created_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        )
      if (error) throw error
      // ignoreDuplicates 不告知是否真的插入；查询该 id 判断
      const { count } = await supabase
        .from(TABLES.memories)
        .select('id', { count: 'exact', head: true })
        .eq('id', id)
      if (count === 1) imported += 1
    }

    // 全部落库后清本地，避免重复提示
    clearLocalMemories()
    // 拉取最新数据刷内存态
    const ms = await fetchAllMemories(userId)
    memoriesRef.current = ms
    setMemoriesState(ms)
    return imported
  }, [userId])

  const value = useMemo<AppStoreValue>(
    () => ({
      getVisited: (code) => litKeys.has(code),
      getMemories: (visitedKey) => sortMemories(memories[visitedKey] ?? []),
      addMemory,
      deleteMemory,
      importLocalMemories,
      storageOk,
    }),
    [memories, litKeys, storageOk, addMemory, deleteMemory, importLocalMemories],
  )

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  )
}
