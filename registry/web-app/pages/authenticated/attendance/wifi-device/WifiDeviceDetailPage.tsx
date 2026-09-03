import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import WifiAttendanceDeviceDetailWrapper from '@/features/attendance/wifi-device/view-details/WifiAttendanceDeviceDetailWrapper'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import useWifiAttendanceDeviceDelete from '@/features/attendance/wifi-device/_shares/hooks/useWifiAttendanceDeviceDelete'
import {
  useAttendanceWifiDevice,
  type AttendanceWifiDevice,
} from '@/features/attendance/services/attendance-wifi-service'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const WifiDeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: deviceResponse, isLoading, error } = useAttendanceWifiDevice(Number(id))
  const device = deviceResponse as AttendanceWifiDevice | undefined
  const deviceName = useMemo(() => device?.name || 'Chi tiết wifi chấm công', [device?.name])
  const navigate = useNavigate()
  const { openDeleteDialog } = useWifiAttendanceDeviceDelete(() => {
    navigate(APP_PATH.ATTENDANCE_WIFI_DEVICE)
  })
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !device
  }, [isLoading, error, device])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'wifi_attendance_device')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.ATTENDANCE_WIFI_DEVICE_EDIT.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (device) {
      openDeleteDialog(device)
    }
  }, [openDeleteDialog, device])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.ATTENDANCE_WIFI_DEVICE_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  return (
    <>
      <PageTitle
        title={deviceName}
        handleEdit={ability.can('update', 'wifi_attendance_device') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'wifi_attendance_device') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'wifi_attendance_device') ? handleShowHistory : undefined
        }
        enableBackButton
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={hasReadPermission}
        >
          <WifiAttendanceDeviceDetailWrapper device={device} />
        </DetailPageWrapper>
      </Flex>
    </>
  )
}
export default WifiDeviceDetailPage
