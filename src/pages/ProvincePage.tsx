/**
 * 中国省级页（路由 #/country/CN/:province）。
 * 按需加载该省市级数据渲染 2D 地图，可下钻到城市页。
 * 注意：市级名录来自 china-division 静态表（regions.ts），与地图数据
 * （china.ts DataV）是两套数据源，改地图源时名录独立生效。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import RegionSearch, {
  type SearchOption,
} from '../components/RegionSearch/RegionSearch'
import Map2D from '../components/Map2D/Map2D'
import MapState from '../components/Map2D/MapState'
import Memories from '../components/Memories/Memories'
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
 * 进入本页不标记 visited——阶段 4.1 起点亮由回忆推导：省页的下级回忆
 * （市页写入）ancestorKeys 带 `CN-<province>` 父层，省自然点亮；
 * 无下级的地区（如香港，名录为空）不请求地图数据（_full.json 不存在），
 * 直接渲染 Memories 回忆区（需求优先项），其回忆 ancestorKeys=['CN']。
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

  // visitedKey 由路由参数直接构造（6 位 adcode）；不主动标记，
  // 点亮由回忆推导（见文件头注释）
  const visitedKey = `CN-${province}`

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

    // 该省市级数据：按需加载（进入中国时不会触发）。
    // 无下级地区（名录为空，如香港）不请求 _full.json —— 该文件不存在，
    // 直接进回忆区，不做无意义的失败请求。
    if (cityRegions.length > 0) {
      loadProvinceCities(province)
        .then((fs) => {
          if (!cancelled) setFeatures(fs)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    }

    return () => {
      cancelled = true
    }
  }, [province, attempt, cityRegions.length])

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
      {cityRegions.length === 0 ? (
        // 无下级地区（如香港）：不渲染地图，直接进回忆区；
        // 回忆父层链只有国家（香港自身是省级），用 ['CN']
        <Memories
          visitedKey={visitedKey}
          placeName={provinceName}
          ancestorKeys={['CN']}
        />
      ) : error ? (
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
