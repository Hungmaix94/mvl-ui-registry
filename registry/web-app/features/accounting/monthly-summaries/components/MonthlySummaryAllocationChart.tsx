import { Text } from '@radix-ui/themes'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { CompositionLine, ROLE_COLORS, ROLE_LABELS } from './MonthlySummaryConstants'

interface MonthlySummaryAllocationChartProps {
  compositionLines: CompositionLine[]
  preTaxTotal: number
}

export const MonthlySummaryAllocationChart = ({
  compositionLines,
  preTaxTotal,
}: MonthlySummaryAllocationChartProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <Text className="text-xs font-semibold tracking-wider text-gray-500">PHÂN BỔ NGUỒN HH</Text>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5">
        {compositionLines
          .filter((c) => c.amount > 0)
          .map((line, idx) => {
            const pct = preTaxTotal > 0 ? (line.amount / preTaxTotal) * 100 : 0
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <Text className="text-sm font-medium text-gray-800">
                    {ROLE_LABELS[line.key] || line.label}
                  </Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {formatCurrencyVND(line.amount).replace(' ₫', '')}
                  </Text>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full ${ROLE_COLORS[line.key] || 'bg-gray-800'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <Text className="text-[11px] text-gray-400">{formatPercent(pct)} của tổng</Text>
              </div>
            )
          })}
        {compositionLines.filter((c) => c.amount > 0).length === 0 && (
          <Text className="text-sm text-gray-500">Chưa có nguồn thu nhập nào</Text>
        )}
      </div>
    </div>
  )
}
