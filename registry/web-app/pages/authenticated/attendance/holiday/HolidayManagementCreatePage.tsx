import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import HolidayForm from '@/features/attendance/holiday/_shares/components/HolidayForm'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

const HolidayManagementCreatePage = () => {
  const navigate = useNavigate()

  const handleSuccess = useCallback(() => {
    navigate(APP_PATH.HOLIDAY_MANAGEMENT)
  }, [navigate])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.HOLIDAY_MANAGEMENT))
  }, [navigate])

  return (
    <>
      <PageTitle enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <HolidayForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}

export default HolidayManagementCreatePage
