declare module 'geojson-rewind' {
  /**
   * 原地修正 GeoJSON 多边形 ring 方向。
   * clockwise=true 时强制外环顺时针（DataV 数据用到的约定）。
   */
  function rewind<T>(geojson: T, clockwise?: boolean): T
  export default rewind
}
