import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import ReconSheetTotalSummary from '@/features/sales/_shared/reconciliation/ReconSheetTotalSummary'
import {
  sheetAmountToCollect,
  sheetPrepaidAdvanceTotal,
} from '@/features/sales/_shared/reconciliation/sheet-money'
import {
  hasRoundingGap,
  sheetRoundingGap,
} from '@/features/sales/_shared/reconciliation/recon-rounding-gap'

interface Props {
  sheet: InvestorReconciliationSheet
}

/**
 * Tổng kết phiếu đối chiếu (CĐT) — số liệu LẤY TỪ BE (sheet detail): total_amount (NET chưa VAT),
 * total_vat_amount, total_amount_with_vat, requires_adjustment_invoice, amount_to_collect,
 * total_prepaid_advance_amount. FE KHÔNG tự tính — hai số cuối trước đây bị cộng từ các căn, mỗi căn
 * làm tròn riêng nên lệch với dòng tổng (xem `sheet-money.ts`). Render qua
 * {@link ReconSheetTotalSummary} (dùng chung với F2).
 */
function InvestorReconciliationSheetTotal({ sheet }: Props) {
  const totalPrepaid = sheetPrepaidAdvanceTotal(sheet)
  const totalToCollect = sheetAmountToCollect(sheet)
  // Khoảng cách giữa bảng các căn phía trên và khối tổng này — chỉ truyền xuống khi thật sự có.
  const gap = sheetRoundingGap(sheet)

  return (
    <ReconSheetTotalSummary
      net={Number(sheet.total_amount ?? 0)}
      vat={Number(sheet.total_vat_amount ?? 0)}
      withVat={Number(sheet.total_amount_with_vat ?? 0)}
      requiresAdjustmentInvoice={!!sheet.requires_adjustment_invoice}
      sharedBonusPrepaidAmount={totalPrepaid > 0 ? totalPrepaid : undefined}
      amountToCollect={totalToCollect !== 0 ? totalToCollect : undefined}
      roundingGap={hasRoundingGap(gap) ? gap : undefined}
    />
  )
}

export default InvestorReconciliationSheetTotal
