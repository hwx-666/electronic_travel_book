/**
 * 国家页占位组件：数据未就绪或后续阶段尚未实现时显示国家名与代码。
 * 目前实际视图分支已被 ChinaMap/ForeignMap 覆盖，本组件保留作降级
 * 兜底与后续新阶段无图国家的占位。
 */
import type { CountryInfo } from './CountryView'

interface PlaceholderProps {
  country: CountryInfo
}

/**
 * 国家页占位：数据未就绪（或后续阶段尚未实现 2D 地图）时显示。
 */
export default function Placeholder({ country }: PlaceholderProps) {
  return (
    <div className="country-placeholder">
      <h1 className="country-placeholder__name">{country.name}</h1>
      <p className="country-placeholder__code">{country.code}</p>
      <p className="country-placeholder__hint">
        该国家的平面地图将在后续阶段接入
      </p>
    </div>
  )
}
