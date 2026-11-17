/**
 * 国家视图分发器：按国家代码决定渲染中国地图或外国地图。
 * 新增国家特有视图时在这里加分支；无国家特有逻辑则走 ForeignMap。
 */
import ChinaMap from './ChinaMap'
import ForeignMap from './ForeignMap'
import './CountryView.css'

export interface CountryInfo {
  /** 国家代码，如 "CN" */
  code: string
  /** 国家名，如 "China" */
  name: string
}

interface CountryViewProps {
  country: CountryInfo
}

/**
 * 国家视图（进入国家后的页面主体）。
 *
 * 按国家分发视图（阶段 3 起外国接入真实行政区地图）：
 * - 中国（code === 'CN'）：省级平面地图（可再下钻省 → 市）；
 * - 其他国家：geoBoundaries 一级行政区平面地图（有二级的国家可下钻）。
 */
export default function CountryView({ country }: CountryViewProps) {
  if (country.code === 'CN') {
    return <ChinaMap country={country} />
  }
  return <ForeignMap country={country} />
}
