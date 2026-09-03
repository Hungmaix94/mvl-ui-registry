import { useMemo } from 'react'
import DealDetailLink from '@/components/commons/DealDetailLink'
import { cn, formatCurrencyVND } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import { useDirectorCommissionReceipts } from '@/features/accounting/director-commissions/services/director-commission-service'

type DirectorCommissionReceiptsTableProps = {
  id: number
}

const HEAD_CELL = 'px-4 py-3 text-xs font-semibold text-content-dark-2 uppercase tracking-wide'
const BODY_CELL = 'px-4 py-3 text-sm text-content-dark-1 align-middle'

export default function DirectorCommissionReceiptsTable({
  id,
}: DirectorCommissionReceiptsTableProps) {
  const { data, isLoading } = useDirectorCommissionReceipts(id, { enabled: !!id })
  const rows = data?.results ?? []

  const netTotal = useMemo(() => rows.reduce((s, r) => s + Number(r.net_amount ?? 0), 0), [rows])

  return (
    <div className="border-border-1 flex flex-col rounded-lg border bg-white">
      <div className="border-border-1 border-b px-6 py-4">
        <h3 className="text-content-dark-1 text-lg font-semibold">Phiếu thu trong kỳ</h3>
        <span className="text-content-dark-3 text-xs">
          Các phiếu thu đóng góp vào tiền thực về (net) của kỳ này.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-border-1 border-b">
              <th className={cn(HEAD_CELL, 'text-left')}>Số phiếu thu</th>
              <th className={cn(HEAD_CELL, 'text-left')}>Ngày thu</th>
              <th className={cn(HEAD_CELL, 'text-left')}>Mã GD</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Phân bổ (Gross)</th>
              <th className={cn(HEAD_CELL, 'text-right')}>Thực về (Net)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                  Chưa có phiếu thu nào trong kỳ này.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.voucher_code}-${i}`} className="border-border-1 border-b">
                  <td className={cn(BODY_CELL, 'font-medium')}>{r.voucher_code || '—'}</td>
                  <td className={BODY_CELL}>{r.receipt_date ? formatDate(r.receipt_date) : '—'}</td>
                  <td className={BODY_CELL}>
                    {r.deal_code ? (
                      <DealDetailLink dealId={r.deal_id}>{r.deal_code}</DealDetailLink>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {formatCurrencyVND(Number(r.allocated_amount ?? 0))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-data-green-default text-right font-medium')}>
                    {formatCurrencyVND(Number(r.net_amount ?? 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!isLoading && rows.length > 0 ? (
            <tfoot>
              <tr className="bg-background-2 border-border-1 border-t font-semibold">
                <td className={cn(BODY_CELL, 'font-bold')} colSpan={4}>
                  Tổng thực về (Net)
                </td>
                <td className={cn(BODY_CELL, 'text-data-green-default text-right')}>
                  {formatCurrencyVND(netTotal)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  )
}
