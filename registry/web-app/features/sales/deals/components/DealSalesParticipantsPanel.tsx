import { FC } from 'react'
import { cn } from '@/utils'
import {
  DealSalesParticipant,
  useDealSalesParticipants,
} from '@/features/sales/deals/services/deal-service'
import { formatCurrencyVND, formatNumber, formatRatePct } from '@/utils/common'

// unit_share only. participation_percentage goes through formatRatePct: the column is
// numeric(6,3) since 2026-08-12, so a 2-decimal cap turns a 33,334% hold-rescale share
// into 33,33 and the column stops adding up to 100.
const PCT_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

type DealSalesParticipantsPanelProps = {
  dealId: number
  /** When provided, rows for which this returns true are highlighted (e.g. the
   * participant that belongs to the unit currently drilled into). */
  highlightMatch?: (row: DealSalesParticipant) => boolean
}

/**
 * Inner (wrapper-less) panel listing a deal's sales participants + their
 * revenue/commission. Rendered inside an expanded row in both the deal list
 * (`DealSalesParticipantRows`) and the TKKD report detail view.
 */
const DealSalesParticipantsPanel: FC<DealSalesParticipantsPanelProps> = ({
  dealId,
  highlightMatch,
}) => {
  const { data, isLoading } = useDealSalesParticipants(dealId)
  const rows = (data ?? []) as DealSalesParticipant[]

  if (isLoading) {
    return <div className="text-content-dark-3 py-2 text-sm">Đang tải đối tượng tham gia…</div>
  }

  if (rows.length === 0) {
    return (
      <div className="text-content-dark-3 py-2 text-sm">Không có đối tượng tham gia bán hàng.</div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-content-dark-3 border-border-1 border-b text-left">
          <th className="py-2 pr-4 font-medium">Đối tượng tham gia</th>
          <th className="py-2 pr-4 font-medium">Phòng / Khối</th>
          <th className="py-2 pr-4 text-right font-medium">Tỉ lệ căn</th>
          <th className="py-2 pr-4 text-right font-medium">% doanh thu</th>
          <th className="py-2 pr-4 text-right font-medium">Thành tiền doanh thu</th>
          <th className="py-2 pr-4 text-right font-medium">Thành tiền hàng</th>
          <th className="py-2 text-right font-medium">Hoa hồng</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const highlighted = highlightMatch?.(row) ?? false
          return (
            <tr
              key={row.allocation_id}
              className={cn(
                'border-border-1/50 border-b last:border-0',
                highlighted &&
                  'bg-red-10 border-action-primary-red-default border-l-2 font-semibold'
              )}
              title={highlighted ? 'Thuộc đơn vị đang xem' : undefined}
            >
              <td className="py-2 pr-4 font-medium">
                {highlighted && <span className="text-action-primary-red-default mr-1">●</span>}
                {row.name || '-'}
              </td>
              <td className="text-content-dark-3 py-2 pr-4">
                {[row.department_name, row.division_name].filter(Boolean).join(' / ') || '-'}
              </td>
              <td className="py-2 pr-4 text-right">
                {formatNumber(Number(row.unit_share), PCT_FORMAT)}
              </td>
              <td className="py-2 pr-4 text-right">
                {formatRatePct(row.participation_percentage)}
              </td>
              <td className="py-2 pr-4 text-right">
                {formatCurrencyVND(Number(row.revenue_amount))}
              </td>
              <td className="py-2 pr-4 text-right">
                {formatCurrencyVND(Number(row.goods_amount))}
              </td>
              <td className="py-2 text-right">
                {formatCurrencyVND(Number(row.commission_amount))}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default DealSalesParticipantsPanel
