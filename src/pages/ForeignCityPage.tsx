/**
 * 外国二级行政区详情页（路由 #/country/:code/:r1/:r2）。
 * 阶段 4.1 起点亮由回忆推导，本页不主动标记：回忆的 ancestorKeys
 * 反查后带上父层链（[countryCode, <alpha2>-<parentCode>]），
 * 添加回忆后国家页的该 ADM1、地球上的该国都会点亮。
 * 关键约束：
 * - visitedKey 无法由 URL 构造（ADM2 键是 <alpha2>-<shapeID>，shapeID 只在
 *   数据里），必须从 getCountryAdm2 反查 feature.properties.visitedKey，
 *   反查失败（网络错误/未命中）时降级为空态，不用占位串污染存储；
 * - r2 是 slug 化地名，反查真实名用 slugifyName/deslugifyName（必须对称）；
 * - parentCode 由数据层 attachParents 推导（ADM1 的 code），反查命中时
 *   hit.properties.parentCode 直接可用，无需再查一次 ADM1。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import MapEmpty from '../components/Map2D/MapEmpty'
import Memories from '../components/Memories/Memories'
import {
  deslugifyName,
  getCountryAdm1,
  getCountryAdm2,
  slugifyName,
} from '../data/geo/foreign'
import { getCountryName } from '../data/geo/world'

/**
 * 外国二级行政区详情页：路由 #/country/:code/:r1/:r2。
 * 面包屑：地球 › 国家 › 一级行政区 › 二级行政区，返回按钮回一级页。
 */
export default function ForeignCityPage() {
  const { code = '', r1 = '', r2 = '' } = useParams()
  const navigate = useNavigate()
  const countryName = getCountryName(code)
  const [regionName, setRegionName] = useState(r1)
  const [cityName, setCityName] = useState(deslugifyName(r2))
  // 反查到的 visitedKey（null = 未反查到，此时不渲染回忆区）
  const [visitedKey, setVisitedKey] = useState<string | null>(null)
  // 回忆的父层键链（国家 + ADM1），反查命中时一并确定
  const [ancestorKeys, setAncestorKeys] = useState<string[]>([])
  // 反查失败（网络错误）时给用户的提示
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    // 一级名用于面包屑（数据一般已缓存）
    getCountryAdm1(code)
      .then(({ features }) => {
        if (cancelled) return
        const hit = features.find((f) => f.properties.code === r1)
        if (hit) setRegionName(hit.properties.name)
      })
      .catch(() => {})

    // 二级名 + visitedKey：从数据里按 slug 反查（visitedKey 依赖 shapeID）
    getCountryAdm2(code)
      .then((adm2) => {
        if (cancelled) return
        if (!adm2) {
          // 该国没有 ADM2（路由直达场景），没有稳定键可标记/回忆
          setFailed(true)
          return
        }
        const hit = adm2.find(
          (f) => slugifyName(f.properties.name) === r2,
        )
        if (hit) {
          setCityName(hit.properties.name)
          setVisitedKey(hit.properties.visitedKey ?? null)
          // 父层链：国家 + ADM1（parentCode 由数据层 attachParents 推导）
          const parent = hit.properties.parentCode
          setAncestorKeys(
            parent
              ? [code.toUpperCase(), `${code.toUpperCase()}-${parent.toUpperCase()}`]
              : [code.toUpperCase()],
          )
        } else {
          setFailed(true)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [code, r1, r2])

  return (
    <>
      <Navigation
        crumbs={[
          { label: '地球', to: '/earth' },
          { label: countryName, to: `/country/${code}` },
          { label: regionName, to: `/country/${code}/${r1}` },
          { label: cityName },
        ]}
        onBack={() => navigate(`/country/${code}/${r1}`)}
      />
      {visitedKey ? (
        <Memories
          visitedKey={visitedKey}
          placeName={cityName}
          ancestorKeys={ancestorKeys}
        />
      ) : (
        <MapEmpty
          title={cityName}
          hint={
            failed
              ? '地区数据加载失败，暂时无法打开回忆'
              : '加载地区信息…'
          }
        />
      )}
    </>
  )
}
