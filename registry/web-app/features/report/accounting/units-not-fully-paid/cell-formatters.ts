import type {
  UnitsNotFullyPaidRelease,
  UnitsNotFullyPaidSale,
} from '@/features/accounting/reports/services/report-service'
import { formatPct } from '@/utils/common'
import { formatMonthKeyFromApi } from '@/utils/date-utils'

/** Ký tự nối các lần chi trả trong ô "Tháng đã chi trả". */
const MONTH_PAID_SEPARATOR = ', '

/** Tiền tố mỗi lần chi trả — "HH" là hoa hồng, theo mẫu BA chốt: `HH 02/2026 - 10%`. */
const RELEASE_PREFIX = 'HH'

/** Số chữ số thập phân của mọi tỷ lệ trên màn này — BE trả Decimal 2 chữ số. */
const PCT_DIGITS = 2

/**
 * Tỷ lệ tham gia của một sale, dạng hiển thị (`60%`). Trả `null` khi HĐ cọc không ghi tỷ lệ —
 * gọi `formatPct` thẳng sẽ ra `—`, mà ô Sale cần BIẾT là không có để bỏ hẳn badge đi thay vì
 * hiện một badge rỗng nghĩa.
 */
export function formatParticipationPct(sale: UnitsNotFullyPaidSale): string | null {
  if (sale.participation_pct == null) return null
  return formatPct(sale.participation_pct, PCT_DIGITS)
}

/** Nhãn một lần chi trả: `HH 02/2026 - 10%`. */
export function formatReleaseLabel(release: UnitsNotFullyPaidRelease): string {
  const period = `${RELEASE_PREFIX} ${formatMonthKeyFromApi(release.period)}`
  if (release.pct == null) return period
  return `${period} - ${formatPct(release.pct, PCT_DIGITS)}`
}

/** Ô "Tháng đã chi trả" gộp mọi lần chi trả: `HH 02/2026 - 10%, HH 03/2026 - 20%`. */
export function formatMonthPaidCell(releases: readonly UnitsNotFullyPaidRelease[]): string {
  return releases.map(formatReleaseLabel).join(MONTH_PAID_SEPARATOR)
}
