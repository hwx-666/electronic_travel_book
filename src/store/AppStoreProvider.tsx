/**
 * 全局状态 Provider：维护 visited 等状态并对外提供读写接口。
 * 阶段 4 接入持久化时，只需替换 getVisited/setVisited 的内部实现，
 * 所有业务组件（地球着色、点亮）无需改动。
 */
import { useMemo, useState, type ReactNode } from 'react'
import { AppStoreContext, type AppStoreValue } from './context'

/**
 * 全局状态 Provider。
 *
 * 阶段 1 只维护 visited：用 Map<countryCode, boolean> 存"去过"状态，
 * 读写统一走 getVisited / setVisited 两个接口。
 * 阶段 4 接 IndexedDB 持久化时，只需要把这两个接口的实现换成
 * "先读/写存储"，业务代码（地球着色、点亮逻辑）无需改动。
 *
 * 说明：这里用 `Map` 而不是普通对象，因为后续省级（CN-44 等）
 * 也要进这个状态，Map 对任意代码的增删更直观。
 */
export default function AppStoreProvider({ children }: { children: ReactNode }) {
  const [visited, setVisitedState] = useState<Map<string, boolean>>(
    () => new Map(),
  )

  const value = useMemo<AppStoreValue>(
    () => ({
      visited,
      getVisited: (code) => visited.get(code) ?? false,
      setVisited: (code, isVisited) => {
        setVisitedState((prev) => {
          const next = new Map(prev)
          if (isVisited) {
            next.set(code, true)
          } else {
            next.delete(code) // 没去过就不占 Map 项
          }
          return next
        })
      },
    }),
    [visited],
  )

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  )
}
