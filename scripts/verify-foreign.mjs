/**
 * 远程外国行政区数据验收脚本（Node，需项目依赖：d3-geo / topojson-client / geojson-rewind）。
 *
 * 用途：从 geoBoundaries 拉取未内置国家的 ADM1/ADM2 做抽样验证
 * （特征数、空路径、ADM2 父级推导、日本 shapeISO 缺失兜底等）。
 *
 * 运行：node scripts/verify-foreign.mjs
 * 修改提示：URL 必须走 media 直链 + 完整 40 位 commit hash（浏览器 CORS
 * 需要），短 hash / github raw 会 302 无 CORS，浏览器里必挂——与本仓库
 * src/data/geo/foreign.ts 的约定保持一致。
 */
import { feature } from 'topojson-client'
import { geoCentroid, geoContains, geoMercator, geoDistance } from 'd3-geo'
import rewind from 'geojson-rewind'

const COMMIT = '9469f09592ced973a3448cf66b6100b741b64c0d'
const url = (iso3, level) =>
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${COMMIT}/releaseData/gbOpen/${iso3}/ADM${level}/geoBoundaries-${iso3}-ADM${level}_simplified.topojson`

async function load(iso3, level) {
  const res = await fetch(url(iso3, level))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const topo = await res.json()
  const key = Object.keys(topo.objects)[0]
  const fc = feature(topo, topo.objects[key])
  rewind(fc, true)
  return fc
}

function countEmptyPaths(fc, size = [800, 600]) {
  const merc = geoMercator()
  merc.fitSize(size, { type: 'FeatureCollection', features: fc.features })
  let empty = 0
  for (const f of fc.features) if (merc(f).length === 0) empty++
  return empty
}

function codeOf(props, level) {
  const iso = String(props.shapeISO ?? '')
  const id = String(props.shapeID ?? '')
  const name = String(props.shapeName ?? '')
  return (level === 'adm1' ? (iso.split('-').pop() || id) : id) || name
}

function attachParents(adm2, adm1) {
  const centroids = adm1.map((a) => ({ a, c: geoCentroid(a) }))
  return adm2.map((f) => {
    const [lon, lat] = geoCentroid(f)
    let parent = adm1.find((a) => geoContains(a, [lon, lat]))
    if (!parent) {
      let best = null
      let bestD = Infinity
      for (const cand of centroids) {
        const d = geoDistance([lon, lat], cand.c)
        if (d < bestD) {
          bestD = d
          best = cand
        }
      }
      parent = best?.a
    }
    return { f, parent: parent ? codeOf(parent.properties, 'adm1') : null }
  })
}

let ok = true
function check(label, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`)
  if (!cond) ok = false
}

const results = {}

// 1) US ADM1
{
  const fc = await load('USA', 1)
  results.usAdm1 = fc.features.length
  check('US ADM1 feature 数 = 56', fc.features.length === 56, `实际 ${fc.features.length}`)
  const empty = countEmptyPaths(fc)
  check('US ADM1 无空路径', empty === 0, `空路径 ${empty}`)
  const sample = codeOf(fc.features.find((f) => String(f.properties.shapeISO) === 'US-CA').properties, 'adm1')
  check('US-CA → code CA', sample === 'CA', sample)
}

// 2) US ADM2 + 父级推导（加州应 58 县）
{
  const [adm1, adm2] = await Promise.all([load('USA', 1), load('USA', 2)])
  const mine = attachParents(adm2.features, adm1.features)
  const ca = mine.filter(({ parent }) => parent === 'CA')
  check('US ADM2 县总数 > 3000', mine.length > 3000, `实际 ${mine.length}`)
  check('加州 ADM2 = 58', ca.length === 58, `实际 ${ca.length}`)
  const unassigned = mine.filter(({ parent }) => !parent).length
  check('US ADM2 无未归属父级', unassigned === 0, `未归属 ${unassigned}`)
}

// 3) JPN ADM1 + ADM2（shapeISO 空 → 靠 shapeID）
{
  const [adm1, adm2] = await Promise.all([load('JPN', 1), load('JPN', 2)])
  check('JPN ADM1 = 47', adm1.features.length === 47, `实际 ${adm1.features.length}`)
  const noIso = adm2.features.filter((f) => !String(f.properties.shapeISO ?? '')).length
  check('JPN ADM2 全无 shapeISO', noIso === adm2.features.length, `无 shapeISO ${noIso}/${adm2.features.length}`)
  const ids = new Set(adm2.features.map((f) => String(f.properties.shapeID)))
  check('JPN ADM2 shapeID 唯一', ids.size === adm2.features.length, `唯一 ${ids.size}`)
  const empty = countEmptyPaths(adm1)
  check('JPN ADM1 无空路径', empty === 0, `空路径 ${empty}`)
}

// 4) ESH 无 ADM1 → 应 404（触发轮廓兜底路径）
{
  const res = await fetch(url('ESH', 1))
  check('ESH ADM1 不存在(404)', res.status === 404, `HTTP ${res.status}`)
}

// 5) BRA ADM2 大文件可用
{
  const fc = await load('BRA', 2)
  check('BRA ADM2 可用', fc.features.length > 5000, `实际 ${fc.features.length}`)
}

// 6) 轮廓兜底国家：ATA 连 ADM0 都无，FR 有 ADM1 —— 抽查 FR 覆盖
{
  const fc = await load('FRA', 1)
  check('FRA ADM1 可用', fc.features.length > 10, `实际 ${fc.features.length}`)
}

console.log('\nsummary:', results)
console.log(ok ? 'ALL PASS' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
