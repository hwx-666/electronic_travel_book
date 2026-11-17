/**
 * 地图空态占位（如城市回忆未接入、无下级数据时）。
 * 修改提示：样式走 Map2D.css 的 .map-state 系列类，文案由页面层传入。
 */
import './Map2D.css'

interface MapEmptyProps {
  title: string
  hint?: string
}

/** 空态展示（如城市回忆尚未接入时的占位），样式走主题变量 */
export default function MapEmpty({ title, hint }: MapEmptyProps) {
  return (
    <div className="map-state">
      <p className="map-state__title">{title}</p>
      {hint && <p className="map-state__hint">{hint}</p>}
    </div>
  )
}
