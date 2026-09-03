import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle, Button } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { InterviewScheduleEditForm } from '@/features/recruitment/interview-schedule'
import {
  useInterviewSchedule,
  useUpdateInterviewSchedule,
} from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

const InterviewScheduleEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const scheduleId = id ? parseInt(id, 10) : 0

  // Fetch interview schedule data
  const { data: interviewSchedule } = useInterviewSchedule(scheduleId)
  const updateMutation = useUpdateInterviewSchedule()
  const invalidateQueries = useInvalidateQueries()
  const ability = useAbility()

  // Handle invalid schedule ID
  useEffect(() => {
    if (!scheduleId || isNaN(scheduleId)) {
      navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)
    }
  }, [scheduleId, navigate])

  // Handle interview schedule not found
  useEffect(() => {
    if (!scheduleId) {
      navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)
    }
  }, [scheduleId, interviewSchedule, navigate])

  const handleSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        time: formatDateToApi(data.time),
      }

      await updateMutation.mutateAsync({ id: scheduleId, data: payload })
      await invalidateQueries.invalidateByPrefix('hrm')
      toastService.success('Cập nhật lịch phỏng vấn thành công')
      navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)
    } catch (error) {
      console.error('Error updating interview schedule:', error)
      toastService.error('Có lỗi xảy ra khi cập nhật lịch phỏng vấn')
    }
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE))
  }

  // Permission check
  if (!ability.can('update', 'interview_schedule')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa lịch phỏng vấn này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  if (!scheduleId || isNaN(scheduleId) || !interviewSchedule) {
    return null
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={interviewSchedule.title} />
      <Flex px="7" py="6" direction="column" gap="4">
        <InterviewScheduleEditForm
          initialData={interviewSchedule}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Flex>
    </>
  )
}

export default InterviewScheduleEditPage
