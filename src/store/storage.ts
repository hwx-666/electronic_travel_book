/**
 * 持久化存储层：旅行回忆的 localStorage 读写（schema v2）。
 *
 * 点亮语义（v2 核心变更）：
 * - "去过/点亮"不再有独立 visited 状态，完全由回忆推导——某个地区亮
 *   当且仅当存在一条回忆，其 visitedKey 等于该地区，或其 ancestorKeys
 *   包含该地区（即"下辖有回忆"）。删掉最后一条回忆自动熄灭。
 * - 因此存储里只有 memories；visited 推导结果不落盘（由回忆即时算出）。
 *
 * 存储方案：
 * - localStorage 单 key JSON（`travel-journal.v2`），回忆是纯文本，
 *   总量远小于 5MB；同步写保证"写完即可刷新不丢"。
 * - 图片回忆不纳入：必须走 IndexedDB 存 blob + 压缩链路，后续阶段做。
 *
 * schema v2：
 *   {
 *     version: 2,
 *     memories: Record<visitedKey, MemoryItem[]>
 *   }
 * MemoryItem.ancestorKeys 是该回忆覆盖的父层键链（如深圳回忆
 * ['CN', 'CN-440000']），用于父层（省/国家/ADM1）点亮判断，冗余存储。
 * schema 升级约定：递增 version 并在 migrate() 里加迁移分支，
 * 旧版本数据先迁移再返回，不允许静默丢弃。
 */
/** 旅行回忆条目（核心模型，含义自解释） */
export interface MemoryItem {
  /** 唯一 id（crypto.randomUUID()，兼容性兜底见 addMemory） */
  id: string
  /** 所属地区的 visitedKey（如 CN-440300 / US-CA-06075） */
  visitedKey: string
  /** 冗余存地名：回忆列表展示不依赖地图数据是否已加载 */
  placeName: string
  /** 回忆日期（yyyy-MM-dd，用户可改，默认今天） */
  date: string
  /** 回忆正文（多行文本，长度限制见 Memories 组件） */
  text: string
  /** 创建时间戳（epoch ms，同日排序兜底） */
  createdAt: number
  /**
   * 父层键链（冗余，点亮推导用）：该回忆能"点亮"的祖先地区。
   * 例：深圳回忆 = ['CN', 'CN-440000']（市键 CN-440300 另存在 visitedKey）；
   * 香港（无下级）回忆 = ['CN']；阿联酋阿布扎比回忆 = ['AE']。
   * v1 旧数据无此字段，迁移时补 []（旧回忆只点亮自身，父层不亮）。
   */
  ancestorKeys: string[]
}

/** localStorage 的存储 key（当前版本 v2；v1 key 用于迁移读取） */
const STORAGE_KEY = 'travel-journal.v2'
const LEGACY_STORAGE_KEY = 'travel-journal.v1'

/** 当前 schema 版本（升级存储结构时递增，并在 migrate 加分支） */
const SCHEMA_VERSION = 2

export interface PersistedState {
  version: number
  memories: Record<string, MemoryItem[]>
}

/**
 * 迁移入口：把任意旧版本原始值升级到当前 schema。
 * v1 → v2：丢弃 visited（点亮语义已改为回忆推导），回忆补 ancestorKeys=[]。
 * 约定：迁移后的 version 必须等于 SCHEMA_VERSION，否则按损坏处理。
 */
function migrate(raw: unknown): PersistedState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const state = raw as Partial<PersistedState> & {
    visited?: Record<string, unknown>
  }
  if (state.version !== 1 && state.version !== SCHEMA_VERSION) {
    // 未来：if (state.version === 0) {...} 逐级迁移到当前版本
    return null
  }
  const memories = (state.memories ?? {}) as Record<string, MemoryItem[]>
  // 只保留合法的回忆条目（缺字段即丢弃，避免脏数据进渲染）
  const cleanMemories: Record<string, MemoryItem[]> = {}
  for (const [key, list] of Object.entries(memories)) {
    if (!Array.isArray(list)) continue
    const clean = list.filter(isValidMemory).map(normalizeMemory)
    if (clean.length > 0) cleanMemories[key] = clean
  }
  // v1 的 visited 不再保留：点亮由回忆推导，旧标记在新语义下无意义
  return { version: SCHEMA_VERSION, memories: cleanMemories }
}

function isValidMemory(item: unknown): item is MemoryItem {
  if (typeof item !== 'object' || item === null) return false
  const m = item as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.visitedKey === 'string' &&
    typeof m.placeName === 'string' &&
    typeof m.date === 'string' &&
    typeof m.text === 'string' &&
    typeof m.createdAt === 'number'
  )
}

/** 补齐 v1 缺的字段：ancestorKeys 缺省为空数组（旧回忆只点亮自身） */
function normalizeMemory(item: MemoryItem): MemoryItem {
  if (Array.isArray(item.ancestorKeys)) return item
  return { ...item, ancestorKeys: [] }
}

/**
 * 存储是否可用（隐私模式/被禁用时 localStorage 读写会抛异常）。
 * 组件用它显示"记忆存储不可用"提示，绝不因存储问题白屏/抛错。
 */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__travel_journal_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * 读取全部持久化状态；不可用/损坏时返回 null（调用方用空态兜底）。
 * 兼容旧 key：v2 不存在时尝试读 v1 并迁移（写回 v2、删除 v1）。
 * 注意：损坏（含未来版本）不覆盖原值，避免误删用户数据。
 */
export function loadState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      return migrate(JSON.parse(raw) as unknown)
    }
    // v1 旧数据迁移（新语义下 visited 作废，回忆补 ancestorKeys）
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw !== null) {
      const migrated = migrate(JSON.parse(legacyRaw) as unknown)
      if (migrated) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
          window.localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {
          // 迁移写回失败：内存态照常，下次再迁
        }
      }
      return migrated
    }
    return null
  } catch {
    return null
  }
}

/**
 * 写入全部持久化状态（同步写）。
 * 数据量小（纯文本回忆），同步写在性能上没有可感知开销，
 * 且比 debounce 更稳（刷新前必落盘）。
 * 写入失败（隐私模式/写满）静默忽略——页面用内存态照常渲染。
 */
export function saveState(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 存储不可用：静默降级（页面仍可用，只是不持久化）
  }
}
