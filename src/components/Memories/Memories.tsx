/**
 * 旅行回忆区组件（阶段 5）：某地区的回忆列表 + 添加表单 + 删除。
 *
 * 阶段 5 新增：
 * - 三态卡片：纯文字（text 非空、无照片）/ 纯图片（text 为空、有照片）/
 *   图文混合；照片以缩略图网格展示（点击大图查看，左右切换）；
 * - 表单可选照片（≤ MAX_PHOTOS_PER_MEMORY 张），本地预览 + 可移除；
 *   提交走异步 addMemory（云端写入）：上传中禁用按钮，失败提示且输入不丢；
 * - 「导入本地回忆」按钮：检测 localStorage 有 v2 数据时显示，
 *   一键迁移到云端（幂等），成功后清除本地。
 *
 * 用法：地区详情页在拿到确定的 visitedKey 后渲染
 * <Memories visitedKey="CN-440300" placeName="深圳" ancestorKeys={...} />。
 *
 * 点亮语义（阶段 4.1）：添加回忆即点亮（含父层），删除最后一条即熄灭，
 * 由 store 推导，本组件无需感知 visited。
 *
 * 交互约定：
 * - 列表按日期倒序（同日按创建时间倒序），排序逻辑在 store；
 * - 空态：显示"还没有旅行回忆…"提示；
 * - 删除：二次确认（window.confirm）后走 store.deleteMemory（异步）；
 * - 云端不可用（storageOk=false）：顶部提示"云端不可用"，页面照常渲染，
 *   绝不白屏/抛错——降级策略见 AppStoreProvider。
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { MemoryItem } from '../../store/context'
import { PHOTOS_BUCKET, supabase } from '../../lib/supabase'
import { loadState } from '../../store/storage'
import './Memories.css'

/** 回忆正文长度上限 */
export const MEMORY_TEXT_LIMIT = 2000
/** 单条回忆最多照片数 */
export const MAX_PHOTOS_PER_MEMORY = 9

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

/** 根据 storage_path 生成公开直链（public bucket，前端直接 <img>） */
function photoUrl(storagePath: string): string {
  const base = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl
  return base
}

/**
 * 旅行回忆区：列表 + 添加 + 删除（云端读写）。
 * 卡片样式走 theme.css 变量（Memories.css），不要写死颜色。
 */
