/**
 * 根组件：认证门控 + Provider + 路由表。
 *
 * 阶段 5 门控结构：
 * - AuthProvider 在外层（登录态真源）；
 * - AppGate 判断：未登录 → 渲染 AuthPage（整站唯一可见页）；
 *   已登录 → 渲染主应用（AppStoreProvider + 路由 + 全局登出条）；
 * - AppStoreProvider 在已登录分支内部挂载，避免未登录时拉数据。
 *
 * 路由（hash 模式）：
 * 用 hash 而不是 history 模式，是为了将来部署到 GitHub Pages /
 * 任何静态托管时不需要服务端做路由重写，`npm run build` 出来的
 * 静态文件直接能跑。
 *
 * 视图状态机（阶段 3 起外国支持两级下钻）：
 *   /earth
 *   /country/:code                 国家视图（中国 → 省级地图；外国 → ADM1 地图）
 *   /country/CN/:province          中国省级视图（该省市级地图）
 *   /country/CN/:province/:city    中国城市页（阶段 2 空态，阶段 4 接回忆）
 *   /country/:code/:r1             外国 ADM1 详情（该区 ADM2 地图）
 *   /country/:code/:r1/:r2         外国 ADM2 详情页（阶段 3 空态，阶段 4 接回忆）
 * 中国专属路由（/country/CN/...）写在前：React Router 的静态段比动态段优先，
 * 保证 /country/CN/xxx 永远命中中国页，不落入 /country/:code/:r1。
 */
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './store/AuthProvider'
import { useAuth } from './store/useAuth'
import AppStoreProvider from './store/AppStoreProvider'
import AuthPage from './pages/AuthPage'
import AccountBar from './components/AccountBar/AccountBar'
import EarthPage from './pages/EarthPage'
import CountryPage from './pages/CountryPage'
import ProvincePage from './pages/ProvincePage'
import CityPage from './pages/CityPage'
import ForeignRegionPage from './pages/ForeignRegionPage'
import ForeignCityPage from './pages/ForeignCityPage'

/** 主应用路由表（仅登录后渲染） */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/earth" replace />} />
      <Route path="/earth" element={<EarthPage />} />
      <Route path="/country/:code" element={<CountryPage />} />
      <Route path="/country/CN/:province" element={<ProvincePage />} />
      <Route path="/country/CN/:province/:city" element={<CityPage />} />
      <Route path="/country/:code/:r1" element={<ForeignRegionPage />} />
      <Route path="/country/:code/:r1/:r2" element={<ForeignCityPage />} />
      <Route path="*" element={<Navigate to="/earth" replace />} />
    </Routes>
  )
}

/**
 * 门控：initializing 期间显示空屏（避免闪一下登录页）；
 * 未登录显示账号页；已登录渲染主应用 + 全局登出条。
 */
function AppGate() {
  const { user, initializing } = useAuth()
  if (initializing) return null
  if (!user) return <AuthPage />
  return (
    <>
      <AccountBar />
      {/* key={user.id}：换账号/登出后重新挂载 Provider，天然清空旧数据 */}
      <AppStoreProvider key={user.id}>
        <AppRoutes />
      </AppStoreProvider>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppGate />
      </HashRouter>
    </AuthProvider>
  )
}
