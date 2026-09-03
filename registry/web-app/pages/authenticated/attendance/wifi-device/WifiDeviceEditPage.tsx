import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useParams } from 'react-router-dom'
import WifiAttendanceDeviceForm from '@/features/attendance/wifi-device/_shares/components/WifiAttendanceDeviceForm.tsx'
import {
  useAttendanceWifiDevice,
  type AttendanceWifiDevice,
} from '@/features/attendance/services/attendance-wifi-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability'
import { useMemo } from 'react'

const WifiDeviceEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: deviceResponse, isLoading, error } = useAttendanceWifiDevice(Number(id))
  const device = deviceResponse as AttendanceWifiDevice | undefined
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !device
  }, [isLoading, error, device])

  const hasReadPermission = ability.can('retrieve', 'wifi_attendance_device')
  const labelName = device?.name

  return (
    <>
      <PageTitle idLabel={labelName} enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          hasPermission={hasReadPermission}
        >
          {device && (
            <WifiAttendanceDeviceForm mode="edit" deviceData={device} deviceLoading={isLoading} />
          )}
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default WifiDeviceEditPage
