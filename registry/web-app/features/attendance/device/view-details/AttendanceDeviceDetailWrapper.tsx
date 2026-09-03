import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { AttendanceDevice } from '@/features/attendance/services/attendance-device-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type AttendanceDeviceDetailWrapperProps = {
  device?: AttendanceDevice
}

const AttendanceDeviceDetailWrapper = ({ device }: AttendanceDeviceDetailWrapperProps) => {
  if (!device) return null

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS,
      APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE,
    ],
  })
  const statusLabels =
    (keysMap.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE) as
      | Record<string, string>
      | undefined) || {}
  const enableLabels =
    (keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS) as
      | Record<string, string>
      | undefined) || {}

  const isEnabled = device.is_enabled
  const isConnected = device.is_connected

  const isEnabledStatusKey = isEnabled ? 'in_use' : 'not_in_use'
  const isEnabledLabel = statusLabels[isEnabledStatusKey] || '-'
  const isEnabledVariant = isEnabled ? ColoredValueVariant.GREEN : ColoredValueVariant.RED

  const isConnectedStatusKey = isConnected ? 'active' : 'inactive'
  const isConnectedLabel = enableLabels[isConnectedStatusKey] || '-'
  const isConnectedVariant = isConnected ? ColoredValueVariant.GREEN : ColoredValueVariant.RED

  // Format dates
  const createdDate = formatDateToApi(new Date(device.created_at)) || '-'
  const updatedDate = formatDateToApi(new Date(device.updated_at)) || '-'
  const pollingSyncedDate = device.polling_synced_at
    ? formatDateToApi(new Date(device.polling_synced_at))
    : '-'

  return (
    <Flex direction="column" gap="5" px="7" className="pt-9 pb-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi tiết thiết bị chấm công
      </Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã máy chấm công" value={device.code} />
        <DetailRow label="Tên máy chấm công" value={device.name} />
        <DetailRow label="Chi nhánh" value={device.block?.branch?.name || '-'} />
        <DetailRow label="Khối" value={device.block?.name || '-'} />
        <DetailRow
          label="Trạng thái sử dụng"
          value={<Chip label={isEnabledLabel} variant={isEnabledVariant} size="small" />}
        />
        <DetailRow label="Tên miền" value={device.ip_address} />
        <DetailRow label="Mật khẩu" value={device.password} />
        <DetailRow label="Port" value={device.port} />
        <DetailRow
          label="Trạng thái kết nối"
          value={
            <Chip label={isConnectedLabel} variant={isConnectedVariant} size="small" showDot />
          }
        />
        <DetailRow label="Số seri" value={device.serial_number || '-'} />
        <DetailRow label="Lần đồng bộ cuối" value={pollingSyncedDate} />
        <DetailRow label="Ghi chú" value={device.note || ''} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default AttendanceDeviceDetailWrapper
