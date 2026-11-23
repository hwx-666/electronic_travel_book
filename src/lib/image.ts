/**
 * 图片压缩工具（阶段 5 图片链路的客户端处理）。
 *
 * 目标（与需求一致）：
 * - 展示图：长边 ≤1280px，JPEG 编码，文件 ≤约300KB（质量迭代压缩）；
 * - 缩略图：长边 ≤200px，JPEG（列表网格用，省流量）；
 * - 统一 JPEG：EXIF 方向自动修正（canvas 绘制 <img> 时现代浏览器按
 *   image-orientation 应用 EXIF 旋转）；gif/png 透明底先铺白再合成，
 *   避免 JPEG 不支持透明导致的黑色残影。
 *
 * 用法：选图 File[] → 逐张 compressPhoto(file, index) → 得到
 * { blob(展示图), thumbBlob(缩略图), fileName }，交给 store 上传。
 */
/** 展示图长边上限（px） */
export const FULL_EDGE = 1280
/** 展示图体积上限（bytes，约 300KB） */
export const FULL_MAX_BYTES = 300 * 1024
/** 缩略图长边上限（px） */
export const THUMB_EDGE = 200
/** JPEG 质量起点与下限（0~1，质量迭代区间） */
const JPEG_QUALITY_START = 0.85
const JPEG_QUALITY_MIN = 0.5

export interface CompressedPhoto {
  /** 展示图 JPEG Blob（≤FULL_MAX_BYTES） */
  blob: Blob
  /** 缩略图 JPEG Blob（长边 ≤THUMB_EDGE） */
  thumbBlob: Blob
  /** 上传用文件名（统一 .jpg，规避原文件中文/畸形名） */
  fileName: string
}

/** 统一生成安全文件名（上传路径用，避免原始文件名含非法字符） */
export function photoFileName(index: number): string {
  return `photo-${index}.jpg`
}

/**
 * 由展示图文件名推导缩略图文件名（约定：`photo-0.thumb.jpg`）。
 * 上传（写 storage_path 时生成缩略图路径）与删除（根据 storagePath
 * 反查缩略图路径）共用，保证两处路径永远一致。
 */
export function thumbPathFor(name: string): string {
  return name.replace(/\.jpg$/i, '.thumb.jpg')
}

/**
 * 读取图片文件到 HTMLImageElement（自动应用 EXIF 方向）。
 * 失败（非图片/损坏）抛 Error，由调用方提示"第 N 张不是有效图片"。
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/**
 * 把图片重采样到指定长边并编码 JPEG。
 * 透明底（gif/png）先铺白色背景；EXIF 方向由 <img> 解码自动修正。
 * 返回 { blob, width, height }（width/height 为压缩后尺寸）。
 */
async function encodeJpeg(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  // 白底兜底（JPEG 无透明通道）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve({ blob, width: w, height: h })
        else reject(new Error('JPEG 编码失败'))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * 压缩单张图片：展示图（≤FULL_EDGE / ≤FULL_MAX_BYTES）+ 缩略图（≤THUMB_EDGE）。
 * 质量迭代：从 JPEG_QUALITY_START 起，超体积则降质量重编码，至下限为止；
 * 到下限仍超则返回当前最小体积结果（不抛错，避免"卡死上传"）。
 */
export async function compressPhoto(
  file: File,
  index: number,
): Promise<CompressedPhoto> {
  const img = await loadImage(file)

  // 展示图：尺寸优先（长边 1280），体积用质量迭代压到 ≤300KB
  let full = await encodeJpeg(img, FULL_EDGE, JPEG_QUALITY_START)
  if (full.blob.size > FULL_MAX_BYTES) {
    for (
      let q = JPEG_QUALITY_START - 0.1;
      q >= JPEG_QUALITY_MIN;
      q -= 0.1
    ) {
      const next = await encodeJpeg(img, FULL_EDGE, q)
      if (next.blob.size <= FULL_MAX_BYTES || q <= JPEG_QUALITY_MIN) {
        full = next
        break
      }
      full = next
    }
  }

  // 缩略图：长边 200，质量固定 0.72（体积天然小，无需迭代）
  const thumb = await encodeJpeg(img, THUMB_EDGE, 0.72)

  return {
    blob: full.blob,
    thumbBlob: thumb.blob,
    fileName: photoFileName(index),
  }
}

/**
 * 生成展示图的公开 URL（public bucket 直链）。
 * 注意：URL 是派生的，不落库；库里只存 storage_path。
 */
export function publicPhotoUrl(storagePath: string, baseUrl: string): string {
  return `${baseUrl}/storage/v1/object/public/photos/${storagePath}`
}
