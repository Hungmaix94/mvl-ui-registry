import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import AttendanceDeviceDetailWrapper from '@/features/attendance/device/view-details/AttendanceDeviceDetailWrapper'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import { useAttendanceDeviceDelete } from '@/features/attendance/device/_shares/hooks/useAttendanceDeviceDelete.tsx'
import {
  useAttendanceDevice,
  useCheckAttendanceDeviceConnection,
  type AttendanceDevice,
} from '@/features/attendance/services/attendance-device-service'

import { useAbility } from '@/lib/ability'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import Button from '../../../../components/ui/button/Button.tsx'
import { IconArrowscounterclockwise } from '@/assets/icons'
import { cn, isNotFoundError } from '@/utils'
import { Separator } from '@radix-ui/themes'
import { extractErrorMessage } from '@/utils/error-utils'

const AttendanceDeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: deviceResponse, isLoading, error } = useAttendanceDevice(Number(id))
  const device = deviceResponse as AttendanceDevice | undefined
  const deviceName = useMemo(() => device?.name || 'Chi tiết thiết bị chấm công', [device?.name])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openDeleteDialog } = useAttendanceDeviceDelete(() => {
    navigate(APP_PATH.ATTENDANCE_DEVICE)
  })
  const ability = useAbility()
  const checkConnectionMutation = useCheckAttendanceDeviceConnection()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !device
  }, [isLoading, error, device])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'attendance_device')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.ATTENDANCE_DEVICE_EDIT.replace(':id', id)
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
      const path = APP_PATH.ATTENDANCE_DEVICE_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleCheckConnect = useCallback(async () => {
    if (!id) {
      toastService.error('Không tìm thấy thiết bị')
      return
    }

    try {
      const res = await checkConnectionMutation.mutateAsync(Number(id))

      if (res.is_connected) {
        toastService.success('Kết nối lại thiết bị thành công')
      } else {
        toastService.error('Kết nối lại thiết bị thất bại')
      }

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.DETAIL(Number(id)),
      })
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.LIST({}),
      })
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [id, checkConnectionMutation, queryClient])

  return (
    <>
      <PageTitle
        title={deviceName}
        enableBackButton
        handleEdit={ability.can('update', 'attendance_device') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'attendance_device') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'attendance_device') ? handleShowHistory : undefined
        }
        customActions={
          !device?.is_connected && (
            <>
              <Button
                variant={'secondary'}
                iconOnly
                size={'large'}
                leftIcon={<IconArrowscounterclockwise />}
                className={cn('p-2', 'bg-data-light-grey-hover')}
                onClick={handleCheckConnect}
                title={'Kết nối lại'}
              />
              <Separator orientation={'vertical'} />
            </>
          )
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={hasReadPermission}
        >
          <AttendanceDeviceDetailWrapper device={device} />
        </DetailPageWrapper>
      </Flex>
    </>
  )
}
export default AttendanceDeviceDetailPage
