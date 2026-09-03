import { Text, Badge } from '@radix-ui/themes'
import { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryStatusBadge } from './MonthlySummaryStatusBadge'

interface MonthlySummaryEmployeeInfoProps {
  record: MonthlyBeneficiaryCommissionSummaryDetail
}

export const MonthlySummaryEmployeeInfo = ({ record }: MonthlySummaryEmployeeInfoProps) => {
  const isEmployee = record.beneficiary_type === 'EMPLOYEE'
  const isCollaborator = record.beneficiary_type === 'COLLABORATOR'
  const isExchange = record.beneficiary_type === 'EXCHANGE'

  const title = isEmployee
    ? 'THÔNG TIN NHÂN VIÊN'
    : isCollaborator
      ? 'THÔNG TIN CỘNG TÁC VIÊN'
      : 'THÔNG TIN SÀN LIÊN KẾT'

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <Text className="text-xs font-semibold tracking-wider text-gray-500">{title}</Text>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {isEmployee && (
          <>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Mã NV</Text>
              <Text className="rounded bg-gray-100 px-2 text-sm font-medium">
                {record.beneficiary_employee_detail?.code || '-'}
              </Text>
            </div>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Phòng</Text>
              <Text className="text-sm font-medium">
                {record.beneficiary_employee_detail?.department?.name || '-'}
              </Text>
            </div>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Vai trò</Text>
              <Badge color="blue" variant="soft" size="1">
                {record.beneficiary_employee_detail?.position?.name || '-'}
              </Badge>
            </div>
          </>
        )}

        {isCollaborator && (
          <>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Mã CTV</Text>
              <Text className="rounded bg-gray-100 px-2 text-sm font-medium">
                {record.beneficiary_collaborator_detail?.code || '-'}
              </Text>
            </div>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Điện thoại</Text>
              <Text className="text-sm font-medium">
                {record.beneficiary_collaborator_detail?.phone || '-'}
              </Text>
            </div>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Email</Text>
              <Text className="text-sm font-medium">
                {record.beneficiary_collaborator_detail?.email || '-'}
              </Text>
            </div>
          </>
        )}

        {isExchange && (
          <>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Mã sàn</Text>
              <Text className="rounded bg-gray-100 px-2 text-sm font-medium">
                {record.beneficiary_exchange_detail?.code || '-'}
              </Text>
            </div>
            <div className="flex justify-between border-b border-gray-50 py-1">
              <Text className="text-sm text-gray-500">Tên sàn</Text>
              <Text className="text-sm font-medium">
                {record.beneficiary_exchange_detail?.name || '-'}
              </Text>
            </div>
          </>
        )}

        <div className="flex justify-between py-1">
          <Text className="text-sm text-gray-500">Trạng thái</Text>
          <MonthlySummaryStatusBadge status={record.status as any} />
        </div>
      </div>
    </div>
  )
}
