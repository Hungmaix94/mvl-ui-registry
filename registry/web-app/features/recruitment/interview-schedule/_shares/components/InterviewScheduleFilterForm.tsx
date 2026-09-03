import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { type DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'

export type InterviewScheduleFilterFormRef = {
  clearForm: () => void
  getValues: () => InterviewScheduleFilterFormValues
}

type InterviewScheduleFilterFormProps = {
  initialValues?: {
    dateRange?: { from?: Date; to?: Date }
  }
}

type InterviewScheduleFilterFormValues = {
  dateRange?: DateRange | null
}

const Schema = z.object({
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
})

const InterviewScheduleFilterForm = forwardRef<
  InterviewScheduleFilterFormRef,
  InterviewScheduleFilterFormProps
>(({ initialValues }, ref) => {
  const { control, register, reset, getValues } = useForm<InterviewScheduleFilterFormValues>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      dateRange: initialValues?.dateRange || null,
    },
  })

  // Reset form when initialValues change (dialog reopen)
  useEffect(() => {
    reset({
      dateRange: initialValues?.dateRange || null,
    })
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset({
          dateRange: null,
        })
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  return (
    <Flex direction={'column'} gap={'4'}>
      <div className="flex flex-col gap-2 space-y-2">
        <label className="typo-body-base-semibold text-content-dark-2 mb-0">
          Chọn khoảng thời gian
        </label>
        <FormController
          register={register}
          name="dateRange"
          control={control}
          Field={DateRangePicker}
          fieldProps={{
            className: 'w-full',
            showQuickSelect: true,
          }}
        />
      </div>
    </Flex>
  )
})

InterviewScheduleFilterForm.displayName = 'InterviewScheduleFilterForm'

export default InterviewScheduleFilterForm
