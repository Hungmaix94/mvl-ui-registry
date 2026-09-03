import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { APP_PATH } from '@/routes/AppRoute.constant'
import { formatCurrencyVND, formatPctFloor } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'

import { useDealPaymentProgress } from '../services/commission-splits-service'

import { SubHead } from '@/components/commons/SubHead'
import { TableSkeletonRows } from '@/components/commons/Skeleton'

interface DealPaymentProgressTableProps {
  dealId: number | null | undefined
  /**
   * Mã phiếu thu của các đợt đã bị đóng băng (đã có phiếu chi) — từ `locked_tranches` của
   * split detail. Đánh dấu ngay tại cột "Phiếu thu" để kế toán thấy đợt nào không sửa được
   * nữa mà không phải đối chiếu tay với banner ở Mục ⑥. Rỗng = kỳ chưa chốt phần nào.
   */
  lockedReceiptCodes?: string[]
}

const money = (v: string | number | null | undefined) =>
  v != null && Number(v) !== 0 ? `${formatCurrencyVND(Number(v))} ₫` : '—'

// Percent value only (no progress bar) — the bar wasted horizontal space; the number alone
// is enough now that "Tổng tiền phải thu" proves the % thu HĐ ratio.
// BE trả 10dp ROUND_DOWN; cắt xuống 2dp ở đây (formatPctFloor) là quy tắc DUY NHẤT của màn:
// dòng, lũy kế ở footer, Mục 3 và trần dial cùng đi qua nó nên ra cùng một con số.
const ProgressCell = ({ value }: { value: string | null | undefined }) => {
  if (value == null || value === '') return <span className="text-content-dark-3">—</span>
  return <span className="text-content-dark-2 font-medium">{formatPctFloor(value, 2)}</span>
}

// Lũy kế tính trên số CHƯA làm tròn rồi mới cắt xuống 2dp một lần — mỗi dòng cũng bị cắt
// riêng nên cộng tay từng dòng có thể thiếu tối đa 0,01/dòng. Nói thẳng trong tooltip thay
// vì để kế toán tự phát hiện (đúng câu hỏi đã nhận: "sao 2 dòng ra 69,22 mà lũy kế 69,23").
const CUM_PCT_HINT =
  'Lũy kế tính trên số chưa làm tròn của từng kỳ, cắt xuống 2 chữ số một lần. Mỗi dòng cũng cắt xuống 2 chữ số riêng nên cộng tay từng dòng có thể thấp hơn tối đa 0,01%/dòng. Đây chính là trần của dial "% TT phí / % TT thưởng kỳ này" ở Mục 3.'

// BE trả thêm invoice_code (mã nội bộ, luôn có) + invoice_status kể từ 2026-07-29.
// Chưa deploy nên schema.ts sinh tự động chưa có 2 field này — cast hẹp tại đây thay vì
// regen schema từ dump local (xem docs/ai/reference.md). GỠ cast sau khi `yarn api:update:local`.
type PeriodInvoiceMeta = { invoice_code?: string | null; invoice_status?: string | null }
const invoiceMeta = (p: unknown): PeriodInvoiceMeta => p as PeriodInvoiceMeta

// PENDING là alias legacy của DRAFT (accounting/constants.py) — phải gộp chung, nếu không
// hóa đơn legacy rơi vào nhánh mặc định và mất badge.
const isDraftInvoice = (status: string | null | undefined) =>
  status === 'DRAFT' || status === 'PENDING'

const StatusChip = ({
  tone,
  label,
  title,
}: {
  tone: 'muted' | 'warn'
  label: string
  title: string
}) => (
  <span
    title={title}
    className={
      tone === 'warn'
        ? 'mt-0.5 inline-block text-[10.5px] font-medium text-amber-700'
        : 'text-content-dark-3 mt-0.5 inline-block text-[10.5px] font-medium'
    }
  >
    {label}
  </span>
)

/**
 * Section 2 — investor cash-payment flow of the unit, one row per IR reconciliation
 * period. THU side (GET /api/sales/deals/{deal_id}/payment-progress/). Fee and bonus each
 * carry their OWN collection progress (fee/bonus recognition × cash_ratio) so the two
 * tracks can diverge. Amount columns show the committed fee/bonus per period; the footer
 * shows the whole-unit committed totals (thành tiền cả căn).
 */
