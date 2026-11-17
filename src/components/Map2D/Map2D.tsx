/**
 * 2D 平面行政区地图（SVG + d3-geo）。
 * 通用渲染组件：省/市/外国 ADM1/ADM2 都复用本组件，
 * 只认 MapFeature[] 契约，不感知数据来源。
 * 投影用墨卡托 fitSize（fitProjection 剔除离群板块 + bbox 防御）；
 * 调整投影类型/尺寸时注意与 3D 地球保持视觉一致性。
 */
import { useMemo, useState } from 'react'
import { geoBounds, geoCentroid, geoDistance, geoMercator, geoPath } from 'd3-geo'
import type { MapFeature } from '../../data/types'
import { themeColors, lightenColor } from '../../theme/colors'
import { useAppStore } from '../../store/useAppStore'
import './Map2D.css'

/** 逻辑画布尺寸（viewBox 用），SVG 会按视口等比缩放 */
const VIEW_WIDTH = 960
const VIEW_HEIGHT = 640

interface Map2DProps {
  /** 要渲染的行政区板块（省或市通用，外国阶段 3 复用） */
  features: MapFeature[]
  /** 点击某板块时回调，携带该板块 */
  onSelect: (feature: MapFeature) => void
}

/** 数值数组中位数 */
function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * 投影适配用的"主体子集"：数据里可能有极端离群的板块
 * （如美国数据含关岛 145°E、美属萨摩亚 -170°W），直接 fitSize 会让
 * 主体被压缩成一小块。按"离中位质心的球面距离 > max(4×中位距离, 1.22rad)"
 * 剔除离群后再适配投影；渲染仍用全部 features。
 * 1.22 rad ≈ 70°：足够宽松，俄罗斯东西跨度（中位质心两端约 50°）、
 * 美国本土+阿拉斯加+夏威夷（≤62°）都保留，只剔关岛这类在太平洋深处的。
 */
function fitProjection(features: MapFeature[]) {
  const centroids = features.map((f) => geoCentroid(f))
  const midLon = median(centroids.map((c) => c[0]))
  const midLat = median(centroids.map((c) => c[1]))
  const dists = centroids.map((c) => geoDistance([midLon, midLat], c))
  const medDist = median(dists)
  const cutoff = Math.max(medDist * 4, 1.22)
  const main = features.filter((_, i) => dists[i] <= cutoff)
  const fc = {
    type: 'FeatureCollection',
    features: main.length > 1 ? main : features,
  } as never
  // 防御：bbox 异常（跨线未归一/负宽度）时退回全量渲染，避免投影翻转
  try {
    const [[x0], [x1]] = geoBounds(fc as never)
    const span = x1 - x0
    if (!Number.isFinite(span) || span <= 0 || span > 350) {
      return geoMercator().fitSize(
        [VIEW_WIDTH, VIEW_HEIGHT],
        { type: 'FeatureCollection', features } as never,
      )
    }
  } catch {
    // 兜底同上
  }
  return geoMercator().fitSize([VIEW_WIDTH, VIEW_HEIGHT], fc)
}

/**
 * 2D 平面行政区地图（SVG）。
 *
 * 与渲染层/数据层解耦：本组件只认 MapFeature[]，
 * 同一实现渲染省级、市级、以及后续外国的一级行政区。
 * 着色规则与 3D 地球一致：visited 状态决定底色，hover 用
 * lightenColor 派生提亮——业务代码里不写死颜色。
 */
export default function Map2D({ features, onSelect }: Map2DProps) {
  const { getVisited } = useAppStore()
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  // 投影：墨卡托，按当前数据"主体范围"自动居中适配（剔除极端离群）
  const pathGen = useMemo(() => geoPath(fitProjection(features)), [features])

  const hoveredFeature =
    features.find((f) => f.properties.code === hoveredCode) ?? null

  return (
    <div className="map2d">
      <svg
        className="map2d__svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {features.map((f) => {
          const { code, name, visitedKey } = f.properties
          const isHovered = code === hoveredCode
          const base = getVisited(visitedKey ?? code)
            ? themeColors.visited
            : themeColors.unvisited
          return (
            <path
              key={code}
              d={pathGen(f) ?? undefined}
              fill={isHovered ? lightenColor(base, 0.25) : base}
              stroke={themeColors.stroke}
              strokeWidth={isHovered ? 1.6 : 0.8}
              className="map2d__region"
              onMouseEnter={() => {
                setHoveredCode(code)
                setHoverPos(null)
              }}
              onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => {
                setHoveredCode(null)
                setHoverPos(null)
              }}
              onClick={() => onSelect(f)}
            >
              <title>{name}</title>
            </path>
          )
        })}
      </svg>

      {hoveredFeature && hoverPos && (
        <div
          className="globe-tip map2d__tooltip"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          {hoveredFeature.properties.name}
        </div>
      )}
    </div>
  )
}
