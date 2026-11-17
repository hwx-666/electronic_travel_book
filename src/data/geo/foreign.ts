import { geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import rewind from 'geojson-rewind'
import { feature } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'
import { ADMIN_COVERAGE } from './adminCoverage'
import { ALPHA3_TO_ALPHA2 } from './alpha3'
import { loadWorldCountries } from './world'
import type { MapFeature } from '../types'

/**
 * 外国行政边界数据加载层（geoBoundaries gbOpen）。
 *
 * 数据源：geoBoundaries（CC BY 4.0），经 github raw 的 commit 锚点按需拉取
 * 每个国家的 TopoJSON（_simplified 版），例如：
 *   .../gbOpen/USA/ADM1/geoBoundaries-USA-ADM1_simplified.topojson
 * 选择它的原因（deldersveld/topojson 已被删除，见交付说明）：
 *   1. 覆盖广：world-atlas 可点击的 174 国里 168 国有 ADM1、163 国有 ADM2；
 *   2. TopoJSON 体积小（美国 51 州约 0.9MB），按需 + 模块级缓存很轻；
 *   3. github raw 带 commit 锚点，响应带 CORS 头，浏览器可直接 fetch。
 *
 * 设计要点（与 china.ts 一致）：
 * 1. ADM1 按需加载，ADM2 只在进入某国的"下一级"时才拉；
 * 2. ring 方向同样用 rewind(fc, true) 统一修复（geoBoundaries 部分板块反向）；
 * 3. 渲染层只认 MapFeature[]，properties 补齐 name/code/visitedKey；
 * 4. visitedKey 命名空间：<alpha2>-<adminCode>，如 US-MS；ADM2 用 shapeID
 *    兜底（shapeISO 在 ADM2 里经常为空，见日本市级数据）；
 * 5. ADM2 的 properties 里没有父级字段，用 geoCentroid + geoContains 按
 *    "中心点在哪个 ADM1 里"推导 parentCode，用于过滤与跳转路径。
 */

/** geoBoundaries 仓库的 commit 锚点（固定版本，避免上游更新导致 URL 失效） */
// 注意用完整 40 位 hash：media.githubusercontent.com 的 /media/ 路径
// 只认完整 hash；且必须走 media 直链而不是 github.com/raw —— raw 会先返回
// 302 重定向，而该 302 响应不带 CORS 头，浏览器跨域 fetch 在重定向阶段就
// 被拦下（这是之前"除了中国都加载不出来"的根因，Node 不受 CORS 约束所以
// 数据层验证发现不了）。
const GEO_BOUNDARIES_COMMIT = '9469f09592ced973a3448cf66b6100b741b64c0d'
const GB_PREFIX =
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${GEO_BOUNDARIES_COMMIT}/releaseData/gbOpen`

/** alpha-3 → alpha-2 的反向映射（geoBoundaries 的 key 是 alpha-3） */
const ALPHA2_TO_ALPHA3: Record<string, string> = Object.fromEntries(
  Object.entries(ALPHA3_TO_ALPHA2).map(([a3, a2]) => [a2, a3]),
)

const admUrl = (iso3: string, level: 1 | 2) =>
  `${GB_PREFIX}/${iso3}/ADM${level}/geoBoundaries-${iso3}-ADM${level}_simplified.topojson`

const adm1Cache = new Map<
  string,
  { features: MapFeature[]; fallback: boolean; centerLon: number }
>()
const adm2Cache = new Map<string, MapFeature[] | null>()

async function fetchTopology(iso3: string, level: 1 | 2): Promise<Topology> {
  // 本地优先：public/data/geo/ 下内置了常用国家（如用户要求的 6 国），
  // 同源加载最快且离线可用；缺失或损坏时回退远程 media 直链。
  const localUrl = `/data/geo/${iso3}-ADM${level}.topojson`
  try {
    const localRes = await fetch(localUrl)
    if (localRes.ok) {
      const topo = (await localRes.json()) as Topology
      if (topo?.type === 'Topology' && topo.objects) return topo
    }
  } catch {
    // 本地缺失/解析失败 → 走远程
  }
  const res = await fetch(admUrl(iso3, level))
  if (!res.ok) {
    throw new Error(`行政区划数据加载失败：${admUrl(iso3, level)} (HTTP ${res.status})`)
  }
  return (await res.json()) as Topology
}

/** TopoJSON → FeatureCollection，并统一修复 ring 方向（原因同 china.ts） */
function topoToFeatureCollection(topo: Topology): FeatureCollection {
  const key = Object.keys(topo.objects)[0]
  const fc = feature(topo, topo.objects[key] as GeometryObject) as unknown as FeatureCollection
  rewind(fc, true)
  return fc
}

/**
 * 把单个坐标经度平移到 [centerLon-180, centerLon+180]（跨 180° 线的
 * 国家重新居中，如阿留申群岛 172.5°E → -188°、楚科奇 -169° → 191°）。
 * 平移后 GeoJSON 坐标仍合法（d3 线性投影/质心/包含判断不受影响），
 * 但 geoBounds/fitSize 不再被"跨线翻折"坑出负宽度 bbox。
 */
function shiftLon(coord: number[], centerLon: number): number[] {
  let lon = coord[0]
  while (lon < centerLon - 180) lon += 360
  while (lon > centerLon + 180) lon -= 360
  return [lon, ...coord.slice(1)]
}

function recenterGeometry(geometry: Geometry, centerLon: number): void {
  if (!geometry) return
  const shift = (cs: number[][]) => cs.map((c) => shiftLon(c, centerLon))
  switch (geometry.type) {
    case 'Point':
      geometry.coordinates = shiftLon(
        geometry.coordinates as unknown as number[],
        centerLon,
      )
      break
    case 'MultiPoint':
      geometry.coordinates = shift(geometry.coordinates as number[][])
      break
    case 'LineString':
      geometry.coordinates = shift(geometry.coordinates as number[][])
      break
    case 'MultiLineString':
      geometry.coordinates = (geometry.coordinates as number[][][]).map((l) =>
        shift(l),
      )
      break
    case 'Polygon':
      geometry.coordinates = (geometry.coordinates as number[][][]).map(
        (ring) => shift(ring),
      )
      break
    case 'MultiPolygon':
      geometry.coordinates = (geometry.coordinates as number[][][][]).map(
        (poly) => poly.map((ring) => shift(ring)),
      )
      break
  }
}

/**
 * 以该国所有板块质心经度的中位数为"重新居中"中心（跨 180° 线的板块
 * 统一平移，投影/bbox 一致）。ADM2 用与 ADM1 相同的中心，
 * 保证父子板块坐标体系一致。
 */
function computeCenterLon(features: MapFeature[]): number {
  const lons = features
    .map((f) => geoCentroid(f)[0])
    .sort((a, b) => a - b)
  const mid = lons.length >> 1
  return lons.length % 2 ? lons[mid] : (lons[mid - 1] + lons[mid]) / 2
}

function recenterFeatures(features: MapFeature[], centerLon: number): void {
  for (const f of features) recenterGeometry(f.geometry, centerLon)
}

/** 把 geoBoundaries 原始 feature 转成统一 MapFeature（ADM1 / ADM2 通用） */
function toMapFeature(raw: Feature, alpha2: string, level: 'adm1' | 'adm2'): MapFeature {
  const props = (raw.properties ?? {}) as Record<string, unknown>
  const shapeName = String(props.shapeName ?? '')
  const shapeISO = String(props.shapeISO ?? '')
  const shapeID = String(props.shapeID ?? '')
  // code 用于路由与 React key：ADM1 取 shapeISO 后段（US-MS → MS），
  // 空则退回 shapeID（geoBoundaries 的稳定唯一码）
  const code = (shapeISO.split('-').pop() || shapeID) || shapeName
  return {
    ...raw,
    properties: {
      ...(raw.properties as object),
      name: shapeName || code,
      code,
      id: shapeID,
      visitedKey:
        level === 'adm1'
          ? `${alpha2}-${code}`
          : `${alpha2}-${shapeID || code}`,
    },
  }
}

/**
 * 加载某国 ADM1（一级行政区）。
 * 该国没有 ADM1 时（如梵蒂冈、南极洲等 6 个），退回 world-atlas 里
 * 该国的整体轮廓（单 feature，不可下钻），保证"点任何国家都有图"。
 * 返回带 fallback 标记，调用方据此区分"真实一级数据 / 轮廓兜底"。
 */
async function loadAdm1(alpha2: string): Promise<{
  features: MapFeature[]
  fallback: boolean
  /** 几何重新居中的经度中心（ADM2 复用，保证父子坐标体系一致） */
  centerLon: number
}> {
  const cached = adm1Cache.get(alpha2)
  if (cached) return cached

  const iso3 = ALPHA2_TO_ALPHA3[alpha2]
  const coverage = ADMIN_COVERAGE[iso3]
  if (!coverage?.adm1) {
    const world = await loadWorldCountries()
    const hit = world.find((f) => f.properties.code === alpha2)
    if (!hit) throw new Error(`未找到国家行政区划数据：${alpha2}`)
    const fallback: MapFeature = {
      ...hit,
      properties: { ...hit.properties, hasChildren: false, visitedKey: alpha2 },
    }
    const result = { features: [fallback], fallback: true, centerLon: 0 }
    adm1Cache.set(alpha2, result)
    return result
  }

  const fc = topoToFeatureCollection(await fetchTopology(iso3, 1))
  const features = fc.features.map((f) => toMapFeature(f, alpha2, 'adm1'))
  // hasChildren 由覆盖清单同步给出，Map2D 点击时据此判断能否下钻
  for (const f of features) f.properties.hasChildren = coverage.adm2
  // 跨 180° 线国家（阿留申群岛、楚科奇等）重新居中，避免投影 bbox 异常
  const centerLon = computeCenterLon(features)
  recenterFeatures(features, centerLon)
  const result = { features, fallback: false, centerLon }
  adm1Cache.set(alpha2, result)
  return result
}

/**
 * 用"中心点落在哪个 ADM1 里"给每个 ADM2 推导父级 code。
 *
 * 性能关键：美国 3200+ 县 × 50+ 州的"全量 geoContains"是 ~18 万次
 * 点-in-多边形测试（实测 17.8 秒，页面冻结），这里先用 ADM1 的 bbox
 * 预筛出少数候选再做 geoContains（实测 0.7 秒）。预筛对跨 180° 线的
 * 多边形可能漏检（geoBounds 会翻折），漏检时退回全量确认，再退回
 * "球面距离最近的 ADM1"，保证每个 ADM2 都有父级可下钻。
 */
function attachParents(adm2: MapFeature[], adm1: MapFeature[]): MapFeature[] {
  const boxes = adm1.map((a) => ({ a, b: geoBounds(a) }))
  const centroids = adm1.map((a) => ({ a, c: geoCentroid(a) }))
  return adm2.map((f) => {
    const [lon, lat] = geoCentroid(f)
    const candidates = boxes.filter(
      ({ b }) =>
        lon >= b[0][0] && lon <= b[1][0] && lat >= b[0][1] && lat <= b[1][1],
    )
    let parentCode = candidates.find(({ a }) => geoContains(a, [lon, lat]))?.a
      .properties.code
    if (!parentCode) {
      // bbox 预筛漏检的少数，全量确认避免误判
      parentCode = adm1.find((a) => geoContains(a, [lon, lat]))?.properties.code
    }
    if (!parentCode) {
      let best: { a: MapFeature; c: number[] } | null = null
      let bestD = Infinity
      for (const cand of centroids) {
        const d = geoDistance([lon, lat], cand.c)
        if (d < bestD) {
          bestD = d
          best = cand
        }
      }
      parentCode = best?.a.properties.code
    }
    return { ...f, properties: { ...f.properties, parentCode } }
  })
}

/**
 * 加载某国 ADM2（二级行政区，含父级推导），模块级缓存。
 * 该国没有 ADM2 时返回 null（对应"点击无反应"的板块）。
 */
async function loadAdm2(alpha2: string): Promise<MapFeature[] | null> {
  if (adm2Cache.has(alpha2)) return adm2Cache.get(alpha2)!

  const iso3 = ALPHA2_TO_ALPHA3[alpha2]
  if (!ADMIN_COVERAGE[iso3]?.adm2) {
    adm2Cache.set(alpha2, null)
    return null
  }

  const [adm1, topo] = await Promise.all([
    loadAdm1(alpha2),
    fetchTopology(iso3, 2),
  ])
  const fc = topoToFeatureCollection(topo)
  const features = attachParents(
    fc.features.map((f) => toMapFeature(f, alpha2, 'adm2')),
    adm1.features,
  )
  // 与 ADM1 同一个中心重新居中，保证父子板块坐标体系一致
  recenterFeatures(features, adm1.centerLon)
  adm2Cache.set(alpha2, features)
  return features
}

export interface CountryAdm1 {
  features: MapFeature[]
  /** adm1 = 有真实一级数据；adm0 = 退回国家整体轮廓 */
  level: 'adm1' | 'adm0'
}

/** 公开入口：某国的 ADM1（或轮廓兜底） */
export async function getCountryAdm1(countryCode: string): Promise<CountryAdm1> {
  const alpha2 = countryCode.toUpperCase()
  const { features, fallback } = await loadAdm1(alpha2)
  return { features, level: fallback ? 'adm0' : 'adm1' }
}

/** 公开入口：某国的 ADM2（没有则返回 null） */
export async function getCountryAdm2(countryCode: string): Promise<MapFeature[] | null> {
  return loadAdm2(countryCode.toUpperCase())
}

/** 把地名转成 URL 段（空格 → 下划线，与需求示例 #/country/US/CA/San_Francisco 一致） */
export function slugifyName(name: string): string {
  return name.trim().replace(/\s+/g, '_')
}

/** 反向展示：URL 段里的下划线还原为空格 */
export function deslugifyName(slug: string): string {
  return slug.replace(/_/g, ' ')
}
