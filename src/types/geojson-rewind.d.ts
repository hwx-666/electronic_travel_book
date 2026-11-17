/**
 * geojson-rewind 的模块类型声明。
 * 该包发布时未自带类型，本项目统一在 types/ 下补齐，避免每个
 * 使用方各自写一遍（或 @ts-ignore 逃避类型检查）。
 * 用途：修正 GeoJSON ring 方向——DataV（china.ts）与 geoBoundaries
 * （foreign.ts）的部分板块外环逆时针，会让 d3-geo 的填充方向错乱。
 */
declare module 'geojson-rewind' {
  /**
   * 原地修正 GeoJSON 多边形 ring 方向。
   * clockwise=true 时强制外环顺时针（DataV 数据用到的约定）。
   */
  function rewind<T>(geojson: T, clockwise?: boolean): T
  export default rewind
}
