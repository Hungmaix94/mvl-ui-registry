import { APP_PATH } from '@/routes/AppRoute.constant'

/**
 * Dựng URL trang xem tài liệu public (`/docs/:token`) trên domain web hiện tại từ
 * share token của elibrary. Người nhận mở link này (không cần đăng nhập) để xem
 * trước / tải tài liệu — thay cho việc dùng URL API thô.
 *
 * Ví dụ: `https://app.example.com/docs/<token>/`
 */
export function buildPublicDocViewerUrl(token: string): string {
  const path = APP_PATH.DOCS_PREVIEW.replace(':token', encodeURIComponent(token))
  // Trailing slash để khớp định dạng link gốc; React Router v6 match cả 2 dạng.
  return `${window.location.origin}${path}/`
}
