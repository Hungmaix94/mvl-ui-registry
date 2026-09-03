import { Flex, Text } from '@radix-ui/themes'
import type { Position } from '@/features/org/services/position-service'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useMemo } from 'react'

type PositionDetailWrapperProps = {
  position: Position
}

const PositionDetailWrapper = ({ position }: PositionDetailWrapperProps) => {
  // Format dates
  const createdDate = formatDate(position.created_at)
  const updatedDate = formatDate(position.updated_at)

  // Format leadership badge
  const leadershipBadge = useMemo(() => {
    const isLeadership = (position as any).is_leadership === true
    return (
      <Chip
        label={isLeadership ? 'Có' : 'Không'}
        variant={isLeadership ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
      />
    )
  }, [position])

  // Format include in HR report badge
  const includeInHrReportBadge = useMemo(() => {
    const includeInReport = (position as any).include_in_employee_report === true
    return (
      <Chip
        label={includeInReport ? 'Có' : 'Không'}
        variant={includeInReport ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
      />
    )
  }, [position])

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi tiết</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên chức vụ" value={position.name} />
        <DetailRow label="Mã chức vụ" value={position.code} />
        <DetailRow label="Mô tả" value={position.description} />
        <DetailRow label="Ban lãnh đạo" value={leadershipBadge} />
        <DetailRow label="Tính vào báo cáo nhân sự" value={includeInHrReportBadge} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default PositionDetailWrapper
