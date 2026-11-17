/**
 * 3D 地球层（globe.gl 命令式封装）。
 * 负责：板块渲染、hover/点击判定（自带点击容差修复）、visited 着色、
 * 描边 z-fighting 修复（径向抬升描边线）。
 * 修改提示：globe.gl 不走 React 渲染，务必在 useEffect 内创建实例；
 * 颜色一律从 theme/colors.ts 取，禁止写死色值。
 */
import { useEffect, useRef } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import * as THREE from 'three'
import { loadWorldCountries } from '../../data/geo/world'
import type { MapFeature } from '../../data/types'
import { themeColors, lightenColor } from '../../theme/colors'
import { useAppStore } from '../../store/useAppStore'
import './Earth.css'

/**
 * 点击 vs 拖动的位移容差（px）。
 * globe.gl 内置判定是"移动超过 1px 即视为拖动"，会把正常点击吞掉，
 * 这里自己接管点击判定，把容差放宽到 6px。
 */
const CLICK_TOLERANCE = 6

interface EarthProps {
  /** 点击某个国家板块时的回调，参数是该国的 ISO 代码 */
  onSelectCountry: (code: string) => void
}

/**
 * 3D 地球层。
 *
 * globe.gl 是"命令式"库（直接操纵 WebGL，不走 React 的 JSX），
 * 所以做法是：React 只提供一个空容器 div，在 useEffect 里创建
 * globe 实例并配置全部行为。React 重渲染不会自动刷新 canvas，
 * 需要颜色变化时手动调用 globe 的访问器（accessor）。
 *
 * 视觉只做了最简纯色（需求要求），但 layer 结构是 globe.gl 原生的，
 * 后续加星空背景（backgroundImageUrl / 自定义层）、大气光晕、
 * 粒子效果都不需要改本组件的点击逻辑。
 */
