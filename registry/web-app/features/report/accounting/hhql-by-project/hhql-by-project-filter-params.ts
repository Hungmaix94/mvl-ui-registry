import type { GetHhqlByProjectParams } from '@/api/schema-accounting-reports-compat'
import { parsePositiveInt } from '@/utils/common'

/**
 * Ánh xạ bộ lọc dự án của báo cáo 21.13 giữa URL ⇄ tham số API.
 *
 * Tách khỏi trang vì đây là chỗ hợp đồng dễ vỡ nhất: URL giữ dạng nối phẩy (`?project=12,37`)
 * cho link chia sẻ được, còn API nhận `project__in` là MẢNG. Gửi nhầm `project` (số ít) thì BE
 * chỉ lọc một dự án và im lặng trả về nhiều dòng hơn màn hình đang nói.
 */

/** `?project=12,37` → `[12, 37]`. Bỏ phần rác thay vì để `NaN` rơi xuống query. */
export function parseProjectIds(raw: string | null | undefined): number[] {
  if (!raw) return []

  const ids = raw
    .split(',')
    .map((part) => parsePositiveInt(part.trim()))
    .filter((id): id is number => typeof id === 'number')

  // Giữ nguyên thứ tự, bỏ trùng — URL do người dùng dán vào có thể lặp id.
  return [...new Set(ids)]
}

/** Giá trị viết ngược lại lên URL; `null` nghĩa là xoá hẳn tham số. */
export function serializeProjectIds(
  values: readonly (string | number)[] | undefined
): string | null {
  if (!values || values.length === 0) return null

  const ids = values
    .map((value) => parsePositiveInt(String(value).trim()))
    .filter((id): id is number => typeof id === 'number')

  return ids.length > 0 ? [...new Set(ids)].join(',') : null
}

/**
 * Tham số cho cả bảng lẫn Xuất Excel — một nguồn duy nhất để file Excel không bao giờ lệch
 * phạm vi với những gì đang hiện trên màn hình.
 */
export function buildHhqlByProjectParams({
  year,
  month,
  projectIds,
}: {
  year?: number
  month?: number
  projectIds: readonly number[]
}): GetHhqlByProjectParams {
  return {
    year: year || undefined,
    month: month || undefined,
    ...(projectIds.length > 0 ? { project__in: [...projectIds] } : {}),
  }
}
