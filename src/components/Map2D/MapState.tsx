/**
 * 地图加载状态组件（loading / 失败重试）。
 * 错误态自带重试按钮（onRetry 回调），由页面层重新触发加载。
 */
import './Map2D.css'

interface MapStateProps {
  kind: 'loading' | 'error'
  /** 错误状态下显示重试按钮 */
  onRetry?: () => void
}

/** 地图数据加载状态展示（loading / 失败重试），样式走主题变量 */
export default function MapState({ kind, onRetry }: MapStateProps) {
  if (kind === 'loading') {
    return (
      <div className="map-state">
        <p className="map-state__title">加载中…</p>
      </div>
    )
  }

  return (
    <div className="map-state">
      <p className="map-state__title">地图数据加载失败</p>
      <p className="map-state__hint">请检查网络后重试</p>
      {onRetry && (
        <button
          type="button"
          className="map-state__retry"
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  )
}
