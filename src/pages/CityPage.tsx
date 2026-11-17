/**
 * 中国城市页（路由 #/country/CN/:province/:city）。
 * 阶段 4.1 起点亮由回忆推导：回忆的 ancestorKeys 带父层链
 * （['CN', 'CN-<province>']），市页不主动标记任何地区。
 * 面包屑依赖 china.ts 的两级缓存数据，查不到时回退路由参数。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation/Navigation'
import Memories from '../components/Memories/Memories'
import {
  loadChinaProvinces,
  loadProvinceCities,
} from '../data/geo/china'

/**
 * 城市页：路由 #/country/CN/:province/:city。
 * 回忆的 ancestorKeys = 该市的父层链（国家 CN + 省 CN-<province>），
 * 添加回忆后省页的"广东"、地球上的"中国"都会点亮。
 * 面包屑：地球 › 中国 › 省 › 市，返回按钮回省级页。
 */
export default function CityPage() {
  const { province = '', city = '' } = useParams()
  const navigate = useNavigate()
  const [provinceName, setProvinceName] = useState(province)
  const [cityName, setCityName] = useState(city)

  // visitedKey 由路由参数直接构造（6 位 adcode），无需等待数据
  const visitedKey = `CN-${city}`

  useEffect(() => {
    let cancelled = false

    // 省名/市名用于面包屑与回忆标题（数据一般已缓存；失败不影响页面）
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
      <Memories
        visitedKey={visitedKey}
        placeName={cityName}
        ancestorKeys={['CN', `CN-${province}`]}
      />
    </>
  )
}
