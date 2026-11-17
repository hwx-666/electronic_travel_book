/**
 * 根组件：只负责包 Provider 与声明路由表，不承载业务逻辑。
 * 新增页面时在这里加路由；页面组件放 src/pages/。
 * 修改提示：中国专属路由（/country/CN/...）必须写在动态段之前，
 * 依赖 React Router 静态段优先匹配，不要打乱顺序。
 */
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppStoreProvider from './store/AppStoreProvider'
import EarthPage from './pages/EarthPage'
import CountryPage from './pages/CountryPage'
import ProvincePage from './pages/ProvincePage'
import CityPage from './pages/CityPage'
import ForeignRegionPage from './pages/ForeignRegionPage'
import ForeignCityPage from './pages/ForeignCityPage'

/**
 * 路由（hash 模式）。
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
export default function App() {
  return (
    <AppStoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/earth" replace />} />
          <Route path="/earth" element={<EarthPage />} />
          <Route path="/country/:code" element={<CountryPage />} />
          <Route path="/country/CN/:province" element={<ProvincePage />} />
          <Route
            path="/country/CN/:province/:city"
            element={<CityPage />}
          />
          <Route
            path="/country/:code/:r1"
            element={<ForeignRegionPage />}
          />
          <Route
            path="/country/:code/:r1/:r2"
            element={<ForeignCityPage />}
          />
          <Route path="*" element={<Navigate to="/earth" replace />} />
        </Routes>
      </HashRouter>
    </AppStoreProvider>
  )
}
