/**
 * 国家页（路由 #/country/:code）：面包屑 + 返回 + 地区搜索 + 国家视图。
 * 中国走专属视图（省级地图），外国走 geoBoundaries ADM1 地图。
 * 修改提示：新增国家的搜索名录/跳转逻辑时，注意中国与外国分支
 * 的路径规则不同（中国 6 位 adcode，外国 alpha2 + adminCode）。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import RegionSearch from '../components/RegionSearch/RegionSearch'
import CountryView from '../components/CountryView/CountryView'
import { getCountryName } from '../data/geo/world'
import { getCountryAdm1, getCountryAdm2, slugifyName } from '../data/geo/foreign'
import {
  getChinaSearchableRegions,
  pickRandomNames,
  trimRegionName,
  type SearchableRegion,
} from '../data/geo/regions'
import type { SearchOption } from '../components/RegionSearch/RegionSearch'

/**
 * 国家页：面包屑（地球 › 国家名）+ 返回按钮 + 国家视图 + 地区搜索。
 *
 * 每个国家页顶部都有搜索框（阶段 3 起外国也接入）：
 * - 中国：名录含全国省 + 市，跳转到对应层级页；
 * - 外国：名录 = 一级行政区（该国存在二级时后台并入二级），
 *   一级跳 /country/:code/:r1，二级跳 /country/:code/:r1/:r2。
 * 提示词示例随机取"当前界面下一层级"（中国 = 省级，外国 = ADM1）。
 */
export default function CountryPage() {
  const { code } = useParams()
  // key 强制在切换国家时重挂载，保证名录状态（null/加载中）干净重置
  return <CountryContent key={code ?? ''} countryCode={code ?? ''} />
}

function CountryContent({ countryCode }: { countryCode: string }) {
  const navigate = useNavigate()
  // 中国在阶段 2 起有专属视图，面包屑用中文名；其余国家沿用英文名
  const name = countryCode === 'CN' ? '中国' : getCountryName(countryCode)
  const isChina = countryCode === 'CN'

  // null = 名录加载中
  const [regions, setRegions] = useState<SearchableRegion[] | null>(null)

  useEffect(() => {
    let cancelled = false

    if (isChina) {
      void getChinaSearchableRegions()
        .then((rs) => {
          if (!cancelled) setRegions(rs)
        })
        .catch(() => {
          if (!cancelled) setRegions([])
        })
    } else {
      // 一级名录先行；该国存在二级时后台并入（geoBoundaries 已按需 + 缓存）
      void getCountryAdm1(countryCode)
        .then(({ features, level }) => {
          if (cancelled) return
          const adm1Regions: SearchableRegion[] = features.map((f) => ({
            name: f.properties.name,
            code: f.properties.code,
            level: 'adm1',
          }))
          setRegions(adm1Regions)
          if (level === 'adm1') {
            void getCountryAdm2(countryCode)
              .then((adm2) => {
                if (cancelled || !adm2) return
                const adm2Regions: SearchableRegion[] = adm2.map((f) => ({
                  name: f.properties.name,
                  code: f.properties.code,
                  parentCode: f.properties.parentCode,
                  level: 'adm2',
                }))
                setRegions((prev) => [...(prev ?? []), ...adm2Regions])
              })
              .catch(() => {})
          }
        })
        .catch(() => {
          if (!cancelled) setRegions([])
        })
    }

    return () => {
      cancelled = true
    }
  }, [countryCode, isChina])

  const loading = regions === null
  const noRegions = regions !== null && regions.length === 0

  // 提示词的示例：随机取两个"当前界面下一层级"的地区名
  const examples = useMemo(() => {
    if (!regions) return ''
    const level = isChina ? 'province' : 'adm1'
    const names = regions
      .filter((r) => r.level === level)
      .map((r) => trimRegionName(r.name))
    return pickRandomNames(names, 2).join('、')
  }, [regions, isChina])

  // 搜索面板的选项（value 保留原始地区对象，onPick 直接取用）
  const searchOptions = useMemo(
    () => (regions ?? []).map((r) => ({ name: r.name, value: r })),
    [regions],
  )

  const onPick = (option: SearchOption<SearchableRegion>) => {
    const region = option.value
    if (isChina) {
      if (region.level === 'province') {
        navigate(`/country/CN/${region.code}`)
      } else {
        navigate(`/country/CN/${region.parentCode}/${region.code}`)
      }
      return
    }
    if (region.level === 'adm1') {
      navigate(`/country/${countryCode}/${region.code}`)
    } else {
      navigate(
        `/country/${countryCode}/${region.parentCode}/${slugifyName(region.name)}`,
      )
    }
  }

  return (
    <>
      <Navigation
        crumbs={[
          { label: '地球', to: '/earth' },
          { label: name },
        ]}
        onBack={() => navigate('/earth')}
      />
      <RegionSearch
        options={searchOptions}
        placeholder={
          loading
            ? '地区名录加载中…'
            : examples
              ? `搜索地区，如：${examples}`
              : '搜索地区'
        }
        emptyHint={
          noRegions ? '该国家暂无可搜索的下级地区' : ''
        }
        onPick={onPick}
      />
      <CountryView country={{ code: countryCode, name }} />
    </>
  )
}
