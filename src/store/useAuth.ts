/**
 * 登录态读取 hook（业务组件统一入口）。
 * 使用前提：必须在 <AuthProvider> 子树内，否则抛错提示。
 */
import { useContext } from 'react'
import { AuthContext, type AuthValue } from './AuthContext'

/** 读取登录态（必须包在 <AuthProvider> 内使用） */
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
