import { Flex } from '@radix-ui/themes'

import { IconWarning } from '@/assets/icons'
import { cn } from '@/utils'
import {
  formatReconCheckDelta,
  formatReconCheckValue,
  type ReconCheckMismatch,
} from '@/features/sales/_shared/reconciliation/recon-server-check'

export interface ReconMismatchListProps {
  mismatches: ReconCheckMismatch[]
  /** Nhãn khối. Mặc định hợp cho chỗ đọc thụ động; dialog xác nhận truyền câu khác. */
  title?: string
  className?: string
}

/**
 * Khối liệt kê các field Lệch so với MV đang ghi nhận (`recon_check` của BE) — mỗi field một dòng
 * "CDT ghi nhận / MV ghi nhận / Lệch" đã format theo đơn vị của chính field đó.
 *
 * Vì sao tồn tại: badge "N Cảnh báo" trên header căn đếm `reconCheckMismatches()`, tức MỌI field
 * trong `RECON_PRIMARY_FIELDS` — trong đó có 3 cờ VAT mà bảng ledger KHÔNG có dòng nào để gắn chip
 * (cờ VAT ở đó chỉ là nhãn "(Gồm VAT)"). Hậu quả đã gặp: badge "2 Cảnh báo" nhưng mở rộng chỉ thấy 1
 * (phiếu DAVTT-IRS1535, căn GN10001). Khối này là bề mặt phủ đủ tập field đó, giữ bất biến
 * "mọi cảnh báo badge đếm đều đọc được" — guard ở `ReconMismatchList.test.tsx`.
 *
 * Thuần hiển thị: KHÔNG tự so sánh/tính lại, chỉ đọc mismatch do `reconCheckMismatches()` lọc ra.
 */
function ReconMismatchList({
  mismatches,
  title = 'Lệch so với MV đang ghi nhận',
  className,
}: ReconMismatchListProps) {
  if (mismatches.length === 0) return null

  return (
    <Flex
      direction="column"
      gap="2"
      className={cn('bg-data-orange-disabled rounded-md px-3 py-2.5', className)}
    >
      <span className="typo-body-sm-semibold text-data-orange-hover flex items-center gap-1">
        <IconWarning size={14} />
        {title} ({mismatches.length})
      </span>
      <div className="flex flex-col gap-2">
        {mismatches.map((m) => {
          const deltaLabel = formatReconCheckDelta(m.field, m.delta)
          return (
            <div
              key={m.field}
              data-testid="recon-mismatch-item"
              className="border-data-orange-default flex flex-col gap-1 border-l-2 pl-2"
            >
              <span className="typo-body-sm-medium text-content-dark-1">{m.label}</span>
              <Flex align="center" gap="2" wrap="wrap" className="typo-body-xs-regular">
                <span className="text-content-dark-3">
                  CDT ghi nhận{' '}
                  <b className="text-content-dark-1">
                    {formatReconCheckValue(m.field, m.submitted)}
                  </b>
                </span>
                <span className="text-content-dark-4">·</span>
                <span className="text-content-dark-3">
                  MV ghi nhận{' '}
                  <b className="text-content-dark-1">
                    {formatReconCheckValue(m.field, m.mv_config)}
                  </b>
                </span>
                {deltaLabel && (
                  <span className="border-data-orange-default text-data-orange-hover bg-background-1 typo-body-xs-semibold rounded-full border px-2 py-0.5">
                    Lệch {deltaLabel}
                  </span>
                )}
              </Flex>
            </div>
          )
        })}
      </div>
    </Flex>
  )
}

export default ReconMismatchList
