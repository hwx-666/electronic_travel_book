/**
 * 全局状态的读取 hook（业务组件统一入口）。
 * 使用前提：必须在 <AppStoreProvider> 子树内，否则抛错提示，
 * 避免静默拿到 null 导致 undefined 访问。
 */
import { useContext } from 'react'
import { AppStoreContext, type AppStoreValue } from './context'

/** 读取全局状态（必须包在 <AppStoreProvider> 内使用） */
export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext)
  if (!ctx) {
    throw new Error('useAppStore 必须在 <AppStoreProvider> 内使用')
  }
  return ctx
}
