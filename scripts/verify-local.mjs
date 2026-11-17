/**
 * 本地外国行政区数据验收脚本（Node，需项目依赖：d3-geo / topojson-client / geojson-rewind）。
 *
 * 用途：验证 public/data/geo/ 下的 6 国内置 TopoJSON（ADM1+ADM2）——
 * 覆盖特征数、空路径、父级推导（attachParents，质心归属 + 球面距离兜底）。
 *
 * 运行：node scripts/verify-local.mjs
 * 修改提示：COUNTRIES / 阈值若随数据源更新而变，先确认 geoBoundaries
 * 真实层级（如意大利 ADM1 仅 5 区组、澳洲 ADM1 9 个），勿拍脑袋调阈值。
 */
import { readFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoCentroid, geoContains, geoDistance, geoMercator } from 'd3-geo'
import rewind from 'geojson-rewind'

const BASE = `${process.cwd()}/public/data/geo/`
const COUNTRIES = ['USA', 'ITA', 'AUS', 'HRV', 'IDN', 'RUS']

function load(iso3, level) {
  const topo = JSON.parse(
    readFileSync(`${BASE}${iso3}-ADM${level}.topojson`, 'utf8'),
  )
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

function codeOf(props) {
  const iso = String(props.shapeISO ?? '')
  const id = String(props.shapeID ?? '')
  const name = String(props.shapeName ?? '')
  return iso.split('-').pop() || id || name
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
    return { f, parent: parent ? codeOf(parent.properties) : null }
  })
}

let ok = true
function check(label, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`)
  if (!cond) ok = false
}

for (const iso3 of COUNTRIES) {
  const adm1 = load(iso3, 1)
  const empty1 = countEmptyPaths(adm1)
  check(`${iso3} ADM1: 可解析且无空路径`, adm1.features.length > 3 && empty1 === 0, `features=${adm1.features.length} 空路径=${empty1}`)
  const ids = new Set(adm1.features.map((f) => String(f.properties.shapeID)))
  check(`${iso3} ADM1: shapeID 唯一`, ids.size === adm1.features.length)

  const adm2 = load(iso3, 2)
  const empty2 = countEmptyPaths(adm2)
  const mine = attachParents(adm2.features, adm1.features)
  const unassigned = mine.filter(({ parent }) => !parent).length
  check(`${iso3} ADM2: 可解析、无空路径、父级全覆盖`, adm2.features.length > 10 && empty2 === 0 && unassigned === 0, `features=${adm2.features.length} 空路径=${empty2} 未归属=${unassigned}`)
}

console.log(ok ? '\nALL PASS' : '\nSOME FAILED')
process.exit(ok ? 0 : 1)
