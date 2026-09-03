import { getFileExtension } from './file-meta'

/** Cách hiển thị một tài liệu dựa trên định dạng. */
export const PREVIEW_KIND = {
  IMAGE: 'image',
  PDF: 'pdf',
  DOCX: 'docx',
  SPREADSHEET: 'spreadsheet',
  TEXT: 'text',
  /** Không hỗ trợ xem trước → chỉ cho tải về. */
  DOWNLOAD: 'download',
} as const

export type PreviewKind = (typeof PREVIEW_KIND)[keyof typeof PREVIEW_KIND]

/**
 * Map đuôi file → cách hiển thị. Nhận diện CHỦ YẾU theo đuôi file vì `mime_type`
 * từ backend có thể null. Các định dạng phức tạp (ppt/pptx, doc, odt, ods, odp,
 * rtf, …) không nằm trong map ⇒ rơi về DOWNLOAD (chỉ tải về).
 */
const EXTENSION_KIND: Record<string, PreviewKind> = {
  png: PREVIEW_KIND.IMAGE,
  jpg: PREVIEW_KIND.IMAGE,
  jpeg: PREVIEW_KIND.IMAGE,
  gif: PREVIEW_KIND.IMAGE,
  webp: PREVIEW_KIND.IMAGE,
  pdf: PREVIEW_KIND.PDF,
  docx: PREVIEW_KIND.DOCX,
  xls: PREVIEW_KIND.SPREADSHEET,
  xlsx: PREVIEW_KIND.SPREADSHEET,
  csv: PREVIEW_KIND.SPREADSHEET,
  txt: PREVIEW_KIND.TEXT,
}

/**
 * Quyết định cách render dựa trên tên file (ưu tiên) và mime (chỉ là gợi ý phụ
 * khi không suy ra được từ đuôi file).
 */
export function resolvePreviewKind(
  fileName: string | null | undefined,
  mimeType?: string | null
): PreviewKind {
  const ext = getFileExtension(fileName)
  const byExt = EXTENSION_KIND[ext]
  if (byExt) return byExt

  const mime = (mimeType ?? '').toLowerCase()
  if (mime.startsWith('image/')) return PREVIEW_KIND.IMAGE
  if (mime === 'application/pdf') return PREVIEW_KIND.PDF
  if (mime.startsWith('text/')) return PREVIEW_KIND.TEXT

  return PREVIEW_KIND.DOWNLOAD
}
