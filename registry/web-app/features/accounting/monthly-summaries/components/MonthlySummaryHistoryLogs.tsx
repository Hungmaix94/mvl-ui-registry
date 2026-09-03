import { Text } from '@radix-ui/themes'
import { format } from 'date-fns'
import { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

interface MonthlySummaryHistoryLogsProps {
  record: MonthlyBeneficiaryCommissionSummaryDetail
}

export const MonthlySummaryHistoryLogs = ({ record }: MonthlySummaryHistoryLogsProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <Text className="text-xs font-semibold tracking-wider text-gray-500">
          THỐNG KÊ THỜI GIAN
        </Text>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {record.confirmed_at && (
          <div className="flex items-center gap-2 text-sm">
            <Text className="w-32 font-medium text-gray-500">
              {format(new Date(record.confirmed_at), 'dd/MM/yyyy HH:mm')}
            </Text>
            <Text className="text-gray-400">—</Text>
            <Text className="text-gray-700">
              Chốt kỳ {String(record.month).padStart(2, '0')}/{record.year}
            </Text>
          </div>
        )}
        {record.last_aggregated_at && (
          <div className="flex items-center gap-2 text-sm">
            <Text className="w-32 font-medium text-gray-500">
              {format(new Date(record.last_aggregated_at), 'dd/MM/yyyy HH:mm')}
            </Text>
            <Text className="text-gray-400">—</Text>
            <Text className="text-gray-700">Cập nhật dữ liệu tổng hợp gần nhất</Text>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Text className="w-32 font-medium text-gray-500">
            {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}
          </Text>
          <Text className="text-gray-400">—</Text>
          <Text className="text-gray-700">Bản nháp được tạo</Text>
        </div>
      </div>
    </div>
  )
}
