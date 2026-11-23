/**
 * 登录态 Context 定义（store 模块的类型真源之一）。
 * 与全局状态约定一致：Context 独立成文件，Provider 与 hook 各自单独文件，
 * 避免 Fast Refresh 警告（AuthProvider 在 AuthProvider.tsx，useAuth 在 useAuth.ts）。
 */
import { createContext } from 'react'

/** 登录态值类型（真源；AuthProvider 与 useAuth 都从这里取类型） */
export interface AuthValue {
  /** 当前登录用户（null = 未登录） */
  user: import('@supabase/supabase-js').User | null
  /** 初始会话恢复是否完成（true 期间不要渲染"未登录"界面） */
  initializing: boolean
  /** 注册：成功时若需邮件确认则返回 true（提示查收邮件） */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  /** 登录（错误规范化，失败抛 { message }） */
  signIn: (email: string, password: string) => Promise<void>
  /** 登出（清本地会话，AppStore 会随之清空数据） */
  signOut: () => Promise<void>
}

/** 供 useAuth.ts 读取（类型真源）；业务组件用 useAuth()，不直接 useContext */
export const AuthContext = createContext<AuthValue | null>(null)
