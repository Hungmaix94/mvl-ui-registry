import { Chip } from '@/components/ui'
import { cn, formatCurrencyVND } from '@/utils'
import {
  useDirectorCommissionLedger,
  type DirectorCommissionLedgerRow,
} from '@/features/accounting/director-commissions/services/director-commission-service'
import { ColoredValueVariant } from '@/api/schema'

type DirectorCommissionLedgerTableProps = {
  id: number
}

const HEAD_CELL = 'px-4 py-3 text-xs font-semibold text-content-dark-2 uppercase tracking-wide'
const BODY_CELL = 'px-4 py-3 text-sm text-content-dark-1 align-middle'

function periodLabel(month?: number, year?: number): string {
  if (!month || !year) return '—'
  return `${String(month).padStart(2, '0')}/${year}`
}

/** True when this row's payout rate diverges from what it was actually entitled to. */
function pctDiffers(row: DirectorCommissionLedgerRow): boolean {
  return Number(row.pct_payout ?? 0) !== Number(row.pct_entitled ?? 0)
}

export default function DirectorCommissionLedgerTable({ id }: DirectorCommissionLedgerTableProps) {
  const { data, isLoading } = useDirectorCommissionLedger(id, { enabled: !!id })
  const rows = data?.results ?? []

  return (
    <div className="border-border-1 flex flex-col rounded-lg border bg-white">
      <div className="border-border-1 border-b px-6 py-4">
        <h3 className="text-content-dark-1 text-lg font-semibold">Sổ đối chiếu lũy kế</h3>
        <span className="text-content-dark-3 text-xs">
          Chạy số dư qua từng kỳ: được hưởng lũy kế, đã chi và số dư còn lại.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-border-1 border-b">
              <th className={cn(HEAD_CELL, 'text-left')}>Kỳ</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Tiền về kỳ</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Lũy kế</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Mức %</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Được hưởng LK</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Đã chi đầu kỳ</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Chi / (Đòi lại)</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Đã chi cuối kỳ</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Số dư</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                  Chưa có kỳ nào trong sổ đối chiếu.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const payout = Number(r.payout_amount ?? 0)
                const paidBefore = Number(r.paid_before ?? 0)
                const paidAfter = paidBefore + payout
                return (
                  <tr key={r.doc_id} className="border-border-1 border-b">
                    <td className={cn(BODY_CELL, 'font-medium')}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{periodLabel(r.month, r.year)}</span>
                        {payout < 0 ? (
                          <Chip variant={ColoredValueVariant.ORANGE} label="Đòi lại" size="small" />
                        ) : null}
                      </div>
                    </td>
                    <td className={cn(BODY_CELL, 'text-right')}>
                      {formatCurrencyVND(Number(r.receipt_in_period ?? 0))}
                    </td>
                    <td className={cn(BODY_CELL, 'text-right')}>
                      {formatCurrencyVND(Number(r.receipt_cum ?? 0))}
                    </td>
                    <td
                      className={cn(BODY_CELL, 'text-right')}
                      title={pctDiffers(r) ? `Được hưởng: ${r.pct_entitled}%` : undefined}
                    >
                      {Number(r.pct_payout ?? 0)}%
                      {pctDiffers(r) ? (
                        <span className="text-content-dark-3 ml-1 text-xs">
                          ({Number(r.pct_entitled ?? 0)}%)
                        </span>
                      ) : null}
                    </td>
                    <td className={cn(BODY_CELL, 'text-right')}>
                      {formatCurrencyVND(Number(r.entitled_cum ?? 0))}
                    </td>
                    <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(paidBefore)}</td>
                    <td className={cn(BODY_CELL, 'text-right')}>
                      {payout < 0 ? (
                        <span className="text-data-orange-default font-semibold">
                          Đòi lại {formatCurrencyVND(Math.abs(payout))}
                        </span>
                      ) : (
                        <span className="text-data-red-default font-semibold">
                          {formatCurrencyVND(payout)}
                        </span>
                      )}
                    </td>
                    <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(paidAfter)}</td>
                    <td className={cn(BODY_CELL, 'text-right font-semibold')}>
                      {formatCurrencyVND(Number(r.balance_after ?? 0))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
