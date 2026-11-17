/**
 * 外国二级行政区详情页（路由 #/country/:code/:r1/:r2）。
 * 阶段 3 起为空态占位；阶段 4 接入旅行回忆时在这里扩展。
 * 修改提示：r2 是 slug 化地名，反查真实名用 foreign.ts 的
 * slugifyName/deslugifyName 工具，注意两者必须对称。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import MapEmpty from '../components/Map2D/MapEmpty'
import {
  deslugifyName,
  getCountryAdm1,
  getCountryAdm2,
  slugifyName,
} from '../data/geo/foreign'
import { getCountryName } from '../data/geo/world'

/**
 * 外国二级行政区详情页：路由 #/country/:code/:r1/:r2。
 * 阶段 3 只显示空态（旅行回忆在阶段 4 接入）。
 * 面包屑：地球 › 国家 › 一级行政区 › 二级行政区，返回按钮回一级页。
 */
export default function ForeignCityPage() {
  const { code = '', r1 = '', r2 = '' } = useParams()
  const navigate = useNavigate()
  const countryName = getCountryName(code)
  const [regionName, setRegionName] = useState(r1)
  const [cityName, setCityName] = useState(deslugifyName(r2))

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

    // 二级名：尝试从缓存数据里按 slug 反查真实名，查不到就用解码后的 slug
    getCountryAdm2(code)
      .then((adm2) => {
        if (cancelled || !adm2) return
        const hit = adm2.find(
          (f) => slugifyName(f.properties.name) === r2,
        )
        if (hit) setCityName(hit.properties.name)
      })
      .catch(() => {})

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
      <MapEmpty
        title={cityName}
        hint="这个地区的旅行回忆将在阶段 4 接入"
      />
    </>
  )
}
