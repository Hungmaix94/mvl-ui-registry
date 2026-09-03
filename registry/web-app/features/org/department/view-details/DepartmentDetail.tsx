import { Flex, Text } from '@radix-ui/themes'
import { DEPARTMENT_LEVEL_LABELS } from '@/constants/department.ts'
import type { Department } from '@/features/org/services/department-service'
import DetailRow from '@/components/commons/DetailRow.tsx'
import Chip from '@/components/ui/chip/Chip.tsx'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { APP_PATH } from '@/routes'

type DepartmentDetailProps = {
  department: Department
}

const DepartmentDetail = ({ department }: DepartmentDetailProps) => {
  // Format dates
  const createdDate = formatDate(department.created_at)
  const updatedDate = formatDate(department.updated_at)

  // Get function display value
  const functionLabel = department.function_display || '-'

  // Get level display value
  const levelDisplay = department.is_main_department ? DEPARTMENT_LEVEL_LABELS.main : ''

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi tiết</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên phòng ban" value={department.name} />
        <DetailRow label="Mã phòng ban" value={department.code} />
        <DetailRow
          label="Chi nhánh"
          value={typeof department.branch === 'object' ? department.branch.name : '-'}
        />
        <DetailRow
          label="Khối"
          value={typeof department.block === 'object' ? department.block.name : '-'}
        />
        <DetailRow
          label="Chức năng"
          value={<Chip label={functionLabel} variant={ColoredValueVariant.BLUE} size="small" />}
        />
        <DetailRow label="Cấp" value={levelDisplay} />
        <DetailRow
          label="Phòng ban quản lý"
          value={department.management_department?.name || '-'}
        />
        <DetailRow
          label="Trưởng phòng"
          value={
            department.leader && (department.leader.fullname || department.leader.code)
              ? `${department.leader.fullname}`
              : '-'
          }
          type={'link'}
          link={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(department.leader?.id))}
        />
        <DetailRow label="Mô tả" value={department.description || '-'} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default DepartmentDetail
