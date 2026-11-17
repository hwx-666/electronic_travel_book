import type { Feature, FeatureCollection } from 'geojson'
import rewind from 'geojson-rewind'
import type { MapFeature } from '../types'

/**
 * 中国行政边界数据加载层。
 *
 * 数据源：阿里云 DataV GeoJSON（areas_v3）。
 * 关键约定：`<adcode>.json` 只返回该行政区"整体轮廓"（1 个 feature），
 * 返回"下一级行政区列表"要用 `<adcode>_full.json`，例如：
 *   - 全国省级：100000_full.json（34 省 + 南海诸岛）
 *   - 广东省市级：440000_full.json（21 个市）
 * （需求文档里写的 100000.json / 440000.json 是整体轮廓，不是列表，
 *  这里按 DataV 真实约定使用 _full 版本。）
 *
 * 设计要点（与 world.ts 一致）：
 * 1. 市级必须按需加载：点进某省才 fetch 该省文件，进入中国时不加载；
 * 2. 渲染层只认 MapFeature[]，不关心 JSON 来源，换数据源只改本文件；
 * 3. code 用 6 位 adcode，visitedKey 用 "CN-<adcode>" 组合键，
 *    给阶段 4 的存储留好命名空间。
 */

/** 全国省级列表（DataV） */
const CHINA_PROVINCES_URL =
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

/** 某省市级列表（DataV）：`<省adcode>_full.json` */
const provinceCitiesUrl = (provinceAdcode: string) =>
  `https://geo.datav.aliyun.com/areas_v3/bound/${provinceAdcode}_full.json`

let provincesCache: MapFeature[] | null = null
const citiesCache = new Map<string, MapFeature[]>()

async function fetchFeatureCollection(url: string): Promise<FeatureCollection> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`地图数据加载失败：${url} (HTTP ${res.status})`)
  }
  return (await res.json()) as FeatureCollection
}

/**
 * 加载 DataV 数据并统一修复 ring 方向。
 *
 * DataV 的 ring 是"逆时针外环"，与 d3-geo 要求的"顺时针外环"相反。
 * 不做 rewind 时，d3-geo 会把每个板块都当成"洞"，渲染成
 * "整个画布挖掉该省"——所有省叠成一个大框，且最后一个 feature
 * 覆盖全屏（表现为"鼠标到哪都 hover 到它"）。
 * rewind(fc, true) 强制外环顺时针，d3 填充恢复正常。
 */
async function fetchDataV(url: string): Promise<FeatureCollection> {
  const fc = await fetchFeatureCollection(url)
  rewind(fc, true)
  return fc
}

/** 把 DataV 原始 feature 转成统一的 MapFeature（省、市通用） */
function toMapFeature(raw: Feature): MapFeature {
  const props = (raw.properties ?? {}) as Record<string, unknown>
  // adcode 可能是数字（如 440000）也可能是特殊串（如 "100000_JD" 南海诸岛）
  const adcode = String(props.adcode ?? '')
  const adchar = String(props.adchar ?? '')
  // 南海诸岛在 DataV 里 name 为空、adchar 为 "JD"，补个友好名
  const rawName = String(props.name ?? '')
  const name = rawName || (adchar === 'JD' ? '南海诸岛' : adchar) || adcode
  return {
    ...raw,
    properties: {
      ...(raw.properties as object),
      name,
      code: adcode,
      id: adcode,
      visitedKey: `CN-${adcode}`,
    },
  }
}

/** 加载中国省级列表（"中国 → 省"这一级），带模块级缓存 */
export async function loadChinaProvinces(): Promise<MapFeature[]> {
  if (provincesCache) return provincesCache
  const fc = await fetchDataV(CHINA_PROVINCES_URL)
  const features = fc.features.map(toMapFeature)
  provincesCache = features
  return features
}

/** 按需加载某省市级列表（"省 → 市"这一级），带模块级缓存 */
export async function loadProvinceCities(
  provinceAdcode: string,
): Promise<MapFeature[]> {
  const cached = citiesCache.get(provinceAdcode)
  if (cached) return cached
  const fc = await fetchDataV(provinceCitiesUrl(provinceAdcode))
  const features = fc.features.map(toMapFeature)
  citiesCache.set(provinceAdcode, features)
  return features
}

/**
 * 该板块能否继续下钻（点击有效）。
 * DataV 数据里有"南海诸岛"这类占位板块（adcode 含非数字字符），
 * 没有对应的下级数据文件，点击应忽略。
 */
export function canDrillDown(feature: MapFeature): boolean {
  return /^\d+$/.test(feature.properties.id ?? '')
}
