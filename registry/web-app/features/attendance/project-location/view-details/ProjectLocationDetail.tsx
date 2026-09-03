import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { AttendanceGeolocation } from '@/features/attendance/services/attendance-geolocation-service'
import { ColoredValueVariant } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { ProjectLocationMap } from '@/features/attendance/project-location/_shares/components/ProjectLocationMap.tsx'

type Props = {
  projectLocation: AttendanceGeolocation
}

const ProjectLocationDetail = ({ projectLocation }: Props) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS],
  })
  const statusLabels =
    (keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS) as
      | Record<string, string>
      | undefined) || {}

  const status = projectLocation.status || 'inactive'
  const statusLabel = statusLabels[status] || '-'
  const statusVariant = status === 'active' ? ColoredValueVariant.GREEN : ColoredValueVariant.RED

  // Format dates
  const createdDate = formatDate(projectLocation.created_at)
  const updatedDate = formatDate(projectLocation.created_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi tiết định vị dự án
      </Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã định vị" value={projectLocation.code} />
        <DetailRow label="Tên định vị" value={projectLocation.name} />
        <DetailRow label="Dự án" value={projectLocation?.project?.name || '-'} />
        <DetailRow
          label="Toạ độ"
          value={'[' + projectLocation.latitude + ', ' + projectLocation?.longitude + ']'}
        />
        <DetailRow label="Bán kính (m)" value={projectLocation.radius_m + ' m'} />
        <DetailRow label="Địa chỉ" value={projectLocation.address} />
        <ProjectLocationMap
          latitude={Number(projectLocation.latitude)}
          longitude={Number(projectLocation.longitude)}
          radius={projectLocation.radius_m}
          onLocationChange={() => {}}
          disable={true}
        />
        <DetailRow
          label="Trạng thái"
          value={<Chip label={statusLabel} variant={statusVariant} size="small" />}
        />
        <DetailRow label="Ghi chú" value={projectLocation.notes || ''} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default ProjectLocationDetail
