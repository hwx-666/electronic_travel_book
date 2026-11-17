/**
 * 地球页（路由 #/earth）：导航 + 3D 地球 + 右下角国家搜索。
 * 国家名录异步加载（world.ts 缓存），失败时显示"加载失败"空态。
 * 地球点击与搜索点击都跳 /country/:code，新增入口保持路径一致。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Earth from '../components/Earth/Earth'
import Navigation from '../components/Navigation/Navigation'
import RegionSearch from '../components/RegionSearch/RegionSearch'
import { loadWorldCountries } from '../data/geo/world'
import { pickRandomNames } from '../data/geo/regions'
import type { MapFeature } from '../data/types'
import './pages.css'

/** 地球页：导航（面包屑"地球"）+ 3D 地球 + 右下角国家搜索 */
export default function EarthPage() {
  const navigate = useNavigate()

  // 国家名录（下一层级），异步加载；null = 加载中
  const [countries, setCountries] = useState<MapFeature[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadWorldCountries()
      .then((fs) => {
        if (!cancelled) setCountries(fs)
      })
      .catch(() => {
        if (!cancelled) setCountries([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 提示词的示例：随机取两个国家名（与地球界面语言一致）
  const examples = useMemo(() => {
    if (!countries) return ''
    return pickRandomNames(
      countries.map((f) => f.properties.name),
      2,
    ).join('、')
  }, [countries])

  // 搜索面板的选项（value = 国家 code）
  const searchOptions = useMemo(
    () =>
      (countries ?? []).map((f) => ({
        name: f.properties.name,
        value: f.properties.code,
      })),
    [countries],
  )

  return (
    <>
      <Navigation crumbs={[{ label: '地球' }]} />
      <Earth
        onSelectCountry={(code) => navigate(`/country/${code}`)}
      />
      <RegionSearch
        options={searchOptions}
        placeholder={
          countries === null
            ? '国家名录加载中…'
            : examples
              ? `搜索地区，如：${examples}`
              : '搜索地区'
        }
        emptyHint={
          countries && countries.length === 0
            ? '国家名录加载失败'
            : undefined
        }
        onPick={(option) => navigate(`/country/${option.value}`)}
      />
      <div className="earth-hint">
        拖动旋转 · 滚轮缩放 · 点击国家进入
      </div>
    </>
  )
}
