/**
 * 通用地区搜索：右下角按钮展开面板，即时过滤 + 点击跳转。
 * 泛型设计：value 类型由页面层决定（中国用地区对象，外国用 SearchableRegion）。
 * 约定：结果最多 12 条（防长列表卡顿）；输入用 trimRegionName 归一化
 * （去行政后缀），匹配逻辑保持与 regions.ts 一致。
 */
import { useMemo, useState } from 'react'
import { trimRegionName } from '../../data/geo/regions'
import './RegionSearch.css'

/** 一个可搜索的选项（地名 + 原始数据，页面层自定 value 类型） */
export interface SearchOption<T = unknown> {
  name: string
  value: T
}

interface RegionSearchProps<T> {
  /** 可搜索的选项列表（空数组 = 无可用地区） */
  options: SearchOption<T>[]
  /** 提示词，如"搜索地区，如：广东、四川"（由页面按下一层级动态生成） */
  placeholder?: string
  /** 无可用选项时显示的提示文案 */
  emptyHint?: string
  /** 点击某个结果时的回调 */
  onPick: (option: SearchOption<T>) => void
}

/**
 * 通用地区搜索：右下角一个按钮，点击展开搜索面板。
 * 输入即时过滤、点击结果跳转；地名只显示本体，不标注行政性质。
 */
export default function RegionSearch<T>({
  options,
  placeholder = '搜索地区',
  emptyHint,
  onPick,
}: RegionSearchProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const q = trimRegionName(query.trim()).toLowerCase()
    if (!q) return []
    return options
      .filter((o) => trimRegionName(o.name).toLowerCase().includes(q))
      .slice(0, 12)
  }, [options, query])

  const disabled = options.length === 0

  return (
    <div className="region-search">
      {open && (
        <button
          type="button"
          className="region-search__backdrop"
          aria-label="关闭搜索"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        className="region-search__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        搜索
      </button>
      {open && (
        <div className="region-search__panel">
          <input
            className="region-search__input"
            type="text"
            value={query}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          {disabled && emptyHint && (
            <p className="region-search__hint">{emptyHint}</p>
          )}
          {!disabled && query.trim() && results.length === 0 && (
            <p className="region-search__hint">没有匹配的地区</p>
          )}
          {!disabled && results.length > 0 && (
            <ul className="region-search__list">
              {results.map((o, i) => (
                <li key={`${o.name}-${i}`}>
                  <button
                    type="button"
                    className="region-search__item"
                    // onMouseDown 先于 blur 触发，防止面板收起导致点击失效
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(o)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    {o.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
