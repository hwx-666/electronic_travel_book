/**
 * 旅行回忆区组件：某地区的回忆列表 + 添加表单 + 删除。
 *
 * 用法：地区详情页在拿到确定的 visitedKey 后渲染
 * <Memories visitedKey="CN-440300" placeName="深圳" ancestorKeys={...} />。
 * ancestorKeys 是该回忆能"点亮"的父层链（如市回忆 = [国家, 省]），
 * 见 store/storage.ts 的 MemoryItem 说明；不传则回忆只点亮自身。
 *
 * 点亮语义（阶段 4.1）：添加回忆即点亮（含父层），删除最后一条即熄灭，
 * 由 store 推导，本组件无需感知 visited。
 *
 * 交互约定：
 * - 列表按日期倒序（同日按创建时间倒序），排序逻辑在 store；
 * - 空态：显示"还没有旅行回忆…"提示；
 * - 添加：日期默认今天（yyyy-MM-dd）、正文 ≤2000 字（maxLength + 计数提示）；
 * - 删除：二次确认（window.confirm）后走 store.deleteMemory；
 * - 存储不可用（storageOk=false）：顶部提示"记忆存储不可用"，页面照常渲染，
 *   绝不白屏/抛错——降级策略见 store/storage.ts。
 */
import { useState, type FormEvent } from 'react'
import { useAppStore } from '../../store/useAppStore'
import './Memories.css'

/** 回忆正文长度上限 */
export const MEMORY_TEXT_LIMIT = 2000

interface MemoriesProps {
  /** 地区 visitedKey（如 CN-440300 / US-CA-06075），回忆按它分组 */
  visitedKey: string
  /** 地区显示名（回忆里冗余存储，展示不依赖地图数据） */
  placeName: string
  /** 父层键链（点亮推导用，见文件头说明）；缺省 [] */
  ancestorKeys?: string[]
}

/** 今天日期（yyyy-MM-dd，input[type=date] 原生格式） */
function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * 旅行回忆区：列表 + 添加 + 删除。
 * 卡片样式走 theme.css 变量（Memories.css），不要写死颜色。
 */
export default function Memories({
  visitedKey,
  placeName,
  ancestorKeys,
}: MemoriesProps) {
  const { getMemories, addMemory, deleteMemory, storageOk } = useAppStore()
  const memories = getMemories(visitedKey)

  const [date, setDate] = useState<string>(today())
  const [text, setText] = useState<string>('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!date || !trimmed) return
    addMemory({
      visitedKey,
      placeName,
      date,
      text: trimmed,
      ancestorKeys,
    })
    setText('')
    setDate(today())
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('确定删除这条回忆吗？')) return
    deleteMemory(id)
  }

  return (
    <div className="memories">
      <header className="memories__header">
        <h2 className="memories__title">{placeName}</h2>
        {!storageOk && (
          <p className="memories__warn">记忆存储不可用，本次的记录不会保存</p>
        )}
      </header>

      <div className="memories__list">
        {memories.length === 0 ? (
          <div className="memories__empty">
            <p className="memories__empty-title">还没有旅行回忆</p>
            <p className="memories__empty-hint">在下方记下第一笔吧</p>
          </div>
        ) : (
          <ul className="memories__items">
            {memories.map((m) => (
              <li key={m.id} className="memories__item">
                <div className="memories__item-main">
                  <span className="memories__item-date">{m.date}</span>
                  <p className="memories__item-text">{m.text}</p>
                </div>
                <button
                  type="button"
                  className="memories__delete"
                  onClick={() => handleDelete(m.id)}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="memories__form" onSubmit={handleSubmit}>
        <div className="memories__form-row">
          <label className="memories__date-label">
            日期
            <input
              type="date"
              className="memories__date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today()}
            />
          </label>
          <span className="memories__count">
            {text.length}/{MEMORY_TEXT_LIMIT}
          </span>
        </div>
        <textarea
          className="memories__textarea"
          placeholder={`在${placeName}的回忆…`}
          value={text}
          maxLength={MEMORY_TEXT_LIMIT}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="memories__submit">
          记一笔
        </button>
      </form>
    </div>
  )
}
