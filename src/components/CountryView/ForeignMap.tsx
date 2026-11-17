/**
 * 外国一级行政区平面地图（CountryView 的外国分支）。
 * 数据按需加载自 geoBoundaries（foreign.ts 缓存），点击板块下钻 ADM1 详情。
 * 下钻能力来自 features 的 hasChildren 属性（foreign.ts 数据层按
 * "该国有无 ADM2"填好），组件本身不硬编码国家清单。
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCountryAdm1 } from '../../data/geo/foreign'
import type { MapFeature } from '../../data/types'
import Map2D from '../Map2D/Map2D'
import MapState from '../Map2D/MapState'
import type { CountryInfo } from './CountryView'

interface ForeignMapProps {
  country: CountryInfo
}

/**
 * 外国一级行政区平面地图（CountryView 里 code !== 'CN' 时渲染）。
 *
 * 数据从 geoBoundaries 按需加载（ADM1，模块级缓存），点击有下级数据的
 * 板块下钻到 /country/:code/:r1；无下级的板块（如无 ADM2 的国家、
 * 退回轮廓兜底的国家）点击无反应。
 */
export default function ForeignMap({ country }: ForeignMapProps) {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<MapFeature[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getCountryAdm1(country.code)
      .then(({ features: fs }) => {
        if (!cancelled) setFeatures(fs)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [country.code, attempt])

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
        if (!feature.properties.hasChildren) return
        navigate(`/country/${country.code}/${feature.properties.code}`)
      }}
    />
  )
}
