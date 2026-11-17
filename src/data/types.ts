/**
 * 地图板块的统一类型定义（渲染层的唯一数据契约）。
 * 所有数据源（world/china/foreign）都输出 MapFeature[]，
 * 渲染组件只认这个结构，不关心数据来自哪个源。
 * 修改提示：新增板块属性时先在这里声明，再让各数据层补齐。
 */
import type { Feature, Geometry } from 'geojson'

/** 地图板块统一属性结构（country / 省 / 市复用同一形态） */
export interface MapFeatureProperties {
  /** 展示名称，如 "China"、"广东省" */
  name: string
  /** 路由 / 状态标识代码：国家如 "CN"；省级/市级如 "440000" */
  code: string
  /** 来源数据里的原始 id（如 TopoJSON 的数字码、DataV 的 adcode） */
  id?: string
  /**
   * visited 状态键（可选）。
   * 缺省时组件用 `code` 作为 visited 键；某些层级需要在 code 前加
   * 命名空间避免撞名（如中国省市的 "CN-440000"），由数据层填好。
   */
  visitedKey?: string
  /** 是否有下级行政区划数据（决定点击能否继续下钻，如外国 ADM1 → ADM2） */
  hasChildren?: boolean
  /** 上级行政区 code（二级板块用，如外国 ADM2 归属的 ADM1 code） */
  parentCode?: string
}

export type MapFeature = Feature<Geometry, MapFeatureProperties>
