import worldTopoJson from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import { ISO_NUMERIC, ALPHA2_NAME } from './iso3166'
import type { MapFeature } from '../types'

/**
 * 世界国家边界数据加载层。
 *
 * 设计要点：
 * 1. 唯一入口 `loadWorldCountries()`，带模块级缓存，重复调用只加载一次；
 * 2. 渲染层只认 `MapFeature[]`（含 name + code），不关心数据来源是
 *    TopoJSON 还是别的格式 —— 后续换数据源、换精度只改本文件；
 * 3. TopoJSON 里的 id 是 ISO 数字码（如 156），这里统一转成 alpha-2
 *    代码（如 CN）作为路由与 visited 状态的标识。
 */

/** TopoJSON 里的国家对象命名空间 */
const TOPO_OBJECTS = (worldTopoJson as unknown as { objects: { countries: unknown } })
  .objects.countries

let cache: MapFeature[] | null = null
const nameByCode = new Map<string, string>()

/**
 * 加载世界国家边界，返回 GeoJSON Feature 列表。
 * 每个 feature 的 properties 已补齐 { name, code }。
 */
export async function loadWorldCountries(): Promise<MapFeature[]> {
  if (cache) return cache

  const collection = feature(
    worldTopoJson as unknown as Topology,
    TOPO_OBJECTS as unknown as GeometryObject,
  ) as unknown as FeatureCollection

  cache = collection.features.map((raw) => {
    const sourceName = (raw.properties?.name as string) ?? ''
    // 注意：world-atlas 的数字码在 feature 顶层 .id（如 156），
    // 不在 properties 里——之前从 properties.id 读导致 code 恒为空串。
    const sourceId = String(raw.id ?? '')
    const iso = ISO_NUMERIC[sourceId]
    // 有 ISO 数字码就用它映射出的 alpha-2；没有（如 Somaliland）就用原始 id 兜底
    const code = iso?.code ?? sourceId
    const name = iso?.name ?? sourceName

    nameByCode.set(code, name)
    return {
      ...raw,
      properties: { ...raw.properties, name, code, id: sourceId },
    }
  })

  return cache
}

/** 同步查询国家名（面包屑、占位页用）；未知代码原样返回。 */
export function getCountryName(code: string): string {
  return nameByCode.get(code) ?? ALPHA2_NAME[code] ?? code
}
