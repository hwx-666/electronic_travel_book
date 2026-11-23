/**
 * Supabase 接入层：client 单例 + 表/bucket 常量 + auth 封装 + 错误规范化。
 *
 * 职责边界：
 * - 只负责与 Supabase 通信（Auth / PostgREST / Storage），不掺业务状态；
 * - 提供语义化错误（网络 / 权限 / 邮箱未确认 / 密码错误 / 未登录……），
 *   组件层只消费 error.message 展示，不感知 SDK 细节；
 * - 表内无默认值：回忆与照片记录的所有字段由调用方（store 层）生成后
 *   insert，本文件不做任何默认值兜底。
 *
 * 环境变量（见 .env.example，勿提交 .env）：
 * - VITE_SUPABASE_URL：项目 REST 端点，如 https://xxx.supabase.co
 * - VITE_SUPABASE_ANON_KEY：publishable key（公开、受 RLS 限制，可直接用于前端）
 */
import { createClient, type Session, type User } from '@supabase/supabase-js'

/** 表名常量（与 scripts/supabase-schema.sql 保持一致） */
export const TABLES = {
  memories: 'memories',
  memoryPhotos: 'memory_photos',
} as const

/** Storage bucket 名（public） */
export const PHOTOS_BUCKET = 'photos'

/** 图片路径命名空间：photos/<userId>/<memoryId>/<文件名>（storage 策略按首段鉴权） */
export const photosPath = (userId: string, memoryId: string, fileName: string) =>
  `${userId}/${memoryId}/${fileName}`

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** client 单例；env 缺失时给出明确报错（只在启动期暴露一次） */
export const supabase = createClient(
  supabaseUrl ?? 'https://missing-url.supabase.co',
  supabaseAnonKey ?? 'missing-key',
)

/**
 * 语义化错误类型：
 * - invalid-email / weak-password：注册表单校验（本地即可判断，部分也来自服务端）
 * - email-confirm-pending：已注册但未点确认邮件（SignUp 后 24h 内登录会提示）
 * - invalid-credentials：密码错误 / 邮箱不存在（统一提示，避免泄露账号存在性）
 * - email-confirm-expired：确认链接过期
 * - network / timeout / permission / unknown：基础设施类
 */
export interface NormalizedError {
  code:
    | 'email-confirm-pending'
    | 'invalid-credentials'
    | 'email-confirm-expired'
    | 'email-already-exists'
    | 'invalid-email'
    | 'weak-password'
    | 'network'
    | 'timeout'
    | 'permission'
    | 'not-signed-in'
    | 'unknown'
  message: string
}

/** 把 SDK/网络异常规范化为友好中文提示（组件层只读 message 展示） */
export function normalizeError(err: unknown): NormalizedError {
  // 网络层错误（fetch 失败 / 断网 / CORS）
  if (err instanceof TypeError) {
    return { code: 'network', message: '网络异常，请检查网络后重试' }
  }
  const anyErr = err as { message?: string; code?: string; name?: string; status?: number } | null
  const msg = anyErr?.message ?? '未知错误'
  const code = anyErr?.code ?? ''

  if (msg.includes('Timeout') || msg.includes('timed out') || anyErr?.name === 'TimeoutError') {
    return { code: 'timeout', message: '请求超时，请稍后重试' }
  }
  // 邮件确认相关（Supabase Auth 的已知文案）
  if (msg.includes('Email not confirmed') || msg.includes('email confirmation')) {
    return { code: 'email-confirm-pending', message: '该邮箱尚未完成邮件确认，请先查收确认邮件' }
  }
  if (msg.includes('expired')) {
    return { code: 'email-confirm-expired', message: '确认链接已过期，请重新注册或发送新链接' }
  }
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return { code: 'email-already-exists', message: '该邮箱已注册，请直接登录' }
  }
  if (msg.includes('Invalid login credentials')) {
    return { code: 'invalid-credentials', message: '邮箱或密码不正确' }
  }
  if (msg.includes('Password should be at least')) {
    return { code: 'weak-password', message: '密码长度至少 6 位' }
  }
  if (msg.includes('Invalid email') || msg.includes('valid email') || msg.includes('is invalid')) {
    return { code: 'invalid-email', message: '邮箱格式不正确' }
  }
  if (code === 'PGRST116' || code === '42501' || msg.includes('row-level security')) {
    return { code: 'permission', message: '没有权限执行该操作' }
  }
  if (msg.includes('rate limit') || msg.includes('Too many')) {
    return { code: 'unknown', message: '操作太频繁，请稍等片刻再试' }
  }
  if (msg.includes('JWT') || msg.includes('session')) {
    return { code: 'not-signed-in', message: '登录状态已失效，请重新登录' }
  }
  return { code: 'unknown', message: `操作失败：${msg}` }
}

/** 邮箱 + 密码注册。返回是否"需要邮件确认"（默认开启确认时为 true） */
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw normalizeError(error)
  // 开启邮件确认时，signUp 返回的 session 为 null
  return { needsConfirmation: data.session === null }
}

/** 邮箱 + 密码登录（错误已规范化为友好提示） */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw normalizeError(error)
}

/** 登出（失败也吞掉：本地上层会清空状态） */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    // 登出失败不阻塞流程：会话最终会在下次校验时失效
    console.warn('[supabase] signOut 失败，忽略', error.message)
  }
}

/** 当前会话（null = 未登录）；getSession 是异步的，调用方 await */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

/** 订阅登录态变化，返回取消订阅函数 */
export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

/** 当前用户（会话存在时为 User，否则 null） */
export async function getUser(): Promise<User | null> {
  return (await getSession())?.user ?? null
}
