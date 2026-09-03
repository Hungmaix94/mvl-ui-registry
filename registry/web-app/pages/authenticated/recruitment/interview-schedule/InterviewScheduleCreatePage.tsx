import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { InterviewScheduleCreateForm } from '@/features/recruitment/interview-schedule'
import { useCreateInterviewSchedule } from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { APP_PATH } from '@/routes'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

const InterviewScheduleCreatePage = () => {
  const navigate = useNavigate()
  const createMutation = useCreateInterviewSchedule()
  const invalidateQueries = useInvalidateQueries()

  const handleSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        time: formatDateToApi(data.time),
      }

      await createMutation.mutateAsync(payload)
      await invalidateQueries.invalidateByPrefix('hrm')
      toastService.success('Tạo lịch phỏng vấn thành công')
      navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)
    } catch (error) {
      console.error('Error creating interview schedule:', error)
      toastService.error('Có lỗi xảy ra khi tạo lịch phỏng vấn')
    }
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE))
  }

  return (
    <>
      <PageTitle enableBackButton currentPageBreadcrumbTitle="Tạo lịch phỏng vấn mới" />
      <Flex px="7" py="6" direction="column" gap="4">
        <InterviewScheduleCreateForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </Flex>
    </>
  )
}

export default InterviewScheduleCreatePage