export const DealPaymentProgressTable = ({
  dealId,
  lockedReceiptCodes = [],
}: DealPaymentProgressTableProps) => {
  const { data, isLoading } = useDealPaymentProgress(dealId, { enabled: !!dealId })
  const lockedCodes = useMemo(() => new Set(lockedReceiptCodes), [lockedReceiptCodes])

  const periods = data?.periods ?? []
  const summary = data?.summary
  const unassigned = Number(data?.unassigned_received || 0)

  // "Thành tiền nhận về" split: fee side (agency fee + extra fee − deduction) vs bonus
  // (shared_bonus). fee + bonus == total_due.
  const dueBreakdown = summary?.total_due_breakdown
  const feeReceivable = dueBreakdown
    ? Number(dueBreakdown.agency_fee || 0) +
      Number(dueBreakdown.extra_bonus || 0) -
      Number(dueBreakdown.fee_deduction || 0)
    : 0
  const bonusReceivable = dueBreakdown ? Number(dueBreakdown.shared_bonus || 0) : 0

  // "Lũy kế toàn căn" whole-unit collected (ĐÃ THU) totals: sum the per-period cash-collected
  // fee/bonus the BE already computes (received_fee/received_bonus = committed × cash_ratio),
  // instead of the committed totals — so the footer reflects money actually collected.
  const collectedFee = useMemo(
    () => periods.reduce((s, p) => s + Number(p.received_fee || 0), 0),
    [periods]
  )
  const collectedBonus = useMemo(
    () => periods.reduce((s, p) => s + Number(p.received_bonus || 0), 0),
    [periods]
  )

  // "Kỳ thanh toán" (receipt-voucher commission period) — the grouping the timeline uses.
  // The API returns rows in reconciliation order, so IR rows of the same payment period can
  // be non-adjacent. Reorder so same-period rows sit together (period groups ordered by
  // first appearance, reconciliation order preserved within each) — otherwise the rowSpan
  // merge below only catches adjacent rows and the same period renders as two cells.
  // Rows with no posted receipt yet (payment_period null) each stay standalone.
  const orderedPeriods = useMemo(() => {
    const keyOf = (p: (typeof periods)[number]) =>
      p.payment_period ? `${p.payment_period.year}-${p.payment_period.month}` : `__null_${p.ir_id}`
    const order: string[] = []
    const groups = new Map<string, typeof periods>()
    for (const p of periods) {
      const k = keyOf(p)
      if (!groups.has(k)) {
        groups.set(k, [])
        order.push(k)
      }
      groups.get(k)!.push(p)
    }
    return order.flatMap((k) => groups.get(k)!)
  }, [periods])

  // Adjacent IR rows sharing a payment period merge into one "Kỳ thanh toán" cell (rowSpan);
  // an IR row with no posted receipt yet (payment_period null) shows a standalone label.
  const periodCells = useMemo(() => {
    const keyOf = (p: (typeof orderedPeriods)[number]) =>
      p.payment_period ? `${p.payment_period.year}-${p.payment_period.month}` : null
    const cells = orderedPeriods.map(() => ({
      render: true,
      rowSpan: 1,
      label: null as string | null,
    }))
    let i = 0
    while (i < orderedPeriods.length) {
      const key = keyOf(orderedPeriods[i])
      if (!key) {
        i++
        continue
      }
      let j = i + 1
      while (j < orderedPeriods.length && keyOf(orderedPeriods[j]) === key) j++
      const pp = orderedPeriods[i].payment_period!
      cells[i] = {
        render: true,
        rowSpan: j - i,
        label: `Kỳ ${String(pp.month).padStart(2, '0')}/${pp.year}`,
      }
      for (let k = i + 1; k < j; k++) cells[k] = { render: false, rowSpan: 0, label: null }
      i = j
    }
    return cells
  }, [orderedPeriods])

  return (
    <div className="border-border-1 overflow-hidden rounded-md border bg-white">
      <SubHead
        n="2"
        title="Phí đại lý & Thưởng từ CĐT — tiến độ thu theo kỳ"
        subtitle="Mỗi kỳ đối chiếu: phí và thưởng có tiến độ thu RIÊNG (cam kết → tiền mặt thực thu), lũy kế đến hiện tại"
        right={
          <span className="text-content-dark-3 flex flex-col items-end text-[12px]">
            <span title="Giá trị NET (chưa gồm VAT) toàn căn — phí đại lý + thưởng thêm + thưởng chia − giảm trừ.">
              Tổng phí và thưởng phải thu từ CĐT (Thành tiền nhận về) — NET:{' '}
              <span className="text-content-dark-1 text-[13px] font-bold">
                {money(summary?.total_due)}
              </span>
            </span>
            {summary && (
              <span className="text-[11px]">
                Phí:{' '}
                <span className="text-content-dark-2 font-semibold">{money(feeReceivable)}</span> ·
                Thưởng:{' '}
                <span className="text-content-dark-2 font-semibold">{money(bonusReceivable)}</span>
              </span>
            )}
          </span>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px] [&_td]:align-middle [&_th]:align-middle">
          <thead>
            <tr className="border-border-1 bg-background-2 text-content-dark-3 border-b">
              <th className="w-[130px] px-4 py-3 font-medium">Kỳ thanh toán</th>
              <th className="px-4 py-3 font-medium">Kỳ đối chiếu</th>
              <th className="w-[130px] px-4 py-3 font-medium">Số HĐ</th>
              <th className="w-[150px] px-4 py-3 font-medium">Phiếu thu</th>
              <th className="w-[150px] px-4 py-3 text-right font-medium">Số tiền phân bổ</th>
              <th
                className="w-[160px] px-4 py-3 text-right font-medium"
                title="Tổng tiền CĐT phải thu của kỳ này (giá trị hóa đơn gồm VAT) — mẫu số của % thu HĐ."
              >
                Tổng tiền phải thu
              </th>
              <th
                className="w-[120px] px-4 py-3 text-right font-medium"
                title="Tỷ lệ tiền CĐT đã thực thu của hóa đơn kỳ này (Σ đã thu / Σ giá trị HĐ gồm VAT). Đây là hệ số nhân ra % TT phí và % TT thưởng của kỳ."
              >
                % thu HĐ
              </th>
              <th className="w-[120px] px-4 py-3 text-right font-medium">% TT phí</th>
              <th className="w-[160px] px-4 py-3 text-right font-medium">Phí đại lý</th>
              <th className="w-[120px] px-4 py-3 text-right font-medium">% TT thưởng</th>
              <th className="w-[150px] px-4 py-3 text-right font-medium">Thưởng từ CĐT</th>
            </tr>
          </thead>
          <tbody className="divide-border-1 divide-y">
            {/* Khung xương thay cho dòng chữ "Đang tải…": giữ đúng chiều cao và bố cục cột
                nên bảng không giật một nhịp khi dữ liệu về. */}
            {isLoading && <TableSkeletonRows rows={3} cols={11} />}

            {!isLoading && periods.length === 0 && (
              <tr>
                <td colSpan={11} className="text-content-dark-3 px-4 py-6 text-center">
                  Chưa có kỳ đối chiếu nào cho căn này.
                </td>
              </tr>
            )}

            {!isLoading &&
              orderedPeriods.map((p, idx) => {
                const pc = periodCells[idx]
                return (
                  <tr key={p.ir_id}>
                    {pc.render && (
                      <td
                        rowSpan={pc.rowSpan}
                        className="border-border-1 text-content-dark-1 border-r px-4 py-3 align-middle font-semibold"
                      >
                        {pc.label || <span className="text-content-dark-4">—</span>}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {p.sheet_id != null ? (
                        <Link
                          to={APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(
                            ':id',
                            String(p.sheet_id)
                          )}
                          className="text-action-primary-red-default font-semibold underline decoration-1 underline-offset-2 hover:decoration-2"
                          title="Mở chi tiết đối chiếu CĐT của kỳ này"
                        >
                          {p.ref_code || `IR ${p.ir_id}`}
                        </Link>
                      ) : (
                        <span className="text-content-dark-2 font-semibold">
                          {p.ref_code || `IR ${p.ir_id}`}
                        </span>
                      )}
                      {p.date && (
                        <div className="text-content-dark-3 mt-0.5 text-[11px]">
                          {formatDate(p.date)}
                        </div>
                      )}
                    </td>
                    <td className="text-content-dark-2 px-4 py-3 tabular-nums">
                      {p.invoice_id != null ? (
                        <div className="flex flex-col items-start">
                          <Link
                            to={APP_PATH.SALES_INVOICE_DETAIL.replace(':id', String(p.invoice_id))}
                            className="text-content-dark-2 hover:text-action-primary-red-default underline decoration-transparent decoration-1 underline-offset-2 transition-colors hover:decoration-current"
                            title="Mở chi tiết hóa đơn"
                          >
                            {p.invoice_no || invoiceMeta(p).invoice_code || `HĐ ${p.invoice_id}`}
                          </Link>
                          {isDraftInvoice(invoiceMeta(p).invoice_status) && (
                            <StatusChip
                              tone="muted"
                              label="Hóa đơn nháp"
                              title="Hóa đơn chưa phát hành nên chưa có số hóa đơn ngoài — đang hiển thị mã nội bộ. Kỳ này chưa thể thu tiền."
                            />
                          )}
                          {invoiceMeta(p).invoice_status === 'ADJUSTED' && (
                            <StatusChip
                              tone="muted"
                              label="Đã thay thế"
                              title="Hóa đơn này đã bị thay thế bởi hóa đơn kế nhiệm."
                            />
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-content-dark-2 px-4 py-3">
                      {p.vouchers && p.vouchers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {p.vouchers.map((v) => {
                            const isLocked = lockedCodes.has(v.code ?? '')
                            return (
                              <span key={v.voucher_id} className="inline-flex items-baseline gap-1">
                                {isLocked && (
                                  <span
                                    aria-label="Đợt đã chốt"
                                    title="Đợt tiền về này đã có phiếu chi — phần chia của nó không sửa được nữa."
                                  >
                                    🔒
                                  </span>
                                )}
                                <Link
                                  to={APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(
                                    ':id',
                                    String(v.voucher_id)
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={
                                    isLocked
                                      ? 'font-semibold text-amber-700 underline decoration-1 underline-offset-2 hover:decoration-2'
                                      : 'text-content-dark-2 hover:text-action-primary-red-default underline decoration-transparent decoration-1 underline-offset-2 transition-colors hover:decoration-current'
                                  }
                                  title="Mở phiếu thu (tab mới)"
                                >
                                  {v.code}
                                </Link>
                              </span>
                            )
                          })}
                        </div>
                      ) : p.invoice_id != null && !isDraftInvoice(invoiceMeta(p).invoice_status) ? (
                        /* Đã phát hành mà chưa có phiếu thu — nói rõ lý do kỳ này chưa ra tiền,
                           thay vì để "—" trơn khiến người dùng tưởng thiếu dữ liệu. Hóa đơn còn
                           nháp thì đã có badge riêng ở cột Số HĐ, không lặp lại ở đây. */
                        <StatusChip
                          tone="warn"
                          label="Chưa có phiếu thu"
                          title="Hóa đơn đã phát hành nhưng chưa có phiếu thu nào phân bổ tiền vào kỳ này."
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* Số tiền phân bổ — số tiền mỗi phiếu thu phân bổ cho căn/kỳ này, canh
                        thẳng hàng với mã phiếu ở cột "Phiếu thu". */}
                    <td className="text-content-dark-1 px-4 py-3 text-right whitespace-nowrap">
                      {p.vouchers && p.vouchers.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {p.vouchers.map((v) => (
                            <span key={v.voucher_id} className="font-medium">
                              {money(v.amount)}
                            </span>
                          ))}
                          {(() => {
                            const netSum =
                              Number(p.received_fee || 0) + Number(p.received_bonus || 0)
                            return netSum > 0 ? (
                              <span className="text-content-dark-3 text-[11px] font-normal">
                                NET: {formatCurrencyVND(netSum)} ₫
                              </span>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* Tổng tiền phải thu — mẫu số của % thu HĐ (giá trị HĐ gồm VAT của kỳ). */}
                    <td className="text-content-dark-2 px-4 py-3 text-right font-medium whitespace-nowrap">
                      {money(p.invoice_gross)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      title="Tỷ lệ tiền thu được của hóa đơn kỳ này — hệ số nhân ra % TT phí và % TT thưởng của kỳ."
                    >
                      <ProgressCell value={p.investor_paid_pct} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProgressCell value={p.fee_collection_pct} />
                      {/* Nối 2 track: % TT phí là cam kết CĐT (chưa trừ giảm trừ); dòng phụ chỉ
                          rõ khoản giảm trừ để lần được sang % phân bổ phí của worksheet. */}
                      {Number(p.due?.deduction || 0) > 0 && (
                        <div
                          className="text-data-red-default mt-0.5 text-[10.5px]"
                          title="CĐT khấu trừ phí kỳ này — số theo mặt khai trên sheet đối chiếu (có thể đã gồm VAT). Tổng phải thu của căn giảm tương ứng; % phân bổ phí của worksheet tính trên phần chưa-VAT của khoản này."
                        >
                          Giảm trừ: −{money(p.due?.deduction)}
                        </div>
                      )}
                    </td>
                    <td
                      className="text-content-dark-1 px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums"
                      title="Phí đại lý CĐT cam kết trả kỳ này — ĐÃ gồm điều chỉnh truy hồi, CHƯA trừ giảm trừ (giảm trừ hiện ở dòng đỏ cột % TT phí)."
                    >
                      {money(p.due?.agency_fee)}
                      {/* Truy hồi đã nằm trong số phí ở trên; hiện riêng để lần được vì sao phí
                          kỳ này khác "tiến độ × đơn giá" — đổi giá giữa chừng ghi bù vào đây. */}
                      {Number(p.due?.retro || 0) !== 0 && (
                        <div
                          className={
                            Number(p.due?.retro) < 0
                              ? 'text-data-red-default mt-0.5 text-[10.5px] font-normal tabular-nums'
                              : 'text-data-green-default mt-0.5 text-[10.5px] font-normal tabular-nums'
                          }
                          title="Điều chỉnh truy hồi của kỳ này (đổi đơn giá/tỷ lệ phí áp cho phần tiến độ đã chốt ở các kỳ trước). Đã được cộng vào số phí phía trên."
                        >
                          Truy hồi: {Number(p.due?.retro) > 0 ? '+' : '−'}
                          {money(Math.abs(Number(p.due?.retro)))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProgressCell value={p.bonus_collection_pct} />
                    </td>
                    <td className="text-content-dark-1 px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {money(p.due?.bonus)}
                    </td>
                  </tr>
                )
              })}
          </tbody>

          {!isLoading && summary && periods.length > 0 && (
            <tfoot>
              {/* Dòng tổng: dải XÁM ĐẬM + gạch trên dày, KHÔNG dùng nền xanh lá nữa — xanh lá
                  trong bảng này đã mang nghĩa "tiền đã thu", tô cả dòng thành xanh là dòng tổng
                  tranh nghĩa với chính các con số nằm trong nó. */}
              <tr className="border-border-1 bg-background-3 text-content-dark-1 border-t-2 font-bold">
                {/* Gộp 4 cột đầu làm một: nhãn vốn nằm ở cột "Kỳ đối chiếu" hẹp nên bị bẻ thành
                    ba dòng co quắp. Bốn cột này (kỳ thanh toán / kỳ đối chiếu / số HĐ / phiếu
                    thu) đều không cộng dồn nên gộp không mất thông tin nào. */}
                <td
                  colSpan={4}
                  className="text-content-dark-1 px-4 py-3 tracking-wide whitespace-nowrap uppercase"
                >
                  Lũy kế toàn căn
                </td>
                {/* Tổng số tiền phân bổ ĐÃ THU của cả căn (Σ theo kỳ). */}
                <td className="text-data-green-default px-4 py-3 text-right text-[15px] font-extrabold whitespace-nowrap">
                  <div>{money(summary.total_received)}</div>
                  {(() => {
                    const totalReceivedNet =
                      Number(summary.total_due || 0) - Number(summary.remaining || 0)
                    return totalReceivedNet > 0 ? (
                      <div className="text-content-dark-3 mt-0.5 text-[11px] font-normal">
                        NET: {formatCurrencyVND(totalReceivedNet)} ₫
                      </div>
                    ) : null
                  })()}
                </td>
                {/* Tổng tiền phải thu + % thu HĐ là hệ số theo từng kỳ, không cộng dồn cả căn. */}
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right" title={CUM_PCT_HINT}>
                  {/* Lũy kế % TT phí đã thu — trần cho dial "% TT phí kỳ này" ở Mục 3. */}
                  {formatPctFloor(
                    summary.fee_collection_cum_pct ?? summary.payment_progress_pct,
                    2
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Tổng tiền phí đại lý ĐÃ THU của cả căn (Σ received_fee theo kỳ). */}
                  {money(collectedFee)}
                </td>
                <td className="px-4 py-3 text-right" title={CUM_PCT_HINT}>
                  {/* Lũy kế % TT thưởng đã thu — trần cho dial "% TT thưởng kỳ này" ở Mục 3. */}
                  {formatPctFloor(summary.bonus_collection_cum_pct, 2)}
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Tổng tiền thưởng ĐÃ THANH TOÁN của cả căn (Σ received_bonus theo kỳ). */}
                  {money(collectedBonus)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {unassigned > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-700">
          Còn <b>{formatCurrencyVND(unassigned)} ₫</b> đã thu nhưng chưa gắn được kỳ đối chiếu (dòng
          hóa đơn cũ chưa liên kết IR) — chưa tính vào cột lũy kế theo kỳ.
        </div>
      )}
    </div>
  )
}
