import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'
import { IconWarning } from '@/assets/icons'

import { amountToVietnameseWords } from '@/features/sales/_shared/reconciliation/recon-amount-to-words'
import type { ReconTaxMode } from '@/features/sales/_shared/reconciliation/recon-kind'

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatCurrencyVND(Math.abs(value), { maximumFractionDigits: 0 })} đ`
}

function amountWords(value: number): string {
  const words = amountToVietnameseWords(value)
  if (value >= 0) return words
  return `Âm ${words.charAt(0).toLowerCase()}${words.slice(1)}`
}

export interface ReconSheetTotalSummaryProps {
  /** Tổng trước thuế: VAT ⇒ NET chưa VAT (`total_amount`); PIT ⇒ tổng trước thuế TNCN (`total_amount`). */
  net: number
  /** Tiền thuế: VAT ⇒ `total_vat_amount`; PIT ⇒ thuế TNCN `total_pit_amount`. */
  vat: number
  /** Tổng sau thuế: VAT ⇒ gồm VAT (`total_amount_with_vat`); PIT ⇒ sau thuế TNCN (`total_amount_after_pit`). */
  withVat: number
  /**
   * Mô hình thuế của phiếu. `vat` (CĐT/F2 — mặc định): nhãn "Cộng (chưa VAT) / VAT / Tổng (gồm VAT)".
   * `pit` (CTV): nhãn "Cộng (trước thuế) / Thuế TNCN / Tổng (sau thuế)".
   */
  taxMode?: ReconTaxMode
  /** Phiếu âm cần xuất HĐ điều chỉnh giảm (BE `requires_adjustment_invoice`). Mặc định false. */
  requiresAdjustmentInvoice?: boolean
  sharedBonusPrepaidAmount?: number
  amountToCollect?: number
  /**
   * Khe hở làm tròn cấp phiếu (BE `rounding_gap`) — `tổng phiếu − Σ các căn`, theo TỪNG trục.
   * Bỏ trống thì không dòng nào hiện; F2 và CTV dùng chung component này và không truyền, nên
   * hành vi của hai màn đó không đổi.
   */
  roundingGap?: { net: number; vat: number; withVat: number }
}

/** Một dòng cộng trong khối tổng kiểu hoá đơn: nhãn trái, số phải (tabular, canh phải). */
function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="typo-body-base text-content-dark-2">{label}</span>
      <span className="typo-body-base-medium text-content-dark-1">{value}</span>
    </div>
  )
}

const ROUNDING_GAP_HINT =
  'Chênh lệch giữa tổng của phiếu (cộng chính xác rồi làm tròn một lần, đúng cách CĐT cộng bảng kê) ' +
  'và tổng cộng dồn từng căn đã làm tròn. Thuộc về chứng từ, không thuộc căn nào.'

/**
 * Chú thích khe hở đặt ngay dưới số của CHÍNH trục lệch — không phải một câu chung ở chân khối.
 * Có phiếu mà dòng tổng khớp hoàn hảo còn hai dòng trên nó lệch ngược chiều nhau
 * (TVVL-IRS0019), và một câu ở chân khối không chỉ được vào đúng chỗ sai.
 */
function GapNote({ gap }: { gap: number }) {
  if (gap === 0) return null
  return (
    <p
      className="typo-body-sm-regular text-content-dark-3 text-right leading-snug"
      title={ROUNDING_GAP_HINT}
    >
      {`gồm ${signedMoney(gap)} chênh lệch làm tròn`}
    </p>
  )
}

/**
 * "Tổng kết phiếu đối chiếu" — số liệu LẤY TỪ BE (sheet detail): NET chưa VAT + VAT + Tổng gồm VAT.
 * FE KHÔNG tự tính. Dùng chung cho CĐT (InvestorReconciliationSheetTotal) và F2 — cả hai map thẳng
 * `total_amount` / `total_vat_amount` / `total_amount_with_vat` của sheet vào đây.
 *
 * Trình bày kiểu CHÂN HOÁ ĐƠN (canh phải): Cộng (chưa VAT) + VAT, gạch một nét rồi ra "Tổng (gồm
 * VAT)" in đậm; "bằng chữ" đặt ngay dưới chính số tổng đó.
 */
function ReconSheetTotalSummary({
  net,
  vat,
  withVat,
  taxMode = 'vat',
  requiresAdjustmentInvoice,
  sharedBonusPrepaidAmount,
  amountToCollect,
  roundingGap,
}: ReconSheetTotalSummaryProps) {
  const isNegative = withVat < 0
  const isPit = taxMode === 'pit'
  const subtotalLabel = isPit ? 'Cộng (trước thuế)' : 'Cộng (chưa VAT)'
  const taxLabel = isPit ? 'Thuế TNCN' : 'VAT'
  const totalLabel = isPit ? 'Tổng (sau thuế)' : 'Tổng (gồm VAT)'

  return (
    <div className="bg-background-1">
      <h3 className="text-content-dark-1 mb-4 text-lg font-semibold">Tổng kết phiếu đối chiếu</h3>

      <div className="border-border-1 overflow-hidden rounded-xl border">
        <div className="px-6 py-5">
          {/* Khối tổng canh phải kiểu chân hoá đơn. */}
          <div className="ml-auto flex w-full max-w-[26rem] flex-col gap-2.5">
            <LedgerRow label={subtotalLabel} value={signedMoney(net)} />
            {roundingGap && <GapNote gap={roundingGap.net} />}
            <LedgerRow label={taxLabel} value={signedMoney(vat)} />
            {roundingGap && <GapNote gap={roundingGap.vat} />}

            {/* Nét cộng trước dòng tổng. */}
            <div className="border-content-dark-3 border-t" />

            <div className="flex items-baseline justify-between gap-6">
              <span className="typo-body-base-semibold text-content-dark-1">{totalLabel}</span>
              <span
                className={cn(
                  'text-xl font-bold tracking-tight',
                  isNegative ? 'text-semantic-danger-default' : 'text-data-green-default'
                )}
              >
                {signedMoney(withVat)}
              </span>
            </div>
            {roundingGap && <GapNote gap={roundingGap.withVat} />}

            {sharedBonusPrepaidAmount !== undefined && sharedBonusPrepaidAmount > 0 && (
              <LedgerRow
                label="Đã trích quỹ tạm ứng (đối trừ ở phiếu thu)"
                value={money(sharedBonusPrepaidAmount)}
              />
            )}

            {amountToCollect !== undefined && (
              <>
                <div className="border-content-dark-3 border-t border-dashed" />
                <div className="flex items-baseline justify-between gap-6">
                  <span className="typo-body-base-semibold text-content-dark-1">Còn phải thu</span>
                  <span
                    className={cn(
                      'text-xl font-bold tracking-tight',
                      amountToCollect < 0
                        ? 'text-semantic-danger-default'
                        : 'text-data-green-default'
                    )}
                  >
                    {signedMoney(amountToCollect)}
                  </span>
                </div>
              </>
            )}

            {/* Bằng chữ — ngay dưới số tổng, canh phải để nằm dưới chính con số. */}
            <p className="typo-body-sm-regular text-content-dark-3 text-right leading-snug italic">
              {amountWords(amountToCollect !== undefined ? amountToCollect : withVat)}
            </p>
          </div>
        </div>

        {requiresAdjustmentInvoice && (
          <div className="bg-data-orange-disabled text-data-orange-hover border-border-1 flex items-start gap-2 border-t px-6 py-3">
            <IconWarning size={15} className="mt-0.5 shrink-0" />
            <span className="typo-body-sm-regular">
              Tổng phiếu âm — cần xuất hoá đơn điều chỉnh giảm.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReconSheetTotalSummary
