/**
 * Hằng số cho Dashboard điều hành (CEO).
 *
 * ⚠️ Chưa khai `EXEC_DASHBOARD_SUBJECT` ở đây: quyền `reports.execdashboard.*` mới chỉ nằm trong
 * đề xuất BE (plan Bước 1), CHƯA có thật. Khai sớm sẽ tạo cảm giác quyền đã tồn tại. Thêm vào khi
 * BE deploy và `yarn api:generate` thấy chúng.
 */

export const ONE_BILLION = 1_000_000_000

/** Màu cột theo mức hoàn thành chỉ tiêu. Chỉ được hardcode màu trong file hằng số này. */
export const KPI_ACHIEVEMENT_COLORS = {
  target: '#CFD8DC',
  achieved: '#2E7D32',
  close: '#F9A825',
  behind: '#D32F2F',
  unknown: '#B0BEC5',
} as const

/** Pareto: cột doanh thu + đường % lũy kế. Chỉ được hardcode màu trong file hằng số này. */
export const PARETO_COLORS = {
  revenue: '#1E88E5',
  cumulative: '#D32F2F',
} as const

const ONE_MILLION = 1_000_000

/**
 * Rút gọn tiền cho THẺ SỐ: `6.709.759.381` → `6,71 tỷ`.
 *
 * Vì sao cần: 5 thẻ trên một hàng ở 1440px không đủ chỗ cho số 13 chữ số — chữ bị cắt thành
 * "6.709.759.381 V…" (đã thấy tận mắt). Số đầy đủ vẫn còn nguyên trong tooltip của thẻ.
 *
 * Chỉ dùng cho thẻ. Bảng và biểu đồ vẫn in số đầy đủ vì ở đó người ta đối chiếu từng đồng.
 */
export function formatCompactVND(value: number | string | null | undefined): {
  value: string
  unit: string
} {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(num)) return { value: '—', unit: '' }

  const abs = Math.abs(num)
  if (abs >= ONE_BILLION) {
    return {
      value: (num / ONE_BILLION).toLocaleString('vi-VN', { maximumFractionDigits: 2 }),
      unit: 'tỷ',
    }
  }
  if (abs >= ONE_MILLION) {
    return {
      value: (num / ONE_MILLION).toLocaleString('vi-VN', { maximumFractionDigits: 1 }),
      unit: 'triệu',
    }
  }
  return { value: num.toLocaleString('vi-VN', { maximumFractionDigits: 0 }), unit: 'VND' }
}

/** Màu các đường cọc cộng dồn. Chỉ được hardcode màu trong file hằng số này. */
export const DEPOSIT_SERIES_COLORS = [
  '#1E88E5',
  '#D32F2F',
  '#2E7D32',
  '#F9A825',
  '#6A1B9A',
] as const
