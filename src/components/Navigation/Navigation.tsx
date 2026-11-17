/**
 * 顶部导航：返回按钮 + 面包屑（hash 路由 Link）。
 * 约定：crumbs 最后一级为当前页（无链接）；返回按钮与面包屑各自独立，
 * 页面层按需传 onBack / crumbs。
 */
import { Link } from 'react-router-dom'
import './Navigation.css'

export interface Crumb {
  /** 面包屑文案，如 "地球"、"中国" */
  label: string
  /** 可点击跳转的路由（最后一级通常为空 = 当前位置） */
  to?: string
}

interface NavigationProps {
  /** 面包屑层级，从左（最外层）到右（当前位置） */
  crumbs: Crumb[]
  /** 返回按钮回调（返回上一级 / 地球） */
  onBack?: () => void
}

/**
 * 顶部导航：返回按钮 + 面包屑并存。
 * 面包屑用于任意跳回上级，返回按钮用于"退一步"。
 */
export default function Navigation({ crumbs, onBack }: NavigationProps) {
  return (
    <nav className="navigation">
      {onBack && (
        <button
          type="button"
          className="navigation__back"
          onClick={onBack}
          aria-label="返回上一级"
        >
          ← 返回
        </button>
      )}
      <ol className="navigation__crumbs">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={index} className="navigation__crumb">
              {isLast || !crumb.to ? (
                <span
                  className={isLast ? 'navigation__link is-current' : 'navigation__link'}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="navigation__link">
                  {crumb.label}
                </Link>
              )}
              {!isLast && <span className="navigation__sep">›</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
