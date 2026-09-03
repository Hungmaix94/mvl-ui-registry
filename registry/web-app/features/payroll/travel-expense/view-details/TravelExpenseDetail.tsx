import { Flex } from '@radix-ui/themes'
import type { TravelExpense } from '@/features/payroll/services/travel-expense-service'
import { Text, Chip } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { formatCurrencyVND } from '@/utils/common.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { TravelExpenseType, RecoveryVoucherStatus } from '@/constants/api-schema-aliases'
// Công tác phí dùng chung enum trạng thái với phiếu thu hồi (cùng bộ giá trị).

type TravelExpenseDetailProps = {
  expense: TravelExpense
}

const TravelExpenseDetail = ({ expense }: TravelExpenseDetailProps) => {
  const createdDate = formatDate(expense.created_at)
  const updatedDate = formatDate(expense.updated_at)

  // Map status to Chip variant
  const getStatusVariant = (status: string): ColoredValueVariant => {
    if (status === RecoveryVoucherStatus.CALCULATED) {
      return ColoredValueVariant.GREEN
    }
    if (status === RecoveryVoucherStatus.NOT_CALCULATED) {
      return ColoredValueVariant.YELLOW
    }
    return ColoredValueVariant.GREY
  }

  // Map expense_type to Chip variant
  const getExpenseTypeVariant = (expenseType: TravelExpenseType): ColoredValueVariant => {
    if (expenseType === TravelExpenseType.TAXABLE) {
      return ColoredValueVariant.BLUE
    }
    return ColoredValueVariant.GREY
  }

  // Get status label
  const getStatusLabel = (status: string): string => {
    if (status === RecoveryVoucherStatus.CALCULATED) {
      return 'Đã tính'
    }
    if (status === RecoveryVoucherStatus.NOT_CALCULATED) {
      return 'Chưa tính'
    }
    return status
  }

  // Get expense type label
  const getExpenseTypeLabel = (expenseType: TravelExpenseType): string => {
    if (expenseType === TravelExpenseType.TAXABLE) {
      return 'Taxable'
    }
    if (expenseType === TravelExpenseType.NON_TAXABLE) {
      return 'Non-taxable'
    }
    return expenseType
  }

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin công tác phí</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã" value={expense.code} />
        <DetailRow label="Tên chi phí" value={expense.name} />
        <DetailRow label="Nhân viên" value={expense.employee?.fullname || '-'} />
        <DetailRow label="Chi nhánh" value={expense.branch?.name || '-'} />
        <DetailRow label="Khối" value={expense.block?.name || '-'} />
        <DetailRow label="Phòng ban" value={expense.department?.name || '-'} />
        <DetailRow label="Chức vụ" value={expense.position?.name || '-'} />
        <DetailRow
          label="Loại chi phí"
          value={
            expense.expense_type ? (
              <Chip
                label={getExpenseTypeLabel(expense.expense_type)}
                variant={getExpenseTypeVariant(expense.expense_type)}
                size="small"
              />
            ) : (
              '-'
            )
          }
        />
        <DetailRow
          label="Số tiền"
          value={expense.amount ? formatCurrencyVND(expense.amount) : '-'}
        />
        <DetailRow label="Tháng" value={expense.month} />
        <DetailRow
          label="Trạng thái"
          value={
            expense.status ? (
              <Chip
                label={getStatusLabel(expense.status)}
                variant={getStatusVariant(expense.status)}
                size="small"
              />
            ) : (
              '-'
            )
          }
        />
        <DetailRow label="Ghi chú" value={expense.note} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default TravelExpenseDetail
