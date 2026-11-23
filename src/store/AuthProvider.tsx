/**
 * 登录态 Provider：session 管理 + 登录/注册/登出封装。
 *
 * 设计：
 * - 挂载时读一次 getSession() 做"刷新不掉登录态"的恢复，并订阅
 *   onAuthStateChange 同步后续变化（多标签页 / 登出）；
 * - initializing：初始恢复完成前为 true，App 层用它避免"闪一下登录页"；
 * - signUp 返回 { needsConfirmation }：开启邮件确认时，注册后 session 为空，
 *   需要提示用户查收确认邮件；需求文档默认"保留邮件确认"。
 * - 错误全部经过 supabase.ts 的 normalizeError 规范化，组件只展示 message。
 * - 注意：本文件只导出 Provider 组件；Context 在 AuthContext.ts，
 *   useAuth hook 在 useAuth.ts（Fast Refresh 约定同全局状态）。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext, type AuthValue } from './AuthContext'
import { getSession, onAuthStateChange, signIn, signOut, signUp } from '../lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthValue['user']>(null)
  const [initializing, setInitializing] = useState(true)

  // 挂载：恢复会话 + 订阅变化
  useEffect(() => {
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setInitializing(false)
    })
    const unsubscribe = onAuthStateChange((next) => {
      if (cancelled) return
      setUser(next?.user ?? null)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const doSignUp = useCallback(async (email: string, password: string) => {
    return signUp(email, password)
  }, [])

  const doSignIn = useCallback(async (email: string, password: string) => {
    await signIn(email, password)
  }, [])

  const doSignOut = useCallback(async () => {
    await signOut()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      initializing,
      signUp: doSignUp,
      signIn: doSignIn,
      signOut: doSignOut,
    }),
    [user, initializing, doSignUp, doSignIn, doSignOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
