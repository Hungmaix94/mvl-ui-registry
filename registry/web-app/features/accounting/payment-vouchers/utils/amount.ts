/**
 * Ép số tiền dạng chuỗi decimal của API về number.
 *
 * Tách riêng khỏi `payment-voucher-utils` (file đó kéo theo `@/routes`) để các util thuần
 * tính toán còn unit-test được mà không phải dựng cả cây route.
 */
export function toAmount(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const num = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(num) ? num : 0
}
