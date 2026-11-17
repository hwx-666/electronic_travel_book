/**
 * 搜索名录与工具函数：中国省/市名录（china-division 静态表）+ 外国区划。
 * 搜索提示词（pickRandomNames）、地名归一化（trimRegionName）也在这里。
 * 注意：CITY_REGIONS 的省码是 2 位、市码 4 位，统一 padEnd(6,'0')
 * 成标准 6 位 adcode 再参与搜索与跳转。
 */
import pcCode from 'china-division/dist/pc-code.json'
import { canDrillDown, loadChinaProvinces } from './china'
import type { MapFeature } from '../types'

/** 搜索结果的统一形态（中国省/市、外国 ADM1/ADM2 通用） */
export interface SearchableRegion {
  name: string
  /** 行政区划码：中国 6 位 adcode；外国 ADM1 的 shapeISO 后段 / ADM2 的 shapeID */
  code: string
  /** 上级行政区码（构造跳转路径用） */
  parentCode?: string
  level: 'province' | 'city' | 'adm1' | 'adm2'
}

interface ProvinceCodeEntry {
  code: string
  name: string
  children?: { code: string; name: string }[]
}

/**
 * 全国市级名录（来自 china-division 的 pc-code.json，纯数据无依赖）。
 * 该数据的省码是 2 位、市码是 4 位，padEnd(6, '0') 后正好是
 * 标准 6 位行政区划码（44 → 440000，4403 → 440300），与 DataV adcode 一致。
 */
const CITY_REGIONS: SearchableRegion[] = (
  pcCode as unknown as ProvinceCodeEntry[]
).flatMap((p) =>
  (p.children ?? []).map((c) => ({
    name: c.name,
    code: c.code.padEnd(6, '0'),
    parentCode: p.code.padEnd(6, '0'),
    level: 'city' as const,
  })),
)

/**
 * 中国全部可搜索地区（省 + 市）。
 * 省级名录用 DataV 已加载的数据（含港澳台，共 35 项）；
 * 市级名录用 china-division 静态表，不预载地图数据。
 */
export async function getChinaSearchableRegions(): Promise<SearchableRegion[]> {
  const provinces = await loadChinaProvinces()
  const provinceRegions: SearchableRegion[] = provinces
    .filter(canDrillDown)
    .map((f: MapFeature) => ({
      name: f.properties.name,
      code: f.properties.code,
      level: 'province',
    }))
  return [...provinceRegions, ...CITY_REGIONS]
}

/** 某省下的城市名录（china-division 静态表，同步返回） */
export function getProvinceCityRegions(provinceCode: string): SearchableRegion[] {
  return CITY_REGIONS.filter((r) => r.parentCode === provinceCode)
}

/** 去掉"省/市/自治区/特别行政区"等行政后缀，只留地名本体 */
export function trimRegionName(name: string): string {
  return name.replace(/(省|市|自治区|特别行政区|地区)$/, '')
}

/** 从列表里随机取最多 n 个，用于搜索提示词的示例 */
export function pickRandomNames(names: string[], n: number): string[] {
  if (names.length <= n) return [...names]
  const pool = [...names]
  const picked: string[] = []
  for (let i = 0; i < n; i++) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return picked
}
