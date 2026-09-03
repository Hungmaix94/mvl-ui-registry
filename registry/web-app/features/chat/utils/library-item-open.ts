/**
 * Quyết định điều gì xảy ra khi người dùng bấm vào card tài liệu thư viện trong
 * chat. Tách khỏi component để test thuần (không phụ thuộc React/DOM).
 *
 * Theo SRS §4.7: FE gọi endpoint chi tiết item (GET /items/{id}/) — chính nó
 * enforce quyền visibility/share:
 *  - 200 + có presigned URL  → mở tài liệu (`open`)
 *  - 200 nhưng không có URL   → thư mục / item không xem trực tiếp được (`unopenable`)
 *  - 403                      → chưa có quyền → màn "Yêu cầu truy cập" (`request-access`)
 *  - 404                      → đã bị xóa / không tồn tại → toast (`deleted`)
 *  - lỗi khác                 → toast lỗi chung (`error`)
 */

export type LibraryItemOpenOutcome =
  | { type: 'open'; url: string }
  | { type: 'request-access' }
  | { type: 'deleted' }
  | { type: 'unopenable' }
  | { type: 'error' }

type LibraryItemDetail =
  | {
      view_url?: string | null
      download_url?: string | null
    }
  | null
  | undefined

export function resolveLibraryItemOpenSuccess(detail: LibraryItemDetail): LibraryItemOpenOutcome {
  const url = detail?.view_url || detail?.download_url
  return url ? { type: 'open', url } : { type: 'unopenable' }
}

export function resolveLibraryItemOpenError(
  error: { status?: number } | null | undefined
): LibraryItemOpenOutcome {
  const status = error?.status
  if (status === 403) return { type: 'request-access' }
  if (status === 404) return { type: 'deleted' }
  return { type: 'error' }
}
