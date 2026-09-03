import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { AttendanceWifiDevice } from '@/features/attendance/services/attendance-wifi-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'

type WifiAttendanceDeviceDetailWrapperProps = {
  device?: AttendanceWifiDevice
}

const WifiAttendanceDeviceDetailWrapper = ({ device }: WifiAttendanceDeviceDetailWrapperProps) => {
  if (!device) return null

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE],
  })
  const stateLabels =
    (keysMap.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE) as
      | Record<string, string>
      | undefined) || {}

  const state = device.state
  const stateLabel = state ? stateLabels[state] || '-' : '-'
  const stateVariant = state === 'in_use' ? ColoredValueVariant.GREEN : ColoredValueVariant.RED

  const createdDate = formatDate(device.created_at)
  const updatedDate = formatDate(device.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi tiết wifi chấm công
      </Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã wifi chấm công" value={device.code} />
        <DetailRow label="Tên wifi chấm công" value={device.name} />
        <DetailRow label="Chi nhánh" value={device.branch?.name || '-'} />
        <DetailRow label="Khối" value={device.block?.name || '-'} />
        <DetailRow
          label="BSSID"
          value={
            device.bssids?.length ? (
              <Flex direction="column" gap="1">
                {device.bssids.map((bssid) => (
                  <Text key={bssid} as="span" className="text-content-dark-1">
                    {bssid}
                  </Text>
                ))}
              </Flex>
            ) : (
              '-'
            )
          }
        />
        <DetailRow
          label="Trạng thái sử dụng"
          value={<Chip label={stateLabel} variant={stateVariant} size="small" />}
        />
        <DetailRow label="Ghi chú" value={device.notes || ''} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default WifiAttendanceDeviceDetailWrapper
