import type { ReactNode } from 'react'
import { Flex } from '@radix-ui/themes'

import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import { sheetAmountToCollect } from '@/features/sales/_shared/reconciliation/sheet-money'
import { sheetRoundingGap } from '@/features/sales/_shared/reconciliation/recon-rounding-gap'
import { vnd } from '@/features/sales/investor-reconciliations-v2/utils/recon-v2-format'

export interface TotalRowProps {
  label: ReactNode
  value: ReactNode
  highlighted?: boolean
}

/** Flat label/value row (nhãn hẹp trái, giá trị rộng phải) — dùng chung cho tổng kết cấp phiếu
 * ({@link InvestorReconciliationSheetTotalV2}) và cấp căn (`InvestorReconciliationUnitLedger`). */
export function TotalRow({ label, value, highlighted }: TotalRowProps) {
  return (
    <div className={cn('flex', highlighted && 'bg-data-red-disabled')}>
      <div className={cn('w-[280px] shrink-0 px-4 py-4', !highlighted && 'bg-background-2')}>
        <span
          className={cn(
            'typo-body-base-medium text-content-dark-2',
            highlighted && 'typo-body-base-semibold text-content-dark-1'
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 px-4 py-4 text-right">
        <span
          className={cn(
            'typo-body-base-medium text-content-dark-1',
            highlighted && 'typo-body-base-semibold text-action-primary-red-default'
          )}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

const ROUNDING_GAP_HINT =
  'Chênh lệch giữa tổng của phiếu (cộng chính xác rồi làm tròn một lần, đúng cách CĐT cộng bảng kê) ' +
  'và tổng cộng dồn từng căn đã làm tròn. Thuộc về chứng từ, không thuộc căn nào.'

/**
 * Số tổng, kèm chú thích khe hở làm tròn của CHÍNH trục đó khi khác 0.
 *
 * Đặt ngay tại dòng lệch chứ không phải một câu chung ở chân bảng: có phiếu mà dòng "Tổng tiền
 * (Gồm VAT)" khớp hoàn hảo còn hai dòng trên nó mỗi dòng lệch 1đ ngược chiều (TVVL-IRS0019) —
 * một câu ở chân bảng không chỉ được vào đúng chỗ sai.
 *
 * Dấu `+` / `−` (KHÔNG dùng ngoặc đơn cho số âm — dễ đọc nhầm thành ghi chú), và không nhắc tới
 * "1đ" ở bất kỳ đâu: khe hở có thể lên tới N/2 đồng.
 */
function ValueWithGap({ value, gap }: { value: string; gap: number }) {
  if (gap === 0) return <>{value}</>
  const sign = gap > 0 ? '+' : '−'
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span>{value}</span>
      <span className="typo-body-sm-regular text-content-dark-3" title={ROUNDING_GAP_HINT}>
        {`gồm ${sign}${formatCurrencyVND(Math.abs(gap), { maximumFractionDigits: 0 })} đ chênh lệch làm tròn`}
      </span>
    </span>
  )
}

interface Props {
  sheet: InvestorReconciliationSheet
}

/**
 * "Tổng kết phiếu đối chiếu" (2.0) — số liệu LẤY TỪ BE giống hệt InvestorReconciliationSheetTotal,
 * chỉ khác trình bày: bảng 2 cột nhãn/giá trị theo mockup 2.0 thay vì khối "chân hoá đơn" của v1
 * (ReconSheetTotalSummary).
 *
 * Cả BỐN dòng đều là số của BE. Trước đây dòng "TIỀN PHẢI THU CĐT" được FE cộng `amount_to_collect`
 * của từng căn, mà mỗi căn làm tròn riêng — nên nó lệch 1đ với dòng "Tổng tiền (Gồm VAT)" ngay trên
 * nó (phiếu CSTN-IRS0024: 2.349.453.649 vs 2.349.453.648). Xem `sheet-money.ts`.
 */
function InvestorReconciliationSheetTotalV2({ sheet }: Props) {
  const net = Number(sheet.total_amount ?? 0)
  const vat = Number(sheet.total_vat_amount ?? 0)
  const withVat = Number(sheet.total_amount_with_vat ?? 0)
  const amountToCollect = sheetAmountToCollect(sheet)
  // Khoảng cách giữa bảng các căn phía trên và khối này. Cộng vào từng trục thì ra đúng số ở đây.
  const gap = sheetRoundingGap(sheet)

  const vatRates = sheet.vat_rates ?? []
  const vatLabel = vatRates.length === 1 ? `VAT ${formatPercent(Number(vatRates[0]))}` : 'VAT'

  return (
    <Flex direction="column" gap="3">
      <span className="typo-body-xl-semibold text-content-dark-1">Tổng kết phiếu đối chiếu</span>
      <div className="border-border-1 divide-border-1 divide-y overflow-hidden rounded-md border">
        <TotalRow
          label="Tổng tiền (Chưa gồm VAT)"
          value={<ValueWithGap value={vnd(net)} gap={gap.net} />}
        />
        <TotalRow label={vatLabel} value={<ValueWithGap value={vnd(vat)} gap={gap.vat} />} />
        <TotalRow
          label="Tổng tiền (Gồm VAT)"
          value={<ValueWithGap value={vnd(withVat)} gap={gap.withVat} />}
        />
        <TotalRow label="TIỀN PHẢI THU CĐT" value={vnd(amountToCollect)} highlighted />
      </div>
    </Flex>
  )
}

export default InvestorReconciliationSheetTotalV2
