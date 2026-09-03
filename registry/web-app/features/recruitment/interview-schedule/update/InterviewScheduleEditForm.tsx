import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Button, Grid, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController.tsx'
import { type InterviewSchedule } from '@/features/recruitment/services/interview-service'
import { useRecruitmentRequests } from '@/features/recruitment/services/recruitment-request-service'
import { InterviewScheduleEditSchema } from '@/features/recruitment/interview-schedule/_shares/schemas/interviewScheduleSchema.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { format } from 'date-fns'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { RecruitmentRequestStatus } from '@/constants/api-schema-aliases'

type Props = {
  initialData: InterviewSchedule
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

const InterviewScheduleEditForm = ({ initialData, onSubmit, onCancel }: Props) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.INTERVIEW.SCHEDULE.TYPE],
  })
  const interviewTypes = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.INTERVIEW.SCHEDULE.TYPE)
        ? keysMapOptions.get(APP_CONSTANT_KEY.INTERVIEW.SCHEDULE.TYPE) || []
        : [],
    [keysMapOptions]
  )

  const [page] = useState(1)

  const { data: recruitmentRequestsData } = useRecruitmentRequests({
    page,
    page_size: PAGE_SIZE,
    status: RecruitmentRequestStatus.OPEN,
  }) // Only show open requests
  const recruitmentRequests = useMemo(
    () => recruitmentRequestsData?.results || [],
    [recruitmentRequestsData?.results]
  )

  const form = useForm({
    resolver: zodResolver(InterviewScheduleEditSchema),
    defaultValues: {
      title: initialData.title,
      recruitment_request_id: initialData.recruitment_request.id,
      position: initialData.recruitment_request.position_title || '',
      interview_type: initialData.interview_type,
      location: initialData.location,
      time: format(new Date(initialData.time), 'dd/MM/yyyy'),
      note: initialData.note || '',
    },
  })

  const { register, control, handleSubmit, setValue } = form

  // Handle recruitment request selection
  const handleRequestSelect = (requestId: number) => {
    const request = recruitmentRequests.find((r) => r.id === requestId)
    if (request) {
      // Update both recruitment_request_id and position
      setValue('recruitment_request_id', requestId, { shouldDirty: true })
      setValue('position', request.job_description?.title || '', { shouldDirty: true })
    }
  }

  const handleFormSubmit = handleSubmit(async (data) => {
    // Remove display-only field before submission
    const { position, ...submitData } = data
    await onSubmit(submitData)
    form.reset(data)
  })

  return (
    <form onSubmit={handleFormSubmit} className="flex w-full flex-col gap-5">
      {/* Lịch phỏng vấn */}
      <FormController
        register={register}
        name="title"
        control={control}
        Field={TextField}
        fieldProps={{
          label: 'Lịch phỏng vấn',
          required: true,
          placeholder: 'Nhập lịch phỏng vấn',
          maxLength: 100,
          showCharacterCount: true,
        }}
      />

      {/* Đề nghị tuyển dụng */}
      <FormController
        register={register}
        name="recruitment_request_id"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Đề nghị tuyển dụng',
          required: true,
          placeholder: 'Nhập đề nghị tuyển dụng',
          options: recruitmentRequests.map((request) => ({
            value: request.id,
            label: `${request.job_description?.title || 'N/A'} - ${request.code}`,
          })),
          onChange: (value: number) => {
            handleRequestSelect(value)
          },
        }}
      />

      <Grid cols={2} gap={5}>
        {/* Vị trí tuyển dụng (Display only) */}
        <FormController
          register={register}
          name="position"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Vị trí phỏng vấn',
            placeholder: 'Vị trí phỏng vấn',
            disabled: true,
          }}
        />

        {/* Loại phỏng vấn */}
        <FormController
          register={register}
          name="interview_type"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            label: 'Loại phỏng vấn',
            required: true,
            options: interviewTypes,
          }}
        />
      </Grid>

      {/* Địa điểm */}
      <FormController
        register={register}
        name="location"
        control={control}
        Field={TextField}
        fieldProps={{
          label: 'Địa điểm',
          required: true,
          placeholder: 'Nhập địa điểm',
          maxLength: 200,
          showCharacterCount: true,
        }}
      />

      {/* Thời gian */}
      <FormController
        register={register}
        name="time"
        control={control}
        Field={DatePicker}
        fieldProps={{
          label: 'Thời gian',
          required: true,
          placeholder: 'DD/MM/YYYY',
          allowManualInput: true,
          clearable: true,
        }}
      />

      {/* Ghi chú */}
      <FormController
        register={register}
        name="note"
        control={control}
        Field={TextArea}
        fieldProps={{
          label: 'Ghi chú',
          placeholder: 'Nhập ghi chú',
          maxLength: 500,
          maxCharacters: 500,
          showCharacterCount: true,
        }}
      />

      {/* Action Buttons */}
      <Flex gap="3" justify="end" className="pt-4">
        <Button type="button" variant="secondary" className={'w-[150px]'} onClick={onCancel}>
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          className={'w-[150px]'}
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
        >
          Lưu
        </Button>
      </Flex>
    </form>
  )
}

export default InterviewScheduleEditForm
