import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import CompensatoryDaysSection from '@/features/attendance/holiday/view-details/CompensatoryDaysSection'
import type { Holiday } from '@/features/attendance/services/holiday-service'
import { formatDate } from '@/utils/date-utils'

interface HolidayDetailWrapperProps {
  holiday?: Holiday
}

const HolidayDetail = ({ holiday }: HolidayDetailWrapperProps) => {
  if (!holiday) return null

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi tiết ngày lễ</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên ngày lễ" value={holiday.name} />
        <DetailRow
          label="Ngày nghỉ"
          value={`${formatDate(holiday.start_date)} - ${formatDate(holiday.end_date)}`}
        />
        <DetailRow label="Ghi chú" value={holiday.notes || ''} />
        <DetailRow label="Ngày tạo" value={formatDate(holiday.created_at)} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={formatDate(holiday.updated_at)} />
      </Flex>

      <hr className="border-border-1" />

      {/* Compensatory Days Section */}
      <CompensatoryDaysSection holidayId={holiday.id} />
    </Flex>
  )
}

export default HolidayDetail
