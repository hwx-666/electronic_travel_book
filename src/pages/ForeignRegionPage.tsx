/**
 * 外国一级行政区详情页（路由 #/country/:code/:r1）。
 * 加载该国 ADM2 并按 parentCode 过滤出本板块的下级，渲染 2D 地图。
 * 修改提示：parentCode 由 foreign.ts 的 attachParents 推导，
 * 若发现归属错乱，先检查数据层的推导逻辑而非本页过滤。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import RegionSearch, {
  type SearchOption,
} from '../components/RegionSearch/RegionSearch'
import Map2D from '../components/Map2D/Map2D'
import MapState from '../components/Map2D/MapState'
import MapEmpty from '../components/Map2D/MapEmpty'
import {
  getCountryAdm1,
  getCountryAdm2,
  slugifyName,
} from '../data/geo/foreign'
import { getCountryName } from '../data/geo/world'
import {
  pickRandomNames,
  trimRegionName,
  type SearchableRegion,
} from '../data/geo/regions'
import type { MapFeature } from '../data/types'

/**
 * 外国二级行政区页：路由 #/country/:code/:r1（如 #/country/US/CA）。
 * 加载该国 ADM2 并只渲染归属该 ADM1 的板块，点击二级板块继续下钻。
 * 面包屑：地球 › 国家 › 一级行政区，返回按钮回国家页。
 */
export default function ForeignRegionPage() {
  const { code = '', r1 = '' } = useParams()
  // key 强制切换国家/板块时重挂载，保证加载态干净
  return (
    <ForeignRegionContent
      key={`${code}/${r1}`}
      countryCode={code}
      regionCode={r1}
    />
  )
}

function ForeignRegionContent({
  countryCode,
  regionCode,
}: {
  countryCode: string
  regionCode: string
}) {
  const navigate = useNavigate()
  const countryName = getCountryName(countryCode)
  const [regionName, setRegionName] = useState(regionCode)
  const [children, setChildren] = useState<MapFeature[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    // 一级名录用于面包屑名（一般已缓存，失败不影响主体）
    getCountryAdm1(countryCode)
      .then(({ features }) => {
        if (cancelled) return
        const hit = features.find((f) => f.properties.code === regionCode)
        if (hit) setRegionName(hit.properties.name)
      })
      .catch(() => {})

    // 二级数据：按需加载后按父级过滤出本板块的下级
    getCountryAdm2(countryCode)
      .then((adm2) => {
        if (cancelled) return
        if (!adm2) {
          setMissing(true)
          return
        }
        const mine = adm2.filter(
          (f) => f.properties.parentCode === regionCode,
        )
        if (mine.length === 0) setMissing(true)
        else setChildren(mine)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [countryCode, regionCode, attempt])

  // 搜索名录 = 该板块的下级地区；提示词随机取两个下级地名
  const childRegions = useMemo<SearchableRegion[]>(
    () =>
      (children ?? []).map((f) => ({
        name: f.properties.name,
        code: f.properties.code,
        parentCode: regionCode,
        level: 'adm2',
      })),
    [children, regionCode],
  )
  const examples = useMemo(
    () =>
      pickRandomNames(
        childRegions.map((r) => trimRegionName(r.name)),
        2,
      ).join('、'),
    [childRegions],
  )
  const searchOptions = useMemo(
    () => childRegions.map((r) => ({ name: r.name, value: r })),
    [childRegions],
  )

  return (
    <>
      <Navigation
        crumbs={[
          { label: '地球', to: '/earth' },
          { label: countryName, to: `/country/${countryCode}` },
          { label: regionName },
        ]}
        onBack={() => navigate(`/country/${countryCode}`)}
      />
      <RegionSearch
        options={searchOptions}
        placeholder={
          examples ? `搜索地区，如：${examples}` : '搜索地区'
        }
        emptyHint={
          childRegions.length === 0
            ? '该地区暂无可搜索的下级地区'
            : undefined
        }
        onPick={(option: SearchOption<SearchableRegion>) =>
          navigate(
            `/country/${countryCode}/${regionCode}/${slugifyName(option.value.name)}`,
          )
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
      ) : missing ? (
        <MapEmpty
          title={regionName}
          hint="该地区没有更细的下级行政区划"
        />
      ) : !children ? (
        <MapState kind="loading" />
      ) : (
        <Map2D
          features={children}
          onSelect={(feature) =>
            navigate(
              `/country/${countryCode}/${regionCode}/${slugifyName(feature.properties.name)}`,
            )
          }
        />
      )}
    </>
  )
}
