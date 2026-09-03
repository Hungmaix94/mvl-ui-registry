import { QUERY_KEYS } from '@/constants'

/**
 * Các query key cần làm mới khi PHẠM VI giao dịch của lô (LAD) thay đổi — thêm / loại GD.
 *
 * Đổi phạm vi GD ảnh hưởng tới hai read-model deal-scoped:
 *   • LINES — danh sách GD ở Bước 1.
 *   • F2S   — danh sách sàn liên kết (suy từ các GD trong lô) ở Bước 2.
 *
 * Bỏ sót F2S là nguyên nhân bug: thêm GD ở Bước 1 rồi quay lại Bước 2 không thấy F2 nào, vì
 * Bước 2 remount đọc cache F2S cũ (rỗng) còn trong global staleTime nên không refetch. Gom vào một
 * nguồn duy nhất để mọi nơi đổi phạm vi đều làm mới ĐỦ cả hai (tránh tái diễn việc bỏ sót).
 */
export function ladScopeChangeQueryKeys(
  batchId: number
): ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>> {
  return [
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.LINES(batchId, {}),
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.F2S(batchId, {}),
  ]
}
