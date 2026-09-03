import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import HolidayForm from '@/features/attendance/holiday/_shares/components/HolidayForm'
import { APP_PATH } from '@/routes'
import { useHoliday } from '@/features/attendance/services/holiday-service'
import { PageLoading } from '@/components/Loading'

const HolidayManagementEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { data: holiday, isLoading } = useHoliday(Number(id))

  const handleSuccess = useCallback(() => {
    navigate(APP_PATH.HOLIDAY_MANAGEMENT_DETAIL.replace(':id', id || ''))
  }, [navigate, id])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.HOLIDAY_MANAGEMENT_DETAIL.replace(':id', id || ''))
  }, [navigate, id])

  const labelName = holiday?.name

  if (isLoading) {
    return <PageLoading />
  }

  return (
    <>
      <PageTitle idLabel={labelName} enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <HolidayForm initialData={holiday} onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}

export default HolidayManagementEditPage
