import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useParams } from 'react-router-dom'
import AttendanceDeviceForm from '@/features/attendance/device/_shares/components/AttendanceDeviceForm.tsx'
import {
  useAttendanceDevice,
  type AttendanceDevice,
} from '@/features/attendance/services/attendance-device-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability'
import { useMemo } from 'react'

const AttendanceDeviceEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: deviceResponse, isLoading, error } = useAttendanceDevice(Number(id))
  const device = deviceResponse as AttendanceDevice | undefined
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !device
  }, [isLoading, error, device])

  const hasReadPermission = ability.can('retrieve', 'attendance_device')
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
            <AttendanceDeviceForm mode="edit" deviceData={device} deviceLoading={isLoading} />
          )}
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default AttendanceDeviceEditPage