export default function Earth({ onSelectCountry }: EarthProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const hoveredRef = useRef<MapFeature | null>(null)

  const { getVisited } = useAppStore()
  // 把最新函数镜像进 ref，避免事件回调里拿到过期闭包；
  // 放 useEffect 里更新（不用在渲染期碰 ref，React 规范）。
  const getVisitedRef = useRef(getVisited)
  useEffect(() => {
    getVisitedRef.current = getVisited
  }, [getVisited])

  const onSelectCountryRef = useRef(onSelectCountry)
  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry
  }, [onSelectCountry])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const globe = new Globe(el, {
      // 对数深度缓冲：把深度精度按"距离对数"分配，避免球体这种
      // 大尺度场景下，描边线与板块顶面因深度值过于接近而 z-fighting
      // （普通 24bit 深度缓冲在远距离处分辨率不足，表现为闪烁）
      rendererConfig: { logarithmicDepthBuffer: true },
    })
      // 背景透明，让页面 CSS 的深蓝底色透出来（颜色仍走主题变量）
      .backgroundColor('rgba(0, 0, 0, 0)')
      .showAtmosphere(false)
      .showGlobe(true)
      .polygonsData([])

    // 球体表面用"未去过"的深蓝，和未点亮板块融为一体；
    // 去过板块是米色，天然形成对比。
    const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial
    globeMaterial.color = new THREE.Color(themeColors.unvisited)

    globeRef.current = globe

    /**
     * 统一维护板块的 hover / 着色规则。
     * 每次 hover 变化或 visited 变化时调用，从 ref 里读最新状态，
     * 保证"着色基于 visited"而不是写死一种颜色。
     */
    const refreshPolygons = () => {
      const hovered = hoveredRef.current
      globe
        // 板块高度尽量压低 + hover 抬升幅度减小，减少相邻描边之间的深度竞争
        .polygonAltitude((d: object) => (d === hovered ? 0.02 : 0.005))
        .polygonCapColor((d: object) => {
          const feature = d as MapFeature
          const base = getVisitedRef.current(feature.properties.code)
            ? themeColors.visited
            : themeColors.unvisited
          // hover 高亮 = 把该地当前应显示的颜色提亮，仍是派生值
          return d === hovered ? lightenColor(base, 0.25) : base
        })
    }

    globe
      // 侧壁透明：板块不再有"厚边"，减少与其他板块描边的遮挡竞争
      .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
      .polygonStrokeColor(() => themeColors.stroke)
      .polygonLabel((d: object) => {
        const feature = d as MapFeature
        return `<div class="globe-tip">${feature.properties.name}</div>`
      })
      .onPolygonHover((polygon: object | null) => {
        hoveredRef.current = (polygon as MapFeature | null) ?? null
        refreshPolygons()
      })

    refreshPolygons()

    // —— 描边闪烁 + 镂空修复 ——
    // 之前用 depthTest:false 消除闪烁，副作用是球体背面的边界线
    // 也会穿透显示，看起来地球"镂空"。
    // 正确做法：恢复深度测试（球体正常遮挡背面线），同时把描边线
    // 沿径向抬高到所有板块之上（> hover 最高高度 0.02），
    // 线与板块顶面不再有深度竞争，z-fighting 闪烁也消失。
    const patchStroke = () => {
      const LIFT = 0.05 // 与 polygonAltitude 同单位（球半径倍数）
      globe.scene().traverse((obj) => {
        const anyObj = obj as { __globeObjType?: string }
        if (anyObj.__globeObjType !== 'polygon') return
        const stroke = obj.children[1] as THREE.LineSegments | undefined
        if (!stroke || !('material' in stroke)) return
        ;(stroke.material as THREE.LineBasicMaterial).depthTest = true
        const lifted = stroke as THREE.LineSegments & { __strokeLifted?: boolean }
        if (lifted.__strokeLifted) return
        lifted.__strokeLifted = true
        const pos = stroke.geometry.getAttribute('position')
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const y = pos.getY(i)
          const z = pos.getZ(i)
          const len = Math.hypot(x, y, z)
          const scale = (len + LIFT) / len
          pos.setXYZ(i, x * scale, y * scale, z * scale)
        }
        pos.needsUpdate = true
        stroke.geometry.computeBoundingSphere()
      })
    }

    // —— 点击修复 ——
    // globe.gl 内部把"按下后移动超过 1px"一律判定为拖动，点击被吞掉。
    // 这里自己监听 pointer，把容差放宽到 CLICK_TOLERANCE：
    // 位移 ≤ 容差视为点击（触发当前 hover 的国家），否则交给相机拖动。
    let pointerDown: { x: number; y: number } | null = null
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = { x: e.clientX, y: e.clientY }
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!pointerDown) return
      const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y)
      pointerDown = null
      if (moved > CLICK_TOLERANCE) return
      const feature = hoveredRef.current
      if (feature) onSelectCountryRef.current(feature.properties.code)
    }
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)

    // 加载国界数据（模块级缓存，多次调用只加载一次）
    let cancelled = false
    void loadWorldCountries().then((features) => {
      if (cancelled) return
      globe.polygonsData(features)
      // 同步 patch 一次，再用 rAF + 延时兜底，
      // 防 three-globe 内部对象创建是异步的导致遍历扑空
      patchStroke()
      requestAnimationFrame(patchStroke)
      setTimeout(patchStroke, 100)
      // 初始视角对准亚洲，让中国居中，方便演示
      globe.pointOfView({ lat: 24, lng: 105, altitude: 2.2 }, 0)
    })

    return () => {
      cancelled = true
      globeRef.current = null
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      // 销毁 globe（私有方法），并清空容器，防止 React StrictMode
      // 下 useEffect 双执行产生重复 canvas
      ;(globe as unknown as { _destructor?: () => void })._destructor?.()
      el.innerHTML = ''
    }
  }, [])

  // visited 状态变化时，让地球立刻按新状态重新着色
  const { visited } = useAppStore()
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const hovered = hoveredRef.current
    globe.polygonCapColor((d: object) => {
      const feature = d as MapFeature
      const base = getVisitedRef.current(feature.properties.code)
        ? themeColors.visited
        : themeColors.unvisited
      return d === hovered ? lightenColor(base, 0.25) : base
    })
    // 复制一份数据重新传入，触发 globe 重绘
    globe.polygonsData([...globe.polygonsData()])
  }, [visited])

  return <div className="earth" ref={containerRef} />
}
