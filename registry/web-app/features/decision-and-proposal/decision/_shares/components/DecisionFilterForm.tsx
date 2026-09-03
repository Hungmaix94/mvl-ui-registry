import { forwardRef, useImperativeHandle, useEffect, useState } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from '@/components/ui/form/Form.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { DecisionFilterFormValues } from '../types.ts'

export type DecisionFilterFormRef = {
  clearForm: () => void
  getValues?: () => DecisionFilterFormValues
}

type DecisionFilterFormProps = {
  initialValues?: DecisionFilterFormValues
}

const Schema = z.object({
  effective_date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional()
    .nullable(),
})

const DecisionFilterForm = forwardRef<DecisionFilterFormRef, DecisionFilterFormProps>(
  ({ initialValues }, ref) => {
    const [isLoading] = useState(false)

    const { control, handleSubmit, reset, getValues } = useForm<DecisionFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        effective_date_range: initialValues?.effective_date_range || null,
      },
    })

    useEffect(() => {
      if (initialValues && Object.keys(initialValues).length > 0) {
        reset({
          effective_date_range: initialValues?.effective_date_range || null,
        })
      }
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset({
            effective_date_range: null,
          })
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = async (_data: DecisionFilterFormValues) => {
      // Form submission is handled by parent component via ref
    }

    return (
      <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        <Controller
          name="effective_date_range"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DateRangePicker
              label="Ngày hiệu lực"
              value={field.value || undefined}
              showQuickSelect
              onChange={(range) => {
                field.onChange(range || null)
              }}
              error={error?.message}
            />
          )}
        />
      </Form>
    )
  }
)

DecisionFilterForm.displayName = 'DecisionFilterForm'

export default DecisionFilterForm
