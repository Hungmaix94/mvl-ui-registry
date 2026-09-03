import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { useHoliday, type Holiday } from '@/features/attendance/services/holiday-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability'
import HolidayDetail from '@/features/attendance/holiday/view-details/HolidayDetail.tsx'
import { APP_PATH } from '@/routes'
import { useHolidayDelete } from '@/features/attendance/holiday/_shares/hooks/useHolidayDelete'
import { isNotFoundError } from '@/utils/error-utils'

const HolidayManagementDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: holidayResponse, isLoading, error } = useHoliday(Number(id))
  const holiday = holidayResponse as Holiday | undefined
  const ability = useAbility()
  const holidayName = useMemo(() => holiday?.name || 'Chi tiết ngày lễ', [holiday?.name])
  const { openDeleteDialog } = useHolidayDelete(() => {
    navigate(APP_PATH.HOLIDAY_MANAGEMENT)
  })

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !holiday
  }, [isLoading, error, holiday])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'holiday')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.HOLIDAY_MANAGEMENT_EDIT.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (holiday) {
      openDeleteDialog(holiday)
    }
  }, [openDeleteDialog, holiday])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.HOLIDAY_MANAGEMENT_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  return (
    <>
      <PageTitle
        title={holidayName}
        handleEdit={ability.can('update', 'holiday') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'holiday') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'holiday') ? handleShowHistory : undefined}
        enableBackButton
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={hasReadPermission}
        >
          <HolidayDetail holiday={holiday} />
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default HolidayManagementDetailPage