export default function Memories({
  visitedKey,
  placeName,
  ancestorKeys,
}: MemoriesProps) {
  const { getMemories, addMemory, deleteMemory, importLocalMemories, storageOk } =
    useAppStore()
  const memories = getMemories(visitedKey)

  const [date, setDate] = useState<string>(today())
  const [text, setText] = useState<string>('')
  // 已选照片（原 File，预览用 objectURL）
  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // 大图查看
  const [lightbox, setLightbox] = useState<{ paths: string[]; index: number } | null>(null)
  // 导入状态
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  // 本地是否有可导入的 v2 数据（决定是否显示导入按钮）；
  // 惰性初始化（只读一次本地存储），导入成功后置 false
  const [hasLocalData, setHasLocalData] = useState<boolean>(() => {
    const local = loadState()
    return Object.values(local?.memories ?? {}).flat().length > 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_PHOTOS_PER_MEMORY - pickedFiles.length
    const accepted = files.slice(0, remaining)
    if (accepted.length === 0) {
      e.target.value = ''
      return
    }
    setPickedFiles((prev) => [...prev, ...accepted])
    setPreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ])
    e.target.value = ''
  }

  const removePicked = (idx: number) => {
    setPickedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      return next
    })
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!date || (!trimmed && pickedFiles.length === 0)) return
    setSubmitting(true)
    setFormError(null)
    try {
      await addMemory({
        visitedKey,
        placeName,
        date,
        text: trimmed,
        ancestorKeys,
        photos: pickedFiles,
      })
      // 成功：清空表单与已选照片（objectURL 释放）
      setText('')
      setDate(today())
      setPickedFiles([])
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u))
        return []
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      // 失败：保留表单输入不丢，仅提示
      const msg = (err as { message?: string })?.message ?? '保存失败，请重试'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条回忆吗？（照片也会一并删除）')) return
    try {
      await deleteMemory(id)
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '删除失败，请重试'
      window.alert(msg)
    }
  }

  const handleImport = async () => {
    if (!window.confirm('将把本机旧版回忆导入云端（不会重复导入），确定继续吗？')) return
    setImporting(true)
    try {
      const n = await importLocalMemories()
      setImportedCount(n)
      setHasLocalData(false)
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '导入失败，请重试'
      window.alert(msg)
    } finally {
      setImporting(false)
    }
  }

  /** 记忆卡片的图片区（缩略图网格，点击第 i 张大图查看） */
  const renderPhotos = (item: MemoryItem) => {
    if (item.photos.length === 0) return null
    const paths = item.photos.map((p) => p.storagePath)
    const gridSize = item.photos.length
    return (
      <div className="memories__photos">
        {item.photos.map((p, i) => (
          <button
            type="button"
            key={p.id}
            className="memories__photo"
            onClick={() => setLightbox({ paths, index: i })}
          >
            <img
              src={photoUrl(p.storagePath)}
              alt={`${item.placeName} 照片 ${i + 1}`}
              loading="lazy"
            />
            {gridSize > 1 && (
              <span className="memories__photo-count">
                {i + 1}/{gridSize}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="memories">
      <header className="memories__header">
        <h2 className="memories__title">{placeName}</h2>
        {!storageOk && (
          <p className="memories__warn">云端不可用，本次记录不会保存</p>
        )}
        {importedCount !== null && (
          <p className="memories__warn" style={{ color: 'var(--color-content-text)' }}>
            已导入 {importedCount} 条本地回忆
          </p>
        )}
        {(hasLocalData || importedCount !== null) && (
          <button
            type="button"
            className="memories__import"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? '导入中…' : importedCount !== null ? '已导入' : '导入本地回忆'}
          </button>
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
                  {m.text && <p className="memories__item-text">{m.text}</p>}
                  {renderPhotos(m)}
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
          placeholder={`在${placeName}的回忆…（可留空只传照片）`}
          value={text}
          maxLength={MEMORY_TEXT_LIMIT}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="memories__photos-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handlePickPhotos}
          />
          <button
            type="button"
            className="memories__pick"
            disabled={pickedFiles.length >= MAX_PHOTOS_PER_MEMORY || submitting}
            onClick={() => fileInputRef.current?.click()}
          >
            添加照片（{pickedFiles.length}/{MAX_PHOTOS_PER_MEMORY}）
          </button>
          {previews.map((url, i) => (
            <span key={url} className="memories__preview">
              <img src={url} alt={`待上传 ${i + 1}`} />
              <button
                type="button"
                className="memories__preview-remove"
                onClick={() => removePicked(i)}
                aria-label="移除这张照片"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {formError && <p className="memories__form-error">{formError}</p>}
        <button type="submit" className="memories__submit" disabled={submitting}>
          {submitting ? '保存中…' : '记一笔'}
        </button>
      </form>

      {lightbox && (
        <div
          className="memories__lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="照片大图"
        >
          <img
            src={photoUrl(lightbox.paths[lightbox.index])}
            alt="大图"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.paths.length > 1 && (
            <>
              <button
                type="button"
                className="memories__lightbox-nav memories__lightbox-nav--prev"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((prev) =>
                    prev
                      ? {
                          ...prev,
                          index:
                            (prev.index - 1 + prev.paths.length) % prev.paths.length,
                        }
                      : null,
                  )
                }}
                aria-label="上一张"
              >
                ‹
              </button>
              <button
                type="button"
                className="memories__lightbox-nav memories__lightbox-nav--next"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((prev) =>
                    prev ? { ...prev, index: (prev.index + 1) % prev.paths.length } : null,
                  )
                }}
                aria-label="下一张"
              >
                ›
              </button>
            </>
          )}
          <button
            type="button"
            className="memories__lightbox-close"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox(null)
            }}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
