/**
 * 全局账号条（阶段 5）：右上角显示当前邮箱 + 登出按钮。
 * 仅登录后渲染（AppGate 内）；登出后由 AppGate 自动切回账号页。
 * z-index 高于 Navigation(10)，且 pointer-events 只在自身生效，
 * 不影响下方地图/地球的交互。
 */
import { useAuth } from '../../store/useAuth'
import './AccountBar.css'

/** 全局账号条：邮箱 + 登出 */
export default function AccountBar() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    if (!window.confirm('确定退出登录吗？')) return
    try {
      await signOut()
    } catch {
      // 登出失败：仍清本地（下次会话校验会兜底）
    }
  }

  return (
    <div className="account-bar">
      <span className="account-bar__email" title={user?.email ?? ''}>
        {user?.email ?? ''}
      </span>
      <button type="button" className="account-bar__logout" onClick={handleSignOut}>
        退出登录
      </button>
    </div>
  )
}
