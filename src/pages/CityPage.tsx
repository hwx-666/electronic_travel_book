/**
 * 中国城市页（路由 #/country/CN/:province/:city）。
 * 阶段 2 起为空态占位；阶段 4 接入旅行回忆时在这里扩展。
 * 修改提示：面包屑依赖 china.ts 的两级缓存数据，查不到时回退路由参数。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import MapEmpty from '../components/Map2D/MapEmpty'
import {
  loadChinaProvinces,
  loadProvinceCities,
} from '../data/geo/china'

/**
 * 城市页：路由 #/country/CN/:province/:city。
 * 阶段 2 只显示城市空态（旅行回忆在阶段 4 接入）。
 * 面包屑：地球 › 中国 › 省 › 市，返回按钮回省级页。
 */
export default function CityPage() {
  const { province = '', city = '' } = useParams()
  const navigate = useNavigate()
  const [provinceName, setProvinceName] = useState(province)
  const [cityName, setCityName] = useState(city)

  useEffect(() => {
    let cancelled = false

    // 省名/市名用于面包屑（数据一般已缓存；失败不影响空态展示）
    loadChinaProvinces()
      .then((all) => {
        if (cancelled) return
        const hit = all.find((f) => f.properties.code === province)
        if (hit) setProvinceName(hit.properties.name)
      })
      .catch(() => {})

    loadProvinceCities(province)
      .then((fs) => {
        if (cancelled) return
        const hit = fs.find((f) => f.properties.code === city)
        if (hit) setCityName(hit.properties.name)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [province, city])

  return (
    <>
      <Navigation
        crumbs={[
          { label: '地球', to: '/earth' },
          { label: '中国', to: '/country/CN' },
          { label: provinceName, to: `/country/CN/${province}` },
          { label: cityName },
        ]}
        onBack={() => navigate(`/country/CN/${province}`)}
      />
      <MapEmpty
        title={cityName}
        hint="这个城市的旅行回忆将在阶段 4 接入"
      />
    </>
  )
}
