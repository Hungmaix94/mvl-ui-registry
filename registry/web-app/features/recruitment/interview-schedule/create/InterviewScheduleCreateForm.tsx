import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Button, Grid, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController.tsx'
import { useRecruitmentRequests } from '@/features/recruitment/services/recruitment-request-service'
import { InterviewScheduleCreateSchema } from '@/features/recruitment/interview-schedule/_shares/schemas/interviewScheduleSchema.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { InterviewType, RecruitmentRequestStatus } from '@/constants/api-schema-aliases'

type Props = {
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

const InterviewScheduleCreateForm = ({ onSubmit, onCancel }: Props) => {
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

  const [page, setPage] = useState(1)

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
    resolver: zodResolver(InterviewScheduleCreateSchema),
    defaultValues: {
      title: '',
      time: '',
      interview_type: InterviewType.IN_PERSON,
      location: '',
      note: '',
    },
  })

  const { register, control, handleSubmit, setValue, watch } = form

  // Handle recruitment request selection
  const handleRequestSelect = (requestId: number) => {
    const request = recruitmentRequests.find((r) => r.id === requestId)
    if (request) {
      // Auto-fill position field from job description
      const position = request.job_description?.title || ''
      setValue('position', position)
    }
  }

  const handleFormSubmit = handleSubmit(async (data) => {
    // Remove display-only field before submission
    const { position, ...submitData } = data
    await onSubmit(submitData)
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
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
          options:
            recruitmentRequests.map((r) => ({
              value: r.id,
              label: `${r.code} - ${r.name}`,
            })) || [],
          searchable: true,
          onMenuScrollToBottom: () => setPage((p) => p + 1),
          onChange: (value: number) => {
            setValue('recruitment_request_id', value)
            handleRequestSelect(value)
          },
        }}
      />

      {/* Two-column row: Vị trí phỏng vấn + Loại phỏng vấn */}
      <Grid cols={2} gap={5}>
        {/* Vị trí phỏng vấn (Read-only) */}
        <Flex direction="column" className="flex-1">
          <TextField
            label="Vị trí phỏng vấn"
            required
            disabled
            maxLength={50}
            value={watch('position') || ''}
            placeholder="Hiển thị theo đề nghị tuyển dụng"
            showCharacterCount
          />
        </Flex>

        {/* Loại phỏng vấn */}
        <Flex direction="column" className="flex-1">
          <FormController
            register={register}
            name="interview_type"
            control={control}
            Field={RadioGroup}
            fieldProps={{
              id: 'interview_type',
              label: 'Loại phỏng vấn',
              required: true,
              disabled: false,
              options: interviewTypes,
              onChange: (value: string) =>
                setValue('interview_type', value as 'IN_PERSON' | 'ONLINE'),
            }}
          />
        </Flex>
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
          maxCharacters: 500,
          rows: 4,
        }}
      />

      {/* Action buttons */}
      <Flex gap="4" justify="end" className="pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-[150px]">
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-[150px]"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
        >
          Lưu
        </Button>
      </Flex>
    </form>
  )
}

export default InterviewScheduleCreateForm
