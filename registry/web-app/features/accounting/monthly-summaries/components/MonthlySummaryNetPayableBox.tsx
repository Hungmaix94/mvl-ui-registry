import { Text, Badge } from '@radix-ui/themes'
import { formatCurrencyVND } from '@/utils/common'

interface MonthlySummaryNetPayableBoxProps {
  preTaxTotal: number
  netPayable: number
  isPaid: boolean
  sourcesCount: number
}

export const MonthlySummaryNetPayableBox = ({
  preTaxTotal,
  netPayable,
  isPaid,
  sourcesCount,
}: MonthlySummaryNetPayableBoxProps) => {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50/30 p-5">
      <div className="flex items-start justify-between">
        <div>
          <Text className="mb-1 block text-xs font-semibold tracking-wider text-green-700">
            THỰC NHẬN KỲ NÀY
          </Text>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-green-600">
              {formatCurrencyVND(netPayable).replace(' ₫', '')}
            </span>
            <span className="mb-1 text-lg font-semibold text-green-600">đ</span>
          </div>
          <Text className="mt-2 block text-sm text-gray-500">
            Tổng HH:{' '}
            <span className="font-medium text-gray-700">{formatCurrencyVND(preTaxTotal)}</span> từ{' '}
            {sourcesCount} nguồn
          </Text>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge color={isPaid ? 'green' : 'gray'} variant="soft" size="2">
            {isPaid ? 'Đã chi' : 'Chưa chi'}
          </Badge>
          {isPaid && <Text className="text-xs text-gray-500">PC-2026-0301</Text>}
        </div>
      </div>
    </div>
  )
}
