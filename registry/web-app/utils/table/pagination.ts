import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'

/**
 * Số ms chờ sau khi người dùng ngừng gõ mới đẩy `search` lên URL.
 * Canonical list page pattern — xem `docs/ai/conventions.md`.
 */
export const SEARCH_DEBOUNCE_MS = 500

/**
 * Đọc `page_size` từ URL search param về một giá trị hợp lệ.
 *
 * URL là input người dùng sửa được, nên giá trị rác (`?page_size=abc`, `?page_size=99999`)
 * phải rơi về `PAGE_SIZE` thay vì bắn thẳng xuống API. Chỉ chấp nhận các mức trong `PAGE_SIZES`
 * để khớp đúng những lựa chọn mà dropdown phân trang render — nếu không, `<Table>` nhận một
 * pageSize không có trong danh sách và hiển thị ô trống.
 *
 * Key trên URL luôn là `page_size` (snake_case), KHÔNG phải `pageSize`.
 */
export function resolvePageSize(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return PAGE_SIZE
  const parsed = Number(raw)
  return Number.isInteger(parsed) && PAGE_SIZES.includes(parsed) ? parsed : PAGE_SIZE
}
