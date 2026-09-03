import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import { type DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'

export type JobDescriptionFilterFormRef = {
  clearForm: () => void
  getValues?: () => JobDescriptionFilterForm
}

type JobDescriptionFilterFormProps = {
  initialValues?: Record<string, any>
}

type JobDescriptionFilterForm = {
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

const JobDescriptionFilterForm = forwardRef<
  JobDescriptionFilterFormRef,
  JobDescriptionFilterFormProps
>(({ initialValues }, ref) => {
  const [isLoading, setIsLoading] = useState(false)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)

  const { control, handleSubmit, register, reset, getValues } = useForm<JobDescriptionFilterForm>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      dateRange: initialValues?.dateRange || null,
    },
  })

  // Update form values when initialValues change
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        dateRange: initialValues?.dateRange || null,
      })
      // Only reset flag after actually resetting to initialValues
      setShouldResetToInitial(true)
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        // Use reset with null for proper clearing
        reset(
          {
            dateRange: null,
          },
          {
            keepDefaultValues: false,
          }
        )
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  const onSubmit = async (_data: JobDescriptionFilterForm) => {
    setIsLoading(true)
    try {
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
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
                onApply: (_range: DateRange | undefined) => {
                  // DateRangePicker will call onChange automatically via FormController
                  // This onApply is just for any additional logic if needed
                },
                onCancel: () => {
                  // Handle cancel if needed
                },
              }}
            />
          </div>
        </Flex>
      </Form>
    </>
  )
})

JobDescriptionFilterForm.displayName = 'JobDescriptionFilterForm'

export default JobDescriptionFilterForm
