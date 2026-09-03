import { Text } from '@radix-ui/themes'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import {
  CompositionLine,
  ROLE_COLORS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_BORDER_COLORS,
} from './MonthlySummaryConstants'

interface MonthlySummaryDetailTableProps {
  compositionLines: CompositionLine[]
  preTaxTotal: number
}

export const MonthlySummaryDetailTable = ({
  compositionLines,
  preTaxTotal,
}: MonthlySummaryDetailTableProps) => {
  return (
    <div className="border-border-1 rounded-lg border bg-white">
      <div className="border-border-1 flex flex-col gap-1 border-b px-5 py-4">
        <Text className="font-semibold text-neutral-900">Chi tiết các nguồn HH</Text>
        <Text className="text-content-dark-4 text-xs">
          Mỗi dòng = 1 nguồn HH · Click "Mở" để xem chi tiết từng deal/từng hạng mục tại màn nguồn
        </Text>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border-1 border-b bg-neutral-50 text-neutral-500">
            <th className="w-1/4 px-5 py-3 text-left font-medium">Nguồn HH</th>
            <th className="w-32 px-2 py-3 text-left font-medium">Mã màn</th>
            <th className="px-2 py-3 text-left font-medium">Mô tả</th>
            <th className="w-40 px-5 py-3 text-right font-medium">Thành tiền</th>
            <th className="w-48 px-5 py-3 text-left font-medium">% Tổng</th>
          </tr>
        </thead>
        <tbody>
          {compositionLines.map((line, idx) => {
            const pct = preTaxTotal > 0 ? (line.amount / preTaxTotal) * 100 : 0
            const isNegative = line.amount < 0
            return (
              <tr key={idx} className="border-border-1 group border-b last:border-0">
                <td className="py-4">
                  <div
                    className={`border-l-[3px] border-transparent pl-4 ${
                      line.amount !== 0 ? ROLE_BORDER_COLORS[line.key] || 'border-neutral-800' : ''
                    }`}
                  >
                    <Text
                      className={`font-medium ${line.amount !== 0 ? 'text-neutral-900' : 'text-neutral-400'}`}
                    >
                      {ROLE_LABELS[line.key] || line.label}
                    </Text>
                  </div>
                </td>
                <td className="px-2 py-4 font-mono text-xs text-neutral-500">{line.link || ''}</td>
                <td className="px-2 py-4 text-xs text-neutral-400">
                  {ROLE_DESCRIPTIONS[line.key] || '-'}
                </td>
                <td className="px-5 py-4 text-right">
                  <Text
                    className={`font-semibold ${line.amount !== 0 ? (isNegative ? 'text-red-500' : 'text-neutral-900') : 'text-neutral-300'}`}
                  >
                    {line.amount !== 0 ? formatCurrencyVND(line.amount).replace(' ₫', '') : '—'}
                  </Text>
                </td>
                <td className="px-5 py-4">
                  {line.amount !== 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full ${ROLE_COLORS[line.key] || 'bg-neutral-800'}`}
                          style={{ width: `${Math.abs(pct)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-neutral-500">
                        {formatPercent(pct)}
                      </span>
                    </div>
                  ) : (
                    <Text className="ml-4 text-neutral-300">—</Text>
                  )}
                </td>
              </tr>
            )
          })}
          <tr className="border-border-1 border-t bg-neutral-50">
            <td colSpan={3} className="px-5 py-4 text-left font-bold text-neutral-900">
              TỔNG HH
            </td>
            <td className="px-5 py-4 text-right font-bold text-neutral-900">
              {formatCurrencyVND(preTaxTotal).replace(' ₫', '')}
            </td>
            <td className="px-5 py-4 text-left font-bold text-neutral-900">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
