/**
 * 账号页（阶段 5）：登录 / 注册（默认"登录"标签），全屏门控。
 *
 * 行为约定：
 * - 默认展示登录表单；"注册"标签切换为注册（邮箱 + 密码，密码 ≥6 位）；
 * - 注册默认开启邮件确认：signUp 成功后提示"查收确认邮件"（不自动登录）；
 * - 登录成功：onAuthStateChange 触发，App 层门控自动放行，无需跳转逻辑；
 * - 错误统一走 normalizeError 的友好中文文案，表单输入保留不丢；
 * - 提交中禁用按钮，避免重复请求。
 */
import { useState, type FormEvent } from 'react'
import { useAuth } from '../store/useAuth'
import './auth.css'

type AuthMode = 'login' | 'register'

/** 密码最短长度（与 Supabase 默认一致） */
const PASSWORD_MIN = 6

/** 账号页：登录/注册（未登录时整站唯一可见页） */
export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setMessage(null)
    // 切换时清空密码，避免残留
    setPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setMessage({ kind: 'error', text: '请输入邮箱和密码' })
      return
    }
    if (password.length < PASSWORD_MIN) {
      setMessage({ kind: 'error', text: `密码长度至少 ${PASSWORD_MIN} 位` })
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'login') {
        await signIn(trimmedEmail, password)
        // 登录成功：session 变化 → App 层自动放行
      } else {
        const { needsConfirmation } = await signUp(trimmedEmail, password)
        if (needsConfirmation) {
          setMode('login')
          setPassword('')
          setMessage({
            kind: 'info',
            text: '注册成功！确认邮件已发送，请查收邮箱后登录',
          })
        } else {
          // 未开启邮件确认：直接进入登录态（App 层自动放行）
          setMessage({ kind: 'info', text: '注册成功，正在进入…' })
        }
      }
    } catch (err) {
      const normalized = err as { message?: string; code?: string }
      setMessage({ kind: 'error', text: normalized?.message ?? '操作失败，请重试' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <h1 className="auth__title">我的旅行手账</h1>
          <p className="auth__desc">
            记录去过的地方，点亮世界地图。登录后回忆将保存到云端，多设备同步。
          </p>
        </div>

        <div className="auth__tabs">
          <button
            type="button"
            className="auth__tab"
            data-active={mode === 'login'}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className="auth__tab"
            data-active={mode === 'register'}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="auth__field">
            <span className="auth__label">邮箱</span>
            <input
              type="email"
              className="auth__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth__field">
            <span className="auth__label">密码</span>
            <input
              type="password"
              className="auth__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? `至少 ${PASSWORD_MIN} 位` : '请输入密码'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={PASSWORD_MIN}
              required
            />
          </label>

          {message && (
            <p
              className={`auth__message ${
                message.kind === 'error'
                  ? 'auth__message--error'
                  : 'auth__message--info'
              }`}
            >
              {message.text}
            </p>
          )}

          <button type="submit" className="auth__submit" disabled={busy}>
            {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="auth__note">
          回忆与照片仅自己可见（按账号隔离）。
          <br />
          忘记密码？请联系管理员重置。
        </p>
      </div>
    </div>
  )
}
