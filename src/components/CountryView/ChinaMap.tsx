/**
 * 中国省级平面地图（CountryView 的中国分支）。
 * 数据按需加载自 DataV（china.ts 缓存），点击可下钻到省。
 * 修改提示：只负责"省级渲染 + 下钻跳转"，市级渲染复用 Map2D。
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  canDrillDown,
  loadChinaProvinces,
} from '../../data/geo/china'
import type { MapFeature } from '../../data/types'
import Map2D from '../Map2D/Map2D'
import MapState from '../Map2D/MapState'
import type { CountryInfo } from './CountryView'

interface ChinaMapProps {
  country: CountryInfo
}

/**
 * 中国省级平面地图（CountryView 里 code === 'CN' 时渲染）。
 *
 * 数据从 DataV 按需加载（省级，含模块级缓存），点击某省下钻到
 * /country/CN/:province；南海诸岛这类没有下级数据的占位板块忽略点击。
 */
export default function ChinaMap({ country: _country }: ChinaMapProps) {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<MapFeature[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadChinaProvinces()
      .then((fs) => {
        if (!cancelled) setFeatures(fs)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (error) {
    return (
      <MapState
        kind="error"
        onRetry={() => {
          setError(false)
          setAttempt((a) => a + 1)
        }}
      />
    )
  }
  if (!features) return <MapState kind="loading" />

  return (
    <Map2D
      features={features}
      onSelect={(feature) => {
        if (!canDrillDown(feature)) return
        navigate(`/country/CN/${feature.properties.code}`)
      }}
    />
  )
}
