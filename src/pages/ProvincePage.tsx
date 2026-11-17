/**
 * 中国省级页（路由 #/country/CN/:province）。
 * 按需加载该省市级数据渲染 2D 地图，可下钻到城市页。
 * 修改提示：市级名录来自 china-division 静态表（regions.ts），
 * 与地图数据（china.ts DataV）是两套数据，改地图源时名录独立生效。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import RegionSearch, {
  type SearchOption,
} from '../components/RegionSearch/RegionSearch'
import Map2D from '../components/Map2D/Map2D'
import MapState from '../components/Map2D/MapState'
import {
  canDrillDown,
  loadChinaProvinces,
  loadProvinceCities,
} from '../data/geo/china'
import {
  getProvinceCityRegions,
  pickRandomNames,
  trimRegionName,
  type SearchableRegion,
} from '../data/geo/regions'
import type { MapFeature } from '../data/types'

/**
 * 省级页：路由 #/country/CN/:province。
 * 按需加载该省的市级数据并渲染 2D 地图，点击市下钻到城市页。
 * 面包屑：地球 › 中国 › 省，返回按钮回中国。
 *
 * 用 key={province} 强制在省切换时重挂载，保证不会短暂显示
 * 上一个省的地图（避免在 effect 里做同步 setState）。
 */
export default function ProvincePage() {
  const { province = '' } = useParams()
  return <ProvinceContent key={province} province={province} />
}

function ProvinceContent({ province }: { province: string }) {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<MapFeature[] | null>(null)
  const [provinceName, setProvinceName] = useState(province)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // 本省城市名录（china-division 静态表，不受地图数据加载状态影响）。
  // 严格只含本省的下级地区；无下级（如香港）时为空，搜索即不可用。
  const cityRegions = useMemo(
    () => getProvinceCityRegions(province),
    [province],
  )
  // 提示词的示例：随机取两个该省的城市，只从本省名录里取
  const examples = useMemo(
    () =>
      pickRandomNames(
        cityRegions.map((r) => trimRegionName(r.name)),
        2,
      ).join('、'),
    [cityRegions],
  )
  // 搜索面板的选项（value 保留原始地区对象）
  const searchOptions = useMemo(
    () => cityRegions.map((r) => ({ name: r.name, value: r })),
    [cityRegions],
  )

  useEffect(() => {
    let cancelled = false

    // 省名用于面包屑（省级数据一般已缓存，顺手补全，失败不影响地图）
    loadChinaProvinces()
      .then((all) => {
        if (cancelled) return
        const hit = all.find((f) => f.properties.code === province)
        if (hit) setProvinceName(hit.properties.name)
      })
      .catch(() => {})

    // 该省市级数据：按需加载（进入中国时不会触发）
    loadProvinceCities(province)
      .then((fs) => {
        if (!cancelled) setFeatures(fs)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [province, attempt])

  return (
    <>
      <Navigation
        crumbs={[
          { label: '地球', to: '/earth' },
          { label: '中国', to: '/country/CN' },
          { label: provinceName },
        ]}
        onBack={() => navigate('/country/CN')}
      />
      <RegionSearch
        options={searchOptions}
        placeholder={examples ? `搜索地区，如：${examples}` : '搜索地区'}
        emptyHint={
          cityRegions.length === 0
            ? '该地区暂无可搜索的下级地区'
            : undefined
        }
        onPick={(option: SearchOption<SearchableRegion>) =>
          navigate(`/country/CN/${province}/${option.value.code}`)
        }
      />
      {error ? (
        <MapState
          kind="error"
          onRetry={() => {
            setError(false)
            setAttempt((a) => a + 1)
          }}
        />
      ) : !features ? (
        <MapState kind="loading" />
      ) : (
        <Map2D
          features={features}
          onSelect={(feature) => {
            if (!canDrillDown(feature)) return
            navigate(`/country/CN/${province}/${feature.properties.code}`)
          }}
        />
      )}
    </>
  )
}
