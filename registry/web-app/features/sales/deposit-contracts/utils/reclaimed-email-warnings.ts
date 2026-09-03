/**
 * Cảnh báo trả kèm khi gửi/xem trước email thu hồi cọc.
 *
 * Backend gửi email cho khách hàng + mọi bên bán hợp đồng (NVKD / sàn F2 / CTV).
 * Bên nào chưa khai email thì bị bỏ qua và backend trả về một cảnh báo nêu tên bên đó —
 * email VẪN được gửi cho những bên còn lại. Người dùng cần thấy cảnh báo này để bổ sung
 * email vào hồ sơ, nên không được nuốt im lặng (ClickUp 86eydyrzf).
 */

export type ReclaimedEmailWarning = {
  code?: string
  detail?: string
}

/**
 * Lọc ra danh sách câu cảnh báo đọc được từ payload trả về.
 * Trả mảng rỗng khi không có cảnh báo, payload lạ, hoặc backend chưa deploy phần này.
 */
export function extractReclaimedEmailWarnings(response: unknown): string[] {
  const warnings = (response as { warnings?: unknown } | null | undefined)?.warnings
  if (!Array.isArray(warnings)) return []

  return warnings
    .map((warning) => {
      if (typeof warning === 'string') return warning.trim()
      return (warning as ReclaimedEmailWarning)?.detail?.trim() ?? ''
    })
    .filter(Boolean)
}
